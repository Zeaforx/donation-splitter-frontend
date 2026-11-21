import { isConnected, requestAccess, getNetwork, signTransaction } from '@stellar/freighter-api';
import { Address, BASE_FEE, Contract, Networks, TransactionBuilder, nativeToScVal, rpc, xdr } from '@stellar/stellar-sdk';

export type Share = { recipient: string; basis_points: number };
export type Team = { id: string; owner: string; name: string; token: string; shares: Share[] };

const contractId = import.meta.env.VITE_SPLITTER_CONTRACT_ID as string;
const server = new rpc.Server(import.meta.env.VITE_STELLAR_RPC_URL || 'https://soroban-testnet.stellar.org');

export async function connectWallet(): Promise<string> {
  const installed = await isConnected();
  if (installed.error || !installed.isConnected) throw new Error('Install Freighter to connect a Stellar wallet.');
  const access = await requestAccess();
  if (access.error || !access.address) throw new Error(access.error?.message ?? 'Wallet access was declined.');
  const network = await getNetwork();
  if (network.error || network.networkPassphrase !== Networks.TESTNET) throw new Error('Switch Freighter to Stellar Testnet.');
  return access.address;
}

const symbol = (value: string) => nativeToScVal(value, { type: 'symbol' });
const address = (value: string) => new Address(value).toScVal();

function shareValue(share: Share): xdr.ScVal {
  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({ key: symbol('basis_points'), val: nativeToScVal(share.basis_points, { type: 'u32' }) }),
    new xdr.ScMapEntry({ key: symbol('recipient'), val: address(share.recipient) }),
  ]);
}

export async function invoke(method: string, wallet: string, args: xdr.ScVal[]): Promise<string> {
  if (!contractId) throw new Error('VITE_SPLITTER_CONTRACT_ID is missing.');
  const account = await server.getAccount(wallet);
  const built = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(new Contract(contractId).call(method, ...args)).setTimeout(60).build();
  const prepared = await server.prepareTransaction(built);
  const signed = await signTransaction(prepared.toXDR(), { networkPassphrase: Networks.TESTNET, address: wallet });
  if (signed.error || !signed.signedTxXdr) throw new Error(signed.error?.message ?? 'Signature declined.');
  const sent = await server.sendTransaction(TransactionBuilder.fromXDR(signed.signedTxXdr, Networks.TESTNET));
  if (sent.status === 'ERROR') throw new Error('Stellar rejected the transaction.');
  for (let i = 0; i < 25; i++) {
    const receipt = await server.getTransaction(sent.hash);
    if (receipt.status === rpc.Api.GetTransactionStatus.SUCCESS) return sent.hash;
    if (receipt.status === rpc.Api.GetTransactionStatus.FAILED) throw new Error('The transaction failed on-chain.');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`Transaction submitted but confirmation is pending: ${sent.hash}`);
}

export function createTeam(wallet: string, name: string, token: string, shares: Share[]) {
  return invoke('create_team', wallet, [address(wallet), nativeToScVal(name, { type: 'string' }), address(token), xdr.ScVal.scvVec(shares.map(shareValue))]);
}

export function donate(wallet: string, teamId: string, amount: string) {
  const value = BigInt(amount);
  if (value <= 0n) throw new Error('Donation must be positive.');
  return invoke('donate', wallet, [nativeToScVal(BigInt(teamId), { type: 'u64' }), address(wallet), nativeToScVal(value, { type: 'i128' })]);
}

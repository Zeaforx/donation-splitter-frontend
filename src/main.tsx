import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { connectWallet, createTeam, donate, type Share, type Team } from './chain';
import './style.css';

const api = (import.meta.env.VITE_API_URL || 'http://localhost:8080').replace(/\/$/, '');
const token = import.meta.env.VITE_TOKEN_CONTRACT_ID || '';

function App() {
  const [wallet, setWallet] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected, setSelected] = useState<Team | null>(null);
  const [name, setName] = useState('');
  const [shares, setShares] = useState<Share[]>([{ recipient: '', basis_points: 5000 }, { recipient: '', basis_points: 5000 }]);
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  async function refresh() {
    try {
      const response = await fetch(`${api}/teams`);
      if (!response.ok) throw new Error('Team list unavailable');
      const data = await response.json() as { teams: Team[] };
      setTeams(data.teams);
      if (selected) setSelected(data.teams.find(team => String(team.id) === String(selected.id)) ?? selected);
    } catch { setStatus('The public team list is unavailable. Check the backend configuration.'); }
  }
  useEffect(() => { void refresh(); }, []);

  function updateShare(index: number, patch: Partial<Share>) {
    setShares(current => current.map((share, i) => i === index ? { ...share, ...patch } : share));
  }

  async function connect() {
    try { setWallet(await connectWallet()); setStatus('Wallet connected on Stellar Testnet.'); }
    catch (error) { setStatus(String(error)); }
  }

  async function submitTeam(event: React.FormEvent) {
    event.preventDefault();
    if (!wallet) return setStatus('Connect your wallet first.');
    if (!token) return setStatus('Set VITE_TOKEN_CONTRACT_ID before creating a team.');
    if (shares.reduce((sum, share) => sum + share.basis_points, 0) !== 10000) return setStatus('Shares must add up to 100%.');
    setBusy(true); setStatus('Review the team in your wallet…');
    try { const hash = await createTeam(wallet, name.trim(), token, shares); setStatus(`Team created. Transaction: ${hash}`); setName(''); await refresh(); }
    catch (error) { setStatus(String(error)); }
    finally { setBusy(false); }
  }

  async function submitDonation(event: React.FormEvent) {
    event.preventDefault();
    if (!wallet || !selected) return setStatus('Choose a team and connect your wallet.');
    if (!/^\d+(\.\d{1,7})?$/.test(amount) || Number(amount) <= 0) return setStatus('Enter a positive amount with up to 7 decimal places.');
    const [whole, fraction = ''] = amount.split('.');
    const stroops = (BigInt(whole) * 10_000_000n + BigInt(fraction.padEnd(7, '0'))).toString();
    setBusy(true); setStatus('Review the donation and recipients in your wallet…');
    try { const hash = await donate(wallet, String(selected.id), stroops); setStatus(`Donation confirmed. Transaction: ${hash}`); setAmount(''); }
    catch (error) { setStatus(String(error)); }
    finally { setBusy(false); }
  }

  return <>
    <header className="topbar"><a className="brand" href="/" aria-label="Commonwell home"><span className="mark">✳</span> commonwell<span className="brand-dot">.</span></a><nav><a href="#explore">Explore teams</a><a href="#create">Create a team</a></nav><button className="wallet" onClick={connect}>{wallet ? `${wallet.slice(0, 5)}…${wallet.slice(-4)}` : 'Connect wallet ↗'}</button></header>
    <main>
      <section className="hero"><div className="hero-copy"><span className="eyebrow">OPEN SUPPORT, SHARED FAIRLY</span><h1>Good work<br/>takes a <em>team.</em></h1><p>Give once. Support everyone behind the work. Every donation is divided on Stellar in a single, public transaction.</p><div className="hero-actions"><a className="button primary" href="#explore">Find a team <span>↗</span></a><a className="text-link" href="#create">Start your own team <span>→</span></a></div><div className="hero-foot"><span>01 / SET THE SPLIT</span><span>02 / GIVE DIRECTLY</span><span>03 / SEE THE RECEIPT</span></div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="art-center">100<span>%</span></div><span className="art-label label-one">FOR THE MAKERS</span><span className="art-label label-two">NO PLATFORM CUT</span><span className="art-star">✳</span></div></section>
      <section id="explore" className="section explore"><div className="section-head"><div><span className="eyebrow">THE DIRECTORY</span><h2>Teams worth backing<span className="period">.</span></h2></div><p>Each team sets its shares before donations begin. Open a team to see exactly where your contribution goes.</p></div><div className="team-list">{teams.length ? teams.map(team => <button className={`team-row ${selected?.id === team.id ? 'selected' : ''}`} key={team.id} onClick={() => setSelected(team)}><span className="team-index">{String(team.id).padStart(2, '0')}</span><span className="team-name">{team.name}</span><span className="team-meta">{team.shares.length} collaborators</span><span className="team-arrow">↗</span></button>) : <p className="empty">No teams yet. The first one can be yours.</p>}</div></section>
      {selected && <section className="detail" aria-label={`Donate to ${selected.name}`}><div><span className="eyebrow">TEAM {selected.id}</span><h2>{selected.name}</h2><p>Verified split on Stellar Testnet. Shares cannot change after this team is created.</p><div className="split-list">{selected.shares.map(share => <div key={share.recipient}><code>{share.recipient.slice(0, 8)}…{share.recipient.slice(-6)}</code><strong>{(share.basis_points / 100).toFixed(2)}%</strong></div>)}</div></div><form onSubmit={submitDonation} className="donation-form"><label htmlFor="amount">Donation amount</label><div className="amount-field"><input id="amount" inputMode="decimal" placeholder="10.00" value={amount} onChange={e => setAmount(e.target.value)} required/><span>tokens</span></div><p className="help">Confirm the token address in your wallet: <code>{selected.token.slice(0, 8)}…{selected.token.slice(-6)}</code></p><button className="button primary" disabled={busy}>Donate to this team ↗</button></form></section>}
      <section id="create" className="section create"><div className="create-intro"><span className="eyebrow">BUILT FOR COLLABORATION</span><h2>Make support<br/><em>collective.</em></h2><p>Set a name and fixed shares for your team. You’ll sign one transaction to publish it. Future donations go straight to the listed wallets.</p><div className="note">✳ &nbsp; This first release uses one configured Stellar Testnet token.</div></div><form className="create-form" onSubmit={submitTeam}><label htmlFor="team-name">Team name</label><input id="team-name" maxLength={64} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. The Open Source Garden" required/><div className="form-heading"><span>Collaborators and shares</span><span>{(shares.reduce((sum, share) => sum + share.basis_points, 0) / 100).toFixed(2)}% / 100%</span></div>{shares.map((share, index) => <div className="share-row" key={index}><span className="share-number">{String(index + 1).padStart(2, '0')}</span><input aria-label={`Collaborator ${index + 1} wallet address`} value={share.recipient} onChange={e => updateShare(index, { recipient: e.target.value.trim() })} placeholder="Stellar G… address" required/><input aria-label={`Collaborator ${index + 1} percentage`} className="percent-input" type="number" min="0.01" max="100" step="0.01" value={share.basis_points / 100} onChange={e => updateShare(index, { basis_points: Math.round(Number(e.target.value) * 100) })} required/><span>%</span>{shares.length > 2 && <button type="button" className="remove" aria-label={`Remove collaborator ${index + 1}`} onClick={() => setShares(current => current.filter((_, i) => i !== index))}>×</button>}</div>)}<button type="button" className="add" disabled={shares.length >= 10} onClick={() => setShares(current => [...current, { recipient: '', basis_points: 0 }])}>+ Add collaborator</button><button className="button dark" disabled={busy}>Create team on Stellar ↗</button></form></section>
    </main><footer><span className="brand">✳ commonwell.</span><span>Open source · Stellar Testnet</span><a href="https://stellar.expert/explorer/testnet" target="_blank" rel="noreferrer">Explore the ledger ↗</a></footer>{status && <div className="status" role="status"><span>{status}</span><button onClick={() => setStatus('')} aria-label="Dismiss message">×</button></div>}
  </>;
}

createRoot(document.getElementById('root')!).render(<App />);

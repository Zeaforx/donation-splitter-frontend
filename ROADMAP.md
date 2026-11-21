# Roadmap for Stellar Wave

## Before applying

- Build the frontend and verify the complete create and donate flows against the deployed Testnet contract.
- Read token decimals and symbol from the token contract instead of assuming seven decimals.
- Add shareable team routes and transaction links so a supporter can reach a specific team and inspect its receipts.
- Review wallet rejection, insufficient balance, wrong network, and RPC failure states on desktop and mobile.

## Scoped contributor issues after the baseline works

1. **Team page route:** add a direct URL for one team. Acceptance: a supporter can open the link, inspect its fixed split, and donate without visiting the directory.
2. **Token metadata:** read the configured token's `decimals` and `symbol`. Acceptance: amount parsing and display work for a non-seven-decimal test token.
3. **Donation receipt view:** display a confirmed transaction with each recipient's amount. Acceptance: figures match the contract's rounding rule and link to the Testnet explorer.

Do not publish paid issues until the core flow is verified and the repository has been approved for the Stellar Wave program.

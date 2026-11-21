# Commonwell frontend

React/Vite interface for creating immutable donation teams and supporting them on Stellar Testnet. Team lists come from the separate backend. Transactions are built and signed in the browser with Freighter; the backend never receives a private key.

## Configuration

Copy `.env.example` to `.env.local` and set the backend URL, deployed splitter contract ID, and a Testnet SEP-41 token contract ID. This first UI assumes the chosen token has 7 decimals. Freighter must be on Testnet. The same splitter ID and token ID must be used across the three repositories.

The create form requires 2–10 distinct Stellar account addresses and percentages totaling exactly 100. The contract enforces these rules again. Donations are signed by the donor, and the receipt shows the resulting transaction hash.

License: Apache-2.0.

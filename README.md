# Minder Credit

Hashrate Credit Event - USC Hackathon MVP

## Overview

Demonstrates a USC-native pattern where mining activity on Sepolia is verified on Creditcoin USC Testnet v2 via the Native Query Verifier precompile.

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

## Packages

- `packages/sepolia-contracts` - Sepolia MiningEvent contract
- `packages/usc-contracts` - Creditcoin USC MiningCreditUSC contract
- `packages/worker` - Offchain worker for proof submission
- `packages/frontend` - Next.js demo UI

## Environment Setup

Copy `.env.example` to `.env` and fill in the required values.

## License

MIT

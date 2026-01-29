# Minder Credit

Hashrate Credit Event - USC Hackathon MVP

## Overview

Demonstrates a **USC-native pattern** where mining activity on Sepolia is verified on Creditcoin USC Testnet v2 via the Native Query Verifier precompile.

**Flow:**
1. User "mines" on Sepolia (finds a nonce satisfying a PoW puzzle)
2. Offchain worker detects `MiningSolved` event
3. Worker generates a USC query proof
4. Worker submits proof to Creditcoin USC contract
5. Contract verifies proof via precompile and updates miner stats

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

| Package | Description |
|---------|-------------|
| `packages/sepolia-contracts` | Sepolia MiningEvent contract |
| `packages/usc-contracts` | Creditcoin USC MiningCreditUSC contract |
| `packages/worker` | Offchain worker for proof submission |
| `packages/frontend` | Next.js demo UI |

## Environment Setup

```bash
# Copy example env
cp .env.example .env

# Fill in required values (see .env.example for descriptions)
```

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `SEPOLIA_RPC_URL` | Sepolia JSON-RPC URL (Alchemy/Infura) |
| `DEPLOYER_PRIVATE_KEY` | Private key for deployment |
| `WORKER_PRIVATE_KEY` | Private key for worker transactions |
| `SOURCE_CHAIN_KEY_SEPOLIA` | USC source chain identifier for Sepolia |
| `USC_PROOF_API_URL` | USC proof generation API endpoint |

## Deployment

### 1. Deploy Sepolia Contract

```bash
pnpm --filter sepolia-contracts deploy:sepolia
```

Copy the output address to `.env`:
- `SEPOLIA_MINING_EVENT_ADDRESS`
- `NEXT_PUBLIC_SEPOLIA_MINING_EVENT_ADDRESS`

### 2. Deploy USC Contract

```bash
pnpm --filter usc-contracts deploy:usc
```

Copy the output address to `.env`:
- `USC_MINING_CREDIT_USC_ADDRESS`
- `NEXT_PUBLIC_USC_MINING_CREDIT_USC_ADDRESS`

## Running

### Worker

```bash
pnpm --filter worker dev
```

### Frontend

```bash
pnpm --filter frontend dev
```

Open http://localhost:3000

## Architecture

```
User Wallet
  |
  | (1) mine(nonce) tx
  v
Sepolia: MiningEvent.sol  -- emits -->  MiningSolved(epoch, miner, nonce, workUnits, digest)
  |
  | (2) worker detects event
  v
Worker
  - wait confirmations
  - wait attestation window
  - generate proof bundle
  |
  | (3) recordMiningFromQuery(...) tx
  v
Creditcoin USC: MiningCreditUSC.sol
  - precompile verify (0x..0FD2)
  - decode verified tx bytes
  - apply scoring
  -- emits --> MiningCredited(miner, epoch, workUnits, newTotalWorkUnits, queryKey)
```

## Networks

| Network | Chain ID | RPC |
|---------|----------|-----|
| Sepolia | 11155111 | Any Sepolia RPC |
| USC Testnet v2 | 102035 | `wss://rpc.usc-testnet2.creditcoin.network/ws` |

## License

MIT

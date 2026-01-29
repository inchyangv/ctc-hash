# Deployed Addresses

This file tracks deployed contract addresses for the hackathon demo.

## Sepolia (Source Chain)

| Contract | Address | Deployed |
|----------|---------|----------|
| MiningEvent | `0x...` | [ ] |

**Explorer:** https://sepolia.etherscan.io/address/{ADDRESS}

## Creditcoin USC Testnet v2 (Execution Chain)

| Contract | Address | Deployed |
|----------|---------|----------|
| MiningCreditUSC | `0x...` | [ ] |

**Explorer:** https://explorer.usc-testnet2.creditcoin.network/address/{ADDRESS}

## Configuration

After deploying, update these in `.env`:

```bash
# Sepolia
SEPOLIA_MINING_EVENT_ADDRESS=0x...
NEXT_PUBLIC_SEPOLIA_MINING_EVENT_ADDRESS=0x...

# USC
USC_MINING_CREDIT_USC_ADDRESS=0x...
NEXT_PUBLIC_USC_MINING_CREDIT_USC_ADDRESS=0x...
```

## Precompile Addresses

| Precompile | Address |
|------------|---------|
| Native Query Verifier | `0x0000000000000000000000000000000000000FD2` |

## Chain Configuration

| Network | Chain ID | RPC |
|---------|----------|-----|
| Sepolia | 11155111 | `https://sepolia.infura.io/v3/{KEY}` |
| USC Testnet v2 | 102035 | `wss://rpc.usc-testnet2.creditcoin.network/ws` |

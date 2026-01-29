# Demo Script

Step-by-step guide for demonstrating Minder Credit to hackathon judges.

## Prerequisites

Before the demo:
- [ ] Contracts deployed (see ADDRESSES.md)
- [ ] `.env` configured with all addresses and keys
- [ ] Worker has CTC tokens on USC Testnet v2
- [ ] Demo wallet has Sepolia ETH

## Demo Steps

### Step 1: Show the Setup

**Terminal 1: Start the Worker**
```bash
cd packages/worker
pnpm dev
```

Expected output:
```
=== Minder Credit Worker ===
[Worker] Database initialized
[Worker] Connected to Sepolia (chainId: 11155111)
[Worker] Connected to USC (chainId: 102035)
[Listener] Listening for MiningSolved events...
[Submitter] Starting job processor...
```

**Terminal 2: Start the Frontend**
```bash
cd packages/frontend
pnpm dev
```

Open http://localhost:3000

### Step 2: Connect Wallet

1. Click "Connect Wallet" in the frontend
2. Connect MetaMask to Sepolia
3. Show the current epoch and difficulty

### Step 3: Mine on Sepolia

1. Click "Start Mining"
2. Watch the mining progress (brute-forcing nonce)
3. Once a valid nonce is found, confirm the transaction in MetaMask
4. Show the Sepolia transaction hash

**Sepolia Explorer:**
https://sepolia.etherscan.io/tx/{TX_HASH}

### Step 4: Watch the Worker

In Terminal 1, observe:
```
[Listener] MiningSolved detected:
  txHash: 0x...
  epoch: 1, miner: 0x..., workUnits: 1
[Listener] Created job #1 for tx 0x...
[Submitter] Processing SEEN job #1...
[Submitter] Job #1 proof ready
[Submitter] Submitting job #1 to USC...
[Submitter] USC tx submitted: 0x...
[Submitter] Explorer: https://explorer.usc-testnet2.creditcoin.network/tx/...
[Submitter] Job #1 credited successfully!
```

### Step 5: Verify on Creditcoin USC

**USC Explorer:**
https://explorer.usc-testnet2.creditcoin.network/tx/{USC_TX_HASH}

Show the `MiningCredited` event:
- miner address
- epoch
- workUnits
- newTotalWorkUnits

### Step 6: Check Scoreboard

1. Navigate to /scoreboard in the frontend
2. Show the updated leaderboard
3. Click on your address to see detailed stats

## Key Points for Judges

1. **Trustless Verification**: The USC precompile verifies the Sepolia transaction without any trusted intermediary.

2. **Cross-Chain Credit**: Mining activity on one chain creates a credit signal on another.

3. **Replay Protection**: Each query can only be processed once (queryKey uniqueness).

4. **Extensibility**: This pattern can be extended to:
   - Bitcoin hashrate proofs
   - Pool payout verification
   - Rolling window reputation scores

## Troubleshooting

**Worker not detecting events?**
- Check SEPOLIA_RPC_URL is valid
- Verify SEPOLIA_MINING_EVENT_ADDRESS matches deployed contract

**Proof generation fails?**
- Wait for attestation window (~1-2 minutes)
- Check USC_PROOF_API_URL is configured

**USC transaction fails?**
- Ensure worker has CTC tokens
- Check USC_MINING_CREDIT_USC_ADDRESS is correct
- Verify SOURCE_CHAIN_KEY_SEPOLIA matches expected value

# HashCredit — Hashrate-Backed Lending on Bitcoin L2

<p align="center">
  <img src="figures/deck/01.png" alt="HashCredit hero: hashrate collateral flows into smart contract vault and outputs stablecoin liquidity" />
</p>

> “Don’t sell your Bitcoin. Leverage your work.”

## TL;DR (Hook in 3 lines)

- **Collateral = Proven Hashrate (future revenue), not ASICs.**
- **Verify mining-pool payouts on-chain via Creditcoin Gateway (SPV / Merkle proofs)** — no bridges, wrappers, or centralized oracles.
- **Keep BTC on Bitcoin; unlock stablecoin liquidity on Creditcoin.**

<p align="center">
  <img src="figures/deck/02.png" alt="TL;DR icons: hashrate as collateral, SPV/Merkle verification, Bitcoin stays while stablecoin liquidity unlocks" />
</p>

## Elevator Pitch

HashCredit is a decentralized lending protocol that allows Bitcoin miners to collateralize their **future revenue stream (hashrate)** instead of physical hardware. Using **Creditcoin’s Universal Smart Contract (USC)** and **Gateway** technology, we verify mining pool payouts directly on-chain — enabling trust-minimized underwriting for miner working capital.

<p align="center">
  <img src="figures/deck/03.png" alt="Elevator Pitch diagram: ASIC hardware collateral vs verified revenue stream (hashrate) collateral" />
</p>

## Problem — “Rich in Iron, Poor in Cash”

Bitcoin mining is capital-intensive and trapped in a liquidity paradox:

- **Hardware illiquidity:** Miners hold millions in ASICs, but loans require physical audits, shipping logistics, and rapid depreciation checks.
- **The “HODL” dilemma:** To pay electricity (OPEX), miners sell mined BTC immediately and miss upside.
- **DeFi disconnect:** Most DeFi only accepts liquid tokens (e.g., WBTC, ETH) and ignores the value of Proof-of-Work activity itself.

<p align="center">
  <img src="figures/deck/04.png" alt="Problem cards: illiquid ASICs, forced BTC selling for OPEX, DeFi ignores PoW activity" />
</p>

## Solution — On-Chain Revenue-Based Financing

We treat **“proven hashrate”** as the new creditworthiness primitive:

- **No physical collateral:** Your on-chain revenue track record becomes the collateral.
- **No centralized oracle:** We don’t trust; we verify via **SPV proofs**.
- **No bridging BTC:** Keep BTC on Bitcoin; get liquidity on Creditcoin.

<p align="center">
  <img src="figures/deck/05.png" alt="Solution checklist: no physical collateral, no centralized oracle, no BTC bridging" />
</p>

## How It Works (Tech)

HashCredit leverages **Creditcoin USC** to read Bitcoin state natively.

<p align="center">
  <img src="figures/deck/06.png" alt="Architecture: Bitcoin pool payout tx, Gateway SPV/Merkle verification, HashCredit smart contract, stablecoin release on Creditcoin" />
</p>

### 1) Connect & Bind

A miner registers their BTC payout address with HashCredit.

### 2) Verify Income (The “Secret Sauce”)

- Miner submits a `txid` for a payout received from a known mining pool (e.g., Foundry, AntPool).
- Creditcoin Gateway nodes verify the **Merkle proof (SPV)** against the Bitcoin block header.
- The protocol confirms on-chain: “This address received X BTC from Pool Y at Block Z.”

<p align="center">
  <img src="figures/deck/08.png" alt="SPV/Merkle proof diagram: block header, merkle tree, transaction inclusion proof path verified" />
</p>

### 3) Score & Fund

- Contract estimates implied/average hashrate from payout volume + network difficulty.
- A credit line opens in stablecoins (e.g., USDC/USDT) on the Creditcoin network.

<p align="center">
  <img src="figures/deck/09.png" alt="Scoring infographic: payout volume plus difficulty yields implied hashrate gauge and opens stablecoin credit line" />
</p>

### 4) Repayment

Miner repays principal + interest to unlock higher limits and future borrowing.

<p align="center">
  <img src="figures/deck/07.png" alt="4-step sequence: connect address, verify payout tx, open credit line, repay and increase limit" />
</p>

## Market Opportunity

- **Target audience:** Mid-sized mining farms & institutional miners.
- **Scale:** Bitcoin mining is a $15B+ annual revenue industry. Capturing just 0.1% of this liquidity flow creates meaningful TVL for the Creditcoin ecosystem.
- **Why now:** Post-halving margin compression makes efficient working capital existential. HashCredit directly addresses OPEX liquidity needs without forcing BTC sales.

<p align="center">
  <img src="figures/deck/10.png" alt="Market chart: tiny 0.1% slice of mining revenue highlighted and mapped to TVL pool" />
</p>

## Why Creditcoin

We didn’t just build *on* Creditcoin — we built *for* Creditcoin. HashCredit validates the Creditcoin 3.0 thesis:

> “A Universal Smart Contract that can verify cross-chain states without bridges.”

<p align="center">
  <img src="figures/deck/11.png" alt="Bridge vs proof: risky bridge crossed out vs proof packet verified by universal smart contract" />
</p>

HashCredit is a concrete RWA/underwriting application of **Gateway SPV proofs**, showcasing Creditcoin as the most “Bitcoin-native” L2 for financial primitives.

## Roadmap

- **Phase 1 — Hackathon MVP**
  - Verify a Bitcoin Testnet transaction via Creditcoin USC.
  - Implement basic hashrate-to-credit calculation logic.
- **Phase 2 — Alpha**
  - Integrate top 3 mining pool payout address sets.
  - Partner with stablecoin issuers/liquidity providers.
- **Phase 3 — Mainnet**
  - DAO governance for pool whitelisting/parameters.
  - Launch “Hashrate Tokenization” (tradable yield-bearing positions).

<p align="center">
  <img src="figures/deck/12.png" alt="3-phase roadmap timeline: testnet verification, pool/liquidity integrations, DAO and tokenized yield positions" />
</p>

## Links & Resources

- **Demo video:** [Link]
- **GitHub:** [Link]
- **Live demo:** [Link]

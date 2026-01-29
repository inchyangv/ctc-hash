import { ethers } from 'ethers';
import { config } from './config.js';
import { JobDB, Job } from './db.js';
import { ProofProvider, ProofBundle } from './proof-provider.js';

// MiningCreditUSC ABI (minimal for recordMiningFromQuery)
const MINING_CREDIT_USC_ABI = [
  'function recordMiningFromQuery(uint64 chainKey, uint64 blockHeight, bytes encodedTransaction, bytes32 merkleRoot, tuple(bytes32 hash, bool isLeft)[] siblings, bytes32 lowerEndpointDigest, bytes32[] continuityRoots) external returns (bool)',
  'function recordMiningDemoMode(uint64 chainKey, uint64 blockHeight, bytes encodedTransaction, bytes32 merkleRoot, tuple(bytes32 hash, bool isLeft)[] siblings, bytes32 lowerEndpointDigest, bytes32[] continuityRoots, address miner, uint64 epoch, uint256 workUnits) external returns (bool)',
  'function strictDecode() view returns (bool)',
  'event MiningCredited(address indexed miner, uint64 indexed epoch, uint256 workUnits, uint256 newTotalWorkUnits, bytes32 indexed queryKey)',
];

export class Submitter {
  private db: JobDB;
  private proofProvider: ProofProvider;
  private uscProvider: ethers.Provider;
  private uscWallet: ethers.Wallet;
  private uscContract: ethers.Contract;
  private chainKey: number;
  private isRunning: boolean = false;
  private pollInterval: number;

  constructor(
    db: JobDB,
    proofProvider: ProofProvider,
    uscProvider: ethers.Provider,
    uscWallet: ethers.Wallet,
    chainKey: number,
    pollInterval: number = 10000,
  ) {
    this.db = db;
    this.proofProvider = proofProvider;
    this.uscProvider = uscProvider;
    this.uscWallet = uscWallet.connect(uscProvider);
    this.uscContract = new ethers.Contract(
      config.USC_MINING_CREDIT_USC_ADDRESS,
      MINING_CREDIT_USC_ABI,
      this.uscWallet,
    );
    this.chainKey = chainKey;
    this.pollInterval = pollInterval;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('[Submitter] Already running');
      return;
    }

    console.log('[Submitter] Starting job processor...');
    console.log(`[Submitter] USC Contract: ${config.USC_MINING_CREDIT_USC_ADDRESS}`);
    console.log(`[Submitter] Chain Key: ${this.chainKey}`);

    this.isRunning = true;
    this.processLoop();
  }

  async stop(): Promise<void> {
    console.log('[Submitter] Stopping...');
    this.isRunning = false;
  }

  private async processLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        await this.processJobs();
      } catch (e) {
        console.error('[Submitter] Error in process loop:', e);
      }
      await this.sleep(this.pollInterval);
    }
  }

  private async processJobs(): Promise<void> {
    // Process SEEN jobs - get proofs
    const seenJobs = this.db.getJobsByStatus('SEEN');
    for (const job of seenJobs) {
      await this.processSeenJob(job);
    }

    // Process PROOF_READY jobs - submit to USC
    const readyJobs = this.db.getJobsByStatus('PROOF_READY');
    for (const job of readyJobs) {
      await this.processReadyJob(job);
    }
  }

  private async processSeenJob(job: Job): Promise<void> {
    console.log(`[Submitter] Processing SEEN job #${job.id}: ${job.txHash}`);

    try {
      this.db.updateStatus(job.id, 'ATTESTING');

      const proof = await this.proofProvider.getProof({
        chainKey: this.chainKey,
        blockHeight: BigInt(job.blockNumber),
        txIndex: job.txIndex,
        txHash: job.txHash,
      });

      this.db.updateStatus(job.id, 'PROOF_READY', {
        proofBundle: JSON.stringify(proof),
      });

      console.log(`[Submitter] Job #${job.id} proof ready`);
    } catch (e) {
      console.error(`[Submitter] Failed to get proof for job #${job.id}:`, e);
      this.db.updateStatus(job.id, 'FAILED', {
        errorMessage: (e as Error).message,
      });
    }
  }

  private async processReadyJob(job: Job): Promise<void> {
    console.log(`[Submitter] Submitting job #${job.id} to USC...`);

    if (!job.proofBundle) {
      console.error(`[Submitter] Job #${job.id} has no proof bundle`);
      return;
    }

    try {
      const proof: ProofBundle = JSON.parse(job.proofBundle);
      this.db.updateStatus(job.id, 'SUBMITTED');

      // Check if strict mode or demo mode
      const strictDecode = await this.uscContract.strictDecode();

      let tx: ethers.TransactionResponse;

      if (strictDecode) {
        // Strict mode - decode from encoded transaction
        tx = await this.uscContract.recordMiningFromQuery(
          this.chainKey,
          job.blockNumber,
          proof.encodedTransaction,
          proof.merkleRoot,
          proof.siblings,
          proof.lowerEndpointDigest,
          proof.continuityRoots,
          {
            gasLimit: 500000,
          },
        );
      } else {
        // Demo mode - pass explicit params
        tx = await this.uscContract.recordMiningDemoMode(
          this.chainKey,
          job.blockNumber,
          proof.encodedTransaction,
          proof.merkleRoot,
          proof.siblings,
          proof.lowerEndpointDigest,
          proof.continuityRoots,
          job.miner,
          job.epoch,
          job.workUnits,
          {
            gasLimit: 500000,
          },
        );
      }

      console.log(`[Submitter] USC tx submitted: ${tx.hash}`);
      console.log(`[Submitter] Explorer: https://explorer.usc-testnet2.creditcoin.network/tx/${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt?.status === 1) {
        this.db.updateStatus(job.id, 'CREDITED', {
          uscTxHash: tx.hash,
        });
        console.log(`[Submitter] Job #${job.id} credited successfully!`);
      } else {
        throw new Error('Transaction failed');
      }
    } catch (e) {
      console.error(`[Submitter] Failed to submit job #${job.id}:`, e);
      this.db.updateStatus(job.id, 'FAILED', {
        errorMessage: (e as Error).message,
      });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

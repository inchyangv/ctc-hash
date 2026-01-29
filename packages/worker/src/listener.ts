import { ethers } from 'ethers';
import { JobDB } from './db.js';

// MiningSolved event ABI
const MINING_SOLVED_ABI = [
  'event MiningSolved(uint64 indexed epoch, address indexed miner, uint256 nonce, uint256 workUnits, bytes32 digest)',
];

export interface MiningSolvedEvent {
  epoch: bigint;
  miner: string;
  nonce: bigint;
  workUnits: bigint;
  digest: string;
  txHash: string;
  blockNumber: number;
  txIndex: number;
  logIndex: number;
}

export class EventListener {
  private provider: ethers.Provider;
  private contract: ethers.Contract;
  private db: JobDB;
  private confirmations: number;
  private isListening: boolean = false;

  constructor(
    provider: ethers.Provider,
    miningEventAddress: string,
    db: JobDB,
    confirmations: number = 3,
  ) {
    this.provider = provider;
    this.contract = new ethers.Contract(miningEventAddress, MINING_SOLVED_ABI, provider);
    this.db = db;
    this.confirmations = confirmations;
  }

  async start(): Promise<void> {
    if (this.isListening) {
      console.log('[Listener] Already listening');
      return;
    }

    console.log('[Listener] Starting event listener...');
    console.log(`[Listener] Contract: ${await this.contract.getAddress()}`);
    console.log(`[Listener] Confirmations required: ${this.confirmations}`);

    this.isListening = true;

    // Listen for new events
    this.contract.on('MiningSolved', async (epoch, miner, nonce, workUnits, digest, event) => {
      try {
        await this.handleEvent(epoch, miner, nonce, workUnits, digest, event);
      } catch (e) {
        console.error('[Listener] Error handling event:', e);
      }
    });

    console.log('[Listener] Listening for MiningSolved events...');
  }

  private async handleEvent(
    epoch: bigint,
    miner: string,
    nonce: bigint,
    workUnits: bigint,
    digest: string,
    event: ethers.ContractEventPayload,
  ): Promise<void> {
    const log = event.log;
    const txHash = log.transactionHash;
    const blockNumber = log.blockNumber;
    const txIndex = log.transactionIndex;
    const logIndex = log.index;

    console.log(`[Listener] MiningSolved detected:`);
    console.log(`  txHash: ${txHash}`);
    console.log(`  block: ${blockNumber}, txIndex: ${txIndex}, logIndex: ${logIndex}`);
    console.log(`  epoch: ${epoch}, miner: ${miner}, workUnits: ${workUnits}`);

    // Wait for confirmations
    console.log(`[Listener] Waiting for ${this.confirmations} confirmations...`);
    const receipt = await log.getTransactionReceipt();
    if (receipt) {
      const currentBlock = await this.provider.getBlockNumber();
      const confirmationsNeeded = this.confirmations - (currentBlock - blockNumber);
      if (confirmationsNeeded > 0) {
        console.log(`[Listener] Need ${confirmationsNeeded} more confirmations`);
        // In production, would wait or use a more sophisticated approach
      }
    }

    // Create job in DB
    const jobId = this.db.createJob({
      txHash,
      blockNumber,
      txIndex,
      logIndex,
      epoch: Number(epoch),
      miner,
      nonce: nonce.toString(),
      workUnits: Number(workUnits),
      digest,
    });

    if (jobId !== null) {
      console.log(`[Listener] Created job #${jobId} for tx ${txHash}`);
    } else {
      console.log(`[Listener] Duplicate event, skipping: ${txHash}`);
    }
  }

  async stop(): Promise<void> {
    if (!this.isListening) return;

    console.log('[Listener] Stopping event listener...');
    await this.contract.removeAllListeners('MiningSolved');
    this.isListening = false;
    console.log('[Listener] Stopped');
  }

  async scanPastEvents(fromBlock: number, toBlock?: number): Promise<number> {
    const endBlock = toBlock || (await this.provider.getBlockNumber());
    console.log(`[Listener] Scanning past events from block ${fromBlock} to ${endBlock}...`);

    const filter = this.contract.filters.MiningSolved();
    const events = await this.contract.queryFilter(filter, fromBlock, endBlock);

    let newJobs = 0;
    for (const event of events) {
      if (event instanceof ethers.EventLog) {
        const [epoch, miner, nonce, workUnits, digest] = event.args;
        const jobId = this.db.createJob({
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          txIndex: event.transactionIndex,
          logIndex: event.index,
          epoch: Number(epoch),
          miner,
          nonce: nonce.toString(),
          workUnits: Number(workUnits),
          digest,
        });
        if (jobId !== null) {
          newJobs++;
        }
      }
    }

    console.log(`[Listener] Found ${events.length} events, created ${newJobs} new jobs`);
    return newJobs;
  }
}

import { ethers } from 'ethers';
import { config } from './config.js';
import { JobDB } from './db.js';
import { EventListener } from './listener.js';
import { Submitter } from './submitter.js';
import { createProofProvider } from './proof-provider.js';
import { ApiServer } from './api.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main(): Promise<void> {
  console.log('=== Minder Credit Worker ===');
  console.log('');

  // Ensure data directory exists
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('[Worker] Created data directory');
  }

  // Initialize database
  const db = new JobDB();
  console.log('[Worker] Database initialized');

  // Connect to Sepolia
  console.log('[Worker] Connecting to Sepolia...');
  const sepoliaProvider = new ethers.JsonRpcProvider(config.SEPOLIA_RPC_URL);
  const sepoliaNetwork = await sepoliaProvider.getNetwork();
  console.log(`[Worker] Connected to Sepolia (chainId: ${sepoliaNetwork.chainId})`);

  // Connect to USC
  console.log('[Worker] Connecting to USC...');
  const uscProvider = new ethers.WebSocketProvider(config.USC_RPC_WS);
  const uscNetwork = await uscProvider.getNetwork();
  console.log(`[Worker] Connected to USC (chainId: ${uscNetwork.chainId})`);

  // Initialize wallet
  const uscWallet = new ethers.Wallet(config.WORKER_PRIVATE_KEY);
  console.log(`[Worker] Wallet address: ${uscWallet.address}`);

  // Initialize proof provider
  const proofProvider = createProofProvider('http');

  // Initialize event listener
  const listener = new EventListener(
    sepoliaProvider,
    config.SEPOLIA_MINING_EVENT_ADDRESS,
    db,
    3, // confirmations
  );

  // Initialize submitter
  const submitter = new Submitter(
    db,
    proofProvider,
    uscProvider,
    uscWallet,
    config.SOURCE_CHAIN_KEY_SEPOLIA,
    10000, // poll interval
  );

  // Initialize API server
  let apiServer: ApiServer | null = null;
  if (config.API_ENABLED) {
    apiServer = new ApiServer(db, config.API_PORT);
    apiServer.start();
  }

  // Start services
  await listener.start();
  await submitter.start();

  // Handle shutdown
  const shutdown = async () => {
    console.log('\n[Worker] Shutting down...');
    await listener.stop();
    await submitter.stop();
    if (apiServer) {
      apiServer.stop();
    }
    db.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log('[Worker] Worker is running. Press Ctrl+C to stop.');

  // Keep process alive
  await new Promise(() => {});
}

main().catch((error) => {
  console.error('[Worker] Fatal error:', error);
  process.exit(1);
});

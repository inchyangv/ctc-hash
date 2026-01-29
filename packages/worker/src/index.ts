import { ethers } from 'ethers';
import { config } from './config.js';
import { JobDB } from './db.js';
import { EventListener } from './listener.js';
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

  // Initialize event listener
  const listener = new EventListener(
    sepoliaProvider,
    config.SEPOLIA_MINING_EVENT_ADDRESS,
    db,
    3, // confirmations
  );

  // Start listening
  await listener.start();

  // Handle shutdown
  process.on('SIGINT', async () => {
    console.log('\n[Worker] Shutting down...');
    await listener.stop();
    db.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n[Worker] Shutting down...');
    await listener.stop();
    db.close();
    process.exit(0);
  });

  console.log('[Worker] Worker is running. Press Ctrl+C to stop.');

  // Keep process alive
  await new Promise(() => {});
}

main().catch((error) => {
  console.error('[Worker] Fatal error:', error);
  process.exit(1);
});

import { config } from './config.js';

console.log('Worker starting with config:', {
  sepoliaRpc: config.SEPOLIA_RPC_URL,
  uscRpc: config.USC_RPC_WS,
});


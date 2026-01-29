import { z } from 'zod';

const envSchema = z.object({
  // Sepolia (source chain)
  SEPOLIA_RPC_URL: z.string().url('SEPOLIA_RPC_URL must be a valid URL'),
  SEPOLIA_MINING_EVENT_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'SEPOLIA_MINING_EVENT_ADDRESS must be a valid Ethereum address'),

  // Creditcoin USC (execution chain)
  USC_RPC_WS: z
    .string()
    .url('USC_RPC_WS must be a valid WebSocket URL')
    .default('wss://rpc.usc-testnet2.creditcoin.network/ws'),
  USC_CHAIN_ID: z.coerce.number().default(102035),
  USC_MINING_CREDIT_USC_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'USC_MINING_CREDIT_USC_ADDRESS must be a valid Ethereum address'),

  // USC-specific
  SOURCE_CHAIN_KEY_SEPOLIA: z.coerce.number().positive('SOURCE_CHAIN_KEY_SEPOLIA must be positive'),
  USC_PROOF_API_URL: z.string().url('USC_PROOF_API_URL must be a valid URL'),

  // Keys
  WORKER_PRIVATE_KEY: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'WORKER_PRIVATE_KEY must be a valid private key'),

  // API Server (optional)
  API_PORT: z.coerce.number().default(3001),
  API_ENABLED: z
    .string()
    .transform((val) => val.toLowerCase() === 'true')
    .default('true'),
});

export type Config = z.infer<typeof envSchema>;

export function loadConfig(): Config {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    console.error('Configuration validation failed:\n' + errors);
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();

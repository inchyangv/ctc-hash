import { config } from './config.js';

export interface MerkleProofEntry {
  hash: `0x${string}`;
  isLeft: boolean;
}

export interface ProofBundle {
  encodedTransaction: `0x${string}`;
  merkleRoot: `0x${string}`;
  siblings: MerkleProofEntry[];
  lowerEndpointDigest: `0x${string}`;
  continuityRoots: `0x${string}`[];
}

export interface ProofProviderParams {
  chainKey: number;
  blockHeight: bigint;
  txIndex: number;
  txHash?: string;
}

export interface ProofProvider {
  getProof(params: ProofProviderParams): Promise<ProofBundle>;
}

// Backoff delays in milliseconds
const BACKOFF_DELAYS = [5000, 10000, 20000, 40000, 60000];

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class HttpProofProvider implements ProofProvider {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || config.USC_PROOF_API_URL;
  }

  async getProof(params: ProofProviderParams): Promise<ProofBundle> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= BACKOFF_DELAYS.length; attempt++) {
      try {
        const proof = await this.fetchProof(params);
        return proof;
      } catch (e) {
        lastError = e as Error;

        if (attempt < BACKOFF_DELAYS.length) {
          const delay = BACKOFF_DELAYS[attempt];
          console.log(
            `[ProofProvider] Attempt ${attempt + 1} failed, retrying in ${delay / 1000}s...`,
          );
          console.log(`[ProofProvider] Error: ${lastError.message}`);
          await sleep(delay);
        }
      }
    }

    throw new Error(`Failed to get proof after ${BACKOFF_DELAYS.length + 1} attempts: ${lastError?.message}`);
  }

  private async fetchProof(params: ProofProviderParams): Promise<ProofBundle> {
    const url = new URL('/proof', this.baseUrl);
    url.searchParams.set('chainKey', params.chainKey.toString());
    url.searchParams.set('blockHeight', params.blockHeight.toString());
    url.searchParams.set('txIndex', params.txIndex.toString());
    if (params.txHash) {
      url.searchParams.set('txHash', params.txHash);
    }

    console.log(`[ProofProvider] Fetching proof from ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text();
      if (response.status === 404 || body.includes('not ready')) {
        throw new Error('Proof not ready yet');
      }
      throw new Error(`HTTP ${response.status}: ${body}`);
    }

    const data = (await response.json()) as {
      encodedTransaction: string;
      merkleRoot: string;
      siblings?: { hash: string; isLeft: boolean }[];
      lowerEndpointDigest: string;
      continuityRoots?: string[];
    };

    // Validate and transform response
    return {
      encodedTransaction: data.encodedTransaction as `0x${string}`,
      merkleRoot: data.merkleRoot as `0x${string}`,
      siblings: (data.siblings || []).map((s) => ({
        hash: s.hash as `0x${string}`,
        isLeft: s.isLeft,
      })),
      lowerEndpointDigest: data.lowerEndpointDigest as `0x${string}`,
      continuityRoots: (data.continuityRoots || []) as `0x${string}`[],
    };
  }
}

// Stub provider for local development
export class StubProofProvider implements ProofProvider {
  private fixtures: Map<string, ProofBundle> = new Map();

  addFixture(txHash: string, bundle: ProofBundle): void {
    this.fixtures.set(txHash.toLowerCase(), bundle);
  }

  async getProof(params: ProofProviderParams): Promise<ProofBundle> {
    if (params.txHash) {
      const fixture = this.fixtures.get(params.txHash.toLowerCase());
      if (fixture) {
        console.log(`[StubProofProvider] Returning fixture for ${params.txHash}`);
        return fixture;
      }
    }

    // Return a dummy proof bundle for testing
    console.log('[StubProofProvider] Returning dummy proof bundle');
    return {
      encodedTransaction: '0x00',
      merkleRoot: '0x0000000000000000000000000000000000000000000000000000000000000000',
      siblings: [],
      lowerEndpointDigest: '0x0000000000000000000000000000000000000000000000000000000000000000',
      continuityRoots: [],
    };
  }
}

export function createProofProvider(mode: 'http' | 'stub' = 'http'): ProofProvider {
  if (mode === 'stub') {
    return new StubProofProvider();
  }
  return new HttpProofProvider();
}

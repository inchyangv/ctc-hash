import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type JobStatus = 'SEEN' | 'ATTESTING' | 'PROOF_READY' | 'SUBMITTED' | 'CREDITED' | 'FAILED';

export interface Job {
  id: number;
  txHash: string;
  blockNumber: number;
  txIndex: number;
  logIndex: number;
  epoch: number;
  miner: string;
  nonce: string;
  workUnits: number;
  digest: string;
  status: JobStatus;
  proofBundle: string | null;
  uscTxHash: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export class JobDB {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath = path.join(__dirname, '..', 'data', 'jobs.db');
    this.db = new Database(dbPath || defaultPath);
    this.init();
  }

  private init(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        txHash TEXT UNIQUE NOT NULL,
        blockNumber INTEGER NOT NULL,
        txIndex INTEGER NOT NULL,
        logIndex INTEGER NOT NULL,
        epoch INTEGER NOT NULL,
        miner TEXT NOT NULL,
        nonce TEXT NOT NULL,
        workUnits INTEGER NOT NULL,
        digest TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'SEEN',
        proofBundle TEXT,
        uscTxHash TEXT,
        errorMessage TEXT,
        createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
      CREATE INDEX IF NOT EXISTS idx_jobs_miner ON jobs(miner);
    `);
  }

  createJob(data: {
    txHash: string;
    blockNumber: number;
    txIndex: number;
    logIndex: number;
    epoch: number;
    miner: string;
    nonce: string;
    workUnits: number;
    digest: string;
  }): number | null {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO jobs (txHash, blockNumber, txIndex, logIndex, epoch, miner, nonce, workUnits, digest)
        VALUES (@txHash, @blockNumber, @txIndex, @logIndex, @epoch, @miner, @nonce, @workUnits, @digest)
      `);
      const result = stmt.run(data);
      return result.lastInsertRowid as number;
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
        return null; // Duplicate
      }
      throw e;
    }
  }

  getJobByTxHash(txHash: string): Job | undefined {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE txHash = ?');
    return stmt.get(txHash) as Job | undefined;
  }

  getJobsByStatus(status: JobStatus): Job[] {
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE status = ? ORDER BY createdAt ASC');
    return stmt.all(status) as Job[];
  }

  updateStatus(id: number, status: JobStatus, extra?: Partial<Job>): void {
    const updates = ['status = @status', 'updatedAt = CURRENT_TIMESTAMP'];
    const params: Record<string, unknown> = { id, status };

    if (extra?.proofBundle !== undefined) {
      updates.push('proofBundle = @proofBundle');
      params.proofBundle = extra.proofBundle;
    }
    if (extra?.uscTxHash !== undefined) {
      updates.push('uscTxHash = @uscTxHash');
      params.uscTxHash = extra.uscTxHash;
    }
    if (extra?.errorMessage !== undefined) {
      updates.push('errorMessage = @errorMessage');
      params.errorMessage = extra.errorMessage;
    }

    const stmt = this.db.prepare(`UPDATE jobs SET ${updates.join(', ')} WHERE id = @id`);
    stmt.run(params);
  }

  getAllJobs(): Job[] {
    const stmt = this.db.prepare('SELECT * FROM jobs ORDER BY createdAt DESC');
    return stmt.all() as Job[];
  }

  close(): void {
    this.db.close();
  }
}

import http from 'http';
import { JobDB, Job } from './db.js';

export interface LeaderboardEntry {
  rank: number;
  miner: string;
  totalWorkUnits: number;
  totalSolves: number;
  lastEpoch: number;
}

export interface ApiStats {
  totalJobs: number;
  jobsByStatus: Record<string, number>;
  leaderboard: LeaderboardEntry[];
  recentJobs: Job[];
}

export class ApiServer {
  private server: http.Server | null = null;
  private db: JobDB;
  private port: number;

  constructor(db: JobDB, port: number = 3001) {
    this.db = db;
    this.port = port;
  }

  start(): void {
    this.server = http.createServer((req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method !== 'GET') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
      }

      const url = new URL(req.url || '/', `http://localhost:${this.port}`);

      try {
        switch (url.pathname) {
          case '/':
          case '/health':
            this.handleHealth(res);
            break;
          case '/api/stats':
            this.handleStats(res);
            break;
          case '/api/leaderboard':
            this.handleLeaderboard(res);
            break;
          case '/api/jobs':
            this.handleJobs(res, url.searchParams.get('status'));
            break;
          default:
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
        }
      } catch (err) {
        console.error('[API] Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error' }));
      }
    });

    this.server.listen(this.port, () => {
      console.log(`[API] Server listening on http://localhost:${this.port}`);
      console.log(`[API] Endpoints:`);
      console.log(`  GET /health - Health check`);
      console.log(`  GET /api/stats - Overall statistics`);
      console.log(`  GET /api/leaderboard - Miner leaderboard`);
      console.log(`  GET /api/jobs?status=CREDITED - Jobs by status`);
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      console.log('[API] Server stopped');
    }
  }

  private handleHealth(res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  }

  private handleStats(res: http.ServerResponse): void {
    const allJobs = this.db.getAllJobs();

    // Count by status
    const jobsByStatus: Record<string, number> = {};
    for (const job of allJobs) {
      jobsByStatus[job.status] = (jobsByStatus[job.status] || 0) + 1;
    }

    // Build leaderboard
    const leaderboard = this.buildLeaderboard(allJobs);

    // Recent jobs (last 10)
    const recentJobs = allJobs.slice(0, 10);

    const stats: ApiStats = {
      totalJobs: allJobs.length,
      jobsByStatus,
      leaderboard: leaderboard.slice(0, 10),
      recentJobs,
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats, null, 2));
  }

  private handleLeaderboard(res: http.ServerResponse): void {
    const allJobs = this.db.getAllJobs();
    const leaderboard = this.buildLeaderboard(allJobs);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ leaderboard }, null, 2));
  }

  private handleJobs(res: http.ServerResponse, status: string | null): void {
    let jobs: Job[];

    if (status) {
      jobs = this.db.getJobsByStatus(status as any);
    } else {
      jobs = this.db.getAllJobs();
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ count: jobs.length, jobs }, null, 2));
  }

  private buildLeaderboard(jobs: Job[]): LeaderboardEntry[] {
    // Aggregate by miner (only CREDITED jobs count)
    const minerMap = new Map<string, { workUnits: number; solves: number; lastEpoch: number }>();

    for (const job of jobs) {
      if (job.status !== 'CREDITED') continue;

      const existing = minerMap.get(job.miner) || { workUnits: 0, solves: 0, lastEpoch: 0 };
      existing.workUnits += job.workUnits;
      existing.solves += 1;
      existing.lastEpoch = Math.max(existing.lastEpoch, job.epoch);
      minerMap.set(job.miner, existing);
    }

    // Convert to array and sort
    const entries: LeaderboardEntry[] = [];
    for (const [miner, stats] of minerMap) {
      entries.push({
        rank: 0,
        miner,
        totalWorkUnits: stats.workUnits,
        totalSolves: stats.solves,
        lastEpoch: stats.lastEpoch,
      });
    }

    // Sort by work units (desc), then by solves (desc)
    entries.sort((a, b) => {
      if (b.totalWorkUnits !== a.totalWorkUnits) {
        return b.totalWorkUnits - a.totalWorkUnits;
      }
      return b.totalSolves - a.totalSolves;
    });

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries;
  }
}

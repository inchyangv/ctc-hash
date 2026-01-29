"use client";

import { useState, useEffect, useCallback } from "react";
import { JsonRpcProvider, Contract } from "ethers";
import Link from "next/link";
import { MINING_CREDIT_USC_ABI } from "../../lib/abi";
import { config } from "../../config";
import "../globals.css";

const USC_RPC = "https://rpc.usc-testnet2.creditcoin.network";

type LeaderboardEntry = {
  miner: string;
  totalWorkUnits: bigint;
  totalSolves: bigint;
  lastEpochCredited: bigint;
};

type CreditEvent = {
  miner: string;
  epoch: bigint;
  workUnits: bigint;
  newTotalWorkUnits: bigint;
  queryKey: string;
  txHash: string;
  blockNumber: number;
};

export default function ScoreboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentEvents, setRecentEvents] = useState<CreditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!config.uscMiningCreditAddress) {
      setError("USC contract address not configured");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const provider = new JsonRpcProvider(USC_RPC);
      const contract = new Contract(
        config.uscMiningCreditAddress,
        MINING_CREDIT_USC_ABI,
        provider
      );

      // Fetch MiningCredited events (last 5000 blocks)
      const filter = contract.filters.MiningCredited();
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 5000);

      const events = await contract.queryFilter(filter, fromBlock);

      // Process events to build leaderboard
      const minerMap = new Map<string, LeaderboardEntry>();
      const creditEvents: CreditEvent[] = [];

      for (const event of events) {
        const log = event as unknown as {
          args: [string, bigint, bigint, bigint, string];
          transactionHash: string;
          blockNumber: number;
        };

        const [miner, epoch, workUnits, newTotalWorkUnits, queryKey] = log.args;

        creditEvents.push({
          miner,
          epoch,
          workUnits,
          newTotalWorkUnits,
          queryKey,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
        });

        // Update miner entry
        const existing = minerMap.get(miner);
        if (!existing || existing.lastEpochCredited < epoch) {
          minerMap.set(miner, {
            miner,
            totalWorkUnits: newTotalWorkUnits,
            totalSolves: BigInt(creditEvents.filter(e => e.miner === miner).length),
            lastEpochCredited: epoch,
          });
        }
      }

      // Convert to array and sort by totalWorkUnits
      const leaderboardArray = Array.from(minerMap.values())
        .sort((a, b) => {
          if (b.totalWorkUnits > a.totalWorkUnits) return 1;
          if (b.totalWorkUnits < a.totalWorkUnits) return -1;
          return 0;
        });

      setLeaderboard(leaderboardArray);
      setRecentEvents(creditEvents.slice(-20).reverse());
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch scoreboard data:", err);
      setError("Failed to fetch data from Creditcoin USC");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="container">
      <header className="header">
        <h1>Scoreboard</h1>
        <Link href="/" className="btn btn-secondary">
          Back to Mining
        </Link>
      </header>

      <main>
        {loading && (
          <div className="mining-panel">
            <p className="status-text">Loading scoreboard...</p>
          </div>
        )}

        {error && (
          <div className="mining-panel">
            <div className="error-message">
              <p>{error}</p>
              <button onClick={fetchData} className="btn btn-secondary">
                Retry
              </button>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="mining-panel">
              <div className="panel-header">
                <h2>Top Miners</h2>
                <button onClick={fetchData} className="btn btn-secondary btn-sm">
                  Refresh
                </button>
              </div>

              {leaderboard.length === 0 ? (
                <p className="status-text">No mining credits recorded yet</p>
              ) : (
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Miner</th>
                      <th>Work Units</th>
                      <th>Solves</th>
                      <th>Last Epoch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.slice(0, 20).map((entry, index) => (
                      <tr key={entry.miner}>
                        <td className="rank">
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                        </td>
                        <td className="miner-address">
                          <a
                            href={`https://explorer.usc-testnet2.creditcoin.network/address/${entry.miner}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link mono"
                          >
                            {entry.miner.slice(0, 6)}...{entry.miner.slice(-4)}
                          </a>
                        </td>
                        <td className="work-units">{entry.totalWorkUnits.toString()}</td>
                        <td>{entry.totalSolves.toString()}</td>
                        <td>{entry.lastEpochCredited.toString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mining-panel">
              <h2>Recent Credits</h2>

              {recentEvents.length === 0 ? (
                <p className="status-text">No recent events</p>
              ) : (
                <div className="events-list">
                  {recentEvents.map((event, index) => (
                    <div key={`${event.txHash}-${index}`} className="event-item">
                      <div className="event-main">
                        <span className="mono">
                          {event.miner.slice(0, 6)}...{event.miner.slice(-4)}
                        </span>
                        <span className="text-success">+{event.workUnits.toString()} units</span>
                      </div>
                      <div className="event-meta">
                        <span className="text-muted">Epoch {event.epoch.toString()}</span>
                        <a
                          href={`https://explorer.usc-testnet2.creditcoin.network/tx/${event.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="link"
                        >
                          View TX
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

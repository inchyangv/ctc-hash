"use client";

import { useState, useEffect } from "react";
import { JsonRpcProvider, Contract } from "ethers";
import { MINING_CREDIT_USC_ABI } from "../lib/abi";
import { config } from "../config";

type Props = {
  txHash: string | null;
  minerAddress: string | null;
};

type CreditStatus = "pending" | "checking" | "credited" | "not_found";

const USC_RPC = "https://rpc.usc-testnet2.creditcoin.network";

export function StatusDisplay({ txHash, minerAddress }: Props) {
  const [creditStatus, setCreditStatus] = useState<CreditStatus>("pending");
  const [uscTxHash, setUscTxHash] = useState<string | null>(null);
  const [minerStats, setMinerStats] = useState<{
    totalWorkUnits: bigint;
    totalSolves: bigint;
    lastEpochCredited: bigint;
  } | null>(null);

  useEffect(() => {
    if (!txHash || !minerAddress || !config.uscMiningCreditAddress) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 60; // ~5 minutes with 5s intervals

    const checkCredit = async () => {
      if (cancelled) return;

      setCreditStatus("checking");

      try {
        const provider = new JsonRpcProvider(USC_RPC);
        const contract = new Contract(
          config.uscMiningCreditAddress!,
          MINING_CREDIT_USC_ABI,
          provider
        );

        // Get miner stats
        const stats = await contract.getMinerStats(minerAddress);
        setMinerStats({
          totalWorkUnits: stats[0],
          totalSolves: stats[1],
          lastEpochCredited: stats[2],
        });

        // Check for MiningCredited events for this miner
        const filter = contract.filters.MiningCredited(minerAddress);
        const events = await contract.queryFilter(filter, -1000); // last 1000 blocks

        if (events.length > 0) {
          const latestEvent = events[events.length - 1];
          setUscTxHash(latestEvent.transactionHash);
          setCreditStatus("credited");
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkCredit, 5000);
        } else {
          setCreditStatus("not_found");
        }
      } catch (err) {
        console.error("Error checking credit status:", err);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkCredit, 5000);
        }
      }
    };

    // Start checking after a delay (worker needs time to process)
    const timeout = setTimeout(checkCredit, 10000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [txHash, minerAddress]);

  if (!txHash) {
    return null;
  }

  return (
    <div className="status-display">
      <h3>Credit Status</h3>

      <div className="status-timeline">
        <div className="timeline-item completed">
          <div className="dot"></div>
          <div className="content">
            <span className="title">Mined on Sepolia</span>
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              View TX
            </a>
          </div>
        </div>

        <div className={`timeline-item ${creditStatus === "checking" ? "active" : creditStatus === "credited" ? "completed" : ""}`}>
          <div className="dot"></div>
          <div className="content">
            <span className="title">Worker Processing</span>
            {creditStatus === "checking" && <span className="spinner-sm"></span>}
            {creditStatus === "pending" && <span className="text-muted">Waiting...</span>}
          </div>
        </div>

        <div className={`timeline-item ${creditStatus === "credited" ? "completed" : ""}`}>
          <div className="dot"></div>
          <div className="content">
            <span className="title">Credited on Creditcoin USC</span>
            {creditStatus === "credited" && uscTxHash && (
              <a
                href={`https://explorer.usc-testnet2.creditcoin.network/tx/${uscTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                View TX
              </a>
            )}
            {creditStatus === "not_found" && (
              <span className="text-warning">Not yet credited (worker may be offline)</span>
            )}
          </div>
        </div>
      </div>

      {minerStats && (
        <div className="miner-stats">
          <h4>Your Stats on Creditcoin USC</h4>
          <div className="stats-grid">
            <div className="stat">
              <span className="stat-value">{minerStats.totalWorkUnits.toString()}</span>
              <span className="stat-label">Total Work Units</span>
            </div>
            <div className="stat">
              <span className="stat-value">{minerStats.totalSolves.toString()}</span>
              <span className="stat-label">Total Solves</span>
            </div>
            <div className="stat">
              <span className="stat-value">{minerStats.lastEpochCredited.toString()}</span>
              <span className="stat-label">Last Epoch Credited</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

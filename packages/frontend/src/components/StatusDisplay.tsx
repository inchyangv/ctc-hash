"use client";

import { useState, useEffect } from "react";
import { JsonRpcProvider, Contract } from "ethers";
import { MINING_CREDIT_USC_ABI } from "../lib/abi";
import { config } from "../config";

type Props = {
  txHash: string | null;
  minerAddress: string | null;
};

type CreditStatus =
  | "pending"           // Initial state
  | "confirming"        // Waiting for Sepolia confirmations
  | "attestation_wait"  // Waiting for USC attestation window (~60s)
  | "proof_generating"  // Worker generating proof
  | "submitting"        // Worker submitting to USC
  | "credited"          // Successfully credited
  | "not_found";        // Timeout

const USC_RPC = "https://rpc.usc-testnet2.creditcoin.network";
const SEPOLIA_CONFIRMATIONS = 3;
const ATTESTATION_WINDOW_SECONDS = 60;

export function StatusDisplay({ txHash, minerAddress }: Props) {
  const [creditStatus, setCreditStatus] = useState<CreditStatus>("pending");
  const [uscTxHash, setUscTxHash] = useState<string | null>(null);
  const [minerStats, setMinerStats] = useState<{
    totalWorkUnits: bigint;
    totalSolves: bigint;
    lastEpochCredited: bigint;
  } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [estimatedRemaining, setEstimatedRemaining] = useState<number | null>(null);

  // Timer for elapsed time
  useEffect(() => {
    if (!txHash) return;
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [txHash]);

  // Update estimated remaining time based on status
  useEffect(() => {
    if (creditStatus === "confirming") {
      // ~12s per block, 3 confirmations
      setEstimatedRemaining(Math.max(0, SEPOLIA_CONFIRMATIONS * 12 - elapsedSeconds));
    } else if (creditStatus === "attestation_wait") {
      // ~60s attestation window
      const confirmTime = SEPOLIA_CONFIRMATIONS * 12;
      setEstimatedRemaining(Math.max(0, confirmTime + ATTESTATION_WINDOW_SECONDS - elapsedSeconds));
    } else if (creditStatus === "proof_generating" || creditStatus === "submitting") {
      // ~30s for proof + submit
      const priorTime = SEPOLIA_CONFIRMATIONS * 12 + ATTESTATION_WINDOW_SECONDS;
      setEstimatedRemaining(Math.max(0, priorTime + 30 - elapsedSeconds));
    } else {
      setEstimatedRemaining(null);
    }
  }, [creditStatus, elapsedSeconds]);

  useEffect(() => {
    if (!txHash || !minerAddress || !config.uscMiningCreditAddress) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 60; // ~5 minutes with 5s intervals

    // Simulate status progression
    const progressStatus = () => {
      if (cancelled) return;

      // Progress through stages based on time
      if (elapsedSeconds < SEPOLIA_CONFIRMATIONS * 12) {
        setCreditStatus("confirming");
      } else if (elapsedSeconds < SEPOLIA_CONFIRMATIONS * 12 + ATTESTATION_WINDOW_SECONDS) {
        setCreditStatus("attestation_wait");
      } else if (elapsedSeconds < SEPOLIA_CONFIRMATIONS * 12 + ATTESTATION_WINDOW_SECONDS + 15) {
        setCreditStatus("proof_generating");
      } else {
        setCreditStatus("submitting");
      }
    };

    const checkCredit = async () => {
      if (cancelled) return;

      progressStatus();

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

    // Start checking after a short delay
    setCreditStatus("confirming");
    const timeout = setTimeout(checkCredit, 5000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [txHash, minerAddress, elapsedSeconds]);

  if (!txHash) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const isStageComplete = (stage: CreditStatus) => {
    const stages: CreditStatus[] = [
      "pending",
      "confirming",
      "attestation_wait",
      "proof_generating",
      "submitting",
      "credited",
    ];
    const currentIndex = stages.indexOf(creditStatus);
    const stageIndex = stages.indexOf(stage);
    return currentIndex > stageIndex || creditStatus === "credited";
  };

  const isStageActive = (stage: CreditStatus) => creditStatus === stage;

  return (
    <div className="status-display">
      <h3>Credit Status</h3>

      {estimatedRemaining !== null && creditStatus !== "credited" && creditStatus !== "not_found" && (
        <div className="time-estimate">
          <span className="elapsed">Elapsed: {formatTime(elapsedSeconds)}</span>
          <span className="remaining">~{formatTime(estimatedRemaining)} remaining</span>
        </div>
      )}

      <div className="status-timeline">
        {/* Step 1: Mined on Sepolia */}
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

        {/* Step 2: Confirmations */}
        <div className={`timeline-item ${isStageComplete("confirming") ? "completed" : isStageActive("confirming") ? "active" : ""}`}>
          <div className="dot"></div>
          <div className="content">
            <span className="title">Waiting for Confirmations</span>
            {isStageActive("confirming") && (
              <span className="status-detail">
                <span className="spinner-sm"></span>
                <span className="text-muted">{SEPOLIA_CONFIRMATIONS} confirmations required</span>
              </span>
            )}
            {isStageComplete("confirming") && <span className="text-success">Confirmed</span>}
          </div>
        </div>

        {/* Step 3: Attestation Window */}
        <div className={`timeline-item ${isStageComplete("attestation_wait") ? "completed" : isStageActive("attestation_wait") ? "active" : ""}`}>
          <div className="dot"></div>
          <div className="content">
            <span className="title">USC Attestation Window</span>
            {isStageActive("attestation_wait") && (
              <span className="status-detail">
                <span className="spinner-sm"></span>
                <span className="text-muted">Waiting for USC to attest Sepolia block (~{ATTESTATION_WINDOW_SECONDS}s)</span>
              </span>
            )}
            {isStageComplete("attestation_wait") && <span className="text-success">Attested</span>}
          </div>
        </div>

        {/* Step 4: Proof Generation */}
        <div className={`timeline-item ${isStageComplete("proof_generating") ? "completed" : isStageActive("proof_generating") ? "active" : ""}`}>
          <div className="dot"></div>
          <div className="content">
            <span className="title">Generating Proof</span>
            {isStageActive("proof_generating") && (
              <span className="status-detail">
                <span className="spinner-sm"></span>
                <span className="text-muted">Worker building merkle + continuity proof</span>
              </span>
            )}
            {isStageComplete("proof_generating") && <span className="text-success">Ready</span>}
          </div>
        </div>

        {/* Step 5: Submitting to USC */}
        <div className={`timeline-item ${isStageComplete("submitting") ? "completed" : isStageActive("submitting") ? "active" : ""}`}>
          <div className="dot"></div>
          <div className="content">
            <span className="title">Submitting to Creditcoin USC</span>
            {isStageActive("submitting") && (
              <span className="status-detail">
                <span className="spinner-sm"></span>
                <span className="text-muted">recordMiningFromQuery tx pending...</span>
              </span>
            )}
          </div>
        </div>

        {/* Step 6: Credited */}
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

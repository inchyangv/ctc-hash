"use client";

import { config } from "../config";

type MiningState = {
  epoch: bigint;
  challenge: string;
  target: bigint;
  lastSolvedEpoch: bigint;
};

type MiningStatus = "idle" | "loading" | "mining" | "submitting" | "success" | "error";

type Props = {
  miningState: MiningState | null;
  status: MiningStatus;
  foundNonce: bigint | null;
  txHash: string | null;
  error: string | null;
  hashRate: number;
  canMine: boolean;
  onStartMining: () => void;
  onStopMining: () => void;
  onRefresh: () => void;
};

export function MiningPanel({
  miningState,
  status,
  foundNonce,
  txHash,
  error,
  hashRate,
  canMine,
  onStartMining,
  onStopMining,
  onRefresh,
}: Props) {
  const formatTarget = (target: bigint) => {
    const hex = target.toString(16).padStart(64, "0");
    const leadingZeros = hex.match(/^0*/)?.[0].length || 0;
    return `Difficulty: ${leadingZeros} leading zeros`;
  };

  return (
    <div className="mining-panel">
      <div className="panel-header">
        <h2>Mining Panel</h2>
        <button onClick={onRefresh} className="btn btn-secondary btn-sm" disabled={status === "loading"}>
          Refresh
        </button>
      </div>

      <div className="contract-info">
        <div className="info-row">
          <span className="label">Contract:</span>
          <a
            href={`https://sepolia.etherscan.io/address/${config.sepoliaMiningEventAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="link"
          >
            {config.sepoliaMiningEventAddress?.slice(0, 10)}...
          </a>
        </div>
      </div>

      {status === "loading" && <p className="status-text">Loading contract state...</p>}

      {miningState && (
        <div className="mining-state">
          <div className="info-row">
            <span className="label">Epoch:</span>
            <span className="value">{miningState.epoch.toString()}</span>
          </div>
          <div className="info-row">
            <span className="label">Challenge:</span>
            <span className="value mono">{miningState.challenge.slice(0, 18)}...</span>
          </div>
          <div className="info-row">
            <span className="label">{formatTarget(miningState.target)}</span>
          </div>
          <div className="info-row">
            <span className="label">Your Status:</span>
            <span className={`value ${canMine ? "text-success" : "text-warning"}`}>
              {canMine ? "Ready to mine" : `Already solved epoch ${miningState.lastSolvedEpoch.toString()}`}
            </span>
          </div>
        </div>
      )}

      <div className="mining-controls">
        {status === "idle" && canMine && (
          <button onClick={onStartMining} className="btn btn-primary btn-lg">
            Start Mining
          </button>
        )}

        {status === "mining" && (
          <>
            <div className="mining-progress">
              <div className="spinner"></div>
              <span>Mining... {hashRate.toLocaleString()} H/s</span>
            </div>
            <button onClick={onStopMining} className="btn btn-danger">
              Stop
            </button>
          </>
        )}

        {status === "submitting" && (
          <div className="mining-progress">
            <div className="spinner"></div>
            <span>Submitting transaction...</span>
          </div>
        )}

        {status === "success" && txHash && (
          <div className="success-message">
            <p>Mining successful!</p>
            <p>Nonce: {foundNonce?.toString()}</p>
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              View on Etherscan
            </a>
          </div>
        )}

        {status === "error" && (
          <div className="error-message">
            <p>Error: {error}</p>
            <button onClick={onRefresh} className="btn btn-secondary">
              Try Again
            </button>
          </div>
        )}

        {!canMine && status === "idle" && (
          <p className="info-text">
            You have already mined this epoch. Wait for the challenge to rotate.
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { BrowserProvider, Contract, Signer, keccak256, toUtf8Bytes } from "ethers";
import { MINING_EVENT_ABI } from "../lib/abi";
import { config } from "../config";

type Props = {
  signer: Signer | null;
  address: string | null;
};

type ContractState = {
  epoch: bigint;
  challenge: string;
  target: bigint;
  owner: string;
};

export function AdminPanel({ signer, address }: Props) {
  const [contractState, setContractState] = useState<ContractState | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [txPending, setTxPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [newChallengeSeed, setNewChallengeSeed] = useState("");
  const [newDifficulty, setNewDifficulty] = useState("");
  const [presetDifficulty, setPresetDifficulty] = useState<string>("");

  // Difficulty presets (number of leading zeros in hex)
  const difficultyPresets = [
    { label: "Very Easy (2 zeros)", zeros: 2 },
    { label: "Easy (3 zeros)", zeros: 3 },
    { label: "Medium (4 zeros)", zeros: 4 },
    { label: "Hard (5 zeros)", zeros: 5 },
    { label: "Very Hard (6 zeros)", zeros: 6 },
  ];

  const loadContractState = async () => {
    if (!config.sepoliaMiningEventAddress) return;

    try {
      setLoading(true);
      setError(null);

      const provider = new BrowserProvider((window as any).ethereum);
      const contract = new Contract(
        config.sepoliaMiningEventAddress,
        MINING_EVENT_ABI,
        provider
      );

      const [epoch, challenge, target, owner] = await Promise.all([
        contract.epoch(),
        contract.challenge(),
        contract.difficultyTarget(),
        contract.owner(),
      ]);

      setContractState({ epoch, challenge, target, owner });
      setIsOwner(address?.toLowerCase() === owner.toLowerCase());
    } catch (err: any) {
      setError(err.message || "Failed to load contract state");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContractState();
  }, [address]);

  const handleRotateChallenge = async () => {
    if (!signer || !newChallengeSeed) return;

    try {
      setTxPending(true);
      setError(null);
      setSuccess(null);

      const contract = new Contract(
        config.sepoliaMiningEventAddress!,
        MINING_EVENT_ABI,
        signer
      );

      const newChallenge = keccak256(toUtf8Bytes(newChallengeSeed));
      const tx = await contract.rotateChallenge(newChallenge);
      await tx.wait();

      setSuccess(`Challenge rotated! TX: ${tx.hash}`);
      setNewChallengeSeed("");
      await loadContractState();
    } catch (err: any) {
      setError(err.message || "Failed to rotate challenge");
    } finally {
      setTxPending(false);
    }
  };

  const handleSetDifficulty = async () => {
    if (!signer || !newDifficulty) return;

    try {
      setTxPending(true);
      setError(null);
      setSuccess(null);

      const contract = new Contract(
        config.sepoliaMiningEventAddress!,
        MINING_EVENT_ABI,
        signer
      );

      const tx = await contract.setDifficulty(newDifficulty);
      await tx.wait();

      setSuccess(`Difficulty updated! TX: ${tx.hash}`);
      setNewDifficulty("");
      setPresetDifficulty("");
      await loadContractState();
    } catch (err: any) {
      setError(err.message || "Failed to set difficulty");
    } finally {
      setTxPending(false);
    }
  };

  const handlePresetChange = (zeros: number) => {
    // Create a target with N leading zeros in hex (64 chars = 256 bits)
    // e.g., 2 zeros = 0x00FF...FF (254 bits of 1s)
    const hexValue = "f".repeat(64 - zeros).padStart(64, "0");
    const target = BigInt("0x" + hexValue).toString();
    setNewDifficulty(target);
    setPresetDifficulty(zeros.toString());
  };

  const formatTarget = (target: bigint) => {
    const hex = target.toString(16).padStart(64, "0");
    const leadingZeros = hex.match(/^0*/)?.[0].length || 0;
    return `${leadingZeros} leading zeros`;
  };

  if (loading) {
    return (
      <div className="admin-panel">
        <h2>Admin Panel</h2>
        <p className="status-text">Loading...</p>
      </div>
    );
  }

  if (!contractState) {
    return (
      <div className="admin-panel">
        <h2>Admin Panel</h2>
        <p className="error-message">Failed to load contract state</p>
      </div>
    );
  }

  return (
    <div className="admin-panel">
      <h2>Admin Panel</h2>

      <div className="admin-status">
        <div className={`owner-badge ${isOwner ? "is-owner" : ""}`}>
          {isOwner ? "You are the owner" : "View only (not owner)"}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="admin-section">
        <h3>Current State</h3>
        <div className="state-grid">
          <div className="state-item">
            <span className="state-label">Epoch</span>
            <span className="state-value">{contractState.epoch.toString()}</span>
          </div>
          <div className="state-item">
            <span className="state-label">Challenge</span>
            <span className="state-value mono">{contractState.challenge.slice(0, 18)}...</span>
          </div>
          <div className="state-item">
            <span className="state-label">Difficulty</span>
            <span className="state-value">{formatTarget(contractState.target)}</span>
          </div>
          <div className="state-item">
            <span className="state-label">Owner</span>
            <span className="state-value mono">{contractState.owner.slice(0, 10)}...</span>
          </div>
        </div>
      </div>

      {isOwner && (
        <>
          <div className="admin-section">
            <h3>Rotate Challenge</h3>
            <p className="section-desc">
              Increment epoch and set a new challenge. This allows all miners to mine again.
            </p>
            <div className="admin-form">
              <input
                type="text"
                value={newChallengeSeed}
                onChange={(e) => setNewChallengeSeed(e.target.value)}
                placeholder="Enter seed (will be hashed)"
                className="admin-input"
                disabled={txPending}
              />
              <button
                onClick={handleRotateChallenge}
                disabled={txPending || !newChallengeSeed}
                className="btn btn-warning"
              >
                {txPending ? "Processing..." : "Rotate Challenge"}
              </button>
            </div>
          </div>

          <div className="admin-section">
            <h3>Set Difficulty</h3>
            <p className="section-desc">
              Adjust the difficulty target. Smaller value = harder puzzle.
            </p>
            <div className="admin-form">
              <div className="preset-buttons">
                {difficultyPresets.map((preset) => (
                  <button
                    key={preset.zeros}
                    onClick={() => handlePresetChange(preset.zeros)}
                    className={`btn btn-sm ${presetDifficulty === preset.zeros.toString() ? "btn-primary" : "btn-secondary"}`}
                    disabled={txPending}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={newDifficulty}
                onChange={(e) => {
                  setNewDifficulty(e.target.value);
                  setPresetDifficulty("");
                }}
                placeholder="Custom target value (uint256)"
                className="admin-input"
                disabled={txPending}
              />
              <button
                onClick={handleSetDifficulty}
                disabled={txPending || !newDifficulty}
                className="btn btn-warning"
              >
                {txPending ? "Processing..." : "Set Difficulty"}
              </button>
            </div>
          </div>
        </>
      )}

      <button onClick={loadContractState} className="btn btn-secondary" disabled={loading}>
        Refresh
      </button>
    </div>
  );
}

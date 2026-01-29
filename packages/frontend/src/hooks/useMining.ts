"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Contract, keccak256, solidityPacked, JsonRpcSigner } from "ethers";
import { MINING_EVENT_ABI } from "../lib/abi";
import { config } from "../config";

type MiningState = {
  epoch: bigint;
  challenge: string;
  target: bigint;
  lastSolvedEpoch: bigint;
};

type MiningStatus = "idle" | "loading" | "mining" | "submitting" | "success" | "error";

export function useMining(signer: JsonRpcSigner | null, address: string | null) {
  const [miningState, setMiningState] = useState<MiningState | null>(null);
  const [status, setStatus] = useState<MiningStatus>("idle");
  const [foundNonce, setFoundNonce] = useState<bigint | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hashRate, setHashRate] = useState<number>(0);
  const miningRef = useRef(false);

  const contractAddress = config.sepoliaMiningEventAddress;

  const fetchMiningState = useCallback(async () => {
    if (!signer || !contractAddress) return;

    setStatus("loading");
    try {
      const contract = new Contract(contractAddress, MINING_EVENT_ABI, signer);

      const [epoch, challenge, target, lastSolved] = await Promise.all([
        contract.epoch(),
        contract.challenge(),
        contract.difficultyTarget(),
        address ? contract.lastSolvedEpoch(address) : Promise.resolve(0n),
      ]);

      setMiningState({
        epoch: BigInt(epoch),
        challenge: challenge,
        target: BigInt(target),
        lastSolvedEpoch: BigInt(lastSolved),
      });
      setStatus("idle");
    } catch (err) {
      console.error("Failed to fetch mining state:", err);
      setError("Failed to fetch contract state");
      setStatus("error");
    }
  }, [signer, contractAddress, address]);

  const canMine = miningState
    ? miningState.lastSolvedEpoch < miningState.epoch
    : false;

  const startMining = useCallback(async () => {
    if (!miningState || !address) return;

    miningRef.current = true;
    setStatus("mining");
    setFoundNonce(null);
    setTxHash(null);
    setError(null);

    const { challenge, epoch, target } = miningState;

    let nonce = 0n;
    const batchSize = 10000;
    let lastTime = Date.now();
    let hashCount = 0;

    const mine = () => {
      if (!miningRef.current) return;

      for (let i = 0; i < batchSize; i++) {
        const packed = solidityPacked(
          ["bytes32", "uint64", "address", "uint256"],
          [challenge, epoch, address, nonce]
        );
        const digest = keccak256(packed);
        const digestNum = BigInt(digest);

        if (digestNum < target) {
          setFoundNonce(nonce);
          miningRef.current = false;
          return;
        }
        nonce++;
        hashCount++;
      }

      const now = Date.now();
      if (now - lastTime >= 1000) {
        setHashRate(Math.round(hashCount / ((now - lastTime) / 1000)));
        hashCount = 0;
        lastTime = now;
      }

      setTimeout(mine, 0);
    };

    mine();
  }, [miningState, address]);

  const stopMining = useCallback(() => {
    miningRef.current = false;
    setStatus("idle");
    setHashRate(0);
  }, []);

  const submitMining = useCallback(async () => {
    if (!signer || !foundNonce || !contractAddress) return;

    setStatus("submitting");
    try {
      const contract = new Contract(contractAddress, MINING_EVENT_ABI, signer);
      const tx = await contract.mine(foundNonce);
      setTxHash(tx.hash);

      await tx.wait();
      setStatus("success");

      await fetchMiningState();
    } catch (err) {
      console.error("Failed to submit mining tx:", err);
      setError("Transaction failed");
      setStatus("error");
    }
  }, [signer, foundNonce, contractAddress, fetchMiningState]);

  useEffect(() => {
    if (signer && contractAddress) {
      fetchMiningState();
    }
  }, [signer, contractAddress, fetchMiningState]);

  useEffect(() => {
    if (foundNonce !== null && status === "mining") {
      submitMining();
    }
  }, [foundNonce, status, submitMining]);

  return {
    miningState,
    status,
    foundNonce,
    txHash,
    error,
    hashRate,
    canMine,
    startMining,
    stopMining,
    refresh: fetchMiningState,
  };
}

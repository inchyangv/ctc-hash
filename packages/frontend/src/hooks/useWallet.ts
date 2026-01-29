"use client";

import { useState, useEffect, useCallback } from "react";
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { config } from "../config";

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

type WalletState = {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
};

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    isCorrectNetwork: false,
    provider: null,
    signer: null,
  });
  const [isConnecting, setIsConnecting] = useState(false);

  const updateState = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.listAccounts();

      if (accounts.length > 0) {
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);

        setState({
          address,
          chainId,
          isConnected: true,
          isCorrectNetwork: chainId === config.sepoliaChainId,
          provider,
          signer,
        });
      } else {
        setState({
          address: null,
          chainId: null,
          isConnected: false,
          isCorrectNetwork: false,
          provider: null,
          signer: null,
        });
      }
    } catch (err) {
      console.error("Failed to update wallet state:", err);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask!");
      return;
    }

    setIsConnecting(true);
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await updateState();
    } catch (err) {
      console.error("Failed to connect:", err);
    } finally {
      setIsConnecting(false);
    }
  }, [updateState]);

  const switchToSepolia = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${config.sepoliaChainId.toString(16)}` }],
      });
    } catch (err: unknown) {
      const error = err as { code?: number };
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: `0x${config.sepoliaChainId.toString(16)}`,
                chainName: "Sepolia Testnet",
                nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
                rpcUrls: ["https://rpc.sepolia.org"],
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        } catch (addErr) {
          console.error("Failed to add Sepolia network:", addErr);
        }
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      chainId: null,
      isConnected: false,
      isCorrectNetwork: false,
      provider: null,
      signer: null,
    });
  }, []);

  useEffect(() => {
    updateState();

    const handleAccountsChanged = () => updateState();
    const handleChainChanged = () => updateState();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        window.ethereum!.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum!.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, [updateState]);

  return {
    ...state,
    isConnecting,
    connect,
    disconnect,
    switchToSepolia,
  };
}

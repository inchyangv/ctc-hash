"use client";

import Link from "next/link";
import { useWallet } from "../hooks/useWallet";
import { useMining } from "../hooks/useMining";
import { WalletConnect } from "../components/WalletConnect";
import { MiningPanel } from "../components/MiningPanel";
import { StatusDisplay } from "../components/StatusDisplay";
import "./globals.css";

export default function Home() {
  const wallet = useWallet();
  const mining = useMining(wallet.signer, wallet.address);

  return (
    <div className="container">
      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h1>Minder Credit - Mining Demo</h1>
          <Link href="/scoreboard" className="btn btn-secondary btn-sm">
            Scoreboard
          </Link>
          <Link href="/admin" className="btn btn-secondary btn-sm">
            Admin
          </Link>
        </div>
        <WalletConnect
          address={wallet.address}
          isConnected={wallet.isConnected}
          isConnecting={wallet.isConnecting}
          isCorrectNetwork={wallet.isCorrectNetwork}
          chainId={wallet.chainId}
          onConnect={wallet.connect}
          onDisconnect={wallet.disconnect}
          onSwitchNetwork={wallet.switchToSepolia}
        />
      </header>

      <main>
        {!wallet.isConnected ? (
          <div className="mining-panel">
            <p className="status-text">Connect your wallet to start mining</p>
          </div>
        ) : !wallet.isCorrectNetwork ? (
          <div className="mining-panel">
            <p className="status-text">Please switch to Sepolia network</p>
          </div>
        ) : (
          <>
            <MiningPanel
              miningState={mining.miningState}
              status={mining.status}
              foundNonce={mining.foundNonce}
              txHash={mining.txHash}
              error={mining.error}
              hashRate={mining.hashRate}
              canMine={mining.canMine}
              onStartMining={mining.startMining}
              onStopMining={mining.stopMining}
              onRefresh={mining.refresh}
            />

            <StatusDisplay
              txHash={mining.txHash}
              minerAddress={wallet.address}
            />
          </>
        )}
      </main>
    </div>
  );
}

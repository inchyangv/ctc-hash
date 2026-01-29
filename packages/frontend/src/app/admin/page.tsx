"use client";

import Link from "next/link";
import { useWallet } from "../../hooks/useWallet";
import { WalletConnect } from "../../components/WalletConnect";
import { AdminPanel } from "../../components/AdminPanel";
import "../globals.css";

export default function AdminPage() {
  const wallet = useWallet();

  return (
    <div className="container">
      <header className="header">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <h1>Minder Credit - Admin</h1>
          <Link href="/" className="btn btn-secondary btn-sm">
            Back to Mining
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
            <p className="status-text">Connect your wallet to access admin panel</p>
          </div>
        ) : !wallet.isCorrectNetwork ? (
          <div className="mining-panel">
            <p className="status-text">Please switch to Sepolia network</p>
          </div>
        ) : (
          <AdminPanel signer={wallet.signer} address={wallet.address} />
        )}
      </main>
    </div>
  );
}

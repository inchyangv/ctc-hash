"use client";

type Props = {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  isCorrectNetwork: boolean;
  chainId: number | null;
  onConnect: () => void;
  onDisconnect: () => void;
  onSwitchNetwork: () => void;
};

export function WalletConnect({
  address,
  isConnected,
  isConnecting,
  isCorrectNetwork,
  chainId,
  onConnect,
  onDisconnect,
  onSwitchNetwork,
}: Props) {
  if (!isConnected) {
    return (
      <button
        onClick={onConnect}
        disabled={isConnecting}
        className="btn btn-primary"
      >
        {isConnecting ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  return (
    <div className="wallet-info">
      <div className="address">
        {address?.slice(0, 6)}...{address?.slice(-4)}
      </div>
      <div className="chain">
        {isCorrectNetwork ? (
          <span className="badge badge-success">Sepolia</span>
        ) : (
          <button onClick={onSwitchNetwork} className="btn btn-warning btn-sm">
            Switch to Sepolia (current: {chainId})
          </button>
        )}
      </div>
      <button onClick={onDisconnect} className="btn btn-secondary btn-sm">
        Disconnect
      </button>
    </div>
  );
}

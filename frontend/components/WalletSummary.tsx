import React from 'react';

interface WalletSummaryProps {
  address: string;
  ethBalance: string;
  mstBalance: string;
}

export const WalletSummary: React.FC<WalletSummaryProps> = ({
  address,
  ethBalance,
  mstBalance,
}) => {
  return (
    <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs">
      <div className="flex flex-col">
        <span className="font-mono text-neutral-300 font-medium">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <span className="text-neutral-500 text-[10px]">
          {ethBalance} ETH • {mstBalance} MST
        </span>
      </div>
    </div>
  );
};

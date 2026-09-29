import React from 'react';

interface LivePillProps {
  label?: string;
  pulse?: boolean;
  className?: string;
}

export const LivePill: React.FC<LivePillProps> = ({
  label = 'LIVE',
  pulse = true,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full bg-red-500 ${pulse ? 'animate-ping' : ''}`}
      />
      {label}
    </span>
  );
};

import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  className?: string;
}

export const RoundProgressBar: React.FC<ProgressBarProps> = ({
  current,
  total,
  className = '',
}) => {
  const percentage = Math.min(Math.max((current / Math.max(total, 1)) * 100, 0), 100);

  return (
    <div className={`w-full bg-neutral-800 rounded-full h-2 overflow-hidden ${className}`}>
      <div
        className="bg-gradient-to-r from-red-600 to-rose-500 h-2 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

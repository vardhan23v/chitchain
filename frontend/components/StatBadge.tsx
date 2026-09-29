import React from 'react';

interface StatBadgeProps {
  label: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
}

export const StatBadge: React.FC<StatBadgeProps> = ({
  label,
  value,
  change,
  isPositive,
}) => {
  return (
    <div className="flex flex-col p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
      <span className="text-xs text-neutral-400 font-medium">{label}</span>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="text-lg font-semibold text-white tracking-tight">{value}</span>
        {change && (
          <span
            className={`text-xs font-medium ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  );
};

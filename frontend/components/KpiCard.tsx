import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
}) => {
  return (
    <div className="relative overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 backdrop-blur-sm transition-all hover:border-neutral-700">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">{title}</p>
        {icon && <div className="text-neutral-400">{icon}</div>}
      </div>
      <p className="mt-2 text-2xl font-bold text-white tracking-tight">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>}
    </div>
  );
};

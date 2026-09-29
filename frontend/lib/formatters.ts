export function formatEtherAmount(val: string | number | bigint, decimals = 4): string {
  const num = typeof val === 'bigint' ? Number(val) / 1e18 : Number(val);
  if (isNaN(num)) return '0.00';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

export function truncateAddress(address?: string, chars = 4): string {
  if (!address || address.length < 10) return address || '---';
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Ended';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    return `${hours}h ${mins % 60}m`;
  }
  return `${mins}m ${secs}s`;
}

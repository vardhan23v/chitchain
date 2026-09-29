import React, { useState, useEffect } from 'react';

export const NetworkStatus: React.FC = () => {
  const [latency, setLatency] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      const start = Date.now();
      fetch('/api/health')
        .then(() => setLatency(Date.now() - start))
        .catch(() => setLatency(null));
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-neutral-400">
      <span
        className={`w-2 h-2 rounded-full ${
          isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
        }`}
      />
      <span>{isOnline ? 'Sepolia Connected' : 'Offline'}</span>
      {latency !== null && (
        <span className="text-neutral-500 font-mono">({latency}ms)</span>
      )}
    </div>
  );
};

import React, { useState } from 'react';

interface CopyButtonProps {
  textToCopy: string;
  label?: string;
  className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  textToCopy,
  label = 'Copy',
  className = '',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition-colors ${className}`}
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <span className="text-emerald-400">✓</span>
          <span className="text-emerald-400 font-medium">Copied!</span>
        </>
      ) : (
        <>
          <span>📋</span>
          <span>{label}</span>
        </>
      )}
    </button>
  );
};

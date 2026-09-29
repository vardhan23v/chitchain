export const SUPPORTED_CHAINS = {
  SEPOLIA: {
    id: 11155111,
    name: 'Ethereum Sepolia',
    rpcUrl: 'https://rpc.sepolia.org',
    explorer: 'https://sepolia.etherscan.io',
    currency: 'ETH',
  },
  HARDHAT: {
    id: 31337,
    name: 'Hardhat Localhost',
    rpcUrl: 'http://127.0.0.1:8545',
    explorer: '',
    currency: 'ETH',
  },
} as const;

export const UI_LIMITS = {
  MAX_NAME_LENGTH: 32,
  MIN_MEMBERS: 2,
  MAX_MEMBERS: 20,
  POLL_INTERVAL_MS: 4000,
  TOAST_AUTO_CLOSE_MS: 5000,
} as const;

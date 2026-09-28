# ChitChain Security Policy

## Security Model & Core Invariants

ChitChain enforces mathematical and cryptographic security across decentralized Rotating Savings and Credit Associations (ROSCAs).

### Key Invariants
1. **Solvency Preservation**: The contract collateral and pot balances strictly equal or exceed liabilities at all times.
2. **One-Payout Guarantee**: In any given circle of $N$ rounds, each verified member can receive the winning pot at most once.
3. **No Zero-Address Settlement**: Rounds settled without active bids default cleanly to randomized eligible non-winners or rollover without loss of member funds.
4. **Reentrancy Immunity**: All state-mutating functions interacting with external ERC20 or native ETH calls adhere to the `Checks-Effects-Interactions` pattern and use OpenZeppelin `ReentrancyGuardUpgradeable`.

## Reporting Vulnerabilities

If you discover a security vulnerability within ChitChain contracts, API, or agent infrastructure, please do not file a public issue.

Send reports to:
- **Security Team**: security@chitchain.finance
- **Encrypted Contact**: GPG Key fingerprint available upon request.

We acknowledge receipt within 24 hours and provide continuous remediation status updates.

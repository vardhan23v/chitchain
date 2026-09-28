# Contributing to ChitChain

We welcome contributions from the community to make decentralized savings circles accessible, secure, and intelligent.

## Development Workflow

1. **Fork and Clone**:
   ```bash
   git clone https://github.com/vardhan23v/chitchain.git
   cd chitchain
   ```
2. **Install Root & Subproject Dependencies**:
   ```bash
   npm install
   cd backend && npm install && cd ..
   cd frontend && npm install && cd ..
   ```
3. **Run Local Hardhat Node**:
   ```bash
   npx hardhat node
   ```
4. **Deploy Contracts Locally**:
   ```bash
   npx hardhat run scripts/deploy.ts --network localhost
   ```

## Commit Conventions
We use Conventional Commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation updates
- `test:` Adding or updating tests
- `refactor:` Code refactoring without behavioral changes
- `perf:` Performance optimizations

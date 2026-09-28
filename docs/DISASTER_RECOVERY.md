# Disaster Recovery & Chain Reorganization Protocol

## RPC & Indexer Resilience
1. **RPC Fallback Cascade**:
   - Primary: Alchemy Sepolia
   - Secondary: Infura Sepolia
   - Tertiary: Public Node (rpc.sepolia.org)

2. **Block Reorganization Handling**:
   - The indexer processes events with a 2-block confirmation window.
   - If a reorg greater than 3 blocks is detected, the indexer triggers a delta rollback to `last_verified_block - 10`.

3. **Prisma State Reseed**:
   - If contract addresses update on redeploy, the backend indexer automatically wipes chain-derived tables while preserving user profiles and off-chain analytics.

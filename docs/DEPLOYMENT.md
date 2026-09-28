# Deployment & Infrastructure Guide

## Smart Contracts (Sepolia)
```bash
npx hardhat run scripts/deploy.ts --network sepolia
```
Record the contract address and verify on Etherscan:
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Backend Service (Railway)
1. Link GitHub repository to Railway project.
2. Set Root Directory to `/backend`.
3. Set environment variables: `DATABASE_URL`, `RPC_URL`, `CONTRACT_ADDRESS`, `PRIVATE_KEY`.

## AI Agent (Railway / Modal)
1. Set Root Directory to `/agent`.
2. Configure `GROQ_API_KEY`, `AGENT_PRIVATE_KEY`, `BACKEND_URL`.

## Frontend Web Application (Vercel)
1. Deploy from `/frontend` directory with Next.js preset.
2. Set `NEXT_PUBLIC_CONTRACT_ADDRESS` and `NEXT_PUBLIC_BACKEND_URL`.

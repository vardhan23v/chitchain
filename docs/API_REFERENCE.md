# ChitChain Backend API Reference

## Endpoints

| Method | Endpoint | Description | Cache TTL |
|---|---|---|---|
| `GET` | `/api/health` | Service health status and LLM connectivity | 5s |
| `GET` | `/api/circles` | List all tracked ROSCA circles | 2s |
| `GET` | `/api/circles/:id` | Get detailed state for a specific circle | 2s |
| `GET` | `/api/circles/:id/bids` | Get bid history for circle rounds | 2s |
| `POST` | `/api/agent/decide` | Request AI bidding agent evaluation | Realtime |
| `GET` | `/api/analytics/metrics` | Protocol-wide volume and stats | 10s |

### Example Response: `/api/health`
```json
{
  "status": "healthy",
  "blockNumber": 6819201,
  "dbConnected": true,
  "agentService": "online",
  "version": "2.1.0"
}
```

import express from "express";
import cors from "cors";
import { config } from "./config";
import { contractAddress, keeper, provider } from "./chain";
import { getLastBlock } from "./db";
import { startIndexer } from "./indexer";
import { startKeeper } from "./keeper";
import { startAutopilot } from "./autopilot";
import { planRound } from "./agent/bidder";
import { bus } from "./bus";
import { circles } from "./routes/circles";
import { feed } from "./routes/feed";
import { members } from "./routes/members";
import { agent } from "./routes/agent";
import { demo } from "./routes/demo";
import { errorMiddleware, wrap } from "./routes/util";

const app = express();
const origins = new Set([config.FRONTEND_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"]);
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || origins.has(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)),
}));
app.use(express.json({ limit: "64kb" }));
app.use((req, _res, next) => { if (req.method !== "GET") console.log(`[api] ${req.method} ${req.path}`); next(); });

app.get("/health", wrap(async (_req, res) => {
  let latestBlock: number | null = null;
  try { latestBlock = await provider.getBlockNumber(); } catch { /* rpc down */ }
  res.json({
    ok: latestBlock !== null, chainId: config.MST_CHAIN_ID, latestBlock, lastIndexedBlock: getLastBlock(),
    contract: contractAddress, keeper: keeper?.address ?? null, explorer: config.EXPLORER,
  });
}));
app.use(circles);
app.use(feed);
app.use(members);
app.use(agent);
app.use(demo);
app.use((_req, res) => { res.status(404).json({ error: "not found", code: "NOT_FOUND" }); });
app.use(errorMiddleware);

// A new round (CircleStarted / RoundSettled / keeper settle) → agent re-plans for every mandate in that circle.
bus.on("roundStarted", (circleId) => {
  planRound(circleId).catch((e) => console.error(`[agent] circle ${circleId}: ${e instanceof Error ? e.message : String(e)}`));
});

process.on("unhandledRejection", (e) => console.error(`[process] unhandled rejection: ${e instanceof Error ? e.stack ?? e.message : String(e)}`));
process.on("uncaughtException", (e) => console.error(`[process] uncaught exception: ${e.stack ?? e.message}`));

app.listen(config.PORT, () => {
  console.log(`[api] listening on http://localhost:${config.PORT} (chain ${config.MST_CHAIN_ID}, rpc ${config.MST_RPC_URL})`);
  startIndexer();
  startKeeper();
  startAutopilot();
});

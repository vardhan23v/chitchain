import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { cachedRead, contractAddress, keeper, provider, txStats } from "./chain";
import { getLastBlock, initDb } from "./db";
import { startIndexer } from "./indexer";
import { startKeeper } from "./keeper";
import { startAutopilot } from "./autopilot";
import { planRound } from "./agent/bidder";
import { users } from "./routes/users";
import { bus, loopStatus } from "./bus";
import { circles } from "./routes/circles";
import { feed } from "./routes/feed";
import { members } from "./routes/members";
import { agent } from "./routes/agent";
import { demo } from "./routes/demo";
import { auth } from "./routes/auth";
import { me } from "./routes/me";
import { organizer } from "./routes/organizer";
import { support } from "./routes/support";
import { admin } from "./routes/admin";
import { auction } from "./routes/auction";
import { aiBidding } from "./routes/aiBidding";
import { startAiBidding } from "./ai/loop";
import { ipOf, rateLimit } from "./auth/ratelimit";
import expressRateLimit from "express-rate-limit";
import { errorMiddleware, wrap } from "./routes/util";
import { demoWalletHealth } from "./demo/funding";
import { crewHealth } from "./ai/crewClient";

const app = express();
app.set("trust proxy", 1); // Railway / reverse proxy: req.ip = X-Forwarded-For (rate limits are per client IP)
// JSON API: no documents are served, so the CSP denies everything; CORP cross-origin lets the frontend origin read
// responses (CORS below still decides who may call). Nothing here touches text/event-stream (SSE keeps working).
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));
const origins = new Set([config.FRONTEND_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"]);
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || origins.has(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)),
}));
app.use(express.json({ limit: "64kb" }));
// App-wide per-IP limit in front of every route (express-rate-limit; `trust proxy` above makes req.ip the client IP).
// Generous because the UI polls several endpoints every few seconds and a demo room may share one Wi-Fi IP; the
// stricter per-route limits (auth, settle, usernames) still apply on top.
app.use(expressRateLimit({
  windowMs: 60_000,
  limit: 1200,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "too many requests, try again in a minute", code: "RATE_LIMITED" },
}));
app.use((req, _res, next) => { if (req.method !== "GET") console.log(`[api] ${req.method} ${req.path}`); next(); });

app.get("/health", wrap(async (_req, res) => {
  let latestBlock: number | null = null;
  try { latestBlock = await cachedRead("blockNumber", () => provider.getBlockNumber(), 5000); } catch { /* rpc down */ }
  const loops = loopStatus();
  const indexer = loops.find((l) => l.name === "indexer");
  const nowSec = Math.floor(Date.now() / 1000);
  const [demoHealth, crew] = await Promise.all([demoWalletHealth(), crewHealth()]);
  let llmHost: string | null = null;
  try { llmHost = new URL(config.LLM_BASE_URL).host; } catch { llmHost = null; }
  res.json({
    ok: latestBlock !== null, chainId: config.MST_CHAIN_ID, latestBlock, lastIndexedBlock: await getLastBlock(),
    contract: contractAddress, keeper: keeper?.address ?? null, explorer: config.EXPLORER,
    adminPasswordLogin: config.adminPasswordLogin,
    loops, tx: txStats(),
    indexerHealthy: !!indexer && indexer.lastOkAt !== null && nowSec - indexer.lastOkAt <= 30,
    demo: demoHealth,
    llm: { configured: config.LLM_API_KEY !== "", baseUrl: llmHost, model: config.LLM_MODEL },
    crew,
  });
}));
app.use("/auth", rateLimit({ perMinute: 60, keys: (req) => [`auth:${ipOf(req)}`] }));
app.use(auth);
app.use(circles);
app.use(feed);
app.use(members);
app.use(agent);
app.use(demo);
app.use(users); // usernames + public profiles (before `me`, which guards /me/*)
app.use(me);
app.use(organizer);
app.use(support);
app.use(admin);
app.use(auction);   // v4 public auction reads
app.use(aiBidding); // v4 autonomous AI bidding (SSE stream included)
app.use((_req, res) => { res.status(404).json({ error: "not found", code: "NOT_FOUND" }); });
app.use(errorMiddleware);

// v2.2: mandates only act once the recipient declined and the auction opened (FullPotDeclined / keeper sees the Auction phase).
bus.on("biddingPhase", (circleId) => {
  planRound(circleId, "bidding").catch((e) => console.error(`[agent] circle ${circleId} (bidding): ${e instanceof Error ? e.message : String(e)}`));
});

process.on("unhandledRejection", (e) => console.error(`[process] unhandled rejection: ${e instanceof Error ? e.stack ?? e.message : String(e)}`));
process.on("uncaughtException", (e) => console.error(`[process] uncaught exception: ${e.stack ?? e.message}`));

async function main(): Promise<void> {
  try {
    await initDb(); // fail fast on a bad DATABASE_URL; tables are created by `prisma db push` in `npm start`
    console.log("[db] connected");
  } catch (e) {
    console.error(`[db] cannot connect (check DATABASE_URL): ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
  app.listen(config.PORT, () => {
    console.log(`[api] listening on http://localhost:${config.PORT} (chain ${config.MST_CHAIN_ID}, rpc ${config.MST_RPC_URL})`);
    void startIndexer();
    startKeeper();
    startAutopilot();
    startAiBidding();
  });
}
void main();

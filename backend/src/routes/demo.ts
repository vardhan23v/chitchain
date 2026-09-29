import { Router } from "express";
import { parseEther } from "ethers";
import { z } from "zod";
import { contractAddress, contractAs, createCircleCall, DEFAULT_BPS, demoWallet, demoWallets, deployer, getCircle, getRiskTier, isConfigured, keeper, preflight, provider, readContract, sendTx } from "../chain";
import { addDemoCircle, countDistinctTx, findEvent, getSkip, latestDemoCircle, setSkip, upsertCircleMeta } from "../db";
import { audit } from "../auth/audit";
import { requireAuth, requireRole } from "../auth/middleware";
import { enqueueJoin, ensureFunded, joinQueueStatus } from "../autopilot";
import { ensureDemoFunding, underfundedReport } from "../demo/funding";
import { unassessedJoinCollateral, validateTierBps } from "../demo/params";
import { assessAndSetTier } from "./members";
import { ApiError, parseAddress, wrap } from "./util";
import { planRound } from "../agent/bidder";

export const demo = Router();
/** Every demo write is ADMIN-only (API.md v3 matrix); GET /demo/state stays public. */
const adminOnly = [requireAuth(), requireRole("ADMIN")];

function requireDemo(): void {
  if (!isConfigured()) throw new ApiError(503, "CHITCHAIN_ADDRESS not configured", "NO_CONTRACT");
  if (demoWallets.length === 0) throw new ApiError(503, "AGENT_WALLET_KEYS not configured", "NO_DEMO_WALLETS");
}
function requireDeployer(): void { if (!deployer) throw new ApiError(503, "DEPLOYER_PRIVATE_KEY not configured", "NO_DEPLOYER"); }

/** GET /demo/state — custodial demo wallets A–E with balance, on-chain tier and skip flag. */
demo.get("/demo/state", wrap(async (_req, res) => {
  const wallets = await Promise.all(demoWallets.map(async (w) => ({
    label: w.label, address: w.address,
    balance: (await provider.getBalance(w.address)).toString(),
    tier: isConfigured() ? await getRiskTier(w.address) : 0,
    skip: await getSkip(w.address),
    custodial: true as const, // custodial demo wallet — backend holds the key
  })));
  const [txCount, circleId] = await Promise.all([countDistinctTx(), latestDemoCircle()]);
  res.json({ wallets, txCount, contract: contractAddress, circleId, joinQueue: joinQueueStatus(), underfunded: underfundedReport()?.wallets ?? [] });
}));

/** POST /demo/fund — top up every demo wallet below 0.3 MST to 0.6 MST from the deployer (skips when the deployer cannot afford it). */
demo.post("/demo/fund", ...adminOnly, wrap(async (req, res) => {
  requireDemo(); requireDeployer();
  const txHashes: string[] = [];
  for (const w of demoWallets) {
    const h = await ensureFunded(w.address);
    if (h) txHashes.push(h);
  }
  audit(req, "demo.fund", null, "ok", { meta: { txHashes } });
  res.json({ txHashes });
}));

/** POST /demo/assess-all — score + setRiskTier for A–E. */
demo.post("/demo/assess-all", ...adminOnly, wrap(async (req, res) => {
  requireDemo();
  const force = ["1", "true", "yes"].includes(String(req.query.force ?? "").toLowerCase());
  const results = [];
  for (const w of demoWallets) results.push(await assessAndSetTier(w.address, force));
  audit(req, "demo.assess-all", null, "ok", { meta: { force, tiers: results.map((r) => ({ address: r.address, tier: r.tier, txHash: r.txHash })) } });
  res.json({ results });
}));

const skipBody = z.object({ address: z.string(), skip: z.boolean() });
demo.post("/demo/skip", ...adminOnly, wrap(async (req, res) => {
  const parsed = skipBody.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "body must be { address, skip: boolean }", "BAD_BODY");
  const address = parseAddress(parsed.data.address);
  if (!demoWallet(address)) throw new ApiError(400, "not a demo wallet", "NOT_DEMO_WALLET");
  await setSkip(address, parsed.data.skip);
  console.log(`[demo] skip ${demoWallet(address)?.label} = ${parsed.data.skip}`);
  audit(req, "demo.skip", address.toLowerCase(), "ok", { meta: { skip: parsed.data.skip, label: demoWallet(address)?.label } });
  res.json({ ok: true });
}));

const newCircleBody = z.object({
  contributionDuration: z.coerce.number().int().min(10).max(86_400).default(30),
  biddingDuration: z.coerce.number().int().min(10).max(86_400).default(30),
  contribution: z.string().default("0.1"),
  holdbackBps: z.coerce.number().int().min(0).max(10_000).default(DEFAULT_BPS.holdbackBps),
  maxDiscountBps: z.coerce.number().int().min(0).max(5000).default(DEFAULT_BPS.maxDiscountBps),
  // tier collateral multipliers; the contract only enforces ordering, the backend additionally rejects 0 (see demo/params.ts)
  lowBps: z.coerce.number().int().default(DEFAULT_BPS.lowBps),
  mediumBps: z.coerce.number().int().default(DEFAULT_BPS.mediumBps),
  highBps: z.coerce.number().int().default(DEFAULT_BPS.highBps),
});
/**
 * POST /demo/new-circle — validate, pre-check funding for ALL demo wallets (deployer top-up first; 409 DEMO_UNDERFUNDED
 * and no circle when it cannot cover), then createCircle(CircleParams) from the deployer and respond at once with
 * { circleId, txHash, joining: true }. The joins run in the background (autopilot join queue, 3 tries per wallet).
 */
demo.post("/demo/new-circle", ...adminOnly, wrap(async (req, res) => {
  requireDemo(); requireDeployer();
  const parsed = newCircleBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new ApiError(400, "body: { contributionDuration?: number (>=10), biddingDuration?: number (>=10), contribution?: string (MST), holdbackBps?: number, maxDiscountBps?: number, lowBps?, mediumBps?, highBps? (all > 0) }", "BAD_BODY");
  }
  let contribution: bigint;
  try { contribution = parseEther(parsed.data.contribution); } catch { throw new ApiError(400, "invalid contribution", "BAD_BODY"); }
  if (contribution <= 0n) throw new ApiError(400, "contribution must be > 0", "BAD_BODY");
  const tierError = validateTierBps(parsed.data);
  if (tierError) throw new ApiError(400, tierError, "BAD_TIER_BPS");
  const members = Math.max(demoWallets.length, 2);

  // Every demo wallet joins unassessed → pays the High multiplier. Check (and top up) before touching the chain.
  const collateral = unassessedJoinCollateral(contribution, parsed.data.highBps);
  const underfunded = await ensureDemoFunding(collateral);
  if (underfunded) {
    audit(req, "demo.new-circle", null, "denied", { meta: { reason: "DEMO_UNDERFUNDED", wallets: underfunded.wallets, deployer: underfunded.deployer } });
    res.status(409).json({ error: "demo wallets are underfunded and the deployer cannot cover the shortfall — claim testnet MST from the faucet", ...underfunded });
    return;
  }

  const rc = await sendTx("demo createCircle", deployer!, () => createCircleCall(deployer!, {
    contribution, baseCollateral: contribution, maxMembers: members,
    contributionDuration: parsed.data.contributionDuration, biddingDuration: parsed.data.biddingDuration, joinWindow: 1800,
    feeBps: DEFAULT_BPS.feeBps, holdbackBps: parsed.data.holdbackBps, maxDiscountBps: parsed.data.maxDiscountBps,
    lowBps: parsed.data.lowBps, mediumBps: parsed.data.mediumBps, highBps: parsed.data.highBps,
  }));
  const iface = readContract().interface;
  let circleId: number | null = null;
  for (const log of rc.logs) {
    try {
      const p = iface.parseLog({ topics: [...log.topics], data: log.data });
      if (p?.name === "CircleCreated") { circleId = Number(p.args.circleId); break; }
    } catch { /* not ours */ }
  }
  if (circleId === null) {
    const ev = await findEvent("CircleCreated", rc.hash);
    if (ev) circleId = Number((JSON.parse(ev.args_json) as { circleId: number }).circleId);
  }
  if (circleId === null) throw new ApiError(500, "CircleCreated event not found", "NO_EVENT");
  await addDemoCircle(circleId);
  await upsertCircleMeta(circleId, { name: `Demo circle #${circleId}`, organizerWallet: deployer!.address, demo: true });
  audit(req, "demo.new-circle", `circle:${circleId}`, "ok", { txHash: rc.hash, meta: { contribution: contribution.toString(), members, collateral: collateral.toString() } });
  console.log(`[demo] circle ${circleId} created txHash ${rc.hash}; queueing joins for ${demoWallets.length} demo wallets`);
  enqueueJoin(circleId); // background: per-wallet retries + audit rows; progress in GET /demo/state.joinQueue
  void planRound(circleId).catch((e) => console.error(`[agent] plan after new circle: ${e instanceof Error ? e.message : String(e)}`));
  res.json({ circleId, txHash: rc.hash, joining: true });
}));

const cancelBody = z.object({ circleId: z.coerce.number().int().positive() });
/** POST /demo/cancel { circleId } — contract cancel(circleId) from the keeper for a circle stuck Open past its join deadline. */
demo.post("/demo/cancel", ...adminOnly, wrap(async (req, res) => {
  requireDemo();
  if (!keeper) throw new ApiError(503, "KEEPER_PRIVATE_KEY not configured", "NO_KEEPER");
  const parsed = cancelBody.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "body must be { circleId }", "BAD_BODY");
  const { circleId } = parsed.data;
  const c = await getCircle(circleId);
  if (c.status !== 0) throw new ApiError(409, "circle is not Open", "NOT_OPEN");
  if (Math.floor(Date.now() / 1000) <= c.joinDeadline) throw new ApiError(409, `join window still open until ${c.joinDeadline}`, "JOIN_WINDOW_STILL_OPEN");
  const contract = contractAs(keeper);
  await preflight(contract, "cancel", [circleId]);
  let rc;
  try {
    rc = await sendTx(`demo cancel circle ${circleId}`, keeper, () => contract.cancel(circleId));
  } catch (e) {
    audit(req, "demo.cancel", `circle:${circleId}`, "failed", { meta: { error: e instanceof Error ? e.message.slice(0, 300) : String(e) } });
    throw e;
  }
  audit(req, "demo.cancel", `circle:${circleId}`, "ok", { txHash: rc.hash, meta: { joinDeadline: c.joinDeadline, memberCount: c.memberCount } });
  res.json({ txHash: rc.hash });
}));

const withdrawBody = z.object({ address: z.string(), circleId: z.coerce.number().int().positive() });
demo.post("/demo/withdraw", ...adminOnly, wrap(async (req, res) => {
  requireDemo();
  const parsed = withdrawBody.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "body must be { address, circleId }", "BAD_BODY");
  const w = demoWallet(parseAddress(parsed.data.address));
  if (!w) throw new ApiError(400, "not a demo wallet", "NOT_DEMO_WALLET");
  const contract = contractAs(w.wallet); // custodial demo wallet
  await preflight(contract, "withdraw", [parsed.data.circleId]);
  const rc = await sendTx(`demo withdraw ${w.label} circle ${parsed.data.circleId}`, w.wallet, () => contract.withdraw(parsed.data.circleId));
  audit(req, "demo.withdraw", `circle:${parsed.data.circleId}`, "ok", { txHash: rc.hash, meta: { address: w.address, label: w.label } });
  res.json({ txHash: rc.hash });
}));

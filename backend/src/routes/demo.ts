import { Router } from "express";
import { parseEther } from "ethers";
import { z } from "zod";
import { contractAddress, contractAs, createCircleCall, DEFAULT_BPS, demoWallet, demoWallets, deployer, getRiskTier, isConfigured, preflight, provider, readContract, sendTx } from "../chain";
import { addDemoCircle, countDistinctTx, findEvent, getSkip, latestDemoCircle, setSkip } from "../db";
import { ensureFunded, joinAll } from "../autopilot";
import { assessAndSetTier } from "./members";
import { ApiError, parseAddress, wrap } from "./util";
import { planRound } from "../agent/bidder";

export const demo = Router();

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
  res.json({ wallets, txCount, contract: contractAddress, circleId });
}));

/** POST /demo/fund — top up every demo wallet below 0.3 MST to 0.6 MST from the deployer (skips when the deployer cannot afford it). */
demo.post("/demo/fund", wrap(async (_req, res) => {
  requireDemo(); requireDeployer();
  const txHashes: string[] = [];
  for (const w of demoWallets) {
    const h = await ensureFunded(w.address);
    if (h) txHashes.push(h);
  }
  res.json({ txHashes });
}));

/** POST /demo/assess-all — score + setRiskTier for A–E. */
demo.post("/demo/assess-all", wrap(async (req, res) => {
  requireDemo();
  const force = ["1", "true", "yes"].includes(String(req.query.force ?? "").toLowerCase());
  const results = [];
  for (const w of demoWallets) results.push(await assessAndSetTier(w.address, force));
  res.json({ results });
}));

const skipBody = z.object({ address: z.string(), skip: z.boolean() });
demo.post("/demo/skip", wrap(async (req, res) => {
  const parsed = skipBody.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "body must be { address, skip: boolean }", "BAD_BODY");
  const address = parseAddress(parsed.data.address);
  if (!demoWallet(address)) throw new ApiError(400, "not a demo wallet", "NOT_DEMO_WALLET");
  await setSkip(address, parsed.data.skip);
  console.log(`[demo] skip ${demoWallet(address)?.label} = ${parsed.data.skip}`);
  res.json({ ok: true });
}));

const newCircleBody = z.object({
  contributionDuration: z.coerce.number().int().min(10).max(86_400).default(30),
  biddingDuration: z.coerce.number().int().min(10).max(86_400).default(30),
  contribution: z.string().default("0.1"),
  holdbackBps: z.coerce.number().int().min(0).max(10_000).default(DEFAULT_BPS.holdbackBps),
  maxDiscountBps: z.coerce.number().int().min(0).max(5000).default(DEFAULT_BPS.maxDiscountBps),
});
/** POST /demo/new-circle — createCircle(CircleParams) from the deployer, then join all 5 demo wallets. */
demo.post("/demo/new-circle", wrap(async (req, res) => {
  requireDemo(); requireDeployer();
  const parsed = newCircleBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    throw new ApiError(400, "body: { contributionDuration?: number (>=10), biddingDuration?: number (>=10), contribution?: string (MST), holdbackBps?: number, maxDiscountBps?: number }", "BAD_BODY");
  }
  let contribution: bigint;
  try { contribution = parseEther(parsed.data.contribution); } catch { throw new ApiError(400, "invalid contribution", "BAD_BODY"); }
  if (contribution <= 0n) throw new ApiError(400, "contribution must be > 0", "BAD_BODY");
  const members = Math.max(demoWallets.length, 3);

  const rc = await sendTx("demo createCircle", deployer!, () => createCircleCall(deployer!, {
    contribution, baseCollateral: contribution, maxMembers: members,
    contributionDuration: parsed.data.contributionDuration, biddingDuration: parsed.data.biddingDuration, joinWindow: 1800,
    feeBps: DEFAULT_BPS.feeBps, holdbackBps: parsed.data.holdbackBps, maxDiscountBps: parsed.data.maxDiscountBps,
    lowBps: DEFAULT_BPS.lowBps, mediumBps: DEFAULT_BPS.mediumBps, highBps: DEFAULT_BPS.highBps,
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
  console.log(`[demo] circle ${circleId} created txHash ${rc.hash}; joining ${demoWallets.length} demo wallets`);
  await joinAll(circleId);
  void planRound(circleId).catch((e) => console.error(`[agent] plan after new circle: ${e instanceof Error ? e.message : String(e)}`));
  res.json({ circleId, txHash: rc.hash });
}));

const withdrawBody = z.object({ address: z.string(), circleId: z.coerce.number().int().positive() });
demo.post("/demo/withdraw", wrap(async (req, res) => {
  requireDemo();
  const parsed = withdrawBody.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "body must be { address, circleId }", "BAD_BODY");
  const w = demoWallet(parseAddress(parsed.data.address));
  if (!w) throw new ApiError(400, "not a demo wallet", "NOT_DEMO_WALLET");
  const contract = contractAs(w.wallet); // custodial demo wallet
  await preflight(contract, "withdraw", [parsed.data.circleId]);
  const rc = await sendTx(`demo withdraw ${w.label} circle ${parsed.data.circleId}`, w.wallet, () => contract.withdraw(parsed.data.circleId));
  res.json({ txHash: rc.hash });
}));

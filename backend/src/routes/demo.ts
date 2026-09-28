import { Router } from "express";
import { parseEther } from "ethers";
import { z } from "zod";
import { contractAddress, contractAs, demoWallet, demoWallets, deployer, getRiskTier, isConfigured, preflight, provider, readContract, sendTx } from "../chain";
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
    skip: getSkip(w.address),
    custodial: true as const, // custodial demo wallet — backend holds the key
  })));
  res.json({ wallets, txCount: countDistinctTx(), contract: contractAddress, circleId: latestDemoCircle() });
}));

/** POST /demo/fund — top up every demo wallet below 1 MSTC to 2 MSTC from the deployer. */
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
  setSkip(address, parsed.data.skip);
  console.log(`[demo] skip ${demoWallet(address)?.label} = ${parsed.data.skip}`);
  res.json({ ok: true });
}));

const newCircleBody = z.object({
  roundDuration: z.coerce.number().int().min(10).max(86_400).default(30),
  contribution: z.string().default("0.1"),
});
/** POST /demo/new-circle — createCircle from the deployer, then join all 5 demo wallets. */
demo.post("/demo/new-circle", wrap(async (req, res) => {
  requireDemo(); requireDeployer();
  const parsed = newCircleBody.safeParse(req.body ?? {});
  if (!parsed.success) throw new ApiError(400, "body: { roundDuration?: number, contribution?: string (MSTC) }", "BAD_BODY");
  let contribution: bigint;
  try { contribution = parseEther(parsed.data.contribution); } catch { throw new ApiError(400, "invalid contribution", "BAD_BODY"); }
  if (contribution <= 0n) throw new ApiError(400, "contribution must be > 0", "BAD_BODY");
  const members = Math.max(demoWallets.length, 3);

  const rc = await sendTx("demo createCircle", deployer!, () =>
    contractAs(deployer!).createCircle(contribution, members, parsed.data.roundDuration, 1800, 100, contribution),
  );
  const iface = readContract().interface;
  let circleId: number | null = null;
  for (const log of rc.logs) {
    try {
      const p = iface.parseLog({ topics: [...log.topics], data: log.data });
      if (p?.name === "CircleCreated") { circleId = Number(p.args.circleId); break; }
    } catch { /* not ours */ }
  }
  if (circleId === null) {
    const ev = findEvent("CircleCreated", rc.hash);
    if (ev) circleId = Number((JSON.parse(ev.args_json) as { circleId: number }).circleId);
  }
  if (circleId === null) throw new ApiError(500, "CircleCreated event not found", "NO_EVENT");
  addDemoCircle(circleId);
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

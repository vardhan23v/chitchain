import { contractAs, errorMessage, getCircle, getCircleCount, isConfigured, keeper, preflight, revertName, sendTx, type CircleView } from "./chain";
import { bus, loop } from "./bus";
import { auditSystem } from "./auth/audit";

/**
 * v2.2 keeper. Each round moves through on-chain phases; the keeper only ever triggers the permissionless step whose
 * deadline has passed (it never decides for anyone):
 *   Contributing, past contributionDeadline → closeContributions (misses covered from collateral, recipient named)
 *   Deciding,     past decisionDeadline     → settleRound (the recipient receives the full pot)
 *   Auction,      past the auction deadline → settleRound (lowest payout offer wins; no bids → recipient)
 */
const pending = new Set<string>(); // `${circleId}:${round}:${phase}` while a tx is in flight
const finished = new Set<number>(); // Completed / Cancelled circles — no need to re-read every tick
const auctionSeen = new Set<string>(); // `${circleId}:${round}` once the auction phase was announced on the bus
const NON_FATAL = ["BiddingNotOver", "DecisionNotOver", "ContributionsOpen", "WrongPhase", "NotActive"];

export type KeeperStep = "closeContributions" | "settleRound";
/** The step due for this circle at `nowSec`, or null when nothing is due yet. */
export function dueStep(c: Pick<CircleView, "status" | "phase" | "contributionDeadline" | "decisionDeadline" | "roundDeadline">, nowSec: number): KeeperStep | null {
  if (c.status !== 1) return null;
  if (c.phase === 0) return nowSec > c.contributionDeadline ? "closeContributions" : null;
  if (c.phase === 1) return nowSec > c.decisionDeadline ? "settleRound" : null;
  return nowSec > c.roundDeadline ? "settleRound" : null;
}

/** Runs the due step for `circleId` now. Returns the tx hash, or throws a readable error (e.g. "NothingDue"). */
export async function settleNow(circleId: number, ctx = "keeper"): Promise<{ txHash: string; step: KeeperStep }> {
  if (!keeper) throw new Error("KEEPER_PRIVATE_KEY not configured");
  const c = await getCircle(circleId);
  if (c.status !== 1) throw new Error("NotActive");
  const step = dueStep(c, Math.floor(Date.now() / 1000));
  if (!step) throw new Error("NothingDue");
  const key = `${circleId}:${c.round}:${c.phase}`;
  if (pending.has(key)) throw new Error("already pending");
  pending.add(key);
  const action = step === "closeContributions" ? "keeper.close" : "keeper.settle";
  const actor = ctx === "keeper" ? "KEEPER" : "SYSTEM";
  try {
    const contract = contractAs(keeper);
    await preflight(contract, step, [circleId]); // never send a tx that would revert
    let rc;
    try {
      rc = await sendTx(`${ctx} ${step} circle ${circleId} round ${c.round}`, keeper, () => contract[step](circleId));
    } catch (e) {
      auditSystem(actor, action, `circle:${circleId}`, "failed", null, { round: c.round, phase: c.phase, error: errorMessage(e), ctx });
      throw e;
    }
    auditSystem(actor, action, `circle:${circleId}`, "ok", rc.hash, { round: c.round, phase: c.phase, ctx });
    if (step === "settleRound") bus.emit("roundStarted", circleId);
    return { txHash: rc.hash, step };
  } finally {
    pending.delete(key);
  }
}

async function keeperTick(): Promise<void> {
  if (!isConfigured() || !keeper) return;
  const nowSec = Math.floor(Date.now() / 1000);
  const count = await getCircleCount();
  for (let id = 1; id <= count; id++) {
    if (finished.has(id)) continue;
    let c: CircleView;
    try { c = await getCircle(id); } catch (e) {
      console.error(`[keeper] circle ${id}: read failed: ${errorMessage(e)}`);
      continue;
    }
    if (c.status === 2 || c.status === 3) { finished.add(id); continue; }
    if (c.status !== 1) continue;
    // Auction open (recipient declined) → let mandates/agents plan once against the final pot.
    const auctionKey = `${id}:${c.round}`;
    if (c.phase === 2 && !auctionSeen.has(auctionKey)) { auctionSeen.add(auctionKey); bus.emit("biddingPhase", id); }
    if (!dueStep(c, nowSec)) continue;
    if (pending.has(`${id}:${c.round}:${c.phase}`)) continue;
    try {
      await settleNow(id);
    } catch (e) {
      const name = revertName(e) ?? errorMessage(e);
      if (NON_FATAL.some((n) => name.includes(n)) || /nonce|already known|replacement|pending/i.test(name)) {
        console.log(`[keeper] circle ${id} round ${c.round}: skipped (${name})`);
      } else {
        console.error(`[keeper] circle ${id} round ${c.round}: step failed: ${name}`);
      }
    }
  }
}

export function startKeeper(): void {
  console.log(`[keeper] wallet ${keeper?.address ?? "(none)"}`);
  loop("keeper", 3000, keeperTick);
}

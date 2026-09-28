import { contractAs, errorMessage, getCircle, getCircleCount, isConfigured, keeper, preflight, revertName, sendTx } from "./chain";
import { bus, loop } from "./bus";

const pending = new Set<string>(); // `${circleId}:${round}` while a settle tx is in flight
const finished = new Set<number>(); // Completed / Cancelled circles — no need to re-read every tick
const NON_FATAL = ["RoundNotOver", "NotActive"];

/** Settles `circleId` now if its deadline passed. Returns the tx hash, or throws a readable error. */
export async function settleNow(circleId: number, ctx = "keeper"): Promise<string> {
  if (!keeper) throw new Error("KEEPER_PRIVATE_KEY not configured");
  const c = await getCircle(circleId);
  if (c.status !== 1) throw new Error("NotActive");
  const key = `${circleId}:${c.round}`;
  if (pending.has(key)) throw new Error("settle already pending");
  pending.add(key);
  try {
    const contract = contractAs(keeper);
    await preflight(contract, "settleRound", [circleId]); // never send a tx that would revert
    const rc = await sendTx(`${ctx} circle ${circleId} round ${c.round}`, keeper, () => contract.settleRound(circleId));
    bus.emit("roundStarted", circleId);
    return rc.hash;
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
    let status: number;
    let roundDeadline: number;
    let round: number;
    try {
      const c = await getCircle(id);
      status = c.status; roundDeadline = c.roundDeadline; round = c.round;
    } catch (e) {
      console.error(`[keeper] circle ${id}: read failed: ${errorMessage(e)}`);
      continue;
    }
    if (status === 2 || status === 3) { finished.add(id); continue; }
    if (status !== 1 || nowSec <= roundDeadline) continue;
    if (pending.has(`${id}:${round}`)) continue;
    try {
      await settleNow(id);
    } catch (e) {
      const name = revertName(e) ?? errorMessage(e);
      if (NON_FATAL.some((n) => name.includes(n)) || /nonce|already known|replacement/i.test(name)) {
        console.log(`[keeper] circle ${id} round ${round}: skipped (${name})`);
      } else {
        console.error(`[keeper] circle ${id} round ${round}: settle failed: ${name}`);
      }
    }
  }
}

export function startKeeper(): void {
  console.log(`[keeper] wallet ${keeper?.address ?? "(none)"}`);
  loop("keeper", 3000, keeperTick);
}

import { EventEmitter } from "node:events";
import type { AgentEventApi, BidAgentApi } from "./db/ai";

/** In-process event bus so keeper/indexer can trigger agent + autopilot without circular imports. */
export interface BusEvents {
  /** A new round is live (CircleStarted seen, or a RoundSettled advanced the circle). */
  roundStarted: (circleId: number) => void;
  /** The recipient declined the full pot: the auction is open (pot is final). */
  biddingPhase: (circleId: number) => void;
  /** A decoded contract event was inserted by the indexer. */
  chainEvent: (name: string, circleId: number | null, args: Record<string, string | number | boolean>) => void;
  /** v4: a BidAgent wrote an activity line (SSE fan-out). */
  agentEvent: (agentId: string, event: AgentEventApi) => void;
  /** v4: a BidAgent row changed status / decision fields. */
  agentStatus: (agentId: string, agent: BidAgentApi) => void;
}
class Bus extends EventEmitter {
  override emit<K extends keyof BusEvents>(ev: K, ...args: Parameters<BusEvents[K]>): boolean { return super.emit(ev, ...args); }
  override on<K extends keyof BusEvents>(ev: K, fn: BusEvents[K]): this { return super.on(ev, fn); }
}
export const bus = new Bus();

export interface LoopStatus { name: string; everyMs: number; ticks: number; errors: number; lastTickAt: number | null; lastOkAt: number | null; lastError: string | null; busy: boolean }
const loops = new Map<string, LoopStatus>();
/** Health snapshot of every registered loop (indexer / keeper / autopilot). Timestamps are unix seconds. */
export function loopStatus(): LoopStatus[] { return [...loops.values()].map((l) => ({ ...l })); }

/** Runs `fn` on an interval, serialised (no overlapping runs), never throwing out of the timer. Registers itself for loopStatus(). */
export function loop(name: string, everyMs: number, fn: () => Promise<void>): NodeJS.Timeout {
  const st: LoopStatus = { name, everyMs, ticks: 0, errors: 0, lastTickAt: null, lastOkAt: null, lastError: null, busy: false };
  loops.set(name, st);
  const tick = async () => {
    if (st.busy) return;
    st.busy = true;
    st.ticks += 1;
    st.lastTickAt = Math.floor(Date.now() / 1000);
    try { await fn(); st.lastOkAt = Math.floor(Date.now() / 1000); }
    catch (e) {
      st.errors += 1;
      st.lastError = e instanceof Error ? e.message : String(e);
      console.error(`[${name}] loop error: ${st.lastError}`);
    } finally { st.busy = false; }
  };
  void tick();
  return setInterval(() => { void tick(); }, everyMs);
}

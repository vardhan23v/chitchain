import { EventEmitter } from "node:events";

/** In-process event bus so keeper/indexer can trigger agent + autopilot without circular imports. */
export interface BusEvents {
  /** A new round is live (CircleStarted seen, or a RoundSettled advanced the circle). */
  roundStarted: (circleId: number) => void;
  /** A decoded contract event was inserted by the indexer. */
  chainEvent: (name: string, circleId: number | null, args: Record<string, string | number | boolean>) => void;
}
class Bus extends EventEmitter {
  override emit<K extends keyof BusEvents>(ev: K, ...args: Parameters<BusEvents[K]>): boolean { return super.emit(ev, ...args); }
  override on<K extends keyof BusEvents>(ev: K, fn: BusEvents[K]): this { return super.on(ev, fn); }
}
export const bus = new Bus();

/** Runs `fn` on an interval, serialised (no overlapping runs), never throwing out of the timer. */
export function loop(name: string, everyMs: number, fn: () => Promise<void>): NodeJS.Timeout {
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try { await fn(); } catch (e) { console.error(`[${name}] loop error: ${e instanceof Error ? e.message : String(e)}`); }
    finally { busy = false; }
  };
  void tick();
  return setInterval(() => { void tick(); }, everyMs);
}

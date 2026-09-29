import { EventLog, type Log } from "ethers";
import { contractAddress, invalidateChainCache, isConfigured, provider, readContract } from "./chain";
import { config } from "./config";
import { getLastBlock, getMeta, insertEvents, prisma, setLastBlock, setMeta, type NewEvent } from "./db";
import { bus, loop } from "./bus";

const CHUNK = 2000;
const blockTs = new Map<number, number>();
let warnedUnconfigured = false;

async function timestampOf(block: number): Promise<number> {
  const cached = blockTs.get(block);
  if (cached !== undefined) return cached;
  const b = await provider.getBlock(block);
  const ts = b?.timestamp ?? Math.floor(Date.now() / 1000);
  blockTs.set(block, ts);
  if (blockTs.size > 5000) blockTs.delete(blockTs.keys().next().value as number);
  return ts;
}

/** Turns an ethers Result into plain JSON-safe args: uint≤64 → number, larger uints → decimal string. */
export function decodeArgs(log: EventLog): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  log.fragment.inputs.forEach((input, i) => {
    const v: unknown = log.args[i];
    const key = input.name || `arg${i}`;
    if (typeof v === "bigint") {
      if (key === "circleId") { out[key] = Number(v); return; } // uint256 on-chain, but a small id in practice
      const bits = /^u?int(\d*)$/.exec(input.type);
      const size = bits ? Number(bits[1] || 256) : 256;
      out[key] = size <= 64 ? Number(v) : v.toString(); // enums/rounds/timestamps as numbers, wei as strings
    } else if (typeof v === "boolean" || typeof v === "number" || typeof v === "string") {
      out[key] = v;
    } else {
      out[key] = String(v);
    }
  });
  return out;
}

async function toRows(logs: (EventLog | Log)[]): Promise<NewEvent[]> {
  const rows: NewEvent[] = [];
  for (const l of logs) {
    if (!(l instanceof EventLog)) continue; // undecodable log (not in our ABI)
    const args = decodeArgs(l);
    rows.push({
      circleId: typeof args.circleId === "number" ? args.circleId : null,
      round: typeof args.round === "number" ? args.round : null,
      name: l.eventName, args, txHash: l.transactionHash, logIndex: l.index, block: l.blockNumber, ts: await timestampOf(l.blockNumber),
    });
  }
  return rows;
}

let lastIndexed: number | null = null;
export async function lastIndexedBlock(): Promise<number | null> { return lastIndexed ?? (await getLastBlock()); }

/** One indexing pass: last_block+1 → latest in ≤2000-block chunks. Idempotent (UNIQUE tx_hash+log_index). */
export async function indexOnce(): Promise<void> {
  if (!isConfigured()) {
    if (!warnedUnconfigured) { console.log("[indexer] CHITCHAIN_ADDRESS empty — indexer idle"); warnedUnconfigured = true; }
    return;
  }
  const latest = await provider.getBlockNumber();
  const stored = await getLastBlock();
  let from = stored === null ? Math.max(config.START_BLOCK, 0) : stored + 1;
  if (from > latest) return;
  const contract = readContract();
  while (from <= latest) {
    const to = Math.min(from + CHUNK - 1, latest);
    const logs = await contract.queryFilter("*", from, to);
    const rows = await toRows(logs);
    const inserted = rows.length ? await insertEvents(rows) : 0;
    if (inserted > 0) {
      invalidateChainCache();
      console.log(`[indexer] blocks ${from}-${to}: ${inserted} new event(s)`);
      for (const r of rows) {
        bus.emit("chainEvent", r.name, r.circleId, r.args);
        if (r.circleId !== null && (r.name === "CircleStarted" || r.name === "RoundSettled")) bus.emit("roundStarted", r.circleId);
      }
    }
    await setLastBlock(to);
    lastIndexed = to;
    from = to + 1;
  }
}

/**
 * When CHITCHAIN_ADDRESS changes (contract redeploy), every chain-derived table is keyed by circle ids that restart at 1
 * on the new contract, so wipe them and start indexing from START_BLOCK. User accounts, sessions, audit log and support
 * tickets are kept.
 */
async function resetIfContractChanged(): Promise<void> {
  if (!contractAddress) return;
  const current = contractAddress.toLowerCase();
  const stored = await getMeta("contract_address");
  if (stored === current) return;
  // A database created before this check exists has no stored address but may already hold events from the old contract.
  const legacyData = stored === null && (await prisma.event.count()) > 0;
  if (stored !== null || legacyData) {
    console.log(`[indexer] contract changed ${stored ?? "(unknown)"} -> ${current}: clearing chain-derived tables`);
    await prisma.$transaction([
      prisma.agentEvent.deleteMany(), prisma.bidAgent.deleteMany(), prisma.agentLog.deleteMany(), prisma.mandate.deleteMany(),
      prisma.event.deleteMany(), prisma.riskCache.deleteMany(), prisma.demoSkip.deleteMany(), prisma.demoCircle.deleteMany(),
      prisma.circleInvite.deleteMany(), prisma.circleMeta.deleteMany(), prisma.meta.deleteMany({ where: { key: "last_block" } }),
    ]);
  }
  await setMeta("contract_address", current);
}

export async function startIndexer(): Promise<void> {
  await resetIfContractChanged();
  console.log(`[indexer] contract ${contractAddress ?? "(none)"} from block ${(await getLastBlock()) ?? config.START_BLOCK}`);
  loop("indexer", 3000, indexOnce);
}

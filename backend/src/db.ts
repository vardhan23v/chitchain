import Database from "better-sqlite3";
import * as fs from "node:fs";
import * as path from "node:path";
import { config } from "./config";

fs.mkdirSync(path.dirname(config.dbFile), { recursive: true });
export const db = new Database(config.dbFile);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");

db.exec(`
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle_id INTEGER, round INTEGER, name TEXT NOT NULL, args_json TEXT NOT NULL,
  tx_hash TEXT NOT NULL, log_index INTEGER NOT NULL, block INTEGER NOT NULL, ts INTEGER NOT NULL,
  UNIQUE(tx_hash, log_index)
);
CREATE INDEX IF NOT EXISTS events_circle ON events(circle_id, id);
CREATE INDEX IF NOT EXISTS events_name ON events(name);
CREATE TABLE IF NOT EXISTS agent_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle_id INTEGER NOT NULL, round INTEGER NOT NULL, member TEXT NOT NULL, agent_wallet TEXT NOT NULL,
  bid_this_round INTEGER NOT NULL, discount TEXT NOT NULL, reason TEXT NOT NULL, source TEXT NOT NULL,
  tx_hash TEXT, error TEXT, ts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS agent_logs_circle ON agent_logs(circle_id, id);
CREATE TABLE IF NOT EXISTS mandates (
  circle_id INTEGER NOT NULL, member TEXT NOT NULL, goal TEXT NOT NULL, max_discount_pct REAL,
  active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL,
  PRIMARY KEY (circle_id, member)
);
CREATE TABLE IF NOT EXISTS risk_cache (address TEXT PRIMARY KEY, result_json TEXT NOT NULL, ts INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS demo_skip (address TEXT PRIMARY KEY, skip INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS demo_circles (circle_id INTEGER PRIMARY KEY, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);

export const now = (): number => Math.floor(Date.now() / 1000);

// ───────────── meta ─────────────
const metaGet = db.prepare<[string], { value: string }>("SELECT value FROM meta WHERE key = ?");
const metaSet = db.prepare("INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
export function getMeta(key: string): string | null { return metaGet.get(key)?.value ?? null; }
export function setMeta(key: string, value: string): void { metaSet.run(key, value); }
export function getLastBlock(): number | null { const v = getMeta("last_block"); return v === null ? null : Number(v); }
export function setLastBlock(n: number): void { setMeta("last_block", String(n)); }

// ───────────── events ─────────────
export interface EventRow {
  id: number; circle_id: number | null; round: number | null; name: string; args_json: string;
  tx_hash: string; log_index: number; block: number; ts: number;
}
export interface NewEvent { circleId: number | null; round: number | null; name: string; args: Record<string, string | number | boolean>; txHash: string; logIndex: number; block: number; ts: number }
const insertEvent = db.prepare(
  `INSERT OR IGNORE INTO events(circle_id, round, name, args_json, tx_hash, log_index, block, ts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
);
export const insertEvents = db.transaction((rows: NewEvent[]): number => {
  let inserted = 0;
  for (const r of rows) {
    const res = insertEvent.run(r.circleId, r.round, r.name, JSON.stringify(r.args), r.txHash, r.logIndex, r.block, r.ts);
    inserted += res.changes;
  }
  return inserted;
});

export function listEvents(opts: { circleId?: number; since?: number; limit?: number }): EventRow[] {
  const where: string[] = [];
  const params: (number | string)[] = [];
  if (opts.circleId !== undefined) { where.push("circle_id = ?"); params.push(opts.circleId); }
  if (opts.since !== undefined) { where.push("id > ?"); params.push(opts.since); }
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500);
  const sql = `SELECT * FROM events ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id ASC LIMIT ?`;
  return db.prepare<(number | string)[], EventRow>(sql).all(...params, limit);
}
export function eventsForAddress(addr: string, limit = 50): EventRow[] {
  const needle = `%"${addr.toLowerCase()}"%`;
  return db
    .prepare<[string, number], EventRow>(`SELECT * FROM events WHERE lower(args_json) LIKE ? ORDER BY id DESC LIMIT ?`)
    .all(needle, limit)
    .reverse();
}
export function countEventsForCircle(circleId: number): number {
  return db.prepare<[number], { c: number }>("SELECT COUNT(*) c FROM events WHERE circle_id = ?").get(circleId)?.c ?? 0;
}
export function countDistinctTx(): number {
  return db.prepare<[], { c: number }>("SELECT COUNT(DISTINCT tx_hash) c FROM events").get()?.c ?? 0;
}
export function findEvent(name: string, txHash: string): EventRow | null {
  return db.prepare<[string, string], EventRow>("SELECT * FROM events WHERE name = ? AND tx_hash = ? LIMIT 1").get(name, txHash) ?? null;
}

// ───────────── agent logs ─────────────
export interface AgentLogRow {
  id: number; circle_id: number; round: number; member: string; agent_wallet: string; bid_this_round: number;
  discount: string; reason: string; source: string; tx_hash: string | null; error: string | null; ts: number;
}
export interface NewAgentLog {
  circleId: number; round: number; member: string; agentWallet: string; bidThisRound: boolean; discount: bigint;
  reason: string; source: "llm" | "fallback"; txHash: string | null; error: string | null;
}
export function insertAgentLog(l: NewAgentLog): AgentLogRow {
  const res = db
    .prepare(`INSERT INTO agent_logs(circle_id, round, member, agent_wallet, bid_this_round, discount, reason, source, tx_hash, error, ts)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(l.circleId, l.round, l.member, l.agentWallet, l.bidThisRound ? 1 : 0, l.discount.toString(), l.reason, l.source, l.txHash, l.error, now());
  return db.prepare<[number], AgentLogRow>("SELECT * FROM agent_logs WHERE id = ?").get(Number(res.lastInsertRowid))!;
}
export function listAgentLogs(opts: { circleId?: number; limit?: number }): AgentLogRow[] {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 500);
  if (opts.circleId !== undefined) {
    return db.prepare<[number, number], AgentLogRow>("SELECT * FROM agent_logs WHERE circle_id = ? ORDER BY id DESC LIMIT ?").all(opts.circleId, limit);
  }
  return db.prepare<[number], AgentLogRow>("SELECT * FROM agent_logs ORDER BY id DESC LIMIT ?").all(limit);
}
export function agentLogByTx(txHash: string): AgentLogRow | null {
  return db.prepare<[string], AgentLogRow>("SELECT * FROM agent_logs WHERE tx_hash = ? LIMIT 1").get(txHash) ?? null;
}
export function agentLogForRound(circleId: number, round: number, member: string): AgentLogRow | null {
  return db
    .prepare<[number, number, string], AgentLogRow>("SELECT * FROM agent_logs WHERE circle_id = ? AND round = ? AND lower(member) = lower(?) ORDER BY id DESC LIMIT 1")
    .get(circleId, round, member) ?? null;
}

// ───────────── mandates ─────────────
export interface MandateRow { circle_id: number; member: string; goal: string; max_discount_pct: number | null; active: number; created_at: number }
export function upsertMandate(circleId: number, member: string, goal: string, maxDiscountPct: number | null): MandateRow {
  db.prepare(`INSERT INTO mandates(circle_id, member, goal, max_discount_pct, active, created_at) VALUES (?, ?, ?, ?, 1, ?)
              ON CONFLICT(circle_id, member) DO UPDATE SET goal = excluded.goal, max_discount_pct = excluded.max_discount_pct, active = 1, created_at = excluded.created_at`)
    .run(circleId, member, goal, maxDiscountPct, now());
  return getMandate(circleId, member)!;
}
export function getMandate(circleId: number, member: string): MandateRow | null {
  return db.prepare<[number, string], MandateRow>("SELECT * FROM mandates WHERE circle_id = ? AND lower(member) = lower(?)").get(circleId, member) ?? null;
}
export function deactivateMandate(circleId: number, member: string): boolean {
  return db.prepare("UPDATE mandates SET active = 0 WHERE circle_id = ? AND lower(member) = lower(?)").run(circleId, member).changes > 0;
}
export function activeMandates(circleId: number): MandateRow[] {
  return db.prepare<[number], MandateRow>("SELECT * FROM mandates WHERE circle_id = ? AND active = 1").all(circleId);
}

// ───────────── risk cache ─────────────
export function getRiskCache(addr: string, maxAgeSec: number): string | null {
  const row = db.prepare<[string], { result_json: string; ts: number }>("SELECT result_json, ts FROM risk_cache WHERE address = ?").get(addr.toLowerCase());
  if (!row || now() - row.ts > maxAgeSec) return null;
  return row.result_json;
}
export function setRiskCache(addr: string, json: string): void {
  db.prepare("INSERT INTO risk_cache(address, result_json, ts) VALUES (?, ?, ?) ON CONFLICT(address) DO UPDATE SET result_json = excluded.result_json, ts = excluded.ts")
    .run(addr.toLowerCase(), json, now());
}

// ───────────── demo ─────────────
export function getSkip(addr: string): boolean {
  return (db.prepare<[string], { skip: number }>("SELECT skip FROM demo_skip WHERE address = ?").get(addr.toLowerCase())?.skip ?? 0) === 1;
}
export function setSkip(addr: string, skip: boolean): void {
  db.prepare("INSERT INTO demo_skip(address, skip) VALUES (?, ?) ON CONFLICT(address) DO UPDATE SET skip = excluded.skip").run(addr.toLowerCase(), skip ? 1 : 0);
}
export function addDemoCircle(circleId: number): void {
  db.prepare("INSERT OR IGNORE INTO demo_circles(circle_id, created_at) VALUES (?, ?)").run(circleId, now());
}
export function isDemoCircle(circleId: number): boolean {
  return !!db.prepare<[number], { circle_id: number }>("SELECT circle_id FROM demo_circles WHERE circle_id = ?").get(circleId);
}
export function demoCircleIds(): number[] {
  return db.prepare<[], { circle_id: number }>("SELECT circle_id FROM demo_circles ORDER BY circle_id ASC").all().map((r) => r.circle_id);
}
export function latestDemoCircle(): number | null {
  return db.prepare<[], { circle_id: number }>("SELECT circle_id FROM demo_circles ORDER BY circle_id DESC LIMIT 1").get()?.circle_id ?? null;
}

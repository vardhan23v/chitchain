/** v4 public auction reads: GET /auction/:circleId (snapshot) and GET /auction/:circleId/bids (indexed BidPlaced rows). */
import { Router } from "express";
import { getCircleCount, getRoundHistory, isConfigured, labelOf, potOf as roundPot } from "../chain";
import { namesFor } from "../db/usernames";
import { bidEventsForCircle } from "../db";
import { buildSnapshot } from "../ai/snapshot";
import { ApiError, optionalInt, parseId, wrap } from "./util";

export const auction = Router();

async function requireCircle(id: number): Promise<void> {
  if (!isConfigured()) throw new ApiError(503, "CHITCHAIN_ADDRESS not configured", "NO_CONTRACT");
  if (id > (await getCircleCount())) throw new ApiError(404, "circle not found", "NOT_FOUND");
}

auction.get("/auction/:circleId", wrap(async (req, res) => {
  const id = parseId(req.params.circleId);
  await requireCircle(id);
  res.json((await buildSnapshot(id)).snapshot);
}));

auction.get("/auction/:circleId/bids", wrap(async (req, res) => {
  const id = parseId(req.params.circleId);
  await requireCircle(id);
  const limit = optionalInt(req.query.limit) ?? 50;
  const [{ round }, rows] = await Promise.all([buildSnapshot(id), bidEventsForCircle(id, limit)]);
  const potByRound = new Map<number, bigint>([[round.round, roundPot(round)]]);
  const potOf = async (r: number | null): Promise<bigint | null> => {
    if (r === null) return null;
    if (!potByRound.has(r)) {
      try { potByRound.set(r, (await getRoundHistory(id, r)).pot); } catch { return null; }
    }
    return potByRound.get(r) ?? null;
  };
  const names = await namesFor(rows.map((b) => b.member));
  const bids = [];
  for (const b of rows) {
    const pot = await potOf(b.round);
    const discount = BigInt(b.discount);
    bids.push({
      round: b.round, member: b.member.toLowerCase(), label: labelOf(b.member), username: names.get(b.member.toLowerCase()) ?? null, discount: b.discount,
      payout: pot === null ? null : (discount >= pot ? 0n : pot - discount).toString(), txHash: b.txHash, block: b.block, ts: b.ts,
    });
  }
  res.json({ bids });
}));

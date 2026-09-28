import { Router } from "express";
import { z } from "zod";
import { getCircle, getRound, isConfigured, provider } from "../chain";
import { circleNames, eventsInvolving, getUser, invitesForAddress, updateUser, type EventRow } from "../db";
import { assessRisk } from "../risk";
import { audit } from "../auth/audit";
import { requireAuth } from "../auth/middleware";
import { circleSummary, roundInfo } from "./circles";
import { circlesForAddress } from "./members";
import { ApiError, wrap } from "./util";

export const me = Router();
me.use("/me", requireAuth());

/** Sums Contributed / RoundSettled / DividendCredited / DefaultDetected rows naming the address (bounded at 500 events). */
export function totalsFromEvents(rows: EventRow[], addr: string): { contributions: bigint; payouts: bigint; dividends: bigint; defaults: number; circles: number } {
  const a = addr.toLowerCase();
  const t = { contributions: 0n, payouts: 0n, dividends: 0n, defaults: 0, circles: 0 };
  const circleIds = new Set<number>();
  for (const r of rows) {
    const args = JSON.parse(r.args_json) as Record<string, string | number | boolean>;
    const member = String(args.member ?? "").toLowerCase();
    const winner = String(args.winner ?? "").toLowerCase();
    if (r.circle_id !== null && r.name === "Joined" && member === a) circleIds.add(r.circle_id);
    if (r.name === "Contributed" && member === a) t.contributions += BigInt(String(args.amount ?? "0"));
    else if (r.name === "RoundSettled" && winner === a) t.payouts += BigInt(String(args.payout ?? "0"));
    else if (r.name === "DividendCredited" && member === a) t.dividends += BigInt(String(args.amount ?? "0"));
    else if (r.name === "DefaultDetected" && member === a) t.defaults += 1;
  }
  t.circles = circleIds.size;
  return t;
}

/** GET /me → MeOverview */
me.get("/me", wrap(async (req, res) => {
  const addr = req.auth!.address;
  const user = await getUser(addr);
  const [balance, risk, rows] = await Promise.all([
    provider.getBalance(addr).catch(() => 0n),
    assessRisk(addr).catch(() => null),
    eventsInvolving(addr, 500),
  ]);
  const totals = totalsFromEvents(rows, addr);
  let activeCircle: Record<string, unknown> | null = null;
  if (isConfigured()) {
    const mine = await circlesForAddress(addr); // newest first
    const active = mine.find((c) => c.status === 1) ?? null;
    if (active) {
      const id = Number(active.id);
      const round = await getRound(id);
      activeCircle = { ...active, roundNumber: Number(active.round), round: roundInfo(round) };
    }
    if (totals.circles < mine.length) totals.circles = mine.length; // on-chain membership is the authority when the index is behind
  }
  res.json({
    user, balance: balance.toString(), risk,
    totals: { contributions: totals.contributions.toString(), payouts: totals.payouts.toString(), dividends: totals.dividends.toString(), defaults: totals.defaults, circles: totals.circles },
    activeCircle,
  });
}));

/** GET /me/circles → { circles: (CircleSummary & { me })[] } */
me.get("/me/circles", wrap(async (req, res) => { res.json({ circles: await circlesForAddress(req.auth!.address) }); }));

/** GET /me/invites → { invites: Invite[] } */
me.get("/me/invites", wrap(async (req, res) => {
  const rows = await invitesForAddress(req.auth!.address);
  const names = await circleNames(rows.map((r) => r.circleId));
  const invites = await Promise.all(rows.map(async (r) => {
    let circle: Record<string, unknown> | null = null;
    if (isConfigured()) {
      try { circle = circleSummary(r.circleId, await getCircle(r.circleId), names.get(r.circleId)?.demo ?? false, names.get(r.circleId)); } catch { circle = null; }
    }
    return { circleId: r.circleId, walletAddress: r.walletAddress, circle, invitedBy: r.invitedBy, createdAt: r.createdAt };
  }));
  res.json({ invites });
}));

const patchBody = z.object({ displayName: z.string().trim().max(40).nullable() });
/** PATCH /me { displayName } → { user } */
me.patch("/me", wrap(async (req, res) => {
  const parsed = patchBody.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "body must be { displayName: string|null (<= 40) }", "BAD_BODY");
  const displayName = parsed.data.displayName === "" ? null : parsed.data.displayName;
  const user = await updateUser(req.auth!.address, { displayName });
  audit(req, "me.update", req.auth!.address, "ok", { meta: { displayName } });
  res.json({ user });
}));

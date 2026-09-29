import { Router } from "express";
import { z } from "zod";
import { getCircle, getMember, getMembers, getRound, isConfigured, labelOf, type CircleView } from "../chain";
import { addInvites, circleMetaByOrganizer, circleNames, getCircleMeta, invitesForCircle, isDemoCircle, listAgentLogs, listEvents, removeInvite, updateCircleMeta, upsertCircleMeta } from "../db";
import { audit } from "../auth/audit";
import { requireAuth, requireCircleOrganizer, requireRole } from "../auth/middleware";
import { allCircles, circleSummary, defaultsOf, memberInfo, roundInfo, roundsOf } from "./circles";
import { defaultInfoFrom, eventRowToFeed } from "./feedShape";
import { ApiError, parseAddress, parseId, wrap } from "./util";

export const organizer = Router();
organizer.use("/organizer", requireAuth());

function requireContract(): void { if (!isConfigured()) throw new ApiError(503, "CHITCHAIN_ADDRESS not configured", "NO_CONTRACT"); }

/** Members + round + aggregates for one circle (shared by /organizer/circles and /organizer/circles/:id/analytics). */
async function circleDetail(id: number, c: CircleView) {
  const [round, addrs, defaults, meta, isDemo] = await Promise.all([getRound(id), getMembers(id), defaultsOf(id), getCircleMeta(id), isDemoCircle(id)]);
  const members = await Promise.all(addrs.map((a) => memberInfo(id, a, c.round, defaults.latestByMember.get(a.toLowerCase()))));
  const active = members.filter((m) => m.removed !== true);
  const paid = active.filter((m) => m.paidThisRound === true).length;
  const collateralTotal = members.reduce((sum, m) => sum + BigInt(String(m.collateral ?? "0")), 0n);
  const r = (await roundInfo(round)) as Record<string, unknown>;
  return {
    summary: circleSummary(id, c, isDemo, meta), members, round: r, defaults,
    pendingContributions: c.status === 1 ? active.length - paid : 0,
    contributionRate: active.length > 0 ? paid / active.length : 0,
    collateralTotal: collateralTotal.toString(),
    lowestAcceptedPayout: r.lowestAcceptedPayout == null ? null : String(r.lowestAcceptedPayout),
  };
}

/** GET /organizer/circles → { circles: OrganizerCircle[] } — CircleMeta-by-organizer ∪ on-chain creator scan; ADMIN sees every circle. */
organizer.get("/organizer/circles", requireRole("ORGANIZER", "ADMIN"), wrap(async (req, res) => {
  requireContract();
  const me = req.auth!.address;
  const all = await allCircles();
  let ids: number[];
  if (req.auth!.role === "ADMIN") ids = all.map((x) => x.id);
  else {
    const set = new Set<number>((await circleMetaByOrganizer(me)).map((m) => m.circleId));
    for (const { id, c } of all) if (c.creator.toLowerCase() === me) set.add(id);
    ids = [...set];
  }
  ids.sort((a, b) => b - a);
  const byId = new Map(all.map((x) => [x.id, x.c]));
  const circles = [];
  for (const id of ids) {
    const c = byId.get(id) ?? (await getCircle(id));
    const d = await circleDetail(id, c);
    circles.push({
      ...d.summary, roundNumber: c.round, members: d.members, round: d.round, pendingContributions: d.pendingContributions,
      defaults: d.defaults.all.length, collateralTotal: d.collateralTotal, lowestAcceptedPayout: d.lowestAcceptedPayout,
    });
  }
  res.json({ circles });
}));

const metaBody = z.object({ name: z.string().trim().min(1).max(80), description: z.string().trim().max(1000).nullable().optional() });
/** POST /organizer/circles/:id/meta { name, description? } → { circle } */
organizer.post("/organizer/circles/:id/meta", requireCircleOrganizer("id"), wrap(async (req, res) => {
  requireContract();
  const id = parseId(req.params.id);
  const parsed = metaBody.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "body must be { name (1-80), description? (<= 1000) }", "BAD_BODY");
  const c = await getCircle(id);
  const existing = await getCircleMeta(id);
  const meta = existing
    ? await updateCircleMeta(id, { name: parsed.data.name, description: parsed.data.description ?? null })
    : await upsertCircleMeta(id, { name: parsed.data.name, description: parsed.data.description ?? null, organizerWallet: c.creator });
  audit(req, "organizer.meta", `circle:${id}`, "ok", { meta: { name: meta.name } });
  res.json({ circle: circleSummary(id, c, await isDemoCircle(id), meta) });
}));

async function inviteList(id: number) {
  const rows = await invitesForCircle(id);
  const names = await circleNames([id]);
  const c = await getCircle(id).catch(() => null);
  const circle = c ? circleSummary(id, c, names.get(id)?.demo ?? false, names.get(id)) : null;
  return rows.map((r) => ({ circleId: r.circleId, walletAddress: r.walletAddress, circle, invitedBy: r.invitedBy, createdAt: r.createdAt }));
}
/** GET /organizer/circles/:id/invites → { invites: Invite[] } */
organizer.get("/organizer/circles/:id/invites", requireCircleOrganizer("id"), wrap(async (req, res) => {
  res.json({ invites: await inviteList(parseId(req.params.id)) });
}));
const invitesBody = z.object({ addresses: z.array(z.string()).min(1).max(50) });
/** POST /organizer/circles/:id/invites { addresses } → { invites } */
organizer.post("/organizer/circles/:id/invites", requireCircleOrganizer("id"), wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const parsed = invitesBody.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "body must be { addresses: string[] (1-50) }", "BAD_BODY");
  const addresses = [...new Set(parsed.data.addresses.map((a) => parseAddress(a).toLowerCase()))];
  await addInvites(id, addresses, req.auth!.address);
  audit(req, "organizer.invite", `circle:${id}`, "ok", { meta: { addresses } });
  res.json({ invites: await inviteList(id) });
}));
/** DELETE /organizer/circles/:id/invites/:addr → { ok } */
organizer.delete("/organizer/circles/:id/invites/:addr", requireCircleOrganizer("id"), wrap(async (req, res) => {
  const id = parseId(req.params.id);
  const addr = parseAddress(req.params.addr).toLowerCase();
  const ok = await removeInvite(id, addr);
  audit(req, "organizer.uninvite", `circle:${id}`, ok ? "ok" : "noop", { meta: { address: addr } });
  res.json({ ok });
}));

/** GET /organizer/circles/:id/analytics → CircleAnalytics */
organizer.get("/organizer/circles/:id/analytics", requireCircleOrganizer("id"), wrap(async (req, res) => {
  requireContract();
  const id = parseId(req.params.id);
  const c = await getCircle(id);
  const [d, rounds, logs, events] = await Promise.all([circleDetail(id, c), roundsOf(id, c), listAgentLogs({ circleId: id, limit: 500 }), listEvents({ circleId: id, limit: 500 })]);
  const defaults = [];
  for (const r of d.defaults.all) {
    const a = (JSON.parse(r.args_json) as { member?: string }).member ?? "";
    const collateral = a ? (await getMember(id, a)).collateral : 0n;
    const info = defaultInfoFrom(r, collateral);
    defaults.push({ ...info, label: labelOf(info.member) });
  }
  const recentEvents = await Promise.all(events.slice(-30).reverse().map(eventRowToFeed));
  res.json({
    circle: d.summary, roundNumber: c.round, round: d.round, members: d.members, rounds, defaults,
    contributionRate: d.contributionRate, agentDecisions: logs.length, recentEvents,
  });
}));

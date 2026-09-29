/**
 * Usernames and public profiles. The username is an off-chain display handle mapped to a wallet; the wallet address stays
 * the on-chain identity and every financial figure in the profile comes from the contract or from indexed contract events.
 */
import { Router } from "express";
import { z } from "zod";
import { getReputation, isConfigured, labelOf, TIER_NAME } from "../chain";
import { eventsInvolving, getUser } from "../db";
import { checkUsername, namesFor, setUsername, type Availability } from "../db/usernames";
import { USERNAME_ERROR_COPY, USERNAME_RULE } from "../users/username";
import { assessRisk } from "../risk";
import { audit } from "../auth/audit";
import { ipOf, rateLimit } from "../auth/ratelimit";
import { requireAuth } from "../auth/middleware";
import { totalsFromEvents } from "./me";
import { circlesForAddress } from "./members";
import { ApiError, isEvmAddress, parseAddress, wrap } from "./util";

export const users = Router();

const withCopy = (a: Availability) => ({ ...a, message: a.available ? null : USERNAME_ERROR_COPY[a.reason], rule: USERNAME_RULE });

/** GET /usernames/check?name= → { username, available, reason?, message, rule } (30/min per IP). */
users.get("/usernames/check", rateLimit({ perMinute: 30, keys: (req) => [`uname:${ipOf(req)}`] }), wrap(async (req, res) => {
  const name = typeof req.query.name === "string" ? req.query.name : "";
  const forWallet = typeof req.query.wallet === "string" && isEvmAddress(req.query.wallet) ? req.query.wallet : undefined;
  res.json(withCopy(await checkUsername(name, forWallet)));
}));

/** GET /usernames?addresses=0x..,0x.. → { names: { [lowercaseAddress]: username } } (max 100 addresses). */
users.get("/usernames", wrap(async (req, res) => {
  const raw = typeof req.query.addresses === "string" ? req.query.addresses : "";
  const list = raw.split(",").map((s) => s.trim()).filter(isEvmAddress).slice(0, 100);
  res.json({ names: Object.fromEntries(await namesFor(list)) });
}));

const body = z.object({ username: z.string().max(64) });
/** PUT /me/username { username } → { user } — wallet sessions only; 10/min per wallet. */
users.put("/me/username", requireAuth(), rateLimit({ perMinute: 10, keys: (req) => [`uname-set:${req.auth?.address ?? ipOf(req)}`] }), wrap(async (req, res) => {
  const me = req.auth!.address;
  if (!isEvmAddress(me)) throw new ApiError(400, "usernames belong to wallets; this session has no wallet", "NO_WALLET");
  const parsed = body.safeParse(req.body ?? {});
  if (!parsed.success) throw new ApiError(400, "body must be { username }", "BAD_BODY");
  try {
    const username = await setUsername(me, parsed.data.username);
    audit(req, "me.username", me, "ok", { meta: { username } });
    res.json({ user: await getUser(me) });
  } catch (e) {
    const a = (e as { availability?: Availability }).availability;
    if (!a || a.available) throw e;
    audit(req, "me.username", me, "failed", { meta: { reason: a.reason } });
    throw new ApiError(a.reason === "TAKEN" || a.reason === "TOO_SIMILAR" ? 409 : 400, USERNAME_ERROR_COPY[a.reason], a.reason);
  }
}));

/**
 * GET /members/:addr/profile — public profile. Counts come from the contract (reputation, membership) and from indexed
 * contract events (payouts, dividends); nothing is stored off-chain except the username.
 */
users.get("/members/:addr/profile", wrap(async (req, res) => {
  const address = parseAddress(req.params.addr);
  if (!isConfigured()) throw new ApiError(503, "CHITCHAIN_ADDRESS not configured", "NO_CONTRACT");
  const [names, rep, risk, circles, rows] = await Promise.all([
    namesFor([address]), getReputation(address), assessRisk(address).catch(() => null), circlesForAddress(address), eventsInvolving(address, 500),
  ]);
  const t = totalsFromEvents(rows, address);
  const a = address.toLowerCase();
  let payoutsCount = 0;
  for (const r of rows) {
    const args = JSON.parse(r.args_json) as Record<string, unknown>;
    if (r.name === "RoundSettled" && String(args.winner ?? "").toLowerCase() === a) payoutsCount += 1;
  }
  res.json({
    address, username: names.get(a) ?? null, label: labelOf(address), custodial: labelOf(address) !== null,
    riskTier: risk ? TIER_NAME[risk.tier] ?? null : null, onChainTier: risk ? TIER_NAME[risk.onChainTier] ?? null : null, score: risk?.score ?? null,
    stats: {
      circles: circles.length,
      completedRounds: rep.paidOnTime + rep.missed,   // rounds this wallet was charged in (on-chain reputation)
      contributions: rep.paidOnTime,                  // on-time contributions (on-chain reputation)
      contributedTotal: t.contributions.toString(),
      defaults: rep.missed,
      circlesCompleted: rep.circlesCompleted,
      circlesRemoved: rep.circlesRemoved,
      payouts: payoutsCount,
      payoutsTotal: t.payouts.toString(),
      dividendsTotal: t.dividends.toString(),
    },
  });
}));

/**
 * End-to-end smoke test for the v3 auth / roles / audit API against a running backend + chain.
 *   BASE_URL=http://localhost:4000 ADMIN_KEY=0x… MEMBER_KEY=0x… npx tsx scripts/auth-smoke.ts
 * ADMIN_KEY must be listed in the backend's PLATFORM_ADMIN_ADDRESSES; MEMBER_KEY must not.
 * Defaults to the Hardhat accounts 8 (admin) and 9 (member) and http://localhost:4000.
 */
import { Wallet } from "ethers";

const BASE = process.env.BASE_URL ?? "http://localhost:4000";
const ADMIN_KEY = process.env.ADMIN_KEY ?? "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97";
const MEMBER_KEY = process.env.MEMBER_KEY ?? "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6";

type Json = Record<string, any>;
async function call(method: string, path: string, body?: unknown, token?: string): Promise<{ status: number; body: Json; headers: Headers }> {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed: Json = {};
  try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
  return { status: res.status, body: parsed, headers: res.headers };
}
let failures = 0;
function check(name: string, ok: boolean, detail?: unknown): void {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail !== undefined && !ok ? `  → ${JSON.stringify(detail)}` : ""}`);
  if (!ok) failures++;
}
async function login(w: Wallet): Promise<{ token: string; role: string; nonce: string }> {
  let n = await call("POST", "/auth/nonce", { address: w.address });
  if (n.status === 429) { // honour Retry-After once (the script itself exercises the 10/min limit)
    await new Promise((r) => setTimeout(r, (Number(n.headers.get("retry-after")) || 6) * 1000));
    n = await call("POST", "/auth/nonce", { address: w.address });
  }
  if (n.status !== 200) throw new Error(`nonce: ${n.status} ${JSON.stringify(n.body)}`);
  const signature = await w.signMessage(n.body.message);
  const v = await call("POST", "/auth/verify", { address: w.address, nonce: n.body.nonce, signature });
  if (v.status !== 200) throw new Error(`verify: ${v.status} ${JSON.stringify(v.body)}`);
  return { token: v.body.token, role: v.body.user.role, nonce: n.body.nonce };
}

async function main(): Promise<void> {
  const admin = new Wallet(ADMIN_KEY);
  const member = new Wallet(MEMBER_KEY);
  console.log(`backend ${BASE}\nadmin  ${admin.address}\nmember ${member.address}\n`);

  const a = await login(admin);
  const m = await login(member);
  console.log(`roles: admin=${a.role} member=${m.role}`);
  check("admin logs in as ADMIN", a.role === "ADMIN", a);
  check("member logs in as MEMBER", m.role === "MEMBER", m);

  // wrong signature → 401 BAD_SIGNATURE
  const n1 = await call("POST", "/auth/nonce", { address: member.address });
  const badSig = await admin.signMessage(n1.body.message); // signed by the wrong key
  const r1 = await call("POST", "/auth/verify", { address: member.address, nonce: n1.body.nonce, signature: badSig });
  check("wrong signature → 401 BAD_SIGNATURE", r1.status === 401 && r1.body.code === "BAD_SIGNATURE", r1);

  // reused nonce → 401 NONCE_INVALID
  const sigAgain = await member.signMessage((await call("POST", "/auth/nonce", { address: member.address })).body.message); // unrelated fresh nonce, just to have a valid-looking sig
  const r2 = await call("POST", "/auth/verify", { address: member.address, nonce: m.nonce, signature: sigAgain });
  check("reused nonce → 401 NONCE_INVALID", r2.status === 401 && r2.body.code === "NONCE_INVALID", r2);

  // rate limit: 10/min per IP on /auth/nonce → the next request in this minute is 429
  let limited: { status: number; body: Json; headers: Headers } | null = null;
  for (let i = 0; i < 12; i++) {
    const r = await call("POST", "/auth/nonce", { address: Wallet.createRandom().address });
    if (r.status === 429) { limited = r; break; }
  }
  check("11th+ nonce in a minute → 429 RATE_LIMITED with Retry-After", !!limited && limited.body.code === "RATE_LIMITED" && !!limited.headers.get("retry-after"), limited?.body);

  const meA = await call("GET", "/me", undefined, a.token);
  const meM = await call("GET", "/me", undefined, m.token);
  check("GET /me 200 for admin", meA.status === 200 && meA.body.user?.role === "ADMIN", meA.body);
  check("GET /me 200 for member", meM.status === 200 && typeof meM.body.totals?.contributions === "string", meM.body);
  const authMe = await call("GET", "/auth/me", undefined, m.token);
  check("GET /auth/me returns user + session", authMe.status === 200 && authMe.body.session?.id, authMe.body);

  const d0 = await call("POST", "/demo/new-circle", {});
  check("POST /demo/new-circle without token → 401 NO_AUTH", d0.status === 401 && d0.body.code === "NO_AUTH", d0.body);
  const d1 = await call("POST", "/demo/new-circle", {}, m.token);
  check("POST /demo/new-circle with member token → 403 FORBIDDEN", d1.status === 403 && d1.body.code === "FORBIDDEN", d1.body);
  const d2 = await call("POST", "/demo/new-circle", { contributionDuration: 30, biddingDuration: 30 }, a.token);
  check("POST /demo/new-circle with admin token → 200", d2.status === 200 && typeof d2.body.circleId === "number", d2.body);
  const circleId: number = d2.body.circleId;

  await new Promise((r) => setTimeout(r, 500)); // audit writes are fire-and-forget
  const au = await call("GET", "/admin/audit?limit=200", undefined, a.token);
  const actions = new Set((au.body.rows ?? []).map((r: Json) => r.action));
  check("/admin/audit contains demo.new-circle and auth.login", au.status === 200 && actions.has("demo.new-circle") && actions.has("auth.login"), [...actions]);
  const auM = await call("GET", "/admin/audit", undefined, m.token);
  check("/admin/audit with member token → 403", auM.status === 403, auM.body);

  const cs = await call("GET", `/circles/${circleId}`);
  check("CircleSummary has name + organizerWallet from CircleMeta", cs.body.circle?.name === `Demo circle #${circleId}` && typeof cs.body.circle?.organizerWallet === "string", cs.body.circle);

  const claim = await call("POST", `/circles/${circleId}/claim`, { name: "Mine" }, m.token);
  check("claim by non-creator → 403 NOT_CREATOR", claim.status === 403 && claim.body.code === "NOT_CREATOR", claim.body);

  const selfRole = await call("PATCH", `/admin/users/${admin.address}`, { role: "MEMBER" }, a.token);
  check("PATCH own role → 400 CANNOT_EDIT_SELF_ROLE", selfRole.status === 400 && selfRole.body.code === "CANNOT_EDIT_SELF_ROLE", selfRole.body);
  const orgBefore = await call("GET", "/organizer/circles", undefined, m.token);
  check("GET /organizer/circles as MEMBER → 403 FORBIDDEN", orgBefore.status === 403 && orgBefore.body.code === "FORBIDDEN", orgBefore.body);
  const promote = await call("PATCH", `/admin/users/${member.address}`, { role: "ORGANIZER" }, a.token);
  check("PATCH member → ORGANIZER 200", promote.status === 200 && promote.body.user?.role === "ORGANIZER", promote.body);
  const org = await call("GET", "/organizer/circles", undefined, m.token); // same token: role is re-read from the DB per request
  check("GET /organizer/circles with (now organizer) member token → 200", org.status === 200 && Array.isArray(org.body.circles), org.body);
  const orgAdmin = await call("GET", "/organizer/circles", undefined, a.token);
  check("GET /organizer/circles as ADMIN lists every circle incl. members/round", orgAdmin.status === 200 && orgAdmin.body.circles.some((c: Json) => c.id === circleId && Array.isArray(c.members) && c.round), orgAdmin.body);
  const an = await call("GET", `/organizer/circles/${circleId}/analytics`, undefined, a.token);
  check("analytics 200 with rounds/defaults/contributionRate + round object", an.status === 200 && Array.isArray(an.body.rounds) && typeof an.body.contributionRate === "number" && typeof an.body.round?.phase === "string" && typeof an.body.roundNumber === "number", an.body);
  const inv = await call("POST", `/organizer/circles/${circleId}/invites`, { addresses: [member.address] }, a.token);
  const invList = await call("GET", `/organizer/circles/${circleId}/invites`, undefined, a.token);
  const myInv = await call("GET", "/me/invites", undefined, m.token);
  check("invites: POST + GET (organizer) + GET /me/invites carry walletAddress", inv.status === 200 && invList.body.invites?.[0]?.walletAddress === member.address.toLowerCase() && myInv.body.invites?.[0]?.circleId === circleId, { inv: inv.body, myInv: myInv.body });
  const del = await call("DELETE", `/organizer/circles/${circleId}/invites/${member.address}`, undefined, a.token);
  check("DELETE invite → { ok: true }", del.body.ok === true, del.body);

  const t = await call("POST", "/support", { subject: "Hello", message: "Just testing the support desk." }, m.token);
  check("POST /support 200", t.status === 200 && t.body.ticket?.status === "OPEN", t.body);
  const tp = await call("PATCH", `/admin/support/${t.body.ticket?.id}`, { status: "CLOSED", adminNote: "done" }, a.token);
  check("PATCH /admin/support/:id 200", tp.status === 200 && tp.body.ticket?.status === "CLOSED", tp.body);

  const ov = await call("GET", "/admin/overview", undefined, a.token);
  check("/admin/overview has keeper.status and loops", ov.status === 200 && ["ONLINE", "STALE", "OFFLINE"].includes(ov.body.keeper?.status) && Array.isArray(ov.body.loops), ov.body);
  console.log(`  keeper.status=${ov.body.keeper?.status} loops=${(ov.body.loops ?? []).map((l: Json) => `${l.name}:${l.ticks}`).join(",")} mst=${JSON.stringify(ov.body.mst)}`);
  const cfg = await call("GET", "/admin/config", undefined, a.token);
  check("/admin/config never leaks secrets", cfg.status === 200 && !JSON.stringify(cfg.body).match(/DATABASE_URL|PRIVATE_KEY|SESSION_SECRET=|postgres:\/\//), cfg.body);
  const h = await call("GET", "/health");
  check("/health.loops length 3 + tx + indexerHealthy", h.body.loops?.length === 3 && typeof h.body.tx?.total === "number" && typeof h.body.indexerHealthy === "boolean", h.body);

  const lo = await call("POST", "/auth/logout", undefined, m.token);
  const after = await call("GET", "/auth/me", undefined, m.token);
  check("logout revokes the session → 401 SESSION_REVOKED", lo.body.ok === true && after.status === 401 && after.body.code === "SESSION_REVOKED", after.body);

  console.log(`\n${failures === 0 ? "ALL PASSED" : `${failures} FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });

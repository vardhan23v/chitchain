import { Router } from "express";
import { z } from "zod";
import { config } from "../config";
import { cachedRead, contractAddress, contractAs, deployer, demoWallets, getMember, getMembers, isConfigured, keeper, oracle, preflight, provider, readContract, sendTx, txStats } from "../chain";
import { loopStatus } from "../bus";
import {
  countAdmins, countAuditSince, countDemoMeta, countOpenTickets, countUsers, demoCircleIds, getLastBlock, getTicket, getUser, listAudit, listTickets, listUsers,
  revokeSessionsFor, updateTicket, updateUser, prisma, countDistinctTx,
} from "../db";
import { audit } from "../auth/audit";
import { requireAuth, requireRole } from "../auth/middleware";
import { allCircles } from "./circles";
import { ApiError, optionalInt, parseUserId, wrap } from "./util";

export const admin = Router();
admin.use("/admin", requireAuth(), requireRole("ADMIN"));

const nowSec = (): number => Math.floor(Date.now() / 1000);
const bal = async (a: string): Promise<string> => (await provider.getBalance(a).catch(() => 0n)).toString();

/** GET /admin/overview → AdminOverview */
admin.get("/admin/overview", wrap(async (_req, res) => {
  const [users, open, last24h, demoMeta, demoIds] = await Promise.all([countUsers(), countOpenTickets(), countAuditSince(nowSec() - 86_400), countDemoMeta(), demoCircleIds()]);
  let latestBlock = 0; let connected = false;
  try { latestBlock = await provider.getBlockNumber(); connected = true; } catch { /* rpc down */ }
  const lastIndexedBlock = await getLastBlock();

  const circles = { total: 0, open: 0, active: 0, completed: 0, cancelled: 0, demo: Math.max(demoMeta, demoIds.length) };
  const mst = { locked: 0n, pots: 0n, collateral: 0n, reserve: 0n };
  let defaults = 0;
  if (isConfigured()) {
    const list = await allCircles();
    circles.total = list.length;
    mst.locked = await provider.getBalance(contractAddress!).catch(() => 0n);
    for (const { id, c } of list) {
      if (c.status === 0) circles.open++; else if (c.status === 1) circles.active++; else if (c.status === 2) circles.completed++; else circles.cancelled++;
      mst.reserve += c.reserve;
      if (c.status !== 0 && c.status !== 1) continue; // bounded scan: only live circles are walked member by member
      const addrs = await getMembers(id);
      const states = await Promise.all(addrs.map((a) => getMember(id, a)));
      for (const s of states) { mst.collateral += s.collateral; defaults += s.defaults; if (c.status === 1 && s.paidThisRound) mst.pots += c.contribution; }
    }
  }
  const loops = loopStatus();
  const k = loops.find((l) => l.name === "keeper");
  const keeperStatus: "ONLINE" | "STALE" | "OFFLINE" = !keeper || !k || k.lastTickAt === null ? "OFFLINE"
    : k.lastOkAt !== null && nowSec() - k.lastOkAt <= 30 ? "ONLINE" : "STALE";
  res.json({
    users, circles,
    mst: { locked: mst.locked.toString(), pots: mst.pots.toString(), collateral: mst.collateral.toString(), reserve: mst.reserve.toString() },
    // defaults and indexedTx come from indexed contract events, so they cover every circle and survive restarts;
    // `tx` is this backend process's own send counters (reset on deploy).
    defaults: Math.max(defaults, await prisma.event.count({ where: { name: "DefaultDetected" } })),
    indexedTx: await countDistinctTx(),
    tx: txStats(), tickets: { open }, audit: { last24h },
    chain: { chainId: config.MST_CHAIN_ID, latestBlock, lastIndexedBlock, lag: lastIndexedBlock === null ? latestBlock : Math.max(0, latestBlock - lastIndexedBlock), connected },
    contract: { address: contractAddress, status: isConfigured() ? "ACTIVE" : "NOT_CONFIGURED", explorer: config.EXPLORER },
    loops, keeper: { address: keeper?.address ?? null, balance: keeper ? await bal(keeper.address) : "0", status: keeperStatus },
    wallets: {
      deployer: deployer ? { address: deployer.address, balance: await bal(deployer.address) } : null,
      oracle: oracle ? { address: oracle.address, balance: await bal(oracle.address) } : null,
    },
  });
}));

const roleEnum = z.enum(["MEMBER", "ORGANIZER", "ADMIN"]);
const statusEnum = z.enum(["ACTIVE", "SUSPENDED"]);
/** GET /admin/users?role&status&q&limit → { users: (User & { circles })[] } */
admin.get("/admin/users", wrap(async (req, res) => {
  const role = roleEnum.safeParse(req.query.role); const status = statusEnum.safeParse(req.query.status);
  const rows = await listUsers({ role: role.success ? role.data : undefined, status: status.success ? status.data : undefined, q: typeof req.query.q === "string" ? req.query.q : undefined, limit: optionalInt(req.query.limit) });
  const circles = await prisma.circleMeta.groupBy({ by: ["organizerWallet"], _count: { _all: true }, where: { organizerWallet: { in: rows.map((u) => u.walletAddress) } } });
  const byOrg = new Map(circles.map((c) => [c.organizerWallet, c._count._all]));
  res.json({ users: rows.map((u) => ({ ...u, circles: byOrg.get(u.walletAddress) ?? 0 })) });
}));

const userPatch = z.object({ role: roleEnum.optional(), status: statusEnum.optional(), displayName: z.string().trim().max(40).nullable().optional() });
/** PATCH /admin/users/:addr { role?, status?, displayName? } → { user } (400 CANNOT_EDIT_SELF_ROLE, 409 LAST_ADMIN) */
admin.patch("/admin/users/:addr", wrap(async (req, res) => {
  const addr = parseUserId(req.params.addr).toLowerCase();
  const parsed = userPatch.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "body: { role?: MEMBER|ORGANIZER|ADMIN, status?: ACTIVE|SUSPENDED, displayName?: string|null }", "BAD_BODY");
  const before = await getUser(addr);
  if (!before) throw new ApiError(404, "user not found", "NOT_FOUND");
  const { role, status, displayName } = parsed.data;
  const self = addr === req.auth!.address;
  if (self && ((role && role !== before.role) || (status && status !== before.status))) throw new ApiError(400, "you cannot change your own role or status", "CANNOT_EDIT_SELF_ROLE");
  const demotes = before.role === "ADMIN" && before.status === "ACTIVE" && ((role && role !== "ADMIN") || status === "SUSPENDED");
  if (demotes && (await countAdmins()) <= 1) throw new ApiError(409, "cannot remove the last active admin", "LAST_ADMIN");
  const user = await updateUser(addr, { ...(role ? { role } : {}), ...(status ? { status } : {}), ...(displayName !== undefined ? { displayName: displayName === "" ? null : displayName } : {}) });
  let revoked = 0;
  if (status === "SUSPENDED") revoked = await revokeSessionsFor(addr); // role changes need no revoke: the role is re-read from the User row per request
  audit(req, "admin.user.update", addr, "ok", { meta: { before: { role: before.role, status: before.status }, after: { role: user.role, status: user.status }, displayName, revokedSessions: revoked } });
  res.json({ user });
}));

/** GET /admin/audit?limit&actor&action&since → { rows } newest first */
admin.get("/admin/audit", wrap(async (req, res) => {
  const actor = typeof req.query.actor === "string" && req.query.actor ? parseUserId(req.query.actor).toLowerCase() : undefined;
  const action = typeof req.query.action === "string" && req.query.action ? req.query.action : undefined;
  res.json({ rows: await listAudit({ limit: optionalInt(req.query.limit), actor, action, since: optionalInt(req.query.since) }) });
}));

/** GET /admin/support?status → { tickets } */
admin.get("/admin/support", wrap(async (req, res) => {
  const st = z.enum(["OPEN", "CLOSED"]).safeParse(req.query.status);
  res.json({ tickets: await listTickets(st.success ? st.data : undefined) });
}));
const ticketPatch = z.object({ status: z.enum(["OPEN", "CLOSED"]).optional(), adminNote: z.string().trim().max(2000).nullable().optional() });
/** PATCH /admin/support/:id { status?, adminNote? } → { ticket } */
admin.patch("/admin/support/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) throw new ApiError(400, "invalid ticket id", "BAD_ID");
  const parsed = ticketPatch.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "body: { status?: OPEN|CLOSED, adminNote?: string|null }", "BAD_BODY");
  if (!(await getTicket(id))) throw new ApiError(404, "ticket not found", "NOT_FOUND");
  const ticket = await updateTicket(id, { ...(parsed.data.status ? { status: parsed.data.status } : {}), ...(parsed.data.adminNote !== undefined ? { adminNote: parsed.data.adminNote } : {}) });
  audit(req, "admin.support.update", `ticket:${id}`, "ok", { meta: { status: ticket.status, adminNote: ticket.adminNote } });
  res.json({ ticket });
}));

/** GET /admin/config → safe subset (never keys, never DATABASE_URL, never SESSION_SECRET). */
admin.get("/admin/config", wrap(async (_req, res) => {
  res.json({
    chain: { rpcUrl: config.MST_RPC_URL, chainId: config.MST_CHAIN_ID, explorer: config.EXPLORER, contract: contractAddress, startBlock: config.START_BLOCK },
    wallets: { deployer: deployer?.address ?? null, keeper: keeper?.address ?? null, oracle: oracle?.address ?? null, treasury: config.TREASURY_ADDRESS ?? null, demo: demoWallets.map((w) => ({ label: w.label, address: w.address })) },
    auth: { domain: config.AUTH_DOMAIN, sessionTtlSec: config.SESSION_TTL_SEC, nonceTtlSec: config.NONCE_TTL_SEC, platformAdmins: config.PLATFORM_ADMIN_ADDRESSES, sessionSecretEphemeral: config.sessionSecretEphemeral, adminPasswordLogin: config.adminPasswordLogin, adminLoginUser: config.ADMIN_LOGIN_USER ?? null },
    llm: { configured: config.LLM_API_KEY !== "", baseUrl: config.LLM_BASE_URL, model: config.LLM_MODEL },
    server: { port: config.PORT, frontendOrigin: config.FRONTEND_ORIGIN, nodeEnv: config.NODE_ENV || null, railway: config.RAILWAY_ENVIRONMENT || null, database: "configured" },
  });
}));

// ───────────── treasury ─────────────
/** On-chain treasury address (immutable, set at deploy) and claimable wei (`treasuryClaimable()` public getter). */
async function treasuryView(): Promise<{ treasury: string; claimable: bigint }> {
  const c = readContract();
  const [treasury, claimable] = await Promise.all([
    cachedRead("treasury", async () => String(await c.treasury()), 60 * 60 * 1000),
    cachedRead("treasuryClaimable", async () => BigInt(await c.treasuryClaimable())),
  ]);
  return { treasury, claimable };
}
/** GET /admin/treasury → { treasury, claimable (wei string), signer, canWithdraw, lastWithdrawTx } */
admin.get("/admin/treasury", wrap(async (_req, res) => {
  if (!isConfigured()) throw new ApiError(503, "CHITCHAIN_ADDRESS not configured", "NO_CONTRACT");
  const { treasury, claimable } = await treasuryView();
  const last = (await listAudit({ action: "admin.treasury.withdraw", limit: 20 })).find((r) => r.result === "ok" && r.txHash);
  const canWithdraw = !!deployer && deployer.address.toLowerCase() === treasury.toLowerCase();
  res.json({
    treasury, claimable: claimable.toString(), balance: await bal(treasury),
    signer: deployer?.address ?? null, canWithdraw,
    lastWithdrawTx: last ? { txHash: last.txHash, ts: last.ts, amount: (last.meta?.amount as string | undefined) ?? null } : null,
  });
}));
/**
 * POST /admin/treasury/withdraw → { txHash, amount }. The contract's withdrawTreasury() may only be called by the
 * treasury address itself (OnlyTreasury); on MST testnet the deployer wallet IS the treasury (deployments/mstTestnet.json),
 * so the tx is sent from the deployer ManagedWallet. 409 NOTHING_TO_WITHDRAW when claimable is 0, 503 when the
 * configured deployer is not the treasury.
 */
admin.post("/admin/treasury/withdraw", wrap(async (req, res) => {
  if (!isConfigured()) throw new ApiError(503, "CHITCHAIN_ADDRESS not configured", "NO_CONTRACT");
  if (!deployer) throw new ApiError(503, "DEPLOYER_PRIVATE_KEY not configured", "NO_DEPLOYER");
  const { treasury, claimable } = await treasuryView();
  if (deployer.address.toLowerCase() !== treasury.toLowerCase()) {
    audit(req, "admin.treasury.withdraw", treasury, "denied", { meta: { reason: "deployer is not the treasury", signer: deployer.address } });
    throw new ApiError(503, `only the treasury (${treasury}) may withdraw; the configured deployer is ${deployer.address}`, "NOT_TREASURY");
  }
  if (claimable === 0n) throw new ApiError(409, "nothing to withdraw", "NOTHING_TO_WITHDRAW");
  const contract = contractAs(deployer);
  await preflight(contract, "withdrawTreasury", []);
  let rc;
  try {
    rc = await sendTx("admin withdrawTreasury", deployer, () => contract.withdrawTreasury());
  } catch (e) {
    audit(req, "admin.treasury.withdraw", treasury, "failed", { meta: { amount: claimable.toString(), error: e instanceof Error ? e.message.slice(0, 300) : String(e) } });
    throw e;
  }
  audit(req, "admin.treasury.withdraw", treasury, "ok", { txHash: rc.hash, meta: { amount: claimable.toString(), signer: deployer.address } });
  res.json({ txHash: rc.hash, amount: claimable.toString() });
}));

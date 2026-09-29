import { parseEther } from "ethers";
import {
  contractAs, deployer, demoWallet, demoWallets, errorMessage, getCircle, getCircleCount, getMember, getMembers, getRequiredCollateral, getRound, isConfigured, potOf,
  preflight, provider, sendTx, type CircleView, type DemoWallet, type ManagedWallet,
} from "./chain";
import { activeBidAgents, addDemoCircle, demoCircleIds, getSkip } from "./db";
import { DECIDE_DELAY_SEC, OFFER_START_SEC, OFFER_STEP_SEC, demoScript, discountForOffer } from "./demo/script";
import { loop } from "./bus";
import { auditSystem } from "./auth/audit";

/**
 * Demo autopilot, for circles created via /demo/new-circle (custodial demo wallets A–E only):
 * - contributes for every demo wallet ~5 s into each round unless the wallet is marked `skip` or the script skips it;
 * - when a demo wallet is the round's recipient and nobody decided yet, accepts or declines per demo/script.ts;
 * - after a decline, places the scripted payout offers one by one (real bids from each member's own key).
 * One tx at a time per wallet.
 */
const CONTRIBUTE_DELAY_SEC = 5;
const busy = new Set<string>(); // wallet addresses with a tx in flight
const done = new Set<string>(); // `${circleId}:${round}:${addr}` already handled

export const MIN_BALANCE = parseEther("0.3");
export const TOP_UP_TO = parseEther("0.6");

/** Tops up a demo wallet from the deployer if below MIN_BALANCE. Returns the tx hash or null. */
export async function ensureFunded(address: string, min = MIN_BALANCE, target = TOP_UP_TO): Promise<string | null> {
  if (!deployer) throw new Error("DEPLOYER_PRIVATE_KEY not configured");
  const bal = await provider.getBalance(address);
  if (bal >= min) return null;
  const need = target - bal;
  const deployerBal = await provider.getBalance(deployer.address);
  if (deployerBal < need + parseEther("0.05")) {
    console.warn(`[demo] cannot fund ${address}: deployer has ${deployerBal} wei, needs ${need} — claim faucet MST for the deployer`);
    return null; // never block the demo on a top-up the deployer cannot afford
  }
  const tx = await deployer.sendTransaction({ to: address, value: need });
  console.log(`[demo] funding ${address} sent ${tx.hash}`);
  await tx.wait(1);
  console.log(`[demo] funded ${address} txHash ${tx.hash}`);
  auditSystem("AUTOPILOT", "autopilot.fund", address.toLowerCase(), "ok", tx.hash, { amount: need.toString() });
  return tx.hash;
}

async function withWallet<T>(wallet: ManagedWallet, fn: () => Promise<T>): Promise<T | null> {
  const key = wallet.address.toLowerCase();
  if (busy.has(key)) return null;
  busy.add(key);
  try { return await fn(); } finally { busy.delete(key); }
}

// ───────────── background join queue (POST /demo/new-circle) ─────────────
/** Per-wallet join attempts: 3 tries with 5 s / 15 s backoff, then the wallet is reported in `failures`. */
const JOIN_MAX_ATTEMPTS = 3;
const JOIN_BACKOFF_MS = [0, 5000, 15_000];
interface JoinWalletState { label: string; address: string; attempts: number; nextAt: number; joined: boolean; lastError: string | null; txHash: string | null }
interface JoinQueueEntry { circleId: number; queuedAt: number; wallets: JoinWalletState[] }
export interface JoinQueueStatus { circleId: number; joined: number; total: number; failures: { label: string; address: string; attempts: number; error: string | null }[]; lastError: string | null; done: boolean }
const joinQueue = new Map<number, JoinQueueEntry>();
const JOIN_QUEUE_KEEP_MS = 10 * 60 * 1000; // finished entries stay visible in /demo/state for 10 min

/** Queues every demo wallet to join `circleId`; the autopilot loop drains it (retries, audit entries). */
export function enqueueJoin(circleId: number): void {
  if (joinQueue.has(circleId)) return;
  joinQueue.set(circleId, {
    circleId, queuedAt: Date.now(),
    wallets: demoWallets.map((w) => ({ label: w.label, address: w.address, attempts: 0, nextAt: 0, joined: false, lastError: null, txHash: null })),
  });
  void drainJoinQueue().catch((e) => console.error(`[autopilot] join queue: ${errorMessage(e)}`));
}
const entryDone = (e: JoinQueueEntry): boolean => e.wallets.every((w) => w.joined || w.attempts >= JOIN_MAX_ATTEMPTS);
/** Snapshot for GET /demo/state. */
export function joinQueueStatus(): JoinQueueStatus[] {
  return [...joinQueue.values()].map((e) => {
    const failures = e.wallets.filter((w) => !w.joined && w.attempts >= JOIN_MAX_ATTEMPTS).map((w) => ({ label: w.label, address: w.address, attempts: w.attempts, error: w.lastError }));
    const lastError = e.wallets.map((w) => w.lastError).filter((x): x is string => !!x).pop() ?? null;
    return { circleId: e.circleId, joined: e.wallets.filter((w) => w.joined).length, total: e.wallets.length, failures, lastError, done: entryDone(e) };
  });
}

let draining = false;
async function drainJoinQueue(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    const now = Date.now();
    for (const entry of joinQueue.values()) {
      if (entryDone(entry)) { if (now - entry.queuedAt > JOIN_QUEUE_KEEP_MS) joinQueue.delete(entry.circleId); continue; }
      for (const st of entry.wallets) {
        if (st.joined || st.attempts >= JOIN_MAX_ATTEMPTS || Date.now() < st.nextAt) continue;
        const w = demoWallets.find((d) => d.address.toLowerCase() === st.address.toLowerCase());
        if (!w) { st.attempts = JOIN_MAX_ATTEMPTS; st.lastError = "wallet no longer configured"; continue; }
        await joinOne(entry.circleId, w, st);
      }
    }
  } finally { draining = false; }
}
async function joinOne(circleId: number, w: DemoWallet, st: JoinWalletState): Promise<void> {
  st.attempts += 1;
  st.nextAt = Date.now() + (JOIN_BACKOFF_MS[st.attempts] ?? JOIN_BACKOFF_MS[JOIN_BACKOFF_MS.length - 1]);
  try {
    const m = await getMember(circleId, w.address);
    if (m.joined) { st.joined = true; return; }
    const need = await getRequiredCollateral(w.address, circleId);
    const contract = contractAs(w.wallet); // custodial demo wallet — join from the member's own key
    await preflight(contract, "join", [circleId], { value: need });
    const rc = await withWallet(w.wallet, () => sendTx(`demo join ${w.label} circle ${circleId}`, w.wallet, () => contract.join(circleId, { value: need })));
    if (!rc) { st.attempts -= 1; return; } // wallet busy with another tx: not an attempt, retry next tick
    st.joined = true; st.txHash = rc.hash; st.lastError = null;
    auditSystem("AUTOPILOT", "autopilot.join", `circle:${circleId}`, "ok", rc.hash, { member: w.address, label: w.label, collateral: need.toString(), attempt: st.attempts });
  } catch (e) {
    const msg = errorMessage(e);
    st.lastError = msg;
    if (/AlreadyJoined|AlreadyMember/.test(msg)) { st.joined = true; st.lastError = null; return; }
    if (/CircleFull|NotOpen|JoinWindowClosed|JoinClosed/.test(msg)) st.attempts = JOIN_MAX_ATTEMPTS; // no point retrying
    console.error(`[autopilot] join ${w.label} circle ${circleId} attempt ${st.attempts}/${JOIN_MAX_ATTEMPTS}: ${msg}`);
    auditSystem("AUTOPILOT", "autopilot.join", `circle:${circleId}`, "failed", null, { member: w.address, label: w.label, attempt: st.attempts, error: msg });
  }
}

/** Accept or decline the full pot from a custodial recipient's own key. Shared by the autopilot and POST /demo/decide. */
export async function decideFor(circleId: number, w: DemoWallet, decision: "accept" | "decline", ctx: string): Promise<string> {
  const method = decision === "accept" ? "acceptFullPot" : "declineFullPot";
  const contract = contractAs(w.wallet); // custodial demo wallet — decide from the member's own key
  await preflight(contract, method, [circleId]);
  const rc = await withWallet(w.wallet, () => sendTx(`${ctx} ${method} ${w.label} circle ${circleId}`, w.wallet, () => contract[method](circleId)));
  if (!rc) throw new Error("wallet busy, try again");
  auditSystem("AUTOPILOT", `autopilot.${decision}`, `circle:${circleId}`, "ok", rc.hash, { member: w.address, label: w.label, ctx });
  return rc.hash;
}

const decided = new Set<string>(); // `${circleId}:${round}` once the script acted (or failed) on the decision
const offered = new Set<string>(); // `${circleId}:${round}:${label}` once a scripted offer was sent or skipped

async function scriptDecision(circleId: number, c: CircleView, nowSec: number): Promise<void> {
  const key = `${circleId}:${c.round}`;
  if (decided.has(key)) return;
  const w = demoWallet(c.recipient);
  if (!w) { decided.add(key); return; } // a real wallet is the recipient: only they decide
  const opensAt = c.decisionDeadline - c.biddingDuration;
  if (nowSec < opensAt + DECIDE_DELAY_SEC || nowSec >= c.decisionDeadline - 2) return;
  decided.add(key);
  const decision = demoScript(c.round).decision;
  try { await decideFor(circleId, w, decision, "autopilot"); } catch (e) {
    const msg = errorMessage(e);
    console.error(`[autopilot] ${decision} ${w.label} circle ${circleId} round ${c.round}: ${msg}`);
    auditSystem("AUTOPILOT", `autopilot.${decision}`, `circle:${circleId}`, "failed", null, { round: c.round, member: w.address, label: w.label, error: msg });
  }
}

async function scriptOffers(circleId: number, c: CircleView, nowSec: number): Promise<void> {
  const offers = demoScript(c.round).offers;
  if (!offers.length) return;
  const opensAt = c.roundDeadline - c.biddingDuration;
  if (nowSec >= c.roundDeadline - 2) return;
  const agents = new Set((await activeBidAgents()).filter((a) => a.circleId === circleId).map((a) => a.member.toLowerCase()));
  for (let i = 0; i < offers.length; i++) {
    const o = offers[i];
    const key = `${circleId}:${c.round}:${o.label}`;
    if (offered.has(key)) continue;
    if (nowSec < opensAt + OFFER_START_SEC + i * OFFER_STEP_SEC) return; // offers go out in order
    offered.add(key);
    const w = demoWallets.find((d) => d.label === o.label);
    if (!w || agents.has(w.address.toLowerCase())) continue; // an AI agent bids for this wallet instead
    const round = await getRound(circleId);
    const discount = discountForOffer(potOf(round), o.payoutPct);
    if (discount <= round.bestDiscount) continue; // someone already offered a lower payout
    const contract = contractAs(w.wallet); // custodial demo wallet — bid from the member's own key
    try {
      await preflight(contract, "placeBid", [circleId, discount]);
      const rc = await withWallet(w.wallet, () => sendTx(`autopilot offer ${w.label} circle ${circleId} round ${c.round}`, w.wallet, () => contract.placeBid(circleId, discount)));
      if (rc) auditSystem("AUTOPILOT", "autopilot.bid", `circle:${circleId}`, "ok", rc.hash, { round: c.round, member: w.address, label: w.label, discount: discount.toString(), payoutPct: o.payoutPct });
    } catch (e) {
      const msg = errorMessage(e);
      console.log(`[autopilot] offer ${w.label} circle ${circleId} round ${c.round} skipped: ${msg}`);
    }
    return; // one offer per tick keeps the order visible
  }
}

async function contributeFor(circleId: number, round: number, label: string, wallet: ManagedWallet, contribution: bigint): Promise<void> {
  const key = `${circleId}:${round}:${wallet.address.toLowerCase()}`;
  if (done.has(key)) return;
  await withWallet(wallet, async () => {
    const m = await getMember(circleId, wallet.address);
    if (!m.joined || m.removed || m.paidThisRound) { done.add(key); return; }
    // top up to a few contributions plus gas, not a fixed 0.6 MST the deployer may not have
    if ((await provider.getBalance(wallet.address)) < contribution * 2n) await ensureFunded(wallet.address, contribution * 2n, contribution * 5n + parseEther("0.02"));
    const contract = contractAs(wallet);
    try {
      await preflight(contract, "contribute", [circleId], { value: contribution });
      // custodial demo wallet — contribute from the member's own key
      const rc = await sendTx(`autopilot ${label} circle ${circleId} round ${round}`, wallet, () => contract.contribute(circleId, { value: contribution }));
      done.add(key);
      auditSystem("AUTOPILOT", "autopilot.contribute", `circle:${circleId}`, "ok", rc.hash, { round, member: wallet.address, label, amount: contribution.toString() });
    } catch (e) {
      const msg = errorMessage(e);
      if (/AlreadyPaid|ContributionClosed|NotActive|MemberRemoved/.test(msg)) done.add(key);
      console.error(`[autopilot] ${label} circle ${circleId} round ${round}: ${msg}`);
      auditSystem("AUTOPILOT", "autopilot.contribute", `circle:${circleId}`, "failed", null, { round, member: wallet.address, label, error: msg });
    }
  });
}

const creatorChecked = new Set<number>();
/** Demo circles = those recorded by /demo/new-circle, plus any circle created by the deployer wallet (survives a DB reset). */
async function discoverDemoCircles(): Promise<number[]> {
  if (deployer) {
    const count = await getCircleCount();
    for (let id = 1; id <= count; id++) {
      if (creatorChecked.has(id)) continue;
      try {
        const c = await getCircle(id);
        creatorChecked.add(id);
        if (c.creator.toLowerCase() === deployer.address.toLowerCase()) await addDemoCircle(id);
      } catch (e) { console.error(`[autopilot] circle ${id}: ${errorMessage(e)}`); }
    }
  }
  return await demoCircleIds();
}

async function autopilotTick(): Promise<void> {
  if (!isConfigured() || demoWallets.length === 0) return;
  await drainJoinQueue();
  const nowSec = Math.floor(Date.now() / 1000);
  for (const circleId of await discoverDemoCircles()) {
    let circle;
    try { circle = await getCircle(circleId); } catch (e) { console.error(`[autopilot] circle ${circleId}: ${errorMessage(e)}`); continue; }
    if (circle.status !== 1) continue;
    if (circle.phase === 1) { await scriptDecision(circleId, circle, nowSec); continue; }
    if (circle.phase === 2) { await scriptOffers(circleId, circle, nowSec); continue; }
    // Contributing: only until contributionDeadline; the last payment closes the phase on-chain.
    const roundStart = circle.contributionDeadline - circle.contributionDuration;
    if (nowSec < roundStart + CONTRIBUTE_DELAY_SEC || nowSec >= circle.contributionDeadline - 2) continue;
    const members = new Set((await getMembers(circleId)).map((a) => a.toLowerCase()));
    for (const w of demoWallets) {
      if (!members.has(w.address.toLowerCase())) continue;
      if (await getSkip(w.address)) continue;
      if (demoScript(circle.round).skip.includes(w.label)) continue; // scripted missed payment (collateral covers it)
      await contributeFor(circleId, circle.round, w.label, w.wallet, circle.contribution);
    }
  }
}

export function startAutopilot(): void {
  console.log(`[autopilot] demo wallets: ${demoWallets.map((w) => `${w.label}=${w.address}`).join(", ") || "(none)"}`);
  loop("autopilot", 2000, autopilotTick);
}

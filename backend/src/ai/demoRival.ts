/**
 * Demo mode: a REAL rival bid from another custodial demo wallet on testnet so the WAIT → new bid → BID story
 * happens on-chain. Nothing here is simulated: the tx is sent, mined and indexed like any other bid.
 * Fires once per circle round, 25 s after the agent was activated, only while the agent is ACTIVE in BIDDING.
 */
import { contractAs, demoWallet, demoWallets, errorMessage, getMember, potOf, preflight, provider, sendTx, type RoundView } from "../chain";
import { insertAgentLog, lastAgentEvent, type BidAgentApi } from "../db";
import { auditSystem } from "../auth/audit";
import { GAS_RESERVE_WEI, pctOfPot } from "./riskGuard";
import { asMst } from "./fallback";
import { recordEvent } from "./sse";
import type { AuctionSnapshot } from "./types";

export const RIVAL_DELAY_SEC = 25;
const RIVAL_STEP_PCT = 2;
const RIVAL_CAP_PCT = 10;
/** `${circleId}:${round}` once a rival bid was placed (or attempted) for that round in this process. */
const placed = new Set<string>();
const inFlight = new Set<string>();

async function alreadyThisRound(agent: BidAgentApi, round: number): Promise<boolean> {
  const key = `${agent.circleId}:${round}`;
  if (placed.has(key)) return true;
  const last = await lastAgentEvent(agent.id, "RIVAL_BID");
  if (last && Number(last.data?.round) === round) { placed.add(key); return true; }
  return false;
}

/** Places the rival bid when the conditions hold. Returns true when a bid was sent this call. */
export async function maybeDemoRival(agent: BidAgentApi, snap: AuctionSnapshot, round: RoundView, nowSec: number): Promise<boolean> {
  if (!agent.demoMode || agent.status !== "ACTIVE" || snap.status !== "BIDDING") return false;
  if (nowSec - agent.startedAt < RIVAL_DELAY_SEC) return false;
  const key = `${agent.circleId}:${snap.round}`;
  if (inFlight.has(key) || (await alreadyThisRound(agent, snap.round))) return false;
  inFlight.add(key);
  try {
    const best = round.bestBidder.toLowerCase();
    // an eligible custodial wallet that is not the agent's member and does not already hold the best bid
    let rival = null as (typeof demoWallets)[number] | null;
    for (const w of demoWallets) {
      const a = w.address.toLowerCase();
      if (a === agent.member.toLowerCase() || a === best) continue;
      const m = await getMember(agent.circleId, w.address);
      if (!m.joined || m.hasWon || m.removed || !m.paidThisRound) continue;
      if ((await provider.getBalance(w.address)) < GAS_RESERVE_WEI) continue;
      rival = w; break;
    }
    if (!rival) { placed.add(key); return false; }
    const pot = potOf(round);
    let discount = round.bestDiscount + pctOfPot(pot, RIVAL_STEP_PCT);
    const cap = pctOfPot(pot, RIVAL_CAP_PCT) < round.maxDiscount ? pctOfPot(pot, RIVAL_CAP_PCT) : round.maxDiscount;
    if (discount > cap) discount = cap;
    if (discount <= round.bestDiscount) { placed.add(key); return false; } // rival cannot beat the best within its small cap
    placed.add(key);
    const contract = contractAs(rival.wallet); // custodial demo wallet
    try {
      await preflight(contract, "placeBid", [agent.circleId, discount]);
      const rc = await sendTx(`demo rival ${rival.label} circle ${agent.circleId} round ${snap.round}`, rival.wallet, () => contract.placeBid(agent.circleId, discount));
      const payout = discount >= pot ? 0n : pot - discount;
      await insertAgentLog({
        circleId: agent.circleId, round: snap.round, member: rival.address, agentWallet: rival.address, bidThisRound: true, discount,
        reason: `Demo rival bid (wallet ${rival.label}) placed to demonstrate the agent reacting to competition.`, source: "fallback", txHash: rc.hash, error: null,
      });
      auditSystem("AGENT", "ai.rival", `circle:${agent.circleId}`, "ok", rc.hash, { round: snap.round, member: rival.address, label: rival.label, discount: discount.toString(), agentId: agent.id });
      await recordEvent(agent.id, "RIVAL_BID", `Demo rival (wallet ${rival.label}) bid ${asMst(discount)}`, "A second custodial demo wallet placed a real testnet bid so you can watch the agent respond.", {
        simulated: false, demoRival: true, round: snap.round, member: rival.address.toLowerCase(), label: rival.label,
        discount: discount.toString(), payout: payout.toString(), txHash: rc.hash, block: rc.blockNumber,
      });
      return true;
    } catch (e) {
      const err = errorMessage(e);
      auditSystem("AGENT", "ai.rival", `circle:${agent.circleId}`, "failed", null, { round: snap.round, member: rival.address, label: rival.label, error: err, agentId: agent.id });
      await recordEvent(agent.id, "INFO", `Demo rival bid failed (${err})`, "The demo rival could not place its bid; the agent keeps monitoring.", { demoRival: true, round: snap.round, error: err });
      return false;
    }
  } finally {
    inFlight.delete(key);
  }
}

/** Test/inspection helper: is this wallet a custodial demo wallet we could use as a rival? */
export function isRivalCandidate(address: string, member: string): boolean {
  return demoWallet(address) !== null && address.toLowerCase() !== member.toLowerCase();
}

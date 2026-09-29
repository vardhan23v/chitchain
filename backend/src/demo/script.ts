/**
 * The demo circle story (custodial demo wallets A–E only). Every step is a real testnet transaction sent from the
 * member's own custodial key; nothing is simulated. Amounts scale with the circle's real pot.
 *
 *   Round 1  A is the recipient and accepts the full pot. No auction.
 *   Round 2  B is the recipient and declines. Payout offers: B 96 %, C 94 %, E 92 %, D 90 % of the pot → D wins,
 *            the 10 % discount is shared equally by the other four members.
 *   Round 3  C is the recipient and accepts.
 *   Round 4  D does not contribute; the contract covers the missed payment from D's collateral. E accepts.
 *   Round 5+ the recipient accepts.
 *
 * An admin (POST /demo/decide) or a signed-in recipient can act first; the script only acts when nobody has.
 */
export interface DemoOffer { label: string; payoutPct: number }
export interface DemoRoundScript { decision: "accept" | "decline"; offers: DemoOffer[]; skip: string[] }

/** Seconds into the decision window before the script decides for a custodial recipient. */
export const DECIDE_DELAY_SEC = 10;
/** Seconds after the auction opens for the first scripted offer, then between offers. */
export const OFFER_START_SEC = 4;
export const OFFER_STEP_SEC = 5;

export function demoScript(round: number): DemoRoundScript {
  if (round === 2) {
    return {
      decision: "decline", skip: [],
      offers: [{ label: "B", payoutPct: 96 }, { label: "C", payoutPct: 94 }, { label: "E", payoutPct: 92 }, { label: "D", payoutPct: 90 }],
    };
  }
  if (round === 4) return { decision: "accept", offers: [], skip: ["D"] };
  return { decision: "accept", offers: [], skip: [] };
}

/** Discount for a payout offer of `payoutPct` % of `pot` (discount = pot − payout). */
export function discountForOffer(pot: bigint, payoutPct: number): bigint {
  const payout = (pot * BigInt(Math.round(payoutPct * 100))) / 10_000n;
  return payout >= pot ? 0n : pot - payout;
}

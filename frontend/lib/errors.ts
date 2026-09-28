import { chitInterface } from "@/lib/contract";
import { formatMst } from "@/lib/format";

export interface UiError {
  message: string;
  /** true for "Cancelled in wallet.", render neutral, not red. */
  neutral: boolean;
  name?: string;
}

function findRevertData(e: unknown, depth = 0): string | null {
  if (!e || typeof e !== "object" || depth > 6) return null;
  const o = e as Record<string, unknown>;
  for (const key of ["data", "error", "info", "cause", "reason", "originalError"]) {
    const v = o[key];
    if (typeof v === "string" && /^0x[0-9a-fA-F]{8,}$/.test(v)) return v;
    if (v && typeof v === "object") {
      const inner = findRevertData(v, depth + 1);
      if (inner) return inner;
    }
  }
  return null;
}

function isUserRejected(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const o = e as { code?: unknown; info?: { error?: { code?: unknown } }; message?: string; shortMessage?: string };
  const codes = [o.code, o.info?.error?.code];
  if (codes.includes(4001) || codes.includes("ACTION_REJECTED")) return true;
  const m = `${o.message ?? ""} ${o.shortMessage ?? ""}`.toLowerCase();
  return m.includes("user rejected") || m.includes("user denied");
}

/** DESIGN §8 error table, contract v2. */
const MESSAGES: Record<string, (args: readonly unknown[]) => string> = {
  WrongAmount: (a) => `Send exactly ${formatMst(a[0] as bigint)} MST.`,
  AlreadyPaid: () => "You've already paid this round.",
  ContributionClosed: () => "Contributions for this round are closed.",
  BiddingClosed: () => "Bidding for this round is closed.",
  BiddingNotOver: () => "Bidding is still open. Settle after the deadline.",
  BidNotHigher: (a) => `Someone already offers a ${formatMst(a[0] as bigint)} MST discount. Accept a lower payout to lead.`,
  BidTooHigh: (a) => `Max discount this round is ${formatMst(a[0] as bigint)} MST. Your accepted payout is too low.`,
  JoinWindowClosed: () => "This circle is no longer accepting members.",
  JoinWindowStillOpen: () => "The join window is still open, the circle can't be cancelled yet.",
  NotOpen: () => "This circle is no longer open.",
  NotActive: () => "This circle is not active.",
  AlreadyJoined: () => "You're already in this circle.",
  NotMember: () => "You're not a member of this circle.",
  CircleFull: () => "This circle is full.",
  NotEligibleToBid: () => "Only members who haven't won yet can bid.",
  MemberRemoved: () => "You were removed from this circle, collateral exhausted.",
  NothingToWithdraw: () => "Nothing to withdraw.",
  InvalidParams: () =>
    "Invalid circle parameters. Check that members are 3 to 20, base collateral is at least the contribution, fee is at most 3%, holdback at most 100%, max discount at most 50%, and the tier multipliers rise from Low to High.",
  OnlyOracle: () => "Only the risk oracle can do this.",
  OnlyTreasury: () => "Only the treasury can do this.",
  DirectPaymentRejected: () => "Direct payments are rejected, use the app.",
  ReentrancyGuardReentrantCall: () => "The contract rejected a re-entrant call. Try again.",
};

const RAW_PATTERNS = [/CALL_EXCEPTION/i, /0x[0-9a-fA-F]{8,}/, /execution reverted/i, /missing revert data/i, /UNPREDICTABLE_GAS_LIMIT/i, /could not coalesce/i];

/** Turns any wallet / RPC / contract error into a plain-English message. Never surfaces raw CALL_EXCEPTION or hex data. */
export function parseTxError(e: unknown): UiError {
  if (isUserRejected(e)) return { message: "Cancelled in wallet.", neutral: true };
  const data = findRevertData(e);
  if (data) {
    try {
      const parsed = chitInterface.parseError(data);
      if (parsed) {
        const fn = MESSAGES[parsed.name];
        return { message: fn ? fn(parsed.args) : `The contract rejected this: ${parsed.name}.`, neutral: false, name: parsed.name };
      }
    } catch {
      /* fallthrough */
    }
  }
  const o = e as { shortMessage?: string; reason?: string; message?: string; code?: string };
  if (o?.code === "INSUFFICIENT_FUNDS" || /insufficient funds/i.test(`${o?.message ?? ""} ${o?.shortMessage ?? ""}`)) {
    return { message: "Not enough MST for this transaction plus gas.", neutral: false };
  }
  if (o?.code === "NETWORK_ERROR" || o?.code === "TIMEOUT") return { message: "MST testnet didn't answer, check your connection and try again.", neutral: false };
  if (o?.code === "CALL_EXCEPTION" || o?.code === "UNPREDICTABLE_GAS_LIMIT") return { message: "The contract rejected this transaction. The round may have moved on, refresh and try again.", neutral: false };
  const msg = o?.reason && !RAW_PATTERNS.some((p) => p.test(o.reason!)) ? o.reason : o?.shortMessage ?? o?.message ?? "The transaction failed.";
  if (RAW_PATTERNS.some((p) => p.test(msg))) return { message: "The contract rejected this transaction.", neutral: false };
  return { message: msg.length > 160 ? msg.slice(0, 157) + "…" : msg, neutral: false };
}

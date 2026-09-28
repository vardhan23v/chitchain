import { chitInterface } from "@/lib/contract";
import { formatMstc } from "@/lib/format";

export interface UiError {
  message: string;
  /** true for "Cancelled in wallet." — render neutral, not red. */
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

/** DESIGN §8 error table. */
const MESSAGES: Record<string, (args: readonly unknown[]) => string> = {
  WrongAmount: (a) => `Send exactly ${formatMstc(a[0] as bigint)} MSTC.`,
  AlreadyPaid: () => "You've already paid this round.",
  RoundClosed: () => "This round has closed — wait for settlement.",
  BidNotHigher: (a) => `Someone bid ${formatMstc(a[0] as bigint)} MSTC; bid more to lead.`,
  BidTooHigh: (a) => `Max discount this round is ${formatMstc(a[0] as bigint)} MSTC.`,
  JoinWindowClosed: () => "This circle is no longer accepting members.",
  JoinWindowStillOpen: () => "The join window is still open — the circle can't be cancelled yet.",
  NotOpen: () => "This circle is no longer open.",
  NotActive: () => "This circle is not active.",
  AlreadyJoined: () => "You're already in this circle.",
  NotMember: () => "You're not a member of this circle.",
  CircleFull: () => "This circle is full.",
  RoundNotOver: () => "The round hasn't ended yet.",
  NotEligibleToBid: () => "Only members who haven't won yet can bid.",
  MemberRemoved: () => "You were removed from this circle — collateral exhausted.",
  NothingToWithdraw: () => "Nothing to withdraw.",
  InvalidParams: () => "Invalid circle parameters.",
  OnlyOracle: () => "Only the risk oracle can do this.",
  OnlyTreasury: () => "Only the treasury can do this.",
  DirectPaymentRejected: () => "Direct payments are rejected — use the app.",
};

export function parseTxError(e: unknown): UiError {
  if (isUserRejected(e)) return { message: "Cancelled in wallet.", neutral: true };
  const data = findRevertData(e);
  if (data) {
    try {
      const parsed = chitInterface.parseError(data);
      if (parsed) {
        const fn = MESSAGES[parsed.name];
        return { message: fn ? fn(parsed.args) : `Transaction failed: ${parsed.name}`, neutral: false, name: parsed.name };
      }
    } catch {
      /* fallthrough */
    }
  }
  const o = e as { shortMessage?: string; reason?: string; message?: string; code?: string };
  if (o?.code === "INSUFFICIENT_FUNDS" || /insufficient funds/i.test(o?.message ?? "")) {
    return { message: "Not enough MSTC for this transaction plus gas.", neutral: false };
  }
  const msg = o?.shortMessage ?? o?.reason ?? o?.message ?? "Transaction failed";
  return { message: msg.length > 160 ? msg.slice(0, 157) + "…" : msg, neutral: false };
}

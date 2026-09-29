"use client";

import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  /** Read-only summary mode (review screen): shows the limits instead of the checkbox. */
  summary?: { maxDiscountMst: string; maxDiscountPct: number; circle: string; member: string; expires: string };
  className?: string;
}

/** "Autonomous bidding" permission: the user grants the agent the right to submit on-chain bids within the limits. */
export function PermissionCard({ checked, onChange, disabled, summary, className }: Props) {
  return (
    <div className={cn("rounded-2xl border border-agent/25 bg-agent/[0.05] p-4", className)}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-agent/10 text-agent" aria-hidden>
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-semibold leading-tight">Autonomous bidding permission</p>
            <Badge variant="outline" className={checked ? "border-success/30 bg-success/10 text-success" : "text-muted-foreground"}>{checked ? "Granted" : "Not granted"}</Badge>
          </div>
          <p className="text-[13px] leading-snug text-muted-foreground">
            The agent may submit bids on-chain from the custodial demo wallet without asking first. Every bid still passes the deterministic risk guard and never exceeds your maximum discount. Without this permission the agent proposes a bid and waits for your approval.
          </p>
          {summary ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-3">
              <Row k="Maximum discount" v={`${summary.maxDiscountMst} MST (${summary.maxDiscountPct}%)`} />
              <Row k="Circle" v={summary.circle} />
              <Row k="Wallet" v={summary.member} />
              <Row k="Expires" v={summary.expires} />
              <Row k="Network" v="MST testnet" />
              <Row k="Funds" v="Testnet coins only" />
            </dl>
          ) : (
            <label className={cn("flex cursor-pointer items-start gap-2.5 text-[13px]", disabled && "cursor-not-allowed opacity-60")}>
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-agent/40 accent-[hsl(var(--agent))]"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange?.(e.target.checked)}
              />
              <span>I allow the agent to place bids on-chain within these limits.</span>
            </label>
          )}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <Chip>MST testnet</Chip>
            <Chip>Demo wallet</Chip>
            <Chip>No real funds</Chip>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-muted-foreground">{k}</dt>
      <dd className="tnum truncate font-medium">{v}</dd>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center rounded-full border border-white/[0.1] bg-white/[0.05] px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{children}</span>;
}

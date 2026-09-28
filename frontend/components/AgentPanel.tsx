"use client";

import { useState } from "react";
import { Bot, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { TxLink } from "@/components/TxLink";
import { api } from "@/lib/api";
import { formatMstc, timeAgo } from "@/lib/format";
import type { AgentLog, Mandate, MemberInfo } from "@/lib/types";

interface Props {
  circleId: number;
  member: MemberInfo | null; // connected or selected member
  isDemoWallet: boolean;
  logs: AgentLog[] | null;
  mandate: Mandate | null;
  labelFor: (addr: string) => string;
  onChanged: () => void;
  backendDown: boolean;
}

/** DESIGN §6.3 AI bidding agent box. Only custodial demo wallets can be driven by the agent (API.md). */
export function AgentPanel({ circleId, member, isDemoWallet, logs, mandate, labelFor, onChanged, backendDown }: Props) {
  const [goal, setGoal] = useState(mandate?.goal ?? "");
  const [busy, setBusy] = useState(false);
  const latest = logs?.[0] ?? null;
  const canAsk = isDemoWallet && !!member && !backendDown && goal.trim().length > 3 && !busy;

  const ask = async () => {
    if (!member) return;
    setBusy(true);
    try {
      const r = await api.mandate({ circleId, member: member.address, goal: goal.trim() });
      toast.success(r.decision ? (r.decision.bidThisRound ? "Agent placed a bid" : "Agent decided not to bid this round") : "Goal saved — agent will act when the circle is active");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Agent request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="rounded-2xl border-agent/30 p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2 text-[13px] font-medium uppercase tracking-wide text-agent">
        <Bot className="h-4 w-4" aria-hidden /> AI bidding agent
        <Badge variant="agent" className="normal-case tracking-normal">custodial demo wallet</Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Tell the agent your goal in plain words. Each round it re-reads the auction and bids on-chain from {member && isDemoWallet ? `${labelFor(member.address)}'s` : "the member's"} custodial demo wallet. Real BridgeKey wallets bid manually.
      </p>
      <Textarea
        className="mt-3"
        rows={2}
        placeholder='e.g. "I need money before Diwali" or "No hurry, maximise dividends"'
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        disabled={!isDemoWallet || !member}
        aria-label="Goal for the bidding agent"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {!member ? "Connect or pick a member." : !isDemoWallet ? "Agent bids only for custodial demo wallets (A–E)." : backendDown ? "Backend unreachable." : mandate?.active ? "Mandate active — re-planned each round." : ""}
        </span>
        <Button size="sm" className="bg-agent text-agent-foreground hover:bg-agent/90" disabled={!canAsk} onClick={ask}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Bot aria-hidden />} Ask agent
        </Button>
      </div>
      {latest && (
        <div className="mt-3 rounded-xl bg-agent/5 p-3 text-sm" aria-live="polite">
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span className="font-medium text-agent">Agent for {labelFor(latest.member)}</span>· Round {latest.round} · {timeAgo(latest.ts)}
            <Badge variant="outline" className="text-[10px]">{latest.source === "llm" ? "LLM" : "fallback"}</Badge>
          </div>
          <p className="mt-1">
            {latest.bidThisRound ? <>Bidding <span className="tnum font-semibold">{formatMstc(latest.discount)} MSTC</span> — </> : <>Not bidding this round — </>}
            {latest.reason}
          </p>
          {latest.txHash && <TxLink hash={latest.txHash} label="View bid on MSTScan" className="mt-1" />}
          {latest.error && <p className="mt-1 text-xs text-danger">{latest.error}</p>}
        </div>
      )}
    </Card>
  );
}

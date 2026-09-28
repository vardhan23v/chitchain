"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AgentDecision } from "@/components/AgentDecision";
import { useAuth } from "@/hooks/useAuth";
import { api, type MandateBody } from "@/lib/api";
import { formatMst } from "@/lib/format";
import type { AgentLog, Level, Mandate, MemberInfo } from "@/lib/types";

interface Props {
  circleId: number;
  member: MemberInfo | null; // connected or selected member
  isDemoWallet: boolean;
  logs: AgentLog[] | null;
  mandate: Mandate | null;
  labelFor: (addr: string) => string;
  onChanged: () => void;
  backendDown: boolean;
  /** Current expected pot (wei) for context. */
  pot?: string | null;
}

const LEVELS: Level[] = ["low", "medium", "high"];

/** DESIGN §6.3 AI bidding agent box. Only custodial demo wallets can be driven by the agent (API.md). */
export function AgentPanel({ circleId, member, isDemoWallet, logs, mandate, labelFor, onChanged, backendDown, pot }: Props) {
  const [goal, setGoal] = useState(mandate?.goal ?? "");
  const [desiredPayout, setDesiredPayout] = useState(mandate?.desiredPayout ? formatMst(mandate.desiredPayout) : "");
  const [maxDiscountPct, setMaxDiscountPct] = useState(mandate?.maxDiscountPct != null ? String(mandate.maxDiscountPct) : "");
  const [urgency, setUrgency] = useState<Level | "">(mandate?.urgency ?? "");
  const [riskTolerance, setRiskTolerance] = useState<Level | "">(mandate?.riskTolerance ?? "");
  const [busy, setBusy] = useState(false);
  const auth = useAuth();
  const signedIn = auth.status === "authenticated";
  const latest = logs?.[0] ?? null;
  const enabled = signedIn && isDemoWallet && !!member && !backendDown;
  const canAsk = enabled && goal.trim().length > 3 && !busy;

  const ask = async () => {
    if (!member) return;
    setBusy(true);
    try {
      const body: MandateBody = { circleId, member: member.address, goal: goal.trim() };
      if (desiredPayout && Number(desiredPayout) > 0) body.desiredPayout = desiredPayout;
      if (maxDiscountPct !== "" && Number.isFinite(Number(maxDiscountPct))) body.maxDiscountPct = Number(maxDiscountPct);
      if (urgency) body.urgency = urgency;
      if (riskTolerance) body.riskTolerance = riskTolerance;
      const r = await api.mandate(body);
      toast.success(r.decision ? (r.decision.bidThisRound ? "Agent placed a bid" : "Agent decided not to bid this round") : "Goal saved, agent will act when the circle is active");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Agent request failed");
    } finally {
      setBusy(false);
    }
  };

  const status = !member ? "Connect or pick a member." : !isDemoWallet ? "Agent bids only for custodial demo wallets (A–E)." : backendDown ? "Backend unreachable." : mandate?.active ? "Mandate active, re-planned each round." : "";

  return (
    <Card className="border-agent/30 bg-agent/[0.03] p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-agent"><Bot className="h-3.5 w-3.5" aria-hidden /> AI bidding agent</span>
        <Badge variant="agent">custodial demo wallet</Badge>
        <Badge variant="outline" className="text-muted-foreground">experimental</Badge>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Tell the agent your goal. Each round it re-reads the auction and bids on-chain from {member && isDemoWallet ? `${labelFor(member.address)}'s` : "the member's"} custodial demo wallet. Real BridgeKey wallets bid manually.
      </p>
      {!signedIn ? (
        <div className="mt-3 rounded-xl border border-dashed bg-card p-4 text-center text-sm text-muted-foreground">
          Sign in as the circle organizer or admin to drive the agent.
          <div className="mt-2"><Button asChild size="sm" variant="outline"><Link href={`/login?next=/circle/${circleId}`}>Sign in</Link></Button></div>
        </div>
      ) : (
      <>
      <Textarea className="mt-3" rows={2} placeholder='e.g. "I need money before Diwali" or "No hurry, maximise dividends"' value={goal} onChange={(e) => setGoal(e.target.value)} disabled={!enabled} aria-label="Goal for the bidding agent" />
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="agent-payout" className="text-xs">Desired payout (MST)</Label>
          <Input id="agent-payout" inputMode="decimal" className="tnum h-8" placeholder={pot ? `≤ ${formatMst(pot)}` : "e.g. 4.5"} value={desiredPayout} onChange={(e) => setDesiredPayout(e.target.value.replace(/[^0-9.]/g, ""))} disabled={!enabled} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="agent-maxpct" className="text-xs">Max discount %</Label>
          <Input id="agent-maxpct" inputMode="numeric" className="tnum h-8" placeholder="e.g. 20" value={maxDiscountPct} onChange={(e) => setMaxDiscountPct(e.target.value.replace(/[^0-9.]/g, ""))} disabled={!enabled} />
        </div>
        <LevelSelect id="agent-urgency" label="Urgency" value={urgency} onChange={setUrgency} disabled={!enabled} />
        <LevelSelect id="agent-risk" label="Risk tolerance" value={riskTolerance} onChange={setRiskTolerance} disabled={!enabled} />
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{status}</span>
        <Button size="sm" className="bg-agent text-agent-foreground hover:bg-agent/90" disabled={!canAsk} onClick={ask}>
          {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Bot aria-hidden />} Ask agent
        </Button>
      </div>
      </>
      )}
      {latest && <AgentDecision log={latest} labelFor={labelFor} pot={pot} />}
    </Card>
  );
}

function LevelSelect({ id, label, value, onChange, disabled }: { id: string; label: string; value: Level | ""; onChange: (v: Level | "") => void; disabled: boolean }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Select value={value || "unset"} onValueChange={(v) => onChange(v === "unset" ? "" : (v as Level))} disabled={disabled}>
        <SelectTrigger id={id} className="h-8"><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="unset">Not set</SelectItem>
          {LEVELS.map((l) => <SelectItem key={l} value={l} className="capitalize">{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

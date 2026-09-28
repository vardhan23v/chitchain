"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Loader2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/EmptyState";
import { InfoBanner } from "@/components/InfoBanner";
import { EASE } from "@/components/motion/Reveal";
import { ActivityLog } from "@/components/ai/ActivityLog";
import { AgentDashboard } from "@/components/ai/AgentDashboard";
import { AiStatusPill } from "@/components/ai/AiStatusPill";
import { BidCard } from "@/components/ai/BidCard";
import { FailureCard } from "@/components/ai/FailureCard";
import { StrategyForm } from "@/components/ai/StrategyForm";
import { StrategyReview } from "@/components/ai/StrategyReview";
import { durationSec, type StrategyValues } from "@/components/ai/strategy";
import { useAuth } from "@/hooks/useAuth";
import { isServiceDown, UNAVAILABLE, useBidAgent } from "@/hooks/useBidAgent";
import { ApiError } from "@/lib/api";
import { formatMst, shortAddr } from "@/lib/format";
import type { MemberInfo } from "@/lib/types";

interface Props {
  circleId: number;
  circleName?: string | null;
  member: MemberInfo | null;
  isDemoWallet: boolean;
  /** Demo members the user may drive (for the wallet select in the form). */
  members: MemberInfo[];
  onMemberChange?: (address: string) => void;
  labelFor: (addr: string) => string;
  backendDown: boolean;
  /** Expected pot (wei) from the room, null when the circle is not active. */
  pot: string | null;
  onChanged?: () => void;
}

type Step = "form" | "review";

/**
 * Autonomous AI bidding panel. Flow: no agent → StrategyForm → StrategyReview → activate → AgentDashboard
 * (+ ActivityLog, BidCard for the latest confirmed bid, FailureCard for failures). Stopped/Done agents get a summary.
 */
export function AiBiddingPanel({ circleId, circleName, member, isDemoWallet, members, onMemberChange, labelFor, backendDown, pot, onChanged }: Props) {
  const auth = useAuth();
  const signedIn = auth.status === "authenticated";
  const enabled = signedIn && isDemoWallet && !!member && !backendDown;
  const { agent, events, auction, loading, error, transport, busy, actions } = useBidAgent(circleId, member?.address ?? null, enabled);
  const [step, setStep] = useState<Step>("form");
  const [draft, setDraft] = useState<StrategyValues | undefined>(undefined);
  const [activateError, setActivateError] = useState<string | null>(null);

  useEffect(() => {
    setStep("form");
    setActivateError(null);
  }, [member?.address, circleId]);

  useEffect(() => {
    if (agent && (agent.status === "ACTIVE" || agent.status === "PAUSED")) onChanged?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.status, agent?.lastTxHash]);

  const latest = events.length ? events[events.length - 1] : null;
  const lastConfirmed = useMemo(() => [...events].reverse().find((e) => e.kind === "TX_CONFIRMED" || e.kind === "TX_SUBMITTED") ?? null, [events]);
  const lastFailed = useMemo(() => [...events].reverse().find((e) => e.kind === "TX_FAILED") ?? null, [events]);
  const potWei = auction?.expectedPot ?? pot;

  const act = async (label: string, fn: () => Promise<unknown>) => {
    try {
      await fn();
      toast.success(label);
    } catch (e) {
      toast.error(isServiceDown(e) ? UNAVAILABLE : e instanceof Error ? e.message : "The request failed.");
    }
  };

  const activate = async () => {
    if (!member || !draft) return;
    setActivateError(null);
    try {
      await actions.start({
        circleId,
        member: member.address,
        goal: draft.goal.trim(),
        desiredPayout: draft.desiredPayout ? draft.desiredPayout : undefined,
        maxDiscount: draft.maxDiscount,
        maxDiscountPct: draft.maxDiscountPct,
        urgency: draft.urgency,
        riskTolerance: draft.riskTolerance,
        durationSec: durationSec(draft.duration),
        autonomous: draft.autonomous,
        demoMode: draft.demoMode,
      });
      toast.success("AI agent activated.");
      setStep("form");
      onChanged?.();
    } catch (e) {
      const msg =
        e instanceof ApiError && e.code === "AGENT_EXISTS" ? "An agent is already running for this wallet. Stop it before starting another." :
        e instanceof ApiError && e.code === "NOT_DEMO_WALLET" ? "Only custodial demo wallets can be driven by the agent." :
        e instanceof ApiError && e.status === 403 ? "Only the circle organizer or an admin can activate the agent." :
        isServiceDown(e) ? UNAVAILABLE :
        e instanceof Error ? e.message : "Activation failed.";
      setActivateError(msg);
      if (isServiceDown(e)) void actions.refresh();
    }
  };

  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-[17px] font-semibold tracking-tight text-agent"><Bot className="h-4 w-4" aria-hidden /> AI bidding agent</span>
      <Badge variant="outline" className="text-muted-foreground">Experimental AI, testnet only</Badge>
      {agent && <AiStatusPill status={agent.status} className="ml-auto" />}
    </div>
  );

  let body: React.ReactNode;
  let key = "gate";
  if (!signedIn) {
    body = (
      <div className="rounded-xl border border-dashed border-white/70 bg-white/40 p-4 text-center text-sm text-muted-foreground">
        Sign in as the circle organizer or admin to run the agent.
        <div className="mt-2"><Button asChild size="sm" variant="outline"><Link href={`/login?next=/circle/${circleId}`}>Sign in</Link></Button></div>
      </div>
    );
  } else if (!member || !isDemoWallet) {
    body = <InfoBanner tone="agent">Pick a custodial demo wallet (A to E). The agent bids only from those; real BridgeKey wallets bid manually.</InfoBanner>;
  } else if (backendDown || (error === UNAVAILABLE && !agent)) {
    key = "down";
    body = <EmptyState Icon={WifiOff} tone="bg-muted text-muted-foreground" title={UNAVAILABLE} text="Your circle keeps running. Try again in a moment." action={<Button size="sm" variant="outline" onClick={() => void actions.refresh()}>Try again</Button>} />;
  } else if (loading && !agent) {
    key = "loading";
    body = (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-16 rounded-xl" />
        <div className="grid grid-cols-3 gap-3"><Skeleton className="h-9 rounded-xl" /><Skeleton className="h-9 rounded-xl" /><Skeleton className="h-9 rounded-xl" /></div>
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  } else if (!agent) {
    key = step;
    body =
      step === "form" ? (
        <StrategyForm member={member} members={members} onMemberChange={onMemberChange} auction={auction} pot={pot} initial={draft} disabled={busy} onReview={(v) => { setDraft(v); setActivateError(null); setStep("review"); }} />
      ) : (
        <StrategyReview values={draft!} member={member} circleId={circleId} circleName={circleName} pot={potWei} busy={busy} error={activateError} onBack={() => setStep("form")} onActivate={activate} />
      );
  } else if (agent.status === "STOPPED" || agent.status === "DONE" || agent.status === "ERROR") {
    key = "summary";
    body = (
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/60 bg-white/45 p-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2">
            <AiStatusPill status={agent.status} />
            <p className="text-[15px] font-semibold leading-tight">{agent.status === "DONE" ? "This strategy has finished" : agent.status === "ERROR" ? "This strategy hit an error" : "This strategy was stopped"}</p>
          </div>
          <p className="mt-1.5 text-[13px] text-muted-foreground">{agent.statusReason ?? "No further bids will be placed."}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] sm:grid-cols-4">
            <Item k="Goal" v={agent.goal} />
            <Item k="Last decision" v={agent.lastDecision ?? "None"} />
            <Item k="Last bid" v={agent.lastBid ? `${formatMst(agent.lastBid)} MST` : "None"} />
            <Item k="Wallet" v={`Member ${labelFor(agent.member)} · ${shortAddr(agent.member)}`} />
          </dl>
          {agent.lastTxHash && lastConfirmed && <div className="mt-3"><BidCard event={lastConfirmed} agent={agent} pot={potWei} /></div>}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button type="button" className="w-full sm:w-auto" onClick={() => { actions.reset(); setStep("form"); }}>Start a new strategy</Button>
          </div>
        </div>
        {events.length > 0 && <ActivityLog events={events} transport={transport} />}
      </div>
    );
  } else {
    key = "dashboard";
    const failing = agent.status === "PAUSED" && agent.failures > 0 && !(agent.statusReason ?? "").toLowerCase().includes("approval");
    body = (
      <div className="space-y-4">
        {error && <InfoBanner tone="warning">{error === UNAVAILABLE ? "Live updates paused. Showing the last known state." : error}</InfoBanner>}
        <AgentDashboard
          agent={agent}
          auction={auction}
          latest={latest}
          labelFor={labelFor}
          busy={busy}
          onPause={() => void act("Agent paused.", actions.pause)}
          onResume={() => void act("Agent resumed.", () => actions.resume())}
          onStop={() => void act("Agent stopped.", actions.stop)}
          onEvaluate={() => void act("Evaluation requested.", actions.evaluate)}
          onApprove={() => void act("Approved. The agent will bid within your limits.", () => actions.resume(true))}
        />
        {(lastFailed || failing) && (
          <FailureCard agent={agent} event={lastFailed} busy={busy} onReview={() => document.getElementById(`ai-activity-${agent.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" })} onResume={agent.status === "PAUSED" ? () => void act("Agent resumed.", () => actions.resume()) : undefined} />
        )}
        {lastConfirmed && <BidCard event={lastConfirmed} agent={agent} pot={potWei} />}
        <div id={`ai-activity-${agent.id}`}><ActivityLog events={events} transport={transport} loading={loading} /></div>
      </div>
    );
  }

  return (
    <Card className="border-agent/30 bg-agent/[0.03] p-4 md:p-5">
      {header}
      <p className="mt-2 text-[13px] text-muted-foreground">
        Describe a goal and hard limits. The AI proposes, a deterministic risk guard checks every bid, and only then is it sent on-chain from {member && isDemoWallet ? `Member ${labelFor(member.address)}'s` : "the member's"} custodial demo wallet.
      </p>
      <div className="mt-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15, ease: EASE }}>
            {body}
          </motion.div>
        </AnimatePresence>
      </div>
      {busy && !agent && step === "form" && <span className="sr-only" aria-live="polite"><Loader2 className="animate-spin" aria-hidden /> Working</span>}
    </Card>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-muted-foreground">{k}</dt>
      <dd className="truncate font-medium">{v}</dd>
    </div>
  );
}

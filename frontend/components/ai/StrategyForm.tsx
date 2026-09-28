"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InfoBanner } from "@/components/InfoBanner";
import { PermissionCard } from "@/components/ai/PermissionCard";
import { DURATION_OPTIONS, EMPTY_STRATEGY, LEVELS, LEVEL_LABEL, fmtMst, mstOf, validateStrategy, type DurationChoice, type StrategyErrors, type StrategyValues } from "@/components/ai/strategy";
import { formatMst, shortAddr } from "@/lib/format";
import type { AuctionSnapshot, Level, MemberInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  member: MemberInfo;
  /** Demo members the user may drive; when more than one, a select is shown. */
  members: MemberInfo[];
  onMemberChange?: (address: string) => void;
  auction: AuctionSnapshot | null;
  /** Expected pot (wei) from the room, used until the auction snapshot arrives. */
  pot: string | null;
  initial?: StrategyValues;
  disabled?: boolean;
  onReview: (values: StrategyValues) => void;
}

const clean = (v: string) => v.replace(/[^0-9.]/g, "").replace(/(\..*)\./g, "$1");

/** Step 1: describe the goal and the hard limits. Nothing is sent until the review step confirms. */
export function StrategyForm({ member, members, onMemberChange, auction, pot, initial, disabled, onReview }: Props) {
  const [v, setV] = useState<StrategyValues>(initial ?? EMPTY_STRATEGY);
  const [errors, setErrors] = useState<StrategyErrors>({});
  const [touched, setTouched] = useState(false);
  const potWei = auction?.expectedPot ?? pot ?? null;
  const potMst = mstOf(potWei);
  const capMst = Number.isFinite(potMst) ? (potMst * v.maxDiscountPct) / 100 : NaN;
  const contractCapMst = mstOf(auction?.maxDiscount);
  const implied = useMemo(() => {
    const d = Number(v.maxDiscount);
    if (!Number.isFinite(potMst) || !Number.isFinite(d) || d <= 0) return null;
    return Math.max(0, potMst - d);
  }, [potMst, v.maxDiscount]);

  const set = <K extends keyof StrategyValues>(k: K, val: StrategyValues[K]) => {
    setV((s) => {
      const next = { ...s, [k]: val };
      if (touched) {
        const r = validateStrategy(next, potMst);
        setErrors(r.ok ? {} : r.errors);
      }
      return next;
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    const r = validateStrategy(v, potMst);
    if (!r.ok) {
      setErrors(r.errors);
      return;
    }
    setErrors({});
    onReview(v);
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4" aria-label="AI bidding strategy">
      {members.length > 1 && onMemberChange ? (
        <Field id="ai-member" label="Bidding wallet" hint="Custodial demo wallets only. Real BridgeKey wallets bid manually.">
          <Select value={member.address} onValueChange={onMemberChange} disabled={disabled}>
            <SelectTrigger id="ai-member"><SelectValue /></SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.address} value={m.address}>Member {m.label ?? shortAddr(m.address)} · {shortAddr(m.address)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          Bidding from <span className="font-medium text-foreground">Member {member.label ?? shortAddr(member.address)}</span>&apos;s custodial demo wallet <span className="font-mono">{shortAddr(member.address)}</span>.
        </p>
      )}

      <Field id="ai-goal" label="Goal" error={errors.goal} hint="Plain language. The agent turns it into a bidding plan and explains each decision.">
        <Textarea
          id="ai-goal"
          rows={2}
          maxLength={220}
          placeholder='e.g. "I need at least 4 MST before the festival" or "No hurry, keep the discount small"'
          value={v.goal}
          onChange={(e) => set("goal", e.target.value)}
          disabled={disabled}
          aria-invalid={!!errors.goal}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field id="ai-payout" label="Desired payout (MST)" error={errors.desiredPayout} hint="Optional">
          <Input id="ai-payout" inputMode="decimal" className="tnum" placeholder={Number.isFinite(potMst) ? `below ${fmtMst(potMst)}` : "e.g. 4.5"} value={v.desiredPayout} onChange={(e) => set("desiredPayout", clean(e.target.value))} disabled={disabled} aria-invalid={!!errors.desiredPayout} />
        </Field>
        <Field id="ai-max" label="Maximum discount (MST)" error={errors.maxDiscount} hint={Number.isFinite(capMst) ? `Up to ${fmtMst(capMst)} MST at ${v.maxDiscountPct}%` : undefined}>
          <Input id="ai-max" inputMode="decimal" className="tnum" placeholder="e.g. 1.0" value={v.maxDiscount} onChange={(e) => set("maxDiscount", clean(e.target.value))} disabled={disabled} aria-invalid={!!errors.maxDiscount} />
        </Field>
        <Field id="ai-pct" label="Maximum discount (%)" error={errors.maxDiscountPct} hint="1 to 50% of the pot">
          <Input
            id="ai-pct"
            inputMode="numeric"
            className="tnum"
            value={Number.isFinite(v.maxDiscountPct) ? String(v.maxDiscountPct) : ""}
            onChange={(e) => {
              const s = e.target.value.replace(/[^0-9.]/g, "");
              set("maxDiscountPct", s === "" ? NaN : Number(s));
            }}
            disabled={disabled}
            aria-invalid={!!errors.maxDiscountPct}
          />
        </Field>
      </div>
      <p className="text-[12px] leading-snug text-muted-foreground">
        Bid = discount you offer; payout = pot minus discount.
        {Number.isFinite(potMst) && <> Pot this round {fmtMst(potMst)} MST{Number.isFinite(contractCapMst) ? `, contract cap ${fmtMst(contractCapMst)} MST` : ""}.</>}
        {implied !== null && <> At your maximum you would accept {fmtMst(implied)} MST.</>}
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <LevelField id="ai-urgency" label="Urgency" value={v.urgency} onChange={(x) => set("urgency", x)} disabled={disabled} hint="High bids sooner and closer to the maximum." />
        <LevelField id="ai-risk" label="Risk tolerance" value={v.riskTolerance} onChange={(x) => set("riskTolerance", x)} disabled={disabled} hint="How far from the best bid the agent is willing to go." />
        <Field id="ai-duration" label="Agent duration">
          <Select value={v.duration} onValueChange={(x) => set("duration", x as DurationChoice)} disabled={disabled}>
            <SelectTrigger id="ai-duration"><SelectValue /></SelectTrigger>
            <SelectContent>{DURATION_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>

      <PermissionCard checked={v.autonomous} onChange={(x) => set("autonomous", x)} disabled={disabled} />

      <label className={cn("flex cursor-pointer items-start gap-2.5 text-[13px] text-muted-foreground", disabled && "cursor-not-allowed opacity-60")}>
        <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 rounded accent-[hsl(var(--agent))]" checked={v.demoMode} disabled={disabled} onChange={(e) => set("demoMode", e.target.checked)} />
        <span>
          <span className="font-medium text-foreground">Demo rival.</span> About 25 seconds after activation another demo wallet places a real small bid on testnet, so you can watch the agent respond. Labelled &quot;Demo rival&quot; in the log.
        </span>
      </label>

      {touched && Object.keys(errors).length > 0 && (
        <InfoBanner tone="warning" role="alert">Check the highlighted fields before reviewing.</InfoBanner>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="submit" className="w-full bg-agent text-agent-foreground hover:bg-agent/90 sm:w-auto" disabled={disabled}>Review strategy</Button>
      </div>
    </form>
  );
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-[13px]">{label}</Label>
      {children}
      {error ? <p className="text-[12px] text-danger" role="alert">{error}</p> : hint ? <p className="text-[12px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function LevelField({ id, label, value, onChange, disabled, hint }: { id: string; label: string; value: Level; onChange: (v: Level) => void; disabled?: boolean; hint?: string }) {
  return (
    <Field id={id} label={label} hint={hint}>
      <Select value={value} onValueChange={(x) => onChange(x as Level)} disabled={disabled}>
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{LEVEL_LABEL[l]}</SelectItem>)}</SelectContent>
      </Select>
    </Field>
  );
}

/** Pot-aware helper for other screens: "4.00 MST". */
export function potText(pot: string | null | undefined): string {
  return pot ? `${formatMst(pot)} MST` : "unknown";
}

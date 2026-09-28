"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Field } from "@/components/create/Field";
import { JOIN_WINDOW_OPTIONS, WINDOW_OPTIONS, type CreateInput } from "@/lib/createSchema";

export interface FieldsProps {
  v: CreateInput;
  set: <K extends keyof CreateInput>(k: K, val: CreateInput[K]) => void;
  errors: Record<string, string>;
}

/** Contribution · members · contribution window · bidding window · join window · fee · base collateral. */
export function CoreFields({ v, set, errors }: FieldsProps) {
  return (
    <>
      <Field label="Circle name" htmlFor="name" error={errors.name} hint="2–60 characters. Shown on the circle card and room. Stored off-chain by ChitChain, not in the contract.">
        <Input id="name" maxLength={60} placeholder="e.g. Office Diwali circle" value={v.name} onChange={(e) => set("name", e.target.value)} />
      </Field>
      <Field label="Description (optional)" htmlFor="description" error={errors.description}>
        <Textarea id="description" rows={2} maxLength={500} placeholder="Who this circle is for, how often you meet…" value={v.description ?? ""} onChange={(e) => set("description", e.target.value)} />
      </Field>
      <Field label="Contribution per round (MST)" error={errors.contribution} htmlFor="contribution">
        <Input id="contribution" inputMode="decimal" className="tnum" value={v.contribution} onChange={(e) => set("contribution", e.target.value)} />
      </Field>
      <Field label={`Members · ${v.maxMembers}`} error={errors.maxMembers} htmlFor="members">
        <Slider id="members" min={3} max={20} step={1} value={[v.maxMembers]} onValueChange={([n]) => set("maxMembers", n)} aria-label="Members" />
        <div className="flex justify-between text-xs text-muted-foreground"><span>3</span><span>20</span></div>
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contribution window" htmlFor="cwin" error={errors.contributionDuration} hint="How long members have to pay each round.">
          <Select value={String(v.contributionDuration)} onValueChange={(s) => set("contributionDuration", Number(s))}>
            <SelectTrigger id="cwin"><SelectValue /></SelectTrigger>
            <SelectContent>{WINDOW_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Bidding window" htmlFor="bwin" error={errors.biddingDuration} hint="Extra time for bids after contributions close.">
          <Select value={String(v.biddingDuration)} onValueChange={(s) => set("biddingDuration", Number(s))}>
            <SelectTrigger id="bwin"><SelectValue /></SelectTrigger>
            <SelectContent>{WINDOW_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Join window" htmlFor="join" error={errors.joinWindow}>
          <Select value={String(v.joinWindow)} onValueChange={(s) => set("joinWindow", Number(s))}>
            <SelectTrigger id="join"><SelectValue /></SelectTrigger>
            <SelectContent>{JOIN_WINDOW_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label={`Platform fee · ${v.feePct}%`} htmlFor="fee" error={errors.feePct}>
          <Slider id="fee" min={0} max={3} step={0.25} value={[v.feePct]} onValueChange={([n]) => set("feePct", n)} aria-label="Platform fee percent" />
          <div className="flex justify-between text-xs text-muted-foreground"><span>0%</span><span>3%</span></div>
        </Field>
      </div>
      <Field label="Base collateral (MST, Medium tier)" htmlFor="base" error={errors.baseCollateral} hint="Must be at least the contribution. Each tier locks base × its multiplier.">
        <Input id="base" inputMode="decimal" className="tnum" value={v.baseCollateral} onChange={(e) => set("baseCollateral", e.target.value)} />
      </Field>
    </>
  );
}

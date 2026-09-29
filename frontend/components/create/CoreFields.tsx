"use client";

import { Clock, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Field, FormSection, SliderRow } from "@/components/create/Field";
import { JOIN_WINDOW_OPTIONS, WINDOW_OPTIONS, type CreateInput } from "@/lib/createSchema";

export interface FieldsProps {
  v: CreateInput;
  set: <K extends keyof CreateInput>(k: K, val: CreateInput[K]) => void;
  errors: Record<string, string>;
}

/** Basics (name · description · contribution · members) and Timing (contribution / bidding / join windows). */
export function CoreFields({ v, set, errors }: FieldsProps) {
  return (
    <>
      <FormSection Icon={FileText} title="Basics" text="What the circle is and how much each member pays per round." first>
        <Field label="Circle name" htmlFor="name" error={errors.name} hint="2–60 characters. Stored off-chain by ChitChain, not in the contract.">
          <Input id="name" maxLength={60} placeholder="e.g. Office Diwali circle" value={v.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Description (optional)" htmlFor="description" error={errors.description}>
          <Textarea id="description" rows={2} maxLength={500} placeholder="Who this circle is for, how often you meet…" value={v.description ?? ""} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contribution per round" htmlFor="contribution" error={errors.contribution} suffix="MST">
            <Input id="contribution" inputMode="decimal" className="tnum" value={v.contribution} onChange={(e) => set("contribution", e.target.value)} />
          </Field>
          <SliderRow label="Members" htmlFor="members" value={`${v.maxMembers}`} min="2" max="20" error={errors.maxMembers}>
            <Slider id="members" min={2} max={20} step={1} value={[v.maxMembers]} onValueChange={([n]) => set("maxMembers", n)} aria-label="Members" />
          </SliderRow>
        </div>
      </FormSection>

      <FormSection Icon={Clock} title="Timing" text="Each round: contributions, then the recipient's decision window, and an auction window only if they decline. The join window is how long the circle waits to fill.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Contribution window" htmlFor="cwin" error={errors.contributionDuration} hint="Time to pay each round.">
            <Select value={String(v.contributionDuration)} onValueChange={(s) => set("contributionDuration", Number(s))}>
              <SelectTrigger id="cwin"><SelectValue /></SelectTrigger>
              <SelectContent>{WINDOW_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Decision and auction window" htmlFor="bwin" error={errors.biddingDuration} hint="Time the recipient has to accept or decline the pot, and again for the auction if they decline.">
            <Select value={String(v.biddingDuration)} onValueChange={(s) => set("biddingDuration", Number(s))}>
              <SelectTrigger id="bwin"><SelectValue /></SelectTrigger>
              <SelectContent>{WINDOW_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Join window" htmlFor="join" error={errors.joinWindow} hint="Cancelled and refunded if it doesn't fill.">
            <Select value={String(v.joinWindow)} onValueChange={(s) => set("joinWindow", Number(s))}>
              <SelectTrigger id="join"><SelectValue /></SelectTrigger>
              <SelectContent>{JOIN_WINDOW_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
      </FormSection>
    </>
  );
}

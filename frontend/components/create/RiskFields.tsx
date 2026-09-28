"use client";

import { Percent, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Field, FormSection, SliderRow } from "@/components/create/Field";
import type { FieldsProps } from "@/components/create/CoreFields";
import type { CreateInput } from "@/lib/createSchema";

const MULTS: { key: keyof Pick<CreateInput, "lowMult" | "mediumMult" | "highMult">; label: string; hint: string }[] = [
  { key: "lowMult", label: "Low risk", hint: "default 0.5×" },
  { key: "mediumMult", label: "Medium", hint: "default 1×" },
  { key: "highMult", label: "High / Unassessed", hint: "default 2×" },
];

/** Risk & collateral (base collateral · multipliers · holdback) and Fees (platform fee · max discount). */
export function RiskFields({ v, set, errors }: FieldsProps) {
  const num = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  return (
    <>
      <FormSection Icon={ShieldCheck} title="Risk & collateral" text="Collateral is locked at join and covers any missed contribution. Sized by the member's risk tier.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Base collateral (Medium tier)" htmlFor="base" error={errors.baseCollateral} suffix="MST" hint="At least the contribution. Each tier locks base × its multiplier.">
            <Input id="base" inputMode="decimal" className="tnum" value={v.baseCollateral} onChange={(e) => set("baseCollateral", e.target.value)} />
          </Field>
          <SliderRow label="Holdback" htmlFor="holdback" value={`${v.holdbackPct}%`} min="0%" max="100%" error={errors.holdbackPct} hint="Share of a winner's payout kept until the circle completes.">
            <Slider id="holdback" min={0} max={100} step={5} value={[v.holdbackPct]} onValueChange={([n]) => set("holdbackPct", n)} aria-label="Holdback percent" />
          </SliderRow>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-[13px] font-medium">Collateral multipliers <span className="font-normal text-muted-foreground">(× base)</span></legend>
          <div className="grid grid-cols-3 gap-3">
            {MULTS.map((m) => (
              <Field key={m.key} label={m.label} htmlFor={m.key} error={errors[m.key]} hint={m.hint} suffix="×">
                <Input id={m.key} inputMode="decimal" className="tnum" value={String(v[m.key])} onChange={(e) => set(m.key, num(e.target.value.replace(/[^0-9.]/g, "")))} />
              </Field>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Low ≤ Medium ≤ High. Unassessed wallets pay the High multiplier.</p>
        </fieldset>
      </FormSection>

      <FormSection Icon={Percent} title="Fees & auction" text="The fee goes to the reserve; the max discount caps how low a bid can go.">
        <div className="grid gap-4 sm:grid-cols-2">
          <SliderRow label="Platform fee" htmlFor="fee" value={`${v.feePct}%`} min="0%" max="3%" error={errors.feePct} hint="Taken from each payout into the reserve.">
            <Slider id="fee" min={0} max={3} step={0.25} value={[v.feePct]} onValueChange={([n]) => set("feePct", n)} aria-label="Platform fee percent" />
          </SliderRow>
          <SliderRow label="Max discount" htmlFor="maxdisc" value={`${v.maxDiscountPct}%`} min="0%" max="50%" error={errors.maxDiscountPct} hint="Largest discount a bidder may offer, as a share of the pot.">
            <Slider id="maxdisc" min={0} max={50} step={5} value={[v.maxDiscountPct]} onValueChange={([n]) => set("maxDiscountPct", n)} aria-label="Max discount percent" />
          </SliderRow>
        </div>
      </FormSection>
    </>
  );
}

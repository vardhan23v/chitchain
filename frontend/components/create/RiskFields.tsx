"use client";

import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Field } from "@/components/create/Field";
import type { FieldsProps } from "@/components/create/CoreFields";
import type { CreateInput } from "@/lib/createSchema";

const MULTS: { key: keyof Pick<CreateInput, "lowMult" | "mediumMult" | "highMult">; label: string; hint: string }[] = [
  { key: "lowMult", label: "Low risk", hint: "default 0.5×" },
  { key: "mediumMult", label: "Medium", hint: "default 1×" },
  { key: "highMult", label: "High / Unassessed", hint: "default 2×" },
];

/** Holdback % · max discount % · collateral multipliers Low ≤ Medium ≤ High. */
export function RiskFields({ v, set, errors }: FieldsProps) {
  const num = (s: string) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };
  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={`Holdback · ${v.holdbackPct}%`} htmlFor="holdback" error={errors.holdbackPct} hint="Share of a winner's payout kept in the contract until the circle completes.">
          <Slider id="holdback" min={0} max={100} step={5} value={[v.holdbackPct]} onValueChange={([n]) => set("holdbackPct", n)} aria-label="Holdback percent" />
          <div className="flex justify-between text-xs text-muted-foreground"><span>0%</span><span>100%</span></div>
        </Field>
        <Field label={`Max discount · ${v.maxDiscountPct}%`} htmlFor="maxdisc" error={errors.maxDiscountPct} hint="Largest discount a bidder may offer, as a share of the pot.">
          <Slider id="maxdisc" min={0} max={50} step={5} value={[v.maxDiscountPct]} onValueChange={([n]) => set("maxDiscountPct", n)} aria-label="Max discount percent" />
          <div className="flex justify-between text-xs text-muted-foreground"><span>0%</span><span>50%</span></div>
        </Field>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Collateral multipliers (× base collateral)</legend>
        <div className="grid grid-cols-3 gap-3">
          {MULTS.map((m) => (
            <Field key={m.key} label={m.label} htmlFor={m.key} error={errors[m.key]} hint={m.hint}>
              <Input id={m.key} inputMode="decimal" className="tnum" value={String(v[m.key])} onChange={(e) => set(m.key, num(e.target.value.replace(/[^0-9.]/g, "")))} />
            </Field>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Low ≤ Medium ≤ High. Unassessed wallets pay the High multiplier.</p>
      </fieldset>
    </>
  );
}

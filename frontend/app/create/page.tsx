"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { CreateSummary } from "@/components/CreateSummary";
import { useTx } from "@/hooks/useTx";
import { useWallet } from "@/hooks/useWallet";
import { getSignerContract } from "@/lib/contract";
import { HAS_CONTRACT } from "@/lib/chain";
import { createSchema, DEFAULTS, JOIN_WINDOW_OPTIONS, ROUND_OPTIONS, type CreateInput } from "@/lib/createSchema";
import { toWei } from "@/lib/format";

export default function CreatePage() {
  const router = useRouter();
  const wallet = useWallet();
  const { run, pending } = useTx();
  const [v, setV] = useState<CreateInput>(DEFAULTS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof CreateInput>(k: K, val: CreateInput[K]) => setV((s) => ({ ...s, [k]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = createSchema.safeParse(v);
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const i of parsed.error.issues) errs[String(i.path[0] ?? "form")] = i.message;
      setErrors(errs);
      return;
    }
    setErrors({});
    if (!wallet.account) return void wallet.connect();
    if (!wallet.correctChain) return void wallet.switchNetwork();
    const d = parsed.data;
    await run(
      async () => {
        const c = await getSignerContract();
        return c.createCircle(toWei(d.contribution), d.maxMembers, d.roundDuration, d.joinWindow, Math.round(d.feePct * 100), toWei(d.baseCollateral));
      },
      {
        success: "Circle created on-chain",
        onMined: async (hash) => {
          // Find the CircleCreated event to get the id; fall back to circleCount.
          const c = await getSignerContract();
          const rc = await c.runner?.provider?.getTransactionReceipt(hash);
          let id: number | null = null;
          for (const log of rc?.logs ?? []) {
            try {
              const p = c.interface.parseLog({ topics: [...log.topics], data: log.data });
              if (p?.name === "CircleCreated") id = Number(p.args[0]);
            } catch {
              /* not ours */
            }
          }
          if (id === null) id = Number(await c.circleCount());
          router.push(`/circle/${id}`);
        },
      }
    );
  };

  const cta = !HAS_CONTRACT ? "Contract not deployed" : !wallet.account ? "Connect BridgeKey" : !wallet.correctChain ? "Switch to MST Testnet" : pending ? "Confirm in BridgeKey…" : "Create circle";

  return (
    <div className="space-y-6">
      <div>
        <h1>Create a circle</h1>
        <p className="mt-1 text-muted-foreground">Set the rules once. The contract enforces them for everyone.</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card className="rounded-2xl p-4 md:p-6">
          <form className="space-y-5" onSubmit={submit} noValidate>
            <Field label="Contribution per round (MSTC)" error={errors.contribution} htmlFor="contribution">
              <Input id="contribution" inputMode="decimal" className="tnum" value={v.contribution} onChange={(e) => set("contribution", e.target.value)} />
            </Field>
            <Field label={`Members · ${v.maxMembers}`} error={errors.maxMembers} htmlFor="members">
              <Slider id="members" min={3} max={20} step={1} value={[v.maxMembers]} onValueChange={([n]) => set("maxMembers", n)} aria-label="Members" />
              <div className="flex justify-between text-xs text-muted-foreground"><span>3</span><span>20</span></div>
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Round length" htmlFor="round">
                <Select value={String(v.roundDuration)} onValueChange={(s) => set("roundDuration", Number(s))}>
                  <SelectTrigger id="round"><SelectValue /></SelectTrigger>
                  <SelectContent>{ROUND_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Join window" htmlFor="join" error={errors.joinWindow}>
                <Select value={String(v.joinWindow)} onValueChange={(s) => set("joinWindow", Number(s))}>
                  <SelectTrigger id="join"><SelectValue /></SelectTrigger>
                  <SelectContent>{JOIN_WINDOW_OPTIONS.map((o) => <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label={`Platform fee · ${v.feePct}%`} htmlFor="fee" error={errors.feePct}>
              <Slider id="fee" min={0} max={3} step={0.25} value={[v.feePct]} onValueChange={([n]) => set("feePct", n)} aria-label="Platform fee percent" />
              <div className="flex justify-between text-xs text-muted-foreground"><span>0%</span><span>3%</span></div>
            </Field>
            <Field label="Base collateral (MSTC, Medium tier)" htmlFor="base" error={errors.baseCollateral} hint="Must be at least the contribution. Low pays 0.5×, High and Unassessed pay 2×.">
              <Input id="base" inputMode="decimal" className="tnum" value={v.baseCollateral} onChange={(e) => set("baseCollateral", e.target.value)} />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={pending || !HAS_CONTRACT || !wallet.hasWallet}>{cta}</Button>
            {!wallet.hasWallet && <p className="text-center text-xs text-muted-foreground">Install BridgeKey to create a circle.</p>}
          </form>
        </Card>
        <CreateSummary v={v} />
      </div>
    </div>
  );
}

function Field({ label, htmlFor, error, hint, children }: { label: string; htmlFor: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-danger" role="alert">{error}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CoreFields } from "@/components/create/CoreFields";
import { RiskFields } from "@/components/create/RiskFields";
import { CreateSummary } from "@/components/CreateSummary";
import { PageHeader } from "@/components/PageHeader";
import { TxStepper } from "@/components/TxStepper";
import { useAuth } from "@/hooks/useAuth";
import { useTx } from "@/hooks/useTx";
import { useWallet } from "@/hooks/useWallet";
import { api } from "@/lib/api";
import { getSignerContract } from "@/lib/contract";
import { HAS_CONTRACT } from "@/lib/chain";
import { createSchema, DEFAULTS, toCircleParams, type CreateInput } from "@/lib/createSchema";

export default function CreatePage() {
  const router = useRouter();
  const wallet = useWallet();
  const auth = useAuth();
  const signedIn = auth.status === "authenticated";
  const { run, pending, state } = useTx();
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
    // Naming a circle needs a session (POST /circles/:id/claim). Prompt once; if declined, the wallet-only path still creates the circle.
    let canClaim = signedIn;
    if (!canClaim) {
      canClaim = !!(await auth.signIn());
      if (!canClaim) toast("Creating without a name — sign in later to claim and name this circle.");
    }
    const { name, description } = parsed.data;
    const params = toCircleParams(parsed.data);
    await run(
      async () => {
        const c = await getSignerContract();
        return c.createCircle(params);
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
          if (!canClaim) return router.push(`/circle/${id}`);
          try {
            const r = await api.claimCircle(id, { name, description: description || undefined, txHash: hash });
            auth.setUser(r.user);
            toast.success(`"${r.circle.name ?? name}" is yours — you're the organizer.`);
            router.push("/organizer");
          } catch (e) {
            toast.error(`Circle #${id} is on-chain, but naming it failed: ${e instanceof Error ? e.message : "backend unreachable"}. You can name it later from the Organizer dashboard.`);
            router.push(`/circle/${id}`);
          }
        },
      }
    );
  };

  const cta = !HAS_CONTRACT ? "Contract not deployed" : !wallet.account ? "Connect BridgeKey" : !wallet.correctChain ? "Switch to MST Testnet" : auth.status === "signing" ? "Confirm the signature in BridgeKey…" : pending ? "Confirm in BridgeKey…" : signedIn ? "Create circle" : "Sign in & create circle";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="New circle" title="Create a circle" description="Set the rules once. The contract enforces them for everyone. Amounts are MST testnet coins." />
      <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <Card className="p-4 md:p-6">
          <form className="space-y-6" onSubmit={submit} noValidate>
            <CoreFields v={v} set={set} errors={errors} />
            <RiskFields v={v} set={set} errors={errors} />
            <Button type="submit" size="lg" className="w-full" disabled={pending || !HAS_CONTRACT || !wallet.hasWallet}>{cta}</Button>
            <TxStepper state={state} />
            {errors.form && <p className="text-xs text-danger" role="alert">{errors.form}</p>}
            {!wallet.hasWallet && <p className="text-center text-xs text-muted-foreground">Install BridgeKey to create a circle.</p>}
            {wallet.hasWallet && !signedIn && (
              <p className="text-center text-xs text-muted-foreground">
                <Link href="/login?next=/create" className="text-primary hover:underline">Sign in</Link> to name your circle and get the Organizer dashboard.
              </p>
            )}
          </form>
        </Card>
        <CreateSummary v={v} />
      </div>
    </div>
  );
}

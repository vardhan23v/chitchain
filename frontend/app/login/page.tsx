"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InfoBanner } from "@/components/InfoBanner";
import { Logo } from "@/components/Logo";
import { AdminPasswordForm } from "@/components/login/AdminPasswordForm";
import { LoginStepper } from "@/components/login/LoginStepper";
import { TestnetBadge } from "@/components/TestnetBadge";
import { roleHome, useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useWallet } from "@/hooks/useWallet";
import { BRIDGEKEY_URL, CHAIN_NAME } from "@/lib/chain";
import { parseTxError } from "@/lib/errors";
import { shortAddr } from "@/lib/format";
import type { User } from "@/lib/types";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <Login />
    </Suspense>
  );
}

function safeNext(v: string | null): string | null {
  return v && v.startsWith("/") && !v.startsWith("//") ? v : null;
}

function Login() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const wallet = useWallet();
  const auth = useAuth();
  const [done, setDone] = useState(false);
  // Platform-admin password fallback: shown only when the backend reports it enabled (GET /health.adminPasswordLogin).
  const [adminLoginAvailable, setAdminLoginAvailable] = useState(false);

  const go = (u: User) => router.replace(next ?? roleHome(u.role));

  useEffect(() => {
    let alive = true;
    api.health().then((h) => { if (alive) setAdminLoginAvailable(!!h.adminPasswordLogin); }).catch(() => undefined);
    return () => { alive = false; };
  }, []);

  // Already signed in → straight to the destination.
  useEffect(() => {
    if (auth.ready && auth.status === "authenticated" && auth.user && !done) go(auth.user);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.ready, auth.status, auth.user]);

  const signIn = async () => {
    const u = await auth.signIn();
    if (u) {
      setDone(true);
      setTimeout(() => go(u), 600);
    }
  };
  const signInAdmin = async (username: string, password: string) => {
    const u = await auth.signInAdmin(username, password);
    if (u) {
      setDone(true);
      setTimeout(() => router.replace(next ?? "/admin"), 600);
    }
    return !!u;
  };
  const signing = auth.status === "signing";
  const step = done ? 2 : wallet.account ? 1 : 0;

  return (
    <div className="mx-auto max-w-md space-y-4 pt-2 md:pt-6">
      <Card className="p-6 md:p-8">
        <div className="flex items-center justify-between">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10"><Logo className="h-8 w-8 text-primary" /></span>
          <TestnetBadge size="xs" />
        </div>
        <h1 className="mt-4">Welcome to ChitChain</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">Connect your MST wallet, sign once, and you&apos;re in. No gas, no funds move.</p>
        <div className="mt-5"><LoginStepper current={step} /></div>

        {!wallet.hasWallet ? (
          <div className="mt-6 space-y-2">
            <Button className="w-full" size="lg" asChild><a href={BRIDGEKEY_URL} target="_blank" rel="noopener noreferrer"><Wallet aria-hidden /> Install BridgeKey</a></Button>
            <p className="text-center text-[13px] text-muted-foreground">No wallet detected. Install BridgeKey, then reload this page.</p>
          </div>
        ) : !wallet.account ? (
          <Button className="mt-6 w-full" size="lg" disabled={wallet.connecting} onClick={() => wallet.connect().catch((e) => toast.error(parseTxError(e).message))}>
            {wallet.connecting ? <Loader2 className="animate-spin" aria-hidden /> : <Wallet aria-hidden />} Connect BridgeKey
          </Button>
        ) : (
          <div className="mt-6 space-y-4">
            <dl className="divide-y overflow-hidden rounded-xl border bg-white/[0.04] text-sm">
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                <dt className="text-xs font-medium text-muted-foreground">Wallet</dt>
                <dd className="flex items-center gap-1.5">
                  <span className="font-mono">{shortAddr(wallet.account)}</span>
                  <button type="button" className="rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground" aria-label="Copy address" onClick={() => navigator.clipboard.writeText(wallet.account!).then(() => toast("Address copied"))}>
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                <dt className="text-xs font-medium text-muted-foreground">Network</dt>
                <dd className="flex items-center gap-2">
                  {wallet.correctChain ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-success"><Check className="h-3.5 w-3.5" aria-hidden /> {CHAIN_NAME}</span>
                  ) : (
                    <>
                      <span className="text-warning">Wrong network</span>
                      <Button size="sm" variant="outline" onClick={() => wallet.switchNetwork().catch((e) => toast.error(parseTxError(e).message))}>Switch to {CHAIN_NAME}</Button>
                    </>
                  )}
                </dd>
              </div>
            </dl>
            <Button className="w-full" size="lg" disabled={!wallet.correctChain || signing || done} onClick={() => void signIn()}>
              {done ? <><Check aria-hidden /> Signed in</> : signing ? <><Loader2 className="animate-spin" aria-hidden /> Sign in</> : "Sign in"}
            </Button>
            {signing && <p className="text-center text-[13px] text-muted-foreground" role="status">Confirm the signature in BridgeKey. It proves you own this wallet, costs no gas and moves no funds.</p>}
          </div>
        )}
        <InfoBanner Icon={ShieldCheck} tone="success" className="mt-5">ChitChain never asks for your seed phrase or private key.</InfoBanner>
      </Card>

      {adminLoginAvailable && <AdminPasswordForm signing={signing} done={done} onSubmit={signInAdmin} />}
    </div>
  );
}

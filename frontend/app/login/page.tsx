"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, KeyRound, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TestnetBadge } from "@/components/TestnetBadge";
import { roleHome, useAuth } from "@/hooks/useAuth";
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

  const go = (u: User) => router.replace(next ?? roleHome(u.role));

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
  const signing = auth.status === "signing";

  return (
    <div className="mx-auto max-w-md space-y-4">
      <Card className="rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" aria-hidden />
          <TestnetBadge size="xs" />
        </div>
        <h1 className="mt-3 text-2xl">Welcome to ChitChain</h1>
        <p className="mt-1 text-sm text-muted-foreground">Connect your MST wallet to continue.</p>

        {!wallet.hasWallet ? (
          <div className="mt-5 space-y-2">
            <Button className="w-full" asChild><a href={BRIDGEKEY_URL} target="_blank" rel="noopener noreferrer"><Wallet aria-hidden /> Install BridgeKey</a></Button>
            <p className="text-center text-xs text-muted-foreground">No wallet detected. Install BridgeKey, then reload this page.</p>
          </div>
        ) : !wallet.account ? (
          <Button className="mt-5 w-full" size="lg" disabled={wallet.connecting} onClick={() => wallet.connect().catch((e) => toast.error(parseTxError(e).message))}>
            <Wallet aria-hidden /> {wallet.connecting ? "Connecting…" : "Connect MST Wallet"}
          </Button>
        ) : (
          <div className="mt-5 space-y-3">
            <Row label="Wallet">
              <span className="font-mono text-sm">{shortAddr(wallet.account)}</span>
              <button type="button" className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Copy address" onClick={() => navigator.clipboard.writeText(wallet.account!).then(() => toast("Address copied"))}>
                <Copy className="h-3.5 w-3.5" aria-hidden />
              </button>
            </Row>
            <Row label="Network">
              {wallet.correctChain ? (
                <span className="inline-flex items-center gap-1 text-sm font-medium text-success"><span className="h-2 w-2 rounded-full bg-success" aria-hidden /> {CHAIN_NAME}</span>
              ) : (
                <>
                  <span className="text-sm text-warning">Wrong network</span>
                  <Button size="sm" variant="outline" onClick={() => wallet.switchNetwork().catch((e) => toast.error(parseTxError(e).message))}>Switch to {CHAIN_NAME}</Button>
                </>
              )}
            </Row>
            <Button className="w-full" size="lg" disabled={!wallet.correctChain || signing || done} onClick={() => void signIn()}>
              {done ? <><Check aria-hidden /> Wallet verified.</> : signing ? <><Loader2 className="animate-spin" aria-hidden /> Confirm the signature in BridgeKey…</> : "Sign In"}
            </Button>
            {signing && <p className="text-center text-xs text-muted-foreground">Signing proves you own this wallet. It costs no gas and moves no funds.</p>}
          </div>
        )}
      </Card>
      <p className="flex items-start justify-center gap-1.5 text-center text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
        ChitChain never asks for your seed phrase or private key.
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border bg-muted/30 px-3 py-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="flex items-center gap-2">{children}</span>
    </div>
  );
}

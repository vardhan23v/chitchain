"use client";

import { useState } from "react";
import { Check, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  signing: boolean;
  done: boolean;
  onSubmit: (username: string, password: string) => Promise<boolean>;
}

/** Platform-admin password fallback (shown only when GET /health reports it enabled). Website rights only, never wallet or fund control. */
export function AdminPasswordForm({ signing, done, onSubmit }: Props) {
  const [show, setShow] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await onSubmit(username, password)) setPassword("");
  };

  return (
    <div className="space-y-3">
      <p className="text-center">
        <button type="button" className="rounded text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" aria-expanded={show} aria-controls="admin-login" onClick={() => setShow((v) => !v)}>
          Platform admin? Sign in with password
        </button>
      </p>
      {show && (
        <Card id="admin-login" className="p-5 md:p-6">
          <form onSubmit={(e) => void submit(e)} className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-agent" aria-hidden />
              <h2 className="text-base font-semibold">Admin password login</h2>
            </div>
            <p className="text-xs text-muted-foreground">For the platform administrator only. Members and organizers sign in with their MST wallet.</p>
            <div className="space-y-1.5">
              <Label htmlFor="admin-username">Username</Label>
              <Input id="admin-username" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(e) => setUsername(e.target.value)} required disabled={signing || done} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Password</Label>
              <Input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={signing || done} />
            </div>
            <Button type="submit" className="w-full" disabled={signing || done || !username.trim() || !password}>
              {done ? <><Check aria-hidden /> Admin verified.</> : signing ? <><Loader2 className="animate-spin" aria-hidden /> Checking…</> : "Sign in as admin"}
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">Grants website admin rights only, never wallet or fund control.</p>
          </form>
        </Card>
      )}
    </div>
  );
}

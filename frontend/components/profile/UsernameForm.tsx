"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiError } from "@/lib/api";
import type { UsernameCheck } from "@/lib/types";
import { cn } from "@/lib/utils";

const RULE = "3 to 20 characters: letters, numbers and single underscores, starting with a letter. Saved in lowercase.";

/**
 * Choose or change a username. Availability is checked as you type (rules, reserved names, taken and lookalike names);
 * the server checks again when saving. The wallet address stays the on-chain identity.
 */
export function UsernameForm({ submitLabel = "Create profile", onSaved, autoFocus }: { submitLabel?: string; onSaved?: () => void; autoFocus?: boolean }) {
  const auth = useAuth();
  const wallet = auth.user?.walletAddress ?? null;
  const [value, setValue] = useState(auth.user?.username ?? "");
  const [check, setCheck] = useState<UsernameCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const trimmed = value.trim();
  const unchanged = !!auth.user?.username && trimmed.toLowerCase() === auth.user.username;

  useEffect(() => {
    if (!trimmed || unchanged) { setCheck(null); return; }
    setChecking(true);
    const t = setTimeout(() => {
      api.checkUsername(trimmed, wallet)
        .then(setCheck)
        .catch(() => setCheck(null))
        .finally(() => setChecking(false));
    }, 350);
    return () => clearTimeout(t);
  }, [trimmed, unchanged, wallet]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.setUsername(trimmed);
      auth.setUser(r.user);
      toast.success(`Profile saved. You are ${r.user.username} on ChitChain.`);
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "The username could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const ok = !!check?.available && !checking;
  const shown = check && check.username !== trimmed ? `Saved as ${check.username}.` : null;

  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (ok) void save(); }}>
      <div className="space-y-1.5">
        <Label htmlFor="username">Username</Label>
        <div className="relative">
          <Input
            id="username"
            value={value}
            autoFocus={autoFocus}
            autoComplete="off"
            spellCheck={false}
            maxLength={20}
            placeholder="rahul"
            onChange={(e) => setValue(e.target.value.replace(/\s/g, ""))}
            className={cn("h-11 pr-10 text-[16px]", check && !check.available && "border-danger focus-visible:ring-danger/30")}
            aria-describedby="username-hint"
            aria-invalid={check ? !check.available : undefined}
          />
          <span className="absolute inset-y-0 right-3 flex items-center" aria-hidden>
            {checking ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : check ? check.available ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-danger" /> : null}
          </span>
        </div>
        <p id="username-hint" className={cn("text-[12px]", check && !check.available ? "text-danger" : "text-muted-foreground")} aria-live="polite">
          {unchanged ? "This is your current username." : check ? (check.available ? `${check.username} is available. ${shown ?? ""}` : check.message) : RULE}
        </p>
      </div>
      <Button type="submit" className="w-full" disabled={!ok || saving || unchanged}>
        {saving && <Loader2 className="animate-spin" aria-hidden />}{submitLabel}
      </Button>
    </form>
  );
}

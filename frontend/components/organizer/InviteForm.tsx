"use client";

import { useEffect, useState } from "react";
import { Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AddressPill } from "@/components/AddressPill";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { Invite } from "@/lib/types";

const ADDR = /^0x[0-9a-fA-F]{40}$/;

/** Invite wallets (one per line / comma separated) → POST invites; list with remove. Invites are off-chain; joining still needs collateral on-chain. */
export function InviteForm({ circleId }: { circleId: number }) {
  const [text, setText] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [busy, setBusy] = useState(false);
  const addrs = Array.from(new Set(text.split(/[\s,;]+/).map((a) => a.trim()).filter(Boolean)));
  const bad = addrs.filter((a) => !ADDR.test(a));

  // No GET for a circle's invites in API.md; we keep what this session sent.
  useEffect(() => setInvites([]), [circleId]);

  const send = async () => {
    if (!addrs.length || bad.length) return;
    setBusy(true);
    try {
      const r = await api.organizerInvite(circleId, addrs);
      // API.md's Invite has no invitee field; fall back to the addresses we just sent (same order).
      const fresh = r.invites.map((i, idx) => (inviteAddr(i) ? i : ({ ...i, address: addrs[idx] ?? "" } as Invite)));
      setInvites((cur) => [...fresh, ...cur.filter((i) => !fresh.some((n) => inviteAddr(n) === inviteAddr(i)))]);
      setText("");
      toast.success(`Invited ${r.invites.length} wallet${r.invites.length === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  };
  const remove = async (addr: string) => {
    try {
      await api.organizerUninvite(circleId, addr);
      setInvites((cur) => cur.filter((i) => inviteAddr(i) !== addr));
      toast("Invite removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't remove the invite");
    }
  };

  return (
    <Card className="rounded-2xl p-4 md:p-5">
      <div className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-wide text-muted-foreground"><UserPlus className="h-4 w-4" aria-hidden /> Invite members</div>
      <p className="mt-1 text-xs text-muted-foreground">One wallet address per line. Invites are a website nudge — joining still locks collateral on-chain.</p>
      <Textarea className="mt-3 font-mono text-xs" rows={3} placeholder="0x…" value={text} onChange={(e) => setText(e.target.value)} aria-label="Wallet addresses to invite" />
      {bad.length > 0 && <p className="mt-1 text-xs text-danger" role="alert">{bad.length} entr{bad.length === 1 ? "y isn't" : "ies aren't"} a valid address.</p>}
      <div className="mt-2 flex justify-end">
        <Button size="sm" disabled={busy || !addrs.length || bad.length > 0} onClick={() => void send()}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : null} Send invites</Button>
      </div>
      {invites.length > 0 && (
        <ul className="mt-3 divide-y text-sm">
          {invites.map((i) => (
            <li key={`${inviteAddr(i)}-${i.createdAt}`} className="flex items-center gap-2 py-1.5">
              <AddressPill address={inviteAddr(i)} />
              <span className="ml-auto text-xs text-muted-foreground">{timeAgo(i.createdAt)}</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Remove invite" onClick={() => void remove(inviteAddr(i))}><X className="h-3.5 w-3.5" aria-hidden /></Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Invite rows carry the invitee under `address` (backend detail); fall back gracefully. */
function inviteAddr(i: Invite): string {
  return String((i as unknown as { address?: string; wallet?: string }).address ?? (i as unknown as { wallet?: string }).wallet ?? "");
}

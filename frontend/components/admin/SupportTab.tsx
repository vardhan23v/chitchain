"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { AddressPill } from "@/components/AddressPill";
import { useAdminSupport } from "@/hooks/useAdmin";
import { timeAgo } from "@/lib/format";
import type { SupportTicket } from "@/lib/types";

export function SupportTab() {
  const [status, setStatus] = useState<"OPEN" | "CLOSED">("OPEN");
  const s = useAdminSupport(status);
  const list = s.data ?? [];
  return (
    <div className="space-y-3">
      <Tabs value={status} onValueChange={(v) => setStatus(v as "OPEN" | "CLOSED")}>
        <TabsList aria-label="Ticket status"><TabsTrigger value="OPEN">Open</TabsTrigger><TabsTrigger value="CLOSED">Closed</TabsTrigger></TabsList>
      </Tabs>
      {s.loading && !s.data ? (
        <Skeleton className="h-32 rounded-[22px]" />
      ) : s.error && !s.data ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">Tickets are temporarily unavailable.<span className="mt-1 block font-mono text-[11px] text-muted-foreground/80">{s.error}</span></Card>
      ) : list.length === 0 ? (
        <Card className="border-dashed p-6 text-center text-sm text-muted-foreground">No {status.toLowerCase()} tickets. Nothing here yet.</Card>
      ) : (
        list.map((t) => <TicketCard key={t.id} t={t} busy={s.busy === t.id} onUpdate={(b) => s.update(t.id, b)} />)
      )}
    </div>
  );
}

function TicketCard({ t, busy, onUpdate }: { t: SupportTicket; busy: boolean; onUpdate: (b: { status?: "OPEN" | "CLOSED"; adminNote?: string }) => Promise<void> }) {
  const [note, setNote] = useState(t.adminNote ?? "");
  return (
    <Card className="p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">#{t.id} · {t.subject}</span>
        <AddressPill address={t.userWallet} />
        <span className="ml-auto text-xs text-muted-foreground">{timeAgo(t.createdAt)}</span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm">{t.message}</p>
      <Textarea className="mt-3" rows={2} placeholder="Admin note (visible to the member)" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Admin note" />
      <div className="mt-2 flex justify-end gap-2">
        <Button size="sm" variant="outline" disabled={busy || note === (t.adminNote ?? "")} onClick={() => void onUpdate({ adminNote: note })}>Save the note</Button>
        {t.status === "OPEN" ? (
          <Button size="sm" disabled={busy} onClick={() => void onUpdate({ status: "CLOSED", adminNote: note || undefined })}>Close the ticket</Button>
        ) : (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void onUpdate({ status: "OPEN" })}>Reopen the ticket</Button>
        )}
      </div>
    </Card>
  );
}

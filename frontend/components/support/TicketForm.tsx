"use client";

import { useState } from "react";
import Link from "next/link";
import { Inbox, Loader2, MessageSquarePlus, Ticket, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { SectionTitle } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useSupport } from "@/hooks/useSupport";
import { timeAgo } from "@/lib/format";

/** Ticket form + "My tickets", needs a session (POST /support, GET /support/mine). */
export function TicketForm() {
  const auth = useAuth();
  const s = useSupport();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const valid = subject.trim().length >= 3 && message.trim().length >= 10;

  if (auth.status !== "authenticated") {
    return (
      <EmptyState Icon={Ticket} title="Sign in to open a ticket." text="Sign in with your wallet to open a support ticket and see replies." action={<Button asChild size="sm"><Link href="/login?next=/support">Sign in</Link></Button>} />
    );
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    if (await s.create(subject.trim(), message.trim())) {
      setSubject("");
      setMessage("");
    }
  };
  const tickets = s.data ?? [];
  return (
    <div className="space-y-4">
      <Card className="p-4 md:p-5">
        <SectionTitle Icon={MessageSquarePlus} tone="text-primary">Open a ticket</SectionTitle>
        <form className="mt-3 space-y-3" onSubmit={submit}>
          <div className="space-y-1">
            <Label htmlFor="t-subject">Subject</Label>
            <Input id="t-subject" maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. My contribution shows pending" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="t-message">Message</Label>
            <Textarea id="t-message" rows={4} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What happened, which circle, and the MSTScan link if you have one." />
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-muted-foreground">Never share your seed phrase or private key. We will never ask.</span>
            <Button type="submit" size="sm" disabled={!valid || s.sending}>{s.sending ? <Loader2 className="animate-spin" aria-hidden /> : null} Send the ticket</Button>
          </div>
        </form>
      </Card>
      <section className="space-y-3">
        <SectionTitle Icon={Inbox} trailing={tickets.length ? <span className="tnum">{tickets.length}</span> : undefined}>My tickets</SectionTitle>
        {s.loading && !s.data ? (
          <Skeleton className="h-16 rounded-[22px]" />
        ) : s.error && !s.data ? (
          <EmptyState Icon={WifiOff} tone="bg-muted text-muted-foreground" className="py-6" title="Your tickets are temporarily unavailable." text="Try again in a moment." />
        ) : tickets.length === 0 ? (
          <EmptyState Icon={Inbox} tone="bg-muted text-muted-foreground" title="Nothing here yet." text="Tickets you open show up here with any replies." className="py-6" />
        ) : (
          tickets.map((t) => (
            <Card key={t.id} className="p-4 md:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">#{t.id} · {t.subject}</span>
                <Badge variant={t.status === "OPEN" ? "status-pending" : "status-paid"}>{t.status === "OPEN" ? "Open" : "Closed"}</Badge>
                <span className="ml-auto text-[13px] text-muted-foreground">{timeAgo(t.createdAt)}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[15px] text-muted-foreground">{t.message}</p>
              {t.adminNote && <p className="mt-2 rounded-xl bg-white/40 p-2 text-sm"><span className="font-medium">Reply:</span> {t.adminNote}</p>}
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

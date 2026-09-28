"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";

/** Inline "Name this circle" → POST /organizer/circles/:id/meta */
export function NameCircleForm({ id, initial, onSaved }: { id: number; initial?: string | null; onSaved: () => void }) {
  const [name, setName] = useState(initial ?? "");
  const [busy, setBusy] = useState(false);
  const valid = name.trim().length >= 2 && name.trim().length <= 60;
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      await api.organizerMeta(id, { name: name.trim() });
      toast.success("Circle named");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the name");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={save} className="flex items-center gap-2" aria-label="Name this circle">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name this circle" maxLength={60} className="h-8" aria-label="Circle name" />
      <Button type="submit" size="sm" disabled={!valid || busy}>{busy ? <Loader2 className="animate-spin" aria-hidden /> : "Save"}</Button>
    </form>
  );
}

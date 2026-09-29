"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Health, ServiceHealth } from "@/lib/types";

type Tone = "ok" | "warn" | "bad";

/** Normalises the tolerant `crew` / `llm` shapes from /health into a label and tone. */
function summarise(v: ServiceHealth | string | boolean | undefined): { label: string; tone: Tone; detail?: string } | null {
  if (v === undefined || v === null) return null;
  if (typeof v === "boolean") return { label: v ? "Online" : "Offline", tone: v ? "ok" : "bad" };
  if (typeof v === "string") {
    const s = v.toLowerCase();
    const ok = ["ok", "online", "up", "ready", "healthy", "connected"].includes(s);
    const warn = ["degraded", "stale", "slow", "warming"].includes(s);
    return { label: v.charAt(0).toUpperCase() + v.slice(1), tone: ok ? "ok" : warn ? "warn" : "bad" };
  }
  const status = v.status?.toLowerCase();
  const ok = v.ok === true || (v.ok === undefined && !!status && ["ok", "online", "up", "ready", "healthy", "connected"].includes(status));
  const warn = !ok && !!status && ["degraded", "stale", "slow", "warming"].includes(status);
  const label = v.status ? v.status.charAt(0).toUpperCase() + v.status.slice(1) : ok ? "Online" : "Offline";
  const detail = [v.provider, v.model].filter(Boolean).join(" · ") || v.error || undefined;
  return { label, tone: ok ? "ok" : warn ? "warn" : "bad", detail };
}

/** `crew` and `llm` status chips from /health, shown on the admin System tab when the backend reports them. */
export function ServiceChips({ health }: { health: Health | null }) {
  const items = [
    { name: "Crew", s: summarise(health?.crew) },
    { name: "LLM", s: summarise(health?.llm) },
  ].filter((i) => i.s);
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs" aria-label="AI services">
      {items.map(({ name, s }) => {
        const Icon = s!.tone === "ok" ? CheckCircle2 : s!.tone === "warn" ? AlertTriangle : XCircle;
        const variant = s!.tone === "ok" ? "status-paid" : s!.tone === "warn" ? "status-covered" : "status-removed";
        return (
          <Badge key={name} variant={variant} className="whitespace-nowrap font-medium" title={s!.detail}>
            <Icon className="h-3 w-3" aria-hidden /> {name}: {s!.label}
            {s!.detail && <span className="ml-1 font-normal opacity-80">{s!.detail}</span>}
          </Badge>
        );
      })}
    </div>
  );
}

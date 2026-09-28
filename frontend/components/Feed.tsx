"use client";

import { useEffect, useState } from "react";
import { Radio, WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { FeedItem, type LabelMap } from "@/components/FeedItem";
import { SectionTitle } from "@/components/PageHeader";
import type { FeedEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  events: FeedEvent[];
  down: boolean;
  loading: boolean;
  labels: LabelMap;
  title?: string;
  className?: string;
}

export function Feed({ events, down, loading, labels, title = "Live feed", className }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card className={cn("flex flex-col p-4 md:p-5", className)}>
      <SectionTitle
        Icon={Radio}
        tone="text-chain"
        trailing={
          !down ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-success">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-success" /></span>
              live
            </span>
          ) : undefined
        }
      >
        {title}
      </SectionTitle>
      <ScrollArea className="-mx-1 mt-2 h-[360px] lg:h-[calc(100vh-280px)] lg:min-h-[420px]">
        {down ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <WifiOff className="h-5 w-5" aria-hidden />
            Live feed needs the backend
          </div>
        ) : loading ? (
          <div className="space-y-2 px-1 pr-3">
            {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : events.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No on-chain events yet.</p>
        ) : (
          <ul className="space-y-0.5 px-1 pr-3" aria-live="polite" aria-relevant="additions">
            {events.map((e) => <FeedItem key={`${e.txHash}-${e.logIndex}-${e.id}`} e={e} labels={labels} now={now} />)}
          </ul>
        )}
      </ScrollArea>
    </Card>
  );
}

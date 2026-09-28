"use client";

import { Bot, History, ShieldHalf, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DefaultEventCard } from "@/components/DefaultEventCard";
import { EmptyState } from "@/components/EmptyState";
import { MembersGrid } from "@/components/MembersGrid";
import { RoundHistory } from "@/components/RoundHistory";
import { AgentSection } from "@/components/room/AgentSection";
import { useDefaults } from "@/hooks/useDefaults";
import { useRoundHistory } from "@/hooks/useRoundHistory";
import type { CircleRoom, FeedEvent, MemberInfo } from "@/lib/types";

interface Props {
  data: CircleRoom & { source: "api" | "chain" };
  me: MemberInfo | null;
  viewer: string | null;
  events: FeedEvent[];
  labelFor: (addr: string) => string;
  onChanged: () => void;
}

function Count({ n }: { n: number }) {
  if (!n) return null;
  return <span className="tnum rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">{n}</span>;
}

/** "Live" (members + agent) | "Round history" | "Defaults" — keeps the hero screen uncluttered. */
export function RoomTabs({ data, me, viewer, events, labelFor, onChanged }: Props) {
  const { circle, members, round } = data;
  const backendDown = data.source !== "api";
  const history = useRoundHistory(circle.id, circle.status >= 1);
  const defaults = useDefaults(circle.id, !backendDown);
  const defaultCount = defaults.data?.length ?? (data.latestDefault ? 1 : 0);
  const rounds = history.data?.rounds ?? [];

  return (
    <Tabs defaultValue="live" className="space-y-4">
      <TabsList aria-label="Room sections">
        <TabsTrigger value="live"><Users className="h-3.5 w-3.5" aria-hidden /> Live <Count n={members.length} /></TabsTrigger>
        <TabsTrigger value="history"><History className="h-3.5 w-3.5" aria-hidden /> Rounds <Count n={rounds.length} /></TabsTrigger>
        <TabsTrigger value="defaults" className={defaultCount ? "data-[state=inactive]:text-warning" : undefined}><ShieldHalf className="h-3.5 w-3.5" aria-hidden /> Defaults <Count n={defaultCount} /></TabsTrigger>
      </TabsList>
      <TabsContent value="live" className="min-w-0 space-y-5">
        <MembersGrid circle={circle} members={members} viewer={viewer} events={events} rounds={rounds} />
        <AgentSection circleId={circle.id} me={me} members={members} mandates={data.mandates} labelFor={labelFor} backendDown={backendDown} pot={circle.status === 1 ? round.expectedPot : null} onChanged={onChanged} />
      </TabsContent>
      <TabsContent value="history" className="min-w-0">
        <RoundHistory rounds={history.data?.rounds ?? null} loading={history.loading} labelFor={labelFor} source={history.data?.source} />
      </TabsContent>
      <TabsContent value="defaults" className="space-y-3">
        {backendDown ? (
          <EmptyState Icon={Bot} tone="bg-muted text-muted-foreground" title="Default details need the backend indexer" />
        ) : defaults.loading && !defaults.data ? (
          <Skeleton className="h-28 rounded-2xl" />
        ) : !defaults.data?.length ? (
          <EmptyState Icon={ShieldHalf} tone="bg-success/10 text-success" title="No missed contributions" text="Every round so far was paid in full." />
        ) : (
          defaults.data.map((d) => <DefaultEventCard key={`${d.txHash}-${d.member}-${d.round}`} d={d} />)
        )}
      </TabsContent>
    </Tabs>
  );
}

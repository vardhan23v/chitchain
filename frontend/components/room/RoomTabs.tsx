"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DefaultEventCard } from "@/components/DefaultEventCard";
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

/** "Live" (members + agent) | "Round history" | "Defaults" — keeps the hero screen uncluttered. */
export function RoomTabs({ data, me, viewer, events, labelFor, onChanged }: Props) {
  const { circle, members, round } = data;
  const backendDown = data.source !== "api";
  const history = useRoundHistory(circle.id, circle.status >= 1);
  const defaults = useDefaults(circle.id, !backendDown);
  const defaultCount = defaults.data?.length ?? (data.latestDefault ? 1 : 0);
  const rounds = history.data?.rounds ?? [];

  return (
    <Tabs defaultValue="live" className="space-y-3">
      <TabsList className="rounded-full">
        <TabsTrigger value="live" className="rounded-full">Live</TabsTrigger>
        <TabsTrigger value="history" className="rounded-full">Round history{rounds.length ? ` · ${rounds.length}` : ""}</TabsTrigger>
        <TabsTrigger value="defaults" className="rounded-full">Defaults{defaultCount ? ` · ${defaultCount}` : ""}</TabsTrigger>
      </TabsList>
      <TabsContent value="live" className="space-y-5">
        <MembersGrid circle={circle} members={members} viewer={viewer} events={events} rounds={rounds} />
        <AgentSection circleId={circle.id} me={me} members={members} mandates={data.mandates} labelFor={labelFor} backendDown={backendDown} pot={circle.status === 1 ? round.expectedPot : null} onChanged={onChanged} />
      </TabsContent>
      <TabsContent value="history">
        <RoundHistory rounds={history.data?.rounds ?? null} loading={history.loading} labelFor={labelFor} source={history.data?.source} />
      </TabsContent>
      <TabsContent value="defaults" className="space-y-3">
        {backendDown ? (
          <p className="text-sm text-muted-foreground">Default details need the backend indexer.</p>
        ) : defaults.loading && !defaults.data ? (
          <Skeleton className="h-28 rounded-2xl" />
        ) : !defaults.data?.length ? (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">No missed contributions in this circle. Every round so far was paid in full.</p>
        ) : (
          defaults.data.map((d) => <DefaultEventCard key={`${d.txHash}-${d.member}-${d.round}`} d={d} />)
        )}
      </TabsContent>
    </Tabs>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgentPanel } from "@/components/AgentPanel";
import { AuctionPanel } from "@/components/AuctionPanel";
import { Feed } from "@/components/Feed";
import type { LabelMap } from "@/components/FeedItem";
import { MembersGrid } from "@/components/MembersGrid";
import { PotMeter } from "@/components/PotMeter";
import { PrimaryAction } from "@/components/PrimaryAction";
import { RoomBanners } from "@/components/RoomBanners";
import { RoomHeader } from "@/components/RoomHeader";
import { useAgentLogs } from "@/hooks/useAgentLogs";
import { useCircle } from "@/hooks/useCircle";
import { useFeed } from "@/hooks/useFeed";
import { useRoomActions } from "@/hooks/useRoomActions";
import { useViewerJoinInfo } from "@/hooks/useViewerJoinInfo";
import { useWallet } from "@/hooks/useWallet";
import { HAS_CONTRACT } from "@/lib/chain";
import { sameAddr, shortAddr } from "@/lib/format";
import type { MemberInfo } from "@/lib/types";

export default function CircleRoomPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const wallet = useWallet();
  const room = useCircle(id, wallet.account);
  const feed = useFeed(id);
  const actions = useRoomActions(id, room.refetch);
  const agentLogs = useAgentLogs(id, room.data?.source === "api");
  const bidRef = useRef<HTMLDivElement>(null);
  const [agentPick, setAgentPick] = useState<string>("");

  const data = room.data;
  const isMember = !!room.me?.joined;
  const joinInfo = useViewerJoinInfo(id, wallet.account, !!data && data.circle.status === 0 && !isMember);

  const labels = useMemo<LabelMap>(() => {
    const m: LabelMap = {};
    for (const x of data?.members ?? []) if (x.label) m[x.address.toLowerCase()] = x.label;
    return m;
  }, [data?.members]);
  const labelFor = (a: string) => labels[a.toLowerCase()] ?? shortAddr(a);

  const isDemo = (m: MemberInfo | null) => !!m && (m.custodial === true || !!m.label);
  const demoMembers = (data?.members ?? []).filter((m) => isDemo(m));
  const agentMember: MemberInfo | null = isDemo(room.me) ? room.me : demoMembers.find((m) => sameAddr(m.address, agentPick)) ?? null;
  const mandate = data?.mandates.find((x) => agentMember && sameAddr(x.member, agentMember.address) && x.active) ?? null;

  if (!Number.isFinite(id) || id < 1) return <p className="text-muted-foreground">Invalid circle id.</p>;
  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
        {room.slow && <p className="text-sm text-warning" role="status">MST testnet is slow — retrying</p>}
        {room.error && !HAS_CONTRACT && <p className="text-sm text-muted-foreground">Backend unreachable and no contract address configured.</p>}
        {room.error && HAS_CONTRACT && room.slow && <p className="text-sm text-muted-foreground">Circle #{id} could not be loaded: {room.error}</p>}
      </div>
    );
  }

  const { circle, round, members } = data;
  const viewerRequired = room.me?.joined ? null : joinInfo.required ?? (data.viewerRequired ? BigInt(data.viewerRequired) : null);
  const viewerTier = room.me?.joined ? room.me.tier : joinInfo.tier;

  const primary = (
    <PrimaryAction
      wallet={wallet}
      circle={circle}
      me={room.me}
      viewerRequired={viewerRequired}
      viewerTier={viewerTier}
      pending={actions.pending}
      hasContract={HAS_CONTRACT}
      on={{
        join: () => viewerRequired !== null && void actions.join(viewerRequired),
        contribute: () => void actions.contribute(BigInt(circle.contribution)),
        withdraw: () => void actions.withdraw(),
        leave: () => void actions.leave(),
        cancel: () => void actions.cancel(),
        focusBid: () => bidRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      }}
    />
  );

  return (
    <div className="space-y-5 pb-24 md:pb-0">
      <RoomHeader circle={circle} txCount={data.txCount} onSettle={() => void actions.settle(!!wallet.account && wallet.correctChain)} settling={actions.pending} source={data.source} />
      <RoomBanners circle={circle} me={room.me} members={members} events={feed.events} labels={labels} onWithdraw={() => void actions.withdraw()} pending={actions.pending} />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <div className="grid gap-5 md:grid-cols-[3fr_2fr]">
            <div className="space-y-3">
              <PotMeter circle={circle} round={round} />
              <div className="hidden md:block">{primary}</div>
            </div>
            <div ref={bidRef} className="order-3 md:order-none">
              <AuctionPanel round={round} active={circle.status === 1} me={room.me} labelFor={labelFor} onBid={actions.bid} pending={actions.pending} />
            </div>
          </div>
          <MembersGrid circle={circle} members={members} viewer={wallet.account} events={feed.events} />
          <div className="space-y-2">
            {!isDemo(room.me) && demoMembers.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                Drive the agent for a demo wallet:
                <Select value={agentPick} onValueChange={setAgentPick}>
                  <SelectTrigger className="h-8 w-40 rounded-full"><SelectValue placeholder="Pick member" /></SelectTrigger>
                  <SelectContent>{demoMembers.map((m) => <SelectItem key={m.address} value={m.address}>Member {m.label} · {shortAddr(m.address)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <AgentPanel
              circleId={id}
              member={agentMember}
              isDemoWallet={isDemo(agentMember)}
              logs={agentLogs.data ? agentLogs.data.filter((l) => !agentMember || sameAddr(l.member, agentMember.address)) : null}
              mandate={mandate}
              labelFor={labelFor}
              onChanged={() => void Promise.all([room.refetch(), agentLogs.refetch(), feed.refetch()])}
              backendDown={data.source !== "api"}
            />
          </div>
        </div>
        <Feed events={feed.events} down={feed.down} loading={feed.loading} labels={labels} />
      </div>

      {/* Mobile sticky primary action */}
      <div className="fixed inset-x-0 bottom-14 z-30 border-t bg-background/95 p-3 backdrop-blur md:hidden">{primary}</div>
    </div>
  );
}

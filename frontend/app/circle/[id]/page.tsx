"use client";

import { useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { AuctionPanel } from "@/components/AuctionPanel";
import { DefaultEventCard } from "@/components/DefaultEventCard";
import { Feed } from "@/components/Feed";
import type { LabelMap } from "@/components/FeedItem";
import { EASE, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { PotMeter } from "@/components/PotMeter";
import { PrimaryAction } from "@/components/PrimaryAction";
import { RoomBanners } from "@/components/RoomBanners";
import { RoomHeader } from "@/components/RoomHeader";
import { RoomTabs } from "@/components/room/RoomTabs";
import { TxStepper } from "@/components/TxStepper";
import { useCircle } from "@/hooks/useCircle";
import { useRoundClock } from "@/hooks/useCountdown";
import { useFeed } from "@/hooks/useFeed";
import { useRoomActions } from "@/hooks/useRoomActions";
import { useViewerJoinInfo } from "@/hooks/useViewerJoinInfo";
import { useWallet } from "@/hooks/useWallet";
import { HAS_CONTRACT } from "@/lib/chain";
import { shortAddr } from "@/lib/format";

/** Loading state that mirrors the real layout: header lines, Pot/Auction 3fr/2fr, 340 px feed rail. */
function RoomSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading circle">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="h-9 w-72" />
        </div>
        <Skeleton className="h-8 w-40 rounded-full" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl md:h-auto" />
          </div>
          <Skeleton className="h-9 w-64 rounded-full" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
        <Skeleton className="h-[420px] rounded-2xl" />
      </div>
    </div>
  );
}

export default function CircleRoomPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const wallet = useWallet();
  const room = useCircle(id, wallet.account);
  const feed = useFeed(id);
  const actions = useRoomActions(id, room.refetch);
  const bidRef = useRef<HTMLDivElement>(null);
  const [bidHighlight, setBidHighlight] = useState(0);
  const [bidFocused, setBidFocused] = useState(false);
  const data = room.data;
  const isMember = !!room.me?.joined;
  const joinInfo = useViewerJoinInfo(id, wallet.account, !!data && data.circle.status === 0 && !isMember);
  const clock = useRoundClock(data?.round, data?.circle.status === 1);

  const labels = useMemo<LabelMap>(() => {
    const m: LabelMap = {};
    for (const x of data?.members ?? []) if (x.label) m[x.address.toLowerCase()] = x.label;
    return m;
  }, [data?.members]);
  const labelFor = (a: string) => labels[a.toLowerCase()] ?? shortAddr(a);

  if (!Number.isFinite(id) || id < 1) return <p className="text-muted-foreground">Invalid circle id.</p>;
  if (!data) {
    return (
      <div className="space-y-4">
        <RoomSkeleton />
        {room.slow && <p className="text-sm text-warning" role="status">MST testnet is slow, retrying</p>}
        {room.error && !HAS_CONTRACT && <p className="text-sm text-muted-foreground">Backend unreachable and no contract address configured.</p>}
        {room.error && HAS_CONTRACT && room.slow && <p className="text-sm text-muted-foreground">Circle #{id} could not be loaded: {room.error}</p>}
      </div>
    );
  }

  const { circle, round, members } = data;
  const viewerRequired = room.me?.joined ? null : joinInfo.required ?? (data.viewerRequired ? BigInt(data.viewerRequired) : null);
  const viewerTier = room.me?.joined ? room.me.tier : joinInfo.tier;
  const activeMembers = members.filter((m) => m.joined && !m.removed).length;
  const showLatestDefault = data.latestDefault && circle.status === 1 && data.latestDefault.round >= circle.round - 1;
  const refetchAll = () => void Promise.all([room.refetch(), feed.refetch()]);

  const primary = (
    <div className="space-y-2">
      <PrimaryAction
        wallet={wallet}
        circle={circle}
        me={room.me}
        viewerRequired={viewerRequired}
        viewerTier={viewerTier}
        pending={actions.pending}
        hasContract={HAS_CONTRACT}
        phase={clock.roundPhase}
        on={{
          join: () => viewerRequired !== null && void actions.join(viewerRequired),
          contribute: () => void actions.contribute(BigInt(circle.contribution)),
          withdraw: () => void actions.withdraw(),
          leave: () => void actions.leave(),
          cancel: () => void actions.cancel(),
          focusBid: () => {
            bidRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
            setBidHighlight((n) => n + 1);
          },
        }}
      />
      <TxStepper state={actions.tx} />
    </div>
  );

  return (
    <RevealGroup mode="load" className="space-y-5 pb-32 md:pb-0">
      <RevealItem>
        <RoomHeader circle={circle} round={round} txCount={data.txCount} onSettle={() => void actions.settle(!!wallet.account && wallet.correctChain)} settling={actions.pending} source={data.source} />
      </RevealItem>
      <RoomBanners circle={circle} me={room.me} members={members} events={feed.events} labels={labels} onWithdraw={() => void actions.withdraw()} pending={actions.pending} />
      {showLatestDefault && data.latestDefault && <DefaultEventCard d={data.latestDefault} compact />}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
            <RevealItem className="min-w-0 space-y-3">
              <PotMeter circle={circle} round={round} />
              <div className="hidden md:block">{primary}</div>
            </RevealItem>
            <RevealItem className="min-w-0">
              <div ref={bidRef} className="h-full">
                <AuctionPanel
                  round={round}
                  phase={clock.roundPhase}
                  active={circle.status === 1}
                  me={room.me}
                  activeMembers={activeMembers}
                  labelFor={labelFor}
                  onBid={actions.bid}
                  pending={actions.pending}
                  highlight={bidHighlight}
                  onFocusChange={setBidFocused}
                />
              </div>
            </RevealItem>
          </div>
          <RevealItem>
            <RoomTabs data={data} me={room.me} viewer={wallet.account} events={feed.events} labelFor={labelFor} onChanged={refetchAll} />
          </RevealItem>
        </div>
        <RevealItem className="min-w-0 lg:sticky lg:top-20 lg:self-start">
          <Feed events={feed.events} down={feed.down} loading={feed.loading} labels={labels} className="min-w-0" />
        </RevealItem>
      </div>

      {/* Mobile sticky primary action: slides up on mount, hides while the bid input has the keyboard. */}
      <AnimatePresence>
        {!bidFocused && (
          <motion.div
            key="mobile-primary"
            className="fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-30 border-t bg-background/95 p-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.25)] backdrop-blur md:hidden"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            {primary}
          </motion.div>
        )}
      </AnimatePresence>
    </RevealGroup>
  );
}

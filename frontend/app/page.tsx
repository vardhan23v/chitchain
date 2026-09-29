"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, CircleDot, Coins, Gavel, Plus, Radio, Sparkles, Users, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CircleCard } from "@/components/CircleCard";
import { EmptyState } from "@/components/EmptyState";
import { HowItWorks } from "@/components/HowItWorks";
import { LiveTicker } from "@/components/landing/LiveTicker";
import { MoneyFlow, type MoneyFlowLive } from "@/components/landing/MoneyFlow";
import type { PotExample } from "@/components/landing/PotStory";
import { Magnetic } from "@/components/motion/Magnetic";
import { Parallax } from "@/components/motion/Parallax";
import { SplitText } from "@/components/motion/SplitText";
import { SpotlightGroup } from "@/components/motion/Spotlight";
import { Transparency } from "@/components/landing/Transparency";
import { WhyBlockchain } from "@/components/landing/WhyBlockchain";
import { CountUp, CountUpMst } from "@/components/motion/CountUp";
import { EASE, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { FeaturedCircle, pickFeatured } from "@/components/FeaturedCircle";
import { SectionTitle } from "@/components/PageHeader";
import { RolesStrip } from "@/components/RolesStrip";
import { StatTile } from "@/components/StatTile";
import { TestnetBadge } from "@/components/TestnetBadge";
import { useAuth } from "@/hooks/useAuth";
import { useCircles } from "@/hooks/useCircles";
import type { Status } from "@/lib/types";

type Filter = "all" | "open" | "active" | "done";
const FILTERS: Record<Filter, (s: Status) => boolean> = {
  all: () => true,
  open: (s) => s === 0,
  active: (s) => s === 1,
  done: (s) => s === 2 || s === 3,
};

export default function HomePage() {
  const { data, loading, slow, error } = useCircles();
  const auth = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const all = data?.circles ?? [];
  const circles = all.filter((c) => FILTERS[filter](c.status));
  const stats = data?.stats ?? null;
  const count = (f: Filter) => all.filter((c) => FILTERS[f](c.status)).length;
  const featured = pickFeatured(all);
  // The How-it-works illustration uses the featured circle's real parameters; shapes only when there is no circle yet.
  const example: PotExample | null = featured
    ? { potWei: BigInt(featured.contribution) * BigInt(featured.maxMembers), contributionWei: BigInt(featured.contribution), maxMembers: featured.maxMembers, maxDiscountBps: featured.maxDiscountBps, name: featured.name ?? `Circle #${featured.id}` }
    : null;
  const enterHref = auth.status === "authenticated" ? auth.home : "/login";

  // Live values for the hero flow come from the first active circle (newest id); otherwise the flow shows neutral copy.
  const liveCircle = [...all].sort((a, b) => b.id - a.id).find((c) => c.status === 1) ?? null;
  const live: MoneyFlowLive | undefined = liveCircle
    ? { potMst: BigInt(liveCircle.contribution) * BigInt(liveCircle.maxMembers), members: liveCircle.memberCount, maxMembers: liveCircle.maxMembers }
    : undefined;
  const liveMembers = all.filter((c) => c.status <= 1).reduce((n, c) => n + c.memberCount, 0);

  return (
    <div className="space-y-10 md:space-y-12">
      {/* Hero: copy, CTAs, then the signature money flow. */}
      <RevealGroup as="section" mode="load" className="space-y-8 pt-2 md:pt-6">
        <Parallax className="max-w-2xl" distance={28} fadeTo={0.3}>
          <RevealItem className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
            <span>Chit funds on MST Blockchain</span>
            <TestnetBadge size="xs" />
          </RevealItem>
          <RevealItem>
            <h1 className="mt-3 text-[36px] font-semibold leading-[1.08] tracking-tight md:text-[44px] md:leading-[48px]">
              <SplitText text="Chit funds, rebuilt on-chain." delay={0.1} />
            </h1>
          </RevealItem>
          <RevealItem>
            <p className="mt-4 text-[15px] text-muted-foreground md:text-lg">Save together. Bid when you need it. Let smart contracts handle the pot.</p>
          </RevealItem>
          <RevealItem className="mt-6 flex flex-wrap gap-3">
            <Magnetic><Button size="lg" asChild><Link href={enterHref}>Enter ChitChain</Link></Button></Magnetic>
            <Magnetic><Button size="lg" variant="secondary" asChild><a href="#how">How it works</a></Button></Magnetic>
          </RevealItem>
        </Parallax>
        <RevealItem>
          <Card className="grid-texture p-4 md:p-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted-foreground">
              <span>How money moves through a chit</span>
              {liveCircle && <span className="tnum">Live values from {liveCircle.name ?? `Circle #${liveCircle.id}`}</span>}
            </div>
            <MoneyFlow live={live} />
          </Card>
        </RevealItem>
      </RevealGroup>

      <SpotlightGroup>
      <RevealGroup as="section" className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Network stats">
        <StatTile label="Circles live" Icon={CircleDot} iconClassName="text-primary" value={stats?.circlesLive ?? (data ? all.filter((c) => c.status <= 1).length : "—")} loading={loading && !data} hint={stats ? `${stats.circlesTotal} total` : data?.source === "chain" ? "read from contract" : undefined} />
        <StatTile label="MST locked" Icon={Coins} iconClassName="text-pot" testnet value={stats ? <CountUpMst wei={stats.mstcInContract} fromZero /> : "—"} valueClassName="text-pot" loading={loading && !data} hint={stats ? "held by the contract, not by anyone" : "temporarily unavailable"} />
        <StatTile label="Transactions" Icon={Activity} iconClassName="text-chain" value={stats ? <CountUp value={stats.txCount} fromZero /> : "—"} loading={loading && !data} hint={stats ? "every one verifiable on MSTScan" : "temporarily unavailable"} />
        <StatTile label="Live members" Icon={Users} iconClassName="text-agent" value={data ? <CountUp value={liveMembers} fromZero /> : "—"} loading={loading && !data} hint={data ? "seats taken in open and active circles" : "temporarily unavailable"} />
      </RevealGroup>
      </SpotlightGroup>

      <LiveTicker />

      {featured && (
        <section aria-label={featured.status <= 1 ? "Live now" : "Latest circle"} className="space-y-4">
          <SectionTitle Icon={Radio} tone={featured.status <= 1 ? "text-primary" : "text-muted-foreground"}>{featured.status <= 1 ? "Live now" : "Latest circle"}</SectionTitle>
          <Card className="p-5 md:p-6">
            <FeaturedCircle c={featured} />
          </Card>
        </section>
      )}

      <HowItWorks example={example} />

      <WhyBlockchain />

      <Transparency />

      <RolesStrip />

      <section id="auctions" className="scroll-mt-20 space-y-4">
        <span id="circles" className="block scroll-mt-20" aria-hidden />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle Icon={Gavel} tone="text-primary">Circles</SectionTitle>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList aria-label="Filter circles">
              {(["all", "open", "active", "done"] as Filter[]).map((f) => (
                <TabsTrigger key={f} value={f} className="capitalize">
                  {f}
                  {data && <span className="tnum rounded-full bg-white/[0.08] px-1.5 text-[10px]">{count(f)}</span>}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
        {slow && !data && <p className="text-[13px] text-warning" role="status">MST testnet is slow, retrying.</p>}
        {loading && !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-64 rounded-2xl" />)}</div>
        ) : circles.length === 0 ? (
          error && !data ? (
            <EmptyState Icon={WifiOff} tone="bg-white/[0.06] text-muted-foreground" title="Circle data is temporarily unavailable." text="Check your connection and try again in a moment." />
          ) : (
          <EmptyState
            Icon={Sparkles}
            tone="bg-pot/15 text-pot"
            title={all.length ? `No ${filter} circles yet` : "No circles here yet"}
            text="Set the rules once. The contract enforces them for everyone."
            action={<Button asChild><Link href="/create"><Plus aria-hidden /> Create a circle</Link></Button>}
          />
          )
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={filter} exit={{ opacity: 0 }} transition={{ duration: 0.15, ease: EASE }}>
              <SpotlightGroup>
                <RevealGroup className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {circles.map((c) => <CircleCard key={c.id} c={c} />)}
                </RevealGroup>
              </SpotlightGroup>
            </motion.div>
          </AnimatePresence>
        )}
      </section>
    </div>
  );
}

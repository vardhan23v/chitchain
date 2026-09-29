"use client";

import Link from "next/link";
import { CircleDot, Coins, Gavel, History, KeyRound, Landmark, Lock, ShieldCheck, Wallet, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AuctionCard } from "@/components/AuctionCard";
import { CircleCard } from "@/components/CircleCard";
import { EmptyState } from "@/components/EmptyState";
import { InfoBanner } from "@/components/InfoBanner";
import { MoneyFlow } from "@/components/landing/MoneyFlow";
import { mstNumber } from "@/components/motion/CountUp";
import { RevealGroup } from "@/components/motion/Reveal";
import { SectionTitle } from "@/components/PageHeader";
import { RequireAuth } from "@/components/RequireAuth";
import { RiskCard } from "@/components/RiskCard";
import { StatCard } from "@/components/StatCard";
import { TierChip } from "@/components/TierChip";
import { TransactionRow } from "@/components/TransactionRow";
import { ActiveChitCard } from "@/components/dashboard/ActiveChitCard";
import { ControlPanel } from "@/components/dashboard/ControlPanel";
import { NextActionCard } from "@/components/dashboard/NextActionCard";
import { RecipientDecision } from "@/components/room/RecipientDecision";
import { TxStepper } from "@/components/TxStepper";
import { useRoomActions } from "@/hooks/useRoomActions";
import { useWallet } from "@/hooks/useWallet";
import { nameOf } from "@/lib/labels";
import { useRef } from "react";
import { useActivity } from "@/hooks/useActivity";
import { useAuth } from "@/hooks/useAuth";
import { useCircle } from "@/hooks/useCircle";
import { useRoundClock } from "@/hooks/useCountdown";
import { useMe } from "@/hooks/useMe";
import { isUnreachable } from "@/lib/api";
import { big, formatClock, formatMst, shortAddr } from "@/lib/format";
import { isEvmAddress, type MeOverview, type MyCircle } from "@/lib/types";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const auth = useAuth();
  const { me, circles } = useMe();
  const account = auth.user?.walletAddress ?? "";
  const hasAddr = isEvmAddress(account);
  const list = circles.data ?? [];
  const activeList = list.filter((c) => c.status === 1).sort((a, b) => b.id - a.id);
  const active = activeList[0] ?? null;
  const down = !!me.error && !me.data;
  const activity = useActivity(hasAddr ? account : null, 5);
  const who = auth.user?.username || auth.user?.displayName || (hasAddr ? shortAddr(account) : auth.isPasswordAdmin ? account.replace(/^admin:/, "") : "there");

  return (
    <div className="space-y-6 md:space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="min-w-0 break-words text-[28px] font-semibold leading-tight tracking-tight">{greeting()}, {who}</h1>
          <p className="mt-1 text-[15px] text-muted-foreground">Your ChitChain overview. Every number is read from the contract on MST testnet.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {down && <Badge variant="outline" className="gap-1 font-medium text-muted-foreground"><WifiOff className="h-3 w-3" aria-hidden /> {isUnreachable(me.error) ? "Overview temporarily unavailable" : "Overview could not be loaded"}</Badge>}
        </div>
      </header>

      {auth.isPasswordAdmin && (
        <InfoBanner Icon={KeyRound} tone="agent">
          Password admin accounts have no wallet. Use the <Link href="/admin" className="font-semibold text-primary hover:underline">Admin dashboard</Link>.
        </InfoBanner>
      )}

      <StatRow me={me.data} circles={activeList} loading={me.loading && !me.data} />

      {active ? (
        <ActiveSection summary={active} account={account} />
      ) : (
        <>
          <MoneyFlow compact />
          {circles.loading && !circles.data ? (
            <Card className="p-5" aria-busy="true"><Skeleton className="h-6 w-40" /><Skeleton className="mt-3 h-10 w-56" /><Skeleton className="mt-4 h-2 w-full" /></Card>
          ) : (
            <EmptyState Icon={CircleDot} title="No active chits" text="Join an open circle and your live round, auction and deadlines will show here." action={<Button asChild variant="outline"><Link href="/#circles">Explore chits</Link></Button>} />
          )}
        </>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-3" aria-label="Recent transactions">
          <SectionTitle Icon={History} tone="text-chain" trailing={<Link href="/activity" className="text-primary hover:underline">All activity</Link>}>Recent transactions</SectionTitle>
          <Card className="overflow-hidden">
            {activity.loading && !activity.data ? (
              <div className="space-y-2 p-3" aria-busy="true">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-11 w-full rounded-xl" />)}</div>
            ) : (activity.data ?? []).length === 0 ? (
              <EmptyState Icon={History} className="border-0" title={activity.error && !activity.data ? "Your history is temporarily unavailable." : "No on-chain activity yet"} text={activity.error && !activity.data ? "Try again in a moment." : "Join a circle and every contribution, bid and payout will appear here."} />
            ) : (
              <>
                <ul className="space-y-2 p-3 md:hidden">{(activity.data ?? []).map((e) => <TransactionRow key={`${e.txHash}-${e.logIndex}`} e={e} layout="card" />)}</ul>
                <table className="hidden w-full md:table"><tbody>{(activity.data ?? []).map((e) => <TransactionRow key={`${e.txHash}-${e.logIndex}`} e={e} />)}</tbody></table>
              </>
            )}
          </Card>
        </section>
        <RiskCard data={me.data?.risk ?? null} loading={me.loading && !me.data} error={me.error} href={hasAddr ? `/member/${account}` : undefined} className="min-w-0" />
      </div>

      <ControlPanel />

      {list.length > 0 && (
        <section id="circles" className="space-y-4">
          <SectionTitle Icon={CircleDot} tone="text-primary" trailing={<span className="tnum">{list.length}</span>}>My chits</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((c) => <CircleCard key={c.id} c={c} />)}</div>
        </section>
      )}
    </div>
  );
}

/** Four stat cards from GET /me and /me/circles. Nothing is invented: unavailable values show as "Not available". */
function StatRow({ me, circles, loading }: { me: MeOverview | null; circles: MyCircle[]; loading: boolean }) {
  const locked = circles.reduce((s, c) => s + big(c.me.collateral), 0n);
  const ac = me?.activeCircle ?? null;
  const clock = useRoundClock(ac?.round ?? null, !!ac && ac.status === 1);
  const largest = circles.length ? circles[0] : null;
  const nextDue = circles.find((c) => !c.me.paidThisRound && !c.me.removed) ?? null;
  const r = me?.risk ?? null;
  const paid = r ? r.reputation.paidOnTime : null;
  return (
    <RevealGroup as="section" mode="load" className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Overview">
      <StatCard label="Total locked" Icon={Lock} tone="text-primary" value={mstNumber(locked)} unit="MST" support={`Collateral across ${circles.length} active chit${circles.length === 1 ? "" : "s"} · testnet`} loading={loading} />
      <StatCard label="Current pot" Icon={Landmark} tone="text-pot" value={ac ? mstNumber(ac.round.collected) : largest ? 0 : "None"} unit={ac || largest ? "MST" : undefined} support={ac ? `${ac.name ?? `Circle #${ac.id}`} · ${ac.round.phaseCode === 0 ? `${formatMst(ac.round.expectedPot)} MST expected` : "pot ready"}` : "No active chit"} loading={loading} />
      <StatCard
        label="Next contribution"
        Icon={Coins}
        tone="text-warning"
        value={nextDue ? mstNumber(nextDue.contribution) : ac ? "Paid" : "None"}
        unit={nextDue ? "MST" : undefined}
        support={nextDue && ac && ac.id === nextDue.id && clock.roundPhase === "contribution" ? `Due in ${formatClock(clock.current.remaining)}` : nextDue ? `${nextDue.name ?? `Circle #${nextDue.id}`}` : ac ? "Nothing due this round" : "No active chit"}
        chip={nextDue && ac && ac.id === nextDue.id && clock.roundPhase === "contribution" && clock.current.remaining < 60 ? <Badge variant="status-covered" className="text-[10px]">Due soon</Badge> : undefined}
        loading={loading}
      />
      <StatCard
        label="Reputation"
        Icon={ShieldCheck}
        tone="text-agent"
        value={r ? r.score : "Unassessed"}
        unit={r ? "/100" : undefined}
        decimals={0}
        support={r ? `${paid} paid on time · ${r.reputation.circlesCompleted} completed · heuristic score` : "Assess once you join a circle"}
        chip={r ? <TierChip tier={r.tier} short className="text-[10px]" /> : undefined}
        loading={loading}
      />
    </RevealGroup>
  );
}

/** Live room for the newest active chit: the chit card, the money flow with real numbers, and the auction card. */
function ActiveSection({ summary, account }: { summary: MyCircle; account: string }) {
  const room = useCircle(summary.id, account);
  const wallet = useWallet();
  const auth = useAuth();
  const actions = useRoomActions(summary.id, room.refetch);
  const focusRef = useRef<HTMLDivElement>(null);
  const data = room.data;
  const circle = data?.circle ?? summary;
  const round = data?.round ?? null;
  const clock = useRoundClock(round, circle.status === 1);
  const labelFor = (a: string) => { const m = data?.members.find((x) => x.address.toLowerCase() === a.toLowerCase()); return nameOf(m ?? { address: a }); };
  const activeMembers = data ? data.members.filter((m) => m.joined && !m.removed).length : circle.memberCount;
  const potWei = round ? round.potForOffers : (BigInt(circle.contribution) * BigInt(circle.maxMembers)).toString();
  const bestWei = round && big(round.bestDiscount) > 0n ? round.bestDiscount : null;
  const nextDecision = round && clock.roundPhase === "contribution" ? formatClock(clock.current.remaining) : null;
  const focus = () => focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="space-y-4">
      {round && data && (
        <div className="space-y-2">
          <NextActionCard
            circle={circle}
            round={round}
            me={room.me}
            phase={clock.roundPhase}
            wallet={wallet}
            pending={actions.pending}
            onContribute={() => void actions.contribute(BigInt(circle.contribution))}
            onWithdraw={() => void actions.withdraw()}
            onFocus={focus}
          />
          <TxStepper state={actions.tx} onKeepWaiting={actions.keepWaiting} onDismiss={actions.dismiss} />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <ActiveChitCard summary={summary} room={data} loading={room.loading && !data} />
        <div ref={focusRef} className="min-w-0">
          {round && data && round.phaseCode === 1 && circle.status === 1 ? (
            <RecipientDecision
              circle={circle}
              round={round}
              members={data.members}
              account={wallet.account}
              pending={actions.pending}
              canSign={!!wallet.account && wallet.correctChain}
              onAccept={() => void actions.accept()}
              onDecline={() => void actions.decline()}
              isAdmin={auth.isAdmin}
              onChanged={() => void room.refetch()}
            />
          ) : round && clock.roundPhase === "bidding" ? (
            <AuctionCard circle={circle} round={round} phase={clock.roundPhase} me={room.me} activeMembers={activeMembers} labelFor={labelFor} account={wallet.account} onBid={actions.bid} pending={actions.pending} wide />
          ) : room.loading && !data ? (
            <Card className="p-5" aria-busy="true"><Skeleton className="h-5 w-32" /><div className="mt-3 grid grid-cols-2 gap-2"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div></Card>
          ) : (
            <EmptyState
              Icon={Gavel}
              tone="bg-agent/10 text-agent"
              className="h-full justify-center"
              title="No auction right now"
              text={nextDecision ? `The pot is ready once everyone pays (${nextDecision} left). Its recipient then accepts it or declines, and only a decline opens an auction.` : clock.roundPhase === "settling" ? "This round is settling. The next round starts with contributions." : "Each round's recipient gets the first choice on the full pot. An auction opens only if they decline."}
              action={<Button asChild variant="outline"><Link href={`/circle/${circle.id}`}>Open the room</Link></Button>}
            />
          )}
        </div>
      </div>
      <MoneyFlow compact live={{ potMst: potWei, members: circle.memberCount, maxMembers: circle.maxMembers, bestDiscountMst: bestWei }} />
      <nav className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="More">
        {[
          { href: `/member/${account}`, label: "Risk profile", Icon: ShieldCheck },
          { href: "/activity", label: "Transactions", Icon: History },
          { href: "/collateral", label: "My collateral", Icon: Lock },
          { href: "/#circles", label: "Explore chits", Icon: Wallet },
        ].map(({ href, label, Icon }) => (
          <Link key={label} href={href} className="card-hover flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-surface px-4 py-3 text-[14px] font-medium shadow-card">
            <Icon className="h-4 w-4 text-primary" aria-hidden /> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

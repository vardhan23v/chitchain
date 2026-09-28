"use client";

import Link from "next/link";
import { Plus, Users, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { OrganizerCircleCard } from "@/components/organizer/OrganizerCircleCard";
import { OrganizerNotice } from "@/components/organizer/OrganizerNotice";
import { ForbiddenCard, RequireAuth } from "@/components/RequireAuth";
import { RoleBadge } from "@/components/RoleBadge";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizerCircles } from "@/hooks/useOrganizerCircles";
import { isUnreachable } from "@/lib/api";

export default function OrganizerPage() {
  return (
    <RequireAuth roles={["ORGANIZER", "ADMIN"]}>
      <Organizer />
    </RequireAuth>
  );
}

function Organizer() {
  const auth = useAuth();
  const circles = useOrganizerCircles();
  const list = circles.data ?? [];
  const forbidden = circles.error && !circles.data && /403|FORBIDDEN|NOT_ORGANIZER/i.test(circles.error);
  if (forbidden) return <ForbiddenCard detail="The API says this wallet doesn't organize any circle yet. Create one to become an organizer." />;

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        eyebrow="Organizer dashboard"
        title="My circles"
        description={auth.isAdmin ? "Admin view · every circle on the platform." : "Name your circles, invite members and read analytics. The contract still holds every pot."}
        actions={
          <>
            {auth.user && <RoleBadge role={auth.user.role} />}
            <Button asChild size="sm"><Link href="/create"><Plus aria-hidden /> Create a circle</Link></Button>
          </>
        }
      />
      <OrganizerNotice plural />
      {circles.loading && !circles.data ? (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true">{Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
      ) : circles.error && !circles.data ? (
        <EmptyState Icon={WifiOff} tone="bg-muted text-muted-foreground" title="Your circles are temporarily unavailable." text={isUnreachable(circles.error) ? "Check your connection and try again in a moment." : circles.error} />
      ) : list.length === 0 ? (
        <EmptyState Icon={Users} title="You don't organize a circle yet." text="Create one. The contract records you as creator and ChitChain lets you name it." action={<Button asChild><Link href="/create"><Plus aria-hidden /> Create a circle</Link></Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">{list.map((c) => <OrganizerCircleCard key={c.id} c={c} onChanged={() => void circles.refetch()} />)}</div>
      )}
    </div>
  );
}

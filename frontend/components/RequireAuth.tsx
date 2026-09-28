"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleBadge } from "@/components/RoleBadge";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/lib/types";

/** Friendly 403 card. Also used when the API answers 403 for an organizer/admin resource. */
export function ForbiddenCard({ title = "This page isn't for your role", detail }: { title?: string; detail?: string }) {
  const auth = useAuth();
  return (
    <Card className="mx-auto max-w-md rounded-2xl p-8 text-center">
      <ShieldOff className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
      <h1 className="mt-3 text-2xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{detail ?? "Roles only gate website actions — the smart contract still holds every pot."}</p>
      {auth.user && (
        <div className="mt-3 flex justify-center">
          <RoleBadge role={auth.user.role} />
        </div>
      )}
      <Button asChild className="mt-4">
        <Link href={auth.home}>Go to my dashboard</Link>
      </Button>
    </Card>
  );
}

/**
 * Gate: anonymous → /login?next=<path>; wrong role → 403 card.
 * Roles come from the backend-validated session (useAuth), never from localStorage edits alone.
 */
export function RequireAuth({ roles, children }: { roles?: Role[]; children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const path = usePathname();
  const anonymous = auth.ready && auth.status !== "authenticated";

  useEffect(() => {
    if (anonymous) router.replace(`/login?next=${encodeURIComponent(path || "/")}`);
  }, [anonymous, path, router]);

  if (!auth.ready || auth.status === "signing") {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }
  if (anonymous) {
    return (
      <Card className="rounded-2xl p-8 text-center text-sm text-muted-foreground">
        Redirecting to sign in… <Link href={`/login?next=${encodeURIComponent(path || "/")}`} className="text-primary hover:underline">Sign in</Link>
      </Card>
    );
  }
  if (roles && !auth.hasRole(...roles)) return <ForbiddenCard />;
  return <>{children}</>;
}

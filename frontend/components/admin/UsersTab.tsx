"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AddressPill } from "@/components/AddressPill";
import { RoleBadge } from "@/components/RoleBadge";
import { useAdminUsers } from "@/hooks/useAdmin";
import { useAuth } from "@/hooks/useAuth";
import { sameAddr, timeAgo } from "@/lib/format";
import type { AdminUser, Role } from "@/lib/types";

const TH = "px-3 py-2 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground";
const ROLES: Role[] = ["MEMBER", "ORGANIZER", "ADMIN"];
type Pending = { u: AdminUser; role?: Role; status?: "ACTIVE" | "SUSPENDED" };

export function UsersTab() {
  const auth = useAuth();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const users = useAdminUsers({ q: q || undefined, role: role || undefined });
  const [pending, setPending] = useState<Pending | null>(null);
  const list = users.data ?? [];

  const confirm = async () => {
    if (!pending) return;
    await users.update(pending.u.walletAddress, { role: pending.role, status: pending.status });
    setPending(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input placeholder="Search wallet or name" value={q} onChange={(e) => setQ(e.target.value)} className="h-9 max-w-xs" aria-label="Search users" />
        <Select value={role || "all"} onValueChange={(v) => setRole(v === "all" ? "" : v)}>
          <SelectTrigger className="h-9 w-40" aria-label="Filter by role"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All roles</SelectItem>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Card className="overflow-x-auto rounded-2xl">
        {users.loading && !users.data ? (
          <div className="space-y-2 p-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
        ) : users.error && !users.data ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Couldn&apos;t load users — {users.error}</p>
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50"><tr><th className={TH}>Wallet</th><th className={TH}>Name</th><th className={TH}>Role</th><th className={TH}>Status</th><th className={TH}>Circles</th><th className={TH}>Last login</th></tr></thead>
            <tbody>
              {list.map((u) => {
                const self = sameAddr(u.walletAddress, auth.user?.walletAddress);
                return (
                  <tr key={u.walletAddress} className="border-t">
                    <td className="px-3 py-2"><AddressPill address={u.walletAddress} />{self && <span className="ml-1 text-[10px] font-bold text-primary">YOU</span>}</td>
                    <td className="px-3 py-2">{u.displayName ?? <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <RoleBadge role={u.role} size="xs" />
                        <Select value={u.role} disabled={self || users.busy === u.walletAddress} onValueChange={(v) => setPending({ u, role: v as Role })}>
                          <SelectTrigger className="h-7 w-32 text-xs" aria-label={`Role for ${u.walletAddress}`}><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant={u.status === "ACTIVE" ? "outline" : "destructive"} className="h-7 text-xs" disabled={users.busy === u.walletAddress} onClick={() => setPending({ u, status: u.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })}>
                        {u.status === "ACTIVE" ? "Active · suspend" : "Suspended · reactivate"}
                      </Button>
                    </td>
                    <td className="tnum px-3 py-2">{u.circles}</td>
                    <td className="px-3 py-2 text-muted-foreground">{u.lastLogin ? timeAgo(u.lastLogin) : "never"}</td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">No users match.</td></tr>}
            </tbody>
          </table>
        )}
      </Card>
      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending?.role ? `Change role to ${pending.role}?` : pending?.status === "SUSPENDED" ? "Suspend this user?" : "Reactivate this user?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.u.walletAddress}. {pending?.status === "SUSPENDED" ? "They won't be able to sign in. Their on-chain funds and collateral are untouched — the contract controls those." : "This changes website permissions only; it never moves funds."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirm()}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

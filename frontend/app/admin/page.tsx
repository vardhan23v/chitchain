"use client";

import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditTab } from "@/components/admin/AuditTab";
import { OverviewTiles } from "@/components/admin/OverviewTiles";
import { SupportTab } from "@/components/admin/SupportTab";
import { ConfigTab, SystemTab } from "@/components/admin/SystemTabs";
import { UsersTab } from "@/components/admin/UsersTab";
import { RequireAuth } from "@/components/RequireAuth";
import { RoleBadge } from "@/components/RoleBadge";
import { TestnetBadge } from "@/components/TestnetBadge";
import { useAdminOverview } from "@/hooks/useAdmin";
import { isUnreachable } from "@/lib/api";

export default function AdminPage() {
  return (
    <RequireAuth roles={["ADMIN"]}>
      <Admin />
    </RequireAuth>
  );
}

function Admin() {
  const ov = useAdminOverview();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[13px] font-bold uppercase tracking-widest text-muted-foreground">ChitChain admin</h1>
        <RoleBadge role="ADMIN" />
        <TestnetBadge />
      </div>
      <p className="flex items-start gap-2 rounded-xl border border-chain/30 bg-chain/5 px-3 py-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-chain" aria-hidden />
        No withdraw controls exist here. Funds are controlled by the smart contract. All amounts are MST testnet coins.
      </p>
      {ov.error && !ov.data && (
        <Card className="rounded-2xl p-6 text-center text-sm text-muted-foreground">{isUnreachable(ov.error) ? "Backend unreachable — the admin dashboard needs the ChitChain API." : ov.error}</Card>
      )}
      <OverviewTiles o={ov.data} loading={ov.loading} />
      <Tabs defaultValue="users" className="space-y-3">
        <TabsList className="flex h-auto flex-wrap justify-start rounded-full">
          {["users", "audit", "support", "config", "system"].map((t) => <TabsTrigger key={t} value={t} className="rounded-full capitalize">{t === "audit" ? "Audit log" : t}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="audit"><AuditTab /></TabsContent>
        <TabsContent value="support"><SupportTab /></TabsContent>
        <TabsContent value="config"><ConfigTab /></TabsContent>
        <TabsContent value="system"><SystemTab loops={ov.data?.loops ?? null} loading={ov.loading} /></TabsContent>
      </Tabs>
    </div>
  );
}

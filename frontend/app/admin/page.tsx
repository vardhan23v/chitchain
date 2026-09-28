"use client";

import { FileText, Lock, ScrollText, Server, Settings2, Users, WifiOff } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditTab } from "@/components/admin/AuditTab";
import { OverviewTiles } from "@/components/admin/OverviewTiles";
import { SupportTab } from "@/components/admin/SupportTab";
import { ConfigTab, SystemTab } from "@/components/admin/SystemTabs";
import { UsersTab } from "@/components/admin/UsersTab";
import { InfoBanner } from "@/components/InfoBanner";
import { PageHeader } from "@/components/PageHeader";
import { RequireAuth } from "@/components/RequireAuth";
import { RoleBadge } from "@/components/RoleBadge";
import { useAdminOverview } from "@/hooks/useAdmin";
import { isUnreachable } from "@/lib/api";

const TABS = [
  { value: "users", label: "Users", Icon: Users },
  { value: "audit", label: "Audit log", Icon: ScrollText },
  { value: "support", label: "Support", Icon: FileText },
  { value: "config", label: "Config", Icon: Settings2 },
  { value: "system", label: "System", Icon: Server },
];

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
    <div className="space-y-6 md:space-y-8">
      <PageHeader eyebrow="Platform admin" title="ChitChain admin" description="Users, audit log, support and system health. Read-only over funds." actions={<RoleBadge role="ADMIN" />} />
      <InfoBanner Icon={Lock} tone="chain" role="note">
        <span className="font-semibold text-foreground">No withdraw controls exist here.</span> Funds are controlled by the smart contract. All amounts are MST testnet coins.
      </InfoBanner>
      {ov.error && !ov.data && (
        <InfoBanner Icon={WifiOff} tone="warning" role="status">
          <span className="font-semibold text-foreground">Platform overview is temporarily unavailable.</span> Users, audit log and support below may also be affected.
          <span className="mt-1 block font-mono text-[11px] text-muted-foreground/80">{isUnreachable(ov.error) ? "API unreachable" : ov.error}</span>
        </InfoBanner>
      )}
      <OverviewTiles o={ov.data} loading={ov.loading} />
      <Tabs defaultValue="users" className="space-y-4">
        <div className="edge-fade -mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <TabsList aria-label="Admin sections">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}><t.Icon className="h-3.5 w-3.5" aria-hidden /> {t.label}</TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="audit"><AuditTab /></TabsContent>
        <TabsContent value="support"><SupportTab /></TabsContent>
        <TabsContent value="config"><ConfigTab /></TabsContent>
        <TabsContent value="system"><SystemTab loops={ov.data?.loops ?? null} loading={ov.loading} /></TabsContent>
      </Tabs>
    </div>
  );
}

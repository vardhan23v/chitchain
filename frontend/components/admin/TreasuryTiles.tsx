"use client";

import { useState } from "react";
import { Landmark, Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { SectionTitle } from "@/components/PageHeader";
import { StatTile } from "@/components/StatTile";
import { TxLink } from "@/components/TxLink";
import { usePolling } from "@/hooks/usePolling";
import { api, ApiError, isUnreachable } from "@/lib/api";
import { POLL_API_MS } from "@/lib/chain";
import { addrUrl, big, formatMst, shortAddr } from "@/lib/format";
import type { AdminTreasury } from "@/lib/types";

/** Treasury tile group on /admin: GET /admin/treasury plus the only fund control admins have, fee withdrawal to the treasury. */
export function TreasuryTiles() {
  const t = usePolling<AdminTreasury>(() => api.adminTreasury(), POLL_API_MS * 4, []);
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);
  const claimable = big(t.data?.claimable);
  const unavailable = !t.data && !!t.error;
  const txHash = lastTx ?? t.data?.lastWithdrawTx?.txHash ?? null;

  const withdraw = async () => {
    setBusy(true);
    try {
      const r = await api.adminTreasuryWithdraw();
      setLastTx(r.txHash);
      toast.success("Fees withdrawn to the treasury.", { description: shortAddr(r.txHash, 10, 6) });
      await t.refetch();
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 404 ? "Treasury withdrawal is not available on this backend." : e instanceof Error ? e.message : "The withdrawal failed.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="Treasury" className="space-y-3">
      <SectionTitle Icon={Landmark} tone="text-pot">Treasury</SectionTitle>
      {unavailable ? (
        <p className="text-[13px] text-muted-foreground" role="status">
          Treasury data is temporarily unavailable.
          {!isUnreachable(t.error) && !(t.error ?? "").startsWith("HTTP 404") && <span className="mt-1 block font-mono text-[11px] text-muted-foreground/80">{t.error}</span>}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label="Treasury wallet"
            Icon={Wallet}
            value={t.data?.treasury ? <a className="font-mono text-lg text-chain hover:underline" href={addrUrl(t.data.treasury)} target="_blank" rel="noopener noreferrer" aria-label={`Treasury ${t.data.treasury} on MSTScan`}>{shortAddr(t.data.treasury, 8, 6)}</a> : "—"}
            hint="receives platform fees"
            loading={t.loading && !t.data}
          />
          <StatTile label="Claimable fees" testnet valueClassName={claimable > 0n ? "text-pot" : undefined} value={t.data ? `${formatMst(t.data.claimable)} MST` : "—"} hint="fees held by the contract" loading={t.loading && !t.data} />
          <StatTile
            label="Last withdrawal"
            value={txHash ? <TxLink hash={txHash} label={shortAddr(txHash, 8, 6)} className="text-lg" /> : <span className="text-muted-foreground">None yet</span>}
            hint={txHash ? "view on MSTScan" : undefined}
            loading={t.loading && !t.data}
          />
          <StatTile label="Withdraw" value={<WithdrawButton claimable={claimable} busy={busy} disabled={!t.data} onConfirm={withdraw} />} hint="fees only, member funds stay in the contract" loading={t.loading && !t.data} />
        </div>
      )}
    </section>
  );
}

function WithdrawButton({ claimable, busy, disabled, onConfirm }: { claimable: bigint; busy: boolean; disabled: boolean; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" disabled={disabled || busy || claimable === 0n} className="mt-0.5">
          {busy && <Loader2 className="animate-spin" aria-hidden />} Withdraw fees to treasury
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Withdraw fees to the treasury</AlertDialogTitle>
          <AlertDialogDescription>
            The backend sends the contract&apos;s claimable platform fees, {formatMst(claimable)} MST, to the treasury wallet. This is a real MST testnet transaction. Member collateral, pots and payouts are not affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Withdraw {formatMst(claimable)} MST</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

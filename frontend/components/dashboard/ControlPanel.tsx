import { Check, FileCode2, User } from "lucide-react";
import { Card } from "@/components/ui/card";

const YOU = ["Join a circle and lock your collateral", "Contribute each round while contributions are open", "Bid the lowest payout you'd accept", "Withdraw whatever is claimable — payouts, dividends, refunds"];
const CONTRACT = ["Holds the pot for every round", "Holds and sizes collateral by risk tier", "Pays the winner and computes dividends", "Covers a missed payment from that member's collateral", "Keeps the holdback until the circle completes"];

/** Two-column "what you control" vs "what the smart contract controls" (API.md principle). */
export function ControlPanel() {
  return (
    <section className="grid gap-3 md:grid-cols-2" aria-label="Who controls what">
      <Card className="rounded-2xl p-4 md:p-5">
        <div className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-wide text-primary"><User className="h-4 w-4" aria-hidden /> What you control</div>
        <ul className="mt-3 space-y-2 text-sm">
          {YOU.map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{t}</li>)}
        </ul>
      </Card>
      <Card className="rounded-2xl border-chain/30 p-4 md:p-5">
        <div className="flex items-center gap-2 text-[13px] font-medium uppercase tracking-wide text-chain"><FileCode2 className="h-4 w-4" aria-hidden /> What the smart contract controls</div>
        <ul className="mt-3 space-y-2 text-sm">
          {CONTRACT.map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-chain" aria-hidden />{t}</li>)}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">No organizer or admin can move member funds. Payouts are pull-only.</p>
      </Card>
    </section>
  );
}

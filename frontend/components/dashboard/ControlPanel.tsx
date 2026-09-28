import { Check, FileCode2, Lock, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SectionTitle } from "@/components/PageHeader";

const YOU = ["Join a circle and lock your collateral", "Contribute each round while contributions are open", "Bid the lowest payout you'd accept", "Withdraw whatever is claimable, payouts, dividends, refunds"];
const CONTRACT = ["Holds the pot for every round", "Holds and sizes collateral by risk tier", "Pays the winner and computes dividends", "Covers a missed payment from that member's collateral", "Keeps the holdback until the circle completes"];

function Column({ Icon, title, items, tone, bg, className }: { Icon: typeof User; title: string; items: string[]; tone: string; bg: string; className?: string }) {
  return (
    <Card className={`p-4 md:p-5 ${bg} ${className ?? ""}`}>
      <SectionTitle Icon={Icon} tone={tone}>{title}</SectionTitle>
      <ul className="mt-3 space-y-2 text-[15px]">
        {items.map((t) => (
          <li key={t} className="flex gap-2.5">
            <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${tone === "text-chain" ? "bg-chain/15" : "bg-primary/15"}`} aria-hidden><Check className={`h-3 w-3 ${tone}`} /></span>
            {t}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Two tinted columns: "what you control" vs "what the smart contract controls". */
export function ControlPanel() {
  return (
    <section className="grid gap-4 md:grid-cols-2" aria-label="Who controls what">
      <Column Icon={User} title="What you control" items={YOU} tone="text-primary" bg="border-primary/20 bg-primary/[0.04]" />
      <Column Icon={FileCode2} title="What the smart contract controls" items={CONTRACT} tone="text-chain" bg="border-chain/25 bg-chain/[0.04]" className="relative" />
      <p className="flex items-center gap-2 text-[13px] text-muted-foreground md:col-span-2"><Lock className="h-3.5 w-3.5 text-chain" aria-hidden /> No organizer or admin can move member funds. Payouts are pull-only.</p>
    </section>
  );
}

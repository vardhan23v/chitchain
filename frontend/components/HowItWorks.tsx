import { Coins, Gavel, ShieldCheck, Trophy, UserPlus, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { HONEST_LIMITS } from "@/lib/labels";

const STEPS: { title: string; text: string; Icon: LucideIcon; color: string }[] = [
  { title: "Join", text: "Lock collateral sized by your risk tier. It sits in the contract.", Icon: UserPlus, color: "text-primary" },
  { title: "Contribute", text: "Pay the fixed amount each round while contributions are open.", Icon: Coins, color: "text-pot" },
  { title: "Bid", text: "Say the lowest payout you'd accept. The lowest accepted payout wins.", Icon: Gavel, color: "text-agent" },
  { title: "Settle", text: "Anyone can settle after bidding closes. The discount becomes dividends.", Icon: Trophy, color: "text-success" },
  { title: "Protect", text: "Miss a payment and your collateral covers it — shortfalls are shown, never hidden.", Icon: ShieldCheck, color: "text-warning" },
];

/** Landing strip: JOIN → CONTRIBUTE → BID → SETTLE → PROTECT, plus the honest-limits line. */
export function HowItWorks() {
  return (
    <section aria-label="How it works" className="space-y-3">
      <h2>How it works</h2>
      <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <Card className="h-full rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <s.Icon className={`h-5 w-5 ${s.color}`} aria-hidden />
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{i + 1} · {s.title}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
            </Card>
          </li>
        ))}
      </ol>
      <p className="text-center text-xs text-muted-foreground">{HONEST_LIMITS}</p>
    </section>
  );
}

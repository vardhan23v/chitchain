import { Coins, Gavel, ListOrdered, ShieldCheck, Trophy, UserPlus, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { SectionTitle } from "@/components/PageHeader";

const STEPS: { title: string; text: string; Icon: LucideIcon; color: string; bg: string }[] = [
  { title: "Join", text: "Lock collateral sized by your risk tier. It sits in the contract.", Icon: UserPlus, color: "text-primary", bg: "bg-primary/10" },
  { title: "Contribute", text: "Pay the fixed amount each round while contributions are open.", Icon: Coins, color: "text-pot", bg: "bg-pot/10" },
  { title: "Bid", text: "Say the lowest payout you'd accept. The lowest accepted payout wins.", Icon: Gavel, color: "text-agent", bg: "bg-agent/10" },
  { title: "Settle", text: "Anyone can settle after bidding closes. The discount becomes dividends.", Icon: Trophy, color: "text-success", bg: "bg-success/10" },
  { title: "Protect", text: "Miss a payment and your collateral covers it. Shortfalls are shown, never hidden.", Icon: ShieldCheck, color: "text-warning", bg: "bg-warning/10" },
];

/** Landing strip: Join, Contribute, Bid, Settle, Protect. Equal-height cards that stagger in once when scrolled into view. */
export function HowItWorks() {
  return (
    <section aria-label="How it works" className="space-y-4">
      <SectionTitle Icon={ListOrdered}>How it works</SectionTitle>
      <RevealGroup as="ol" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {STEPS.map((s, i) => (
          <RevealItem as="li" key={s.title} className="min-w-0">
            <Card className="flex h-full flex-col gap-3 p-4 md:p-5">
              <div className="flex items-center justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg}`}>
                  <s.Icon className={`h-[18px] w-[18px] ${s.color}`} aria-hidden />
                </span>
                <span className="tnum text-[11px] font-bold text-muted-foreground/70">0{i + 1}</span>
              </div>
              <div>
                <div className="text-sm font-semibold">{s.title}</div>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{s.text}</p>
              </div>
            </Card>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

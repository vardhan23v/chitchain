import { Coins, Gavel, ListOrdered, Trophy, UserPlus, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { SectionTitle } from "@/components/PageHeader";

const STEPS: { title: string; text: string; Icon: LucideIcon; color: string; bg: string }[] = [
  { title: "Join", text: "Lock collateral sized by your risk tier. It sits in the contract.", Icon: UserPlus, color: "text-primary", bg: "bg-primary/15" },
  { title: "Contribute", text: "Pay the fixed amount each round while contributions are open.", Icon: Coins, color: "text-pot", bg: "bg-pot/15" },
  { title: "Bid", text: "Say the lowest payout you'd accept. The lowest accepted payout wins.", Icon: Gavel, color: "text-agent", bg: "bg-agent/15" },
  { title: "Settle", text: "Anyone can settle after bidding closes. The discount becomes dividends.", Icon: Trophy, color: "text-success", bg: "bg-success/15" },
];

/** Landing strip: four numbered steps, Join, Contribute, Bid, Settle. Cards stagger in once when scrolled into view. */
export function HowItWorks() {
  return (
    <section id="how" aria-label="How it works" className="scroll-mt-20 space-y-4">
      <SectionTitle Icon={ListOrdered}>How it works</SectionTitle>
      <RevealGroup as="ol" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <RevealItem as="li" key={s.title} className="flex min-w-0">
            <Card className="card-hover flex w-full flex-col gap-3 p-4 md:p-5">
              <div className="flex items-center justify-between">
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${s.bg}`}>
                  <s.Icon className={`h-[18px] w-[18px] ${s.color}`} aria-hidden />
                </span>
                <span className="tnum font-mono text-[12px] font-semibold text-muted-foreground">0{i + 1}</span>
              </div>
              <div>
                <div className="text-[16px] font-semibold tracking-tight">{s.title}</div>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{s.text}</p>
              </div>
            </Card>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

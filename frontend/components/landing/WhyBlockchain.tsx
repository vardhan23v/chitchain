import { Check, FileCode2, UserRound, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { SectionTitle } from "@/components/PageHeader";

const ROWS: { point: string; traditional: string; chitchain: string }[] = [
  { point: "Who holds the pot", traditional: "The organizer's own wallet or bank account", chitchain: "A smart contract on MST Testnet" },
  { point: "Who can move funds", traditional: "The organizer, at any time", chitchain: "Nobody. Payouts are pull-only and rule-bound" },
  { point: "Missed contributions", traditional: "Chased by hand, often hidden", chitchain: "Covered from locked collateral, recorded on-chain" },
  { point: "Auction and settlement", traditional: "Decided in the room, trust the minutes", chitchain: "Lowest payout wins, settled by code, verifiable on MSTScan" },
];

/** Comparison block: traditional chit (organizer wallet) versus ChitChain (smart contract). */
export function WhyBlockchain() {
  return (
    <section aria-label="Why blockchain" className="space-y-4">
      <SectionTitle Icon={FileCode2} tone="text-primary">Why blockchain?</SectionTitle>
      <RevealGroup className="grid gap-4 md:grid-cols-2">
        <RevealItem className="flex min-w-0">
          <Card className="flex w-full flex-col gap-4 p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-muted-foreground"><UserRound className="h-[18px] w-[18px]" aria-hidden /></span>
              <div>
                <div className="text-[16px] font-semibold">Traditional chit</div>
                <div className="text-[13px] text-muted-foreground">Money flows through the organizer</div>
              </div>
            </div>
            <ul className="space-y-3">
              {ROWS.map((r) => (
                <li key={r.point} className="flex gap-2 text-[13px]">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span><span className="font-medium text-foreground">{r.point}:</span> <span className="text-muted-foreground">{r.traditional}</span></span>
                </li>
              ))}
            </ul>
          </Card>
        </RevealItem>
        <RevealItem className="flex min-w-0">
          <Card className="flex w-full flex-col gap-4 border-primary/30 p-5">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary"><FileCode2 className="h-[18px] w-[18px]" aria-hidden /></span>
              <div>
                <div className="text-[16px] font-semibold">ChitChain</div>
                <div className="text-[13px] text-muted-foreground">Money flows through a smart contract</div>
              </div>
            </div>
            <ul className="space-y-3">
              {ROWS.map((r) => (
                <li key={r.point} className="flex gap-2 text-[13px]">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                  <span><span className="font-medium text-foreground">{r.point}:</span> <span className="text-muted-foreground">{r.chitchain}</span></span>
                </li>
              ))}
            </ul>
          </Card>
        </RevealItem>
      </RevealGroup>
    </section>
  );
}

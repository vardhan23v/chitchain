"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useSpring } from "framer-motion";
import { Coins, Gavel, ListOrdered, Trophy, UserPlus, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PotStory, type PotExample } from "@/components/landing/PotStory";
import { DrawLine } from "@/components/motion/DrawLine";
import { useMotionOK } from "@/components/motion/MotionPref";
import { EASE, Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { SectionTitle } from "@/components/PageHeader";
import { formatMst } from "@/lib/format";
import { cn } from "@/lib/utils";

type Step = { title: string; text: string; Icon: LucideIcon; color: string; bg: string };

const STEPS: Step[] = [
  { title: "Join", text: "Lock collateral sized by your risk tier. It sits in the contract.", Icon: UserPlus, color: "text-primary", bg: "bg-primary/15" },
  { title: "Contribute", text: "Pay the fixed amount each round while contributions are open.", Icon: Coins, color: "text-pot", bg: "bg-pot/15" },
  { title: "Choose or bid", text: "This round's recipient takes the full pot, or declines. Only then an auction opens and the lowest payout offer wins.", Icon: Gavel, color: "text-agent", bg: "bg-agent/15" },
  { title: "Settle", text: "The contract pays the winner. After an auction, the discount is shared with everyone else as dividends.", Icon: Trophy, color: "text-success", bg: "bg-success/15" },
];

/** Captions under the illustration. Real numbers from the example circle when there is one, otherwise neutral copy. */
const CAPTIONS: ((ex: PotExample | null) => string)[] = [
  (ex) => (ex ? `${ex.maxMembers} members join and lock collateral in the contract.` : "Members join and lock collateral in the contract."),
  (ex) => (ex ? `Each pays ${formatMst(ex.contributionWei)} MST per round, so the pot is ${formatMst(ex.potWei)} MST.` : "Everyone contributes and the pot grows inside the contract."),
  (ex) => (ex ? `The recipient can take the whole pot. If they decline, members offer to take up to ${(ex.maxDiscountBps / 100).toFixed(0)} % less, and the lowest payout offer wins.` : "The recipient can take the whole pot. If they decline, the lowest payout offer wins."),
  () => "The winner is paid out. After an auction, the discount is shared with everyone else as dividends.",
];

function StepCard({ s, i }: { s: Step; i: number }) {
  return (
    <Card className="card-hover flex w-full flex-col gap-3 p-4 md:p-5">
      <div className="flex items-center justify-between">
        <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", s.bg)}>
          <s.Icon className={cn("h-[18px] w-[18px]", s.color)} aria-hidden />
        </span>
        <span className="tnum font-mono text-[12px] font-semibold text-muted-foreground">0{i + 1}</span>
      </div>
      <div>
        <div className="text-[16px] font-semibold tracking-tight">{s.title}</div>
        <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{s.text}</p>
      </div>
    </Card>
  );
}

/**
 * Landing section: Join, Contribute, Choose or bid, Settle.
 * Desktop with animations on: the section pins for three screens while the steps light up and the pot illustration
 * plays one round, all driven by scroll position. Smaller screens: a timeline whose rail draws as you scroll.
 * Animations off: the plain four-card grid.
 */
export function HowItWorks({ example = null }: { example?: PotExample | null }) {
  const ok = useMotionOK();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.6 });
  const [step, setStep] = useState(0);
  useMotionValueEvent(progress, "change", (v) => setStep(Math.min(3, Math.max(0, Math.floor(v * 4)))));

  if (!ok) {
    return (
      <section id="how" aria-label="How it works" className="scroll-mt-20 space-y-4">
        <SectionTitle Icon={ListOrdered}>How it works</SectionTitle>
        <RevealGroup as="ol" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <RevealItem as="li" key={s.title} className="flex min-w-0">
              <StepCard s={s} i={i} />
            </RevealItem>
          ))}
        </RevealGroup>
      </section>
    );
  }

  return (
    <section id="how" aria-label="How it works" className="scroll-mt-20">
      <SectionTitle Icon={ListOrdered} className="lg:hidden">How it works</SectionTitle>

      <DrawLine as="ol" className="mt-4 space-y-3 pl-5 lg:hidden" color="bg-primary/70">
        {STEPS.map((s, i) => (
          <Reveal as="li" key={s.title} className="relative">
            <span className="absolute -left-5 top-4 flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full border border-primary bg-background text-[9px] font-semibold text-primary" aria-hidden>
              {i + 1}
            </span>
            <StepCard s={s} i={i} />
          </Reveal>
        ))}
      </DrawLine>

      <div ref={ref} className="relative hidden lg:block lg:h-[320vh]">
        <div className="sticky top-16 flex h-[calc(100vh-4rem)] items-center">
          <div className="w-full">
          <SectionTitle Icon={ListOrdered}>How it works</SectionTitle>
          <div className="mt-8 grid w-full grid-cols-2 items-center gap-12">
            <ol className="relative pl-8">
              <span className="absolute bottom-4 left-2 top-4 w-px bg-white/[0.08]" aria-hidden />
              <motion.span className="absolute bottom-4 left-2 top-4 w-px origin-top bg-primary" style={{ scaleY: progress }} aria-hidden />
              {STEPS.map((s, i) => (
                <motion.li key={s.title} animate={{ opacity: step === i ? 1 : 0.4 }} transition={{ duration: 0.3, ease: EASE }} className="relative py-4">
                  {/* The badge stays on the rail; only the text block slides. */}
                  <span
                    className={cn(
                      "absolute -left-6 top-[1.35rem] flex h-4 w-4 -translate-x-1/2 items-center justify-center rounded-full border text-[9px] font-semibold transition-colors duration-300",
                      step >= i ? "border-primary bg-primary text-white" : "border-white/20 bg-background text-muted-foreground",
                    )}
                    aria-hidden
                  >
                    {i + 1}
                  </span>
                  <motion.div animate={{ x: step === i ? 0 : -4 }} transition={{ duration: 0.3, ease: EASE }}>
                    <div className="flex items-center gap-3">
                      <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", s.bg)}>
                        <s.Icon className={cn("h-[18px] w-[18px]", s.color)} aria-hidden />
                      </span>
                      <span className="text-[20px] font-semibold tracking-tight">{s.title}</span>
                      <span className="tnum ml-auto font-mono text-[12px] text-muted-foreground">0{i + 1}</span>
                    </div>
                    <p className="mt-2 max-w-md text-[14px] leading-relaxed text-muted-foreground">{s.text}</p>
                  </motion.div>
                </motion.li>
              ))}
            </ol>
            <div className="flex flex-col items-center">
              <PotStory progress={progress} example={example} className="w-full max-w-[400px]" />
              <div className="mt-1 h-10 text-center text-[13px] text-muted-foreground">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.p key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: EASE }}>
                    {CAPTIONS[step](example)}
                  </motion.p>
                </AnimatePresence>
              </div>
              <p className="text-[12px] text-muted-foreground/70">{example ? `Numbers from ${example.name} on MST testnet` : "Scroll to walk through one round"}</p>
            </div>
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}

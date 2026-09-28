import { FileCode2, Shield, UserRound, Users, UsersRound, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { RevealGroup, RevealItem } from "@/components/motion/Reveal";
import { SectionTitle } from "@/components/PageHeader";

const ROLES: { title: string; text: string; Icon: LucideIcon; color: string; bg: string }[] = [
  { title: "Member", text: "Joins, contributes, bids and withdraws.", Icon: UserRound, color: "text-primary", bg: "bg-primary/10" },
  { title: "Circle organizer", text: "Names the circle, invites members, reads analytics.", Icon: Users, color: "text-pot", bg: "bg-pot/10" },
  { title: "Platform admin", text: "Manages users, audit log, support and health.", Icon: Shield, color: "text-agent", bg: "bg-agent/10" },
  { title: "Smart contract", text: "Controls the funds. No role can move a member's money. Payouts are pull-only.", Icon: FileCode2, color: "text-chain", bg: "bg-chain/10" },
];

/** Landing strip: people operate the platform; the smart contract controls the funds. */
export function RolesStrip() {
  return (
    <section aria-label="Who does what" className="space-y-4">
      <SectionTitle Icon={UsersRound}>Who does what</SectionTitle>
      <RevealGroup as="ul" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ROLES.map((r) => (
          <RevealItem as="li" key={r.title} className="min-w-0">
            <Card className={`flex h-full flex-col gap-3 p-4 md:p-5 ${r.title === "Smart contract" ? "border-chain/30" : ""}`}>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${r.bg}`}>
                <r.Icon className={`h-[18px] w-[18px] ${r.color}`} aria-hidden />
              </span>
              <div>
                <div className="text-sm font-semibold">{r.title}</div>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{r.text}</p>
              </div>
            </Card>
          </RevealItem>
        ))}
      </RevealGroup>
    </section>
  );
}

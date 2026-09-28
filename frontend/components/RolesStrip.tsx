import { FileCode2, Shield, UserRound, Users, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

const ROLES: { title: string; text: string; Icon: LucideIcon; color: string }[] = [
  { title: "Member", text: "Participates in a chit circle: joins, contributes, bids, withdraws.", Icon: UserRound, color: "text-primary" },
  { title: "Circle organizer", text: "Manages my chit circle: names it, invites members, reads analytics.", Icon: Users, color: "text-pot" },
  { title: "Platform admin", text: "Manages the ChitChain platform: users, audit log, support, health.", Icon: Shield, color: "text-agent" },
  { title: "Smart contract", text: "Controls the funds. No role can move a member's money — payouts are pull-only.", Icon: FileCode2, color: "text-chain" },
];

/** Landing strip: people operate the platform; the smart contract controls the funds (API.md v3 principle). */
export function RolesStrip() {
  return (
    <section aria-label="Who does what" className="space-y-3">
      <h2>Who does what</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map((r) => (
          <li key={r.title}>
            <Card className="h-full rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <r.Icon className={`h-5 w-5 ${r.color}`} aria-hidden />
                <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{r.title}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{r.text}</p>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  );
}

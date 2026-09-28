import { LifeBuoy } from "lucide-react";
import { Faq } from "@/components/support/Faq";
import { TicketForm } from "@/components/support/TicketForm";
import { TestnetBadge } from "@/components/TestnetBadge";

export const metadata = { title: "Support — ChitChain" };

/** Public page: FAQ for everyone; the ticket form needs a wallet session. */
export default function SupportPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex items-center gap-2"><LifeBuoy className="h-6 w-6 text-primary" aria-hidden /> Support</h1>
        <TestnetBadge />
      </div>
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="space-y-3">
          <h2 className="text-base">Frequently asked</h2>
          <Faq />
          <p className="text-sm text-muted-foreground">Still stuck? Sign in and open a ticket — an admin replies here. Testnet prototype: not a registered chit fund.</p>
        </section>
        <TicketForm />
      </div>
    </div>
  );
}

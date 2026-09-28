import { HelpCircle } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/PageHeader";
import { Faq } from "@/components/support/Faq";
import { TicketForm } from "@/components/support/TicketForm";

export const metadata = { title: "Support — ChitChain" };

/** Public page: FAQ for everyone; the ticket form needs a wallet session. */
export default function SupportPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Help centre" title="Support" description="Answers to the common questions first. Still stuck? Sign in and open a ticket — an admin replies here." />
      <div className="grid items-start gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="space-y-3">
          <SectionTitle Icon={HelpCircle} tone="text-primary">Frequently asked</SectionTitle>
          <Faq />
          <p className="text-xs text-muted-foreground">Testnet prototype · not a registered chit fund.</p>
        </section>
        <TicketForm />
      </div>
    </div>
  );
}

import { FileCode2 } from "lucide-react";

/** Persistent organizer line: people operate the platform; the contract holds the funds. */
export function OrganizerNotice({ plural }: { plural?: boolean }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-chain/30 bg-chain/5 px-3 py-2 text-xs text-muted-foreground">
      <FileCode2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-chain" aria-hidden />
      You manage {plural ? "these circles" : "this circle"}. The smart contract holds the pot — you cannot move funds.
    </p>
  );
}

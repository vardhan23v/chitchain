import { FileCode2 } from "lucide-react";
import { InfoBanner } from "@/components/InfoBanner";

/** Persistent organizer line: people operate the platform; the contract holds the funds. */
export function OrganizerNotice({ plural }: { plural?: boolean }) {
  return (
    <InfoBanner Icon={FileCode2} tone="chain">
      You manage {plural ? "these circles" : "this circle"}. The smart contract holds the pot, you cannot move funds.
    </InfoBanner>
  );
}

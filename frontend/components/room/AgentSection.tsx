"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AiBiddingPanel } from "@/components/ai/AiBiddingPanel";
import { sameAddr, shortAddr } from "@/lib/format";
import type { Mandate, MemberInfo } from "@/lib/types";

interface Props {
  circleId: number;
  circleName?: string | null;
  me: MemberInfo | null;
  members: MemberInfo[];
  /** Legacy one-shot mandates; kept in the props so the room shape is unchanged. */
  mandates: Mandate[];
  labelFor: (addr: string) => string;
  backendDown: boolean;
  pot: string | null;
  onChanged: () => void;
}

export const isDemoMember = (m: MemberInfo | null) => !!m && (m.custodial === true || !!m.label);

/** Autonomous AI bidding panel + "drive the agent for a demo wallet" picker for non-demo viewers. */
export function AgentSection({ circleId, circleName, me, members, labelFor, backendDown, pot, onChanged }: Props) {
  const [pick, setPick] = useState<string>("");
  const demoMembers = members.filter(isDemoMember);
  const agentMember: MemberInfo | null = isDemoMember(me) ? me : demoMembers.find((m) => sameAddr(m.address, pick)) ?? null;

  return (
    <div className="space-y-2">
      {!isDemoMember(me) && demoMembers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          Drive the agent for a demo wallet:
          <Select value={pick} onValueChange={setPick}>
            <SelectTrigger className="h-8 w-44 rounded-full"><SelectValue placeholder="Pick member" /></SelectTrigger>
            <SelectContent>{demoMembers.map((m) => <SelectItem key={m.address} value={m.address}>Member {m.label} · {shortAddr(m.address)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}
      <AiBiddingPanel
        circleId={circleId}
        circleName={circleName}
        member={agentMember}
        isDemoWallet={isDemoMember(agentMember)}
        members={[]}
        onMemberChange={isDemoMember(me) ? undefined : setPick}
        labelFor={labelFor}
        backendDown={backendDown}
        pot={pot}
        onChanged={onChanged}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AgentPanel } from "@/components/AgentPanel";
import { useAgentLogs } from "@/hooks/useAgentLogs";
import { sameAddr, shortAddr } from "@/lib/format";
import type { Mandate, MemberInfo } from "@/lib/types";

interface Props {
  circleId: number;
  me: MemberInfo | null;
  members: MemberInfo[];
  mandates: Mandate[];
  labelFor: (addr: string) => string;
  backendDown: boolean;
  pot: string | null;
  onChanged: () => void;
}

export const isDemoMember = (m: MemberInfo | null) => !!m && (m.custodial === true || !!m.label);

/** Agent panel + "drive the agent for a demo wallet" picker for non-demo viewers. */
export function AgentSection({ circleId, me, members, mandates, labelFor, backendDown, pot, onChanged }: Props) {
  const [pick, setPick] = useState<string>("");
  const agentLogs = useAgentLogs(circleId, !backendDown);
  const demoMembers = members.filter(isDemoMember);
  const agentMember: MemberInfo | null = isDemoMember(me) ? me : demoMembers.find((m) => sameAddr(m.address, pick)) ?? null;
  const mandate = mandates.find((x) => agentMember && sameAddr(x.member, agentMember.address) && x.active) ?? null;

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
      <AgentPanel
        circleId={circleId}
        member={agentMember}
        isDemoWallet={isDemoMember(agentMember)}
        logs={agentLogs.data ? agentLogs.data.filter((l) => !agentMember || sameAddr(l.member, agentMember.address)) : null}
        mandate={mandate}
        labelFor={labelFor}
        onChanged={() => {
          void agentLogs.refetch();
          onChanged();
        }}
        backendDown={backendDown}
        pot={pot}
      />
    </div>
  );
}

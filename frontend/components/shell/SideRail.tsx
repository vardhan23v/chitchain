"use client";

import Link from "next/link";
import { KeyRound, MessageCircleQuestion, Orbit, SquarePlus, UserRound } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavItems, type NavItem } from "@/components/shell/MobileTabs";
import { cn } from "@/lib/utils";

function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  const { href, label, Icon } = item;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          href={href}
          aria-label={label}
          aria-current={active ? "page" : undefined}
          className={cn(
            "liquid flex h-11 w-11 items-center justify-center rounded-full",
            active ? "liquid-navy text-primary-foreground" : "liquid-clear text-muted-foreground hover:text-foreground"
          )}
        >
          <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Desktop icon rail: fixed, 72 px wide, liquid glass. Mobile keeps the bottom tab bar. */
export function SideRail() {
  const { signedIn, dashboard, profileHref, isActive } = useNavItems();
  const items: NavItem[] = [
    { href: "/", label: "Circles", Icon: Orbit },
    ...(signedIn ? [dashboard] : []),
    { href: "/create", label: "Create", Icon: SquarePlus },
    { href: "/support", label: "Support", Icon: MessageCircleQuestion },
  ];
  const profile: NavItem = { href: profileHref, label: signedIn ? "Profile" : "Sign in", Icon: signedIn ? UserRound : KeyRound };
  return (
    <aside className="liquid-panel fixed bottom-4 left-4 top-4 z-40 hidden w-[72px] flex-col items-center rounded-[28px] py-4 md:flex" aria-label="Main">
      <Link href="/" className="flex h-11 w-11 items-center justify-center rounded-full text-primary" aria-label="ChitChain home">
        <Logo className="h-8 w-8" />
      </Link>
      <nav className="flex flex-1 flex-col items-center justify-center gap-2" aria-label="Sections">
        {items.map((item) => <RailLink key={item.label} item={item} active={isActive(item.href)} />)}
      </nav>
      <RailLink item={profile} active={isActive(profile.href)} />
    </aside>
  );
}

"use client";

import Link from "next/link";
import { CircleDot, LifeBuoy, PlusCircle, User } from "lucide-react";
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
            "flex h-11 w-11 items-center justify-center rounded-full transition-colors",
            active ? "bg-primary text-primary-foreground shadow-[0_6px_18px_-8px_rgba(46,74,125,0.55)]" : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
          )}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10}>{label}</TooltipContent>
    </Tooltip>
  );
}

/** Desktop icon rail: fixed, 72 px wide, frosted. Mobile keeps the bottom tab bar. */
export function SideRail() {
  const { signedIn, dashboard, profileHref, isActive } = useNavItems();
  const items: NavItem[] = [
    { href: "/", label: "Circles", Icon: CircleDot },
    ...(signedIn ? [dashboard] : []),
    { href: "/create", label: "Create", Icon: PlusCircle },
    { href: "/support", label: "Support", Icon: LifeBuoy },
  ];
  const profile: NavItem = { href: profileHref, label: signedIn ? "Profile" : "Sign in", Icon: User };
  return (
    <aside className="glass-strong fixed bottom-4 left-4 top-4 z-40 hidden w-[72px] flex-col items-center rounded-[26px] py-4 md:flex" aria-label="Main">
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

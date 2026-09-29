/** Route → page title map for the top header. Longest prefix wins; unknown routes show the app name. */
const TITLES: [string, string][] = [
  ["/dashboard", "Overview"],
  ["/organizer", "Organizer"],
  ["/admin", "Admin"],
  ["/activity", "On-chain activity"],
  ["/circle", "Chit"],
  ["/create", "Create a chit"],
  ["/member", "Profile"],
  ["/collateral", "Collateral"],
  ["/support", "Support"],
  ["/login", "Sign in"],
  ["/demo", "Demo"],
  ["/", "ChitChain"],
];

export function pageTitle(pathname: string): string {
  const hit = TITLES.find(([p]) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/")));
  return hit ? hit[1] : "ChitChain";
}

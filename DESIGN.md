# ChitChain — UI/UX Design Spec

Design spec for the Next.js frontend. Stack: **Tailwind CSS + shadcn/ui + lucide-react icons + framer-motion** (light use). Pairs with `ARCHITECTURE.md` (behaviour) and `INTERFACE.md` (contract calls).

**Design goal:** a judge understands "the pot sits in a contract, and the contract enforces the rules" within 10 seconds of looking at the Circle Room. Everything on screen should make **money movement** and **trust** visible.

---

## 1. Principles

1. **Show the money.** The pot, each member's collateral and every payout are always visible as numbers *and* bars.
2. **Every action is verifiable.** Every tx toast and feed item has an MSTScan link.
3. **Status by colour + icon + text.** Never colour alone (accessibility).
4. **One hero screen.** The Circle Room is the demo. All other pages are supporting.
5. **Calm, trustworthy, Indian-fintech feel.** Think clean banking app, not neon crypto casino.
6. **Mobile-first.** Judges may join circles from phones via BridgeKey Android.

---

## 2. Brand

| | |
|---|---|
| Name | **ChitChain** |
| Tagline | *The pot sits in a contract, not in anyone's account.* |
| Voice | Plain, reassuring, precise. "Your collateral covered this payment." not "Slashed!!" |
| Logo idea | Circle of 5 dots joined by a ring, one dot highlighted (the round's winner). Wordmark in Inter Bold. |
| Currency display | `12.50 MSTC` (2 decimals); optional ₹ equivalent in muted text only if a demo rate is set, labelled "demo rate" |

---

## 3. Colour tokens

Define in `globals.css` as CSS variables (shadcn convention, HSL). Dark mode via `class="dark"`.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#F8FAFC` | `#0B1120` | Page |
| `--card` | `#FFFFFF` | `#111827` | Cards |
| `--foreground` | `#0F172A` | `#E5E7EB` | Body text |
| `--muted-foreground` | `#64748B` | `#94A3B8` | Secondary text |
| `--border` | `#E2E8F0` | `#1F2937` | Borders |
| `--primary` | `#4F46E5` (indigo) | `#818CF8` | Main buttons, links, active round |
| `--pot` | `#0EA5E9` (sky) | `#38BDF8` | Pot amount, pot bar |
| `--success` | `#16A34A` | `#22C55E` | Paid ✓, payout, Low risk |
| `--warning` | `#D97706` | `#F59E0B` | Covered by collateral, Medium risk, countdown < 10 s |
| `--danger` | `#DC2626` | `#EF4444` | Removed, High risk, errors |
| `--chain` | `#C0392B` | `#F87171` | "On-chain" badges / tx links (matches MST red) |
| `--agent` | `#7C3AED` (violet) | `#A78BFA` | Anything the AI agent did |

**Risk tier chips:**
| Tier | Colour | Icon | Label |
|---|---|---|---|
| Unassessed | slate | `HelpCircle` | Unassessed · 2× |
| Low | success | `ShieldCheck` | Low risk · 0.5× |
| Medium | warning | `Shield` | Medium · 1× |
| High | danger | `ShieldAlert` | High risk · 2× |

---

## 4. Typography & spacing

| Role | Font | Size / weight |
|---|---|---|
| Display (pot amount) | Inter | 48px / 800, `tabular-nums` |
| H1 | Inter | 30px / 700 |
| H2 | Inter | 20px / 600 |
| Body | Inter | 15px / 400 |
| Small / meta | Inter | 13px / 500 |
| Addresses, hashes | JetBrains Mono | 13px, truncated `0x12ab…9f3c` |

- All numbers use `tabular-nums` so counters don't jitter.
- Spacing scale: 4 / 8 / 12 / 16 / 24 / 32. Card padding 20px (mobile 16px). Radius: cards `rounded-2xl`, buttons `rounded-xl`, chips `rounded-full`.
- Max content width 1200px; 16px side gutter on mobile.

---

## 5. Layout shell

```
┌──────────────────────────────────────────────────────────────┐
│ ◉ ChitChain     Circles   Create   My Profile      [● MST Testnet] [0x12…9f ▾] │
└──────────────────────────────────────────────────────────────┘
│                         page content                          │
└──────────────────────────────────────────────────────────────┘
```
- Top bar: logo, nav, **network pill** (green dot = connected to MST testnet, red = wrong network → "Switch to MST" button), wallet button (shadcn `DropdownMenu`: copy address, view on MSTScan, disconnect).
- Mobile: nav collapses into a bottom tab bar (Circles · Create · Profile).
- Toaster bottom-right (mobile: top).

---

## 6. Pages

### 6.1 Home `/`

```
┌──────────────────────────────────────────────────────────┐
│  The pot sits in a contract,                             │
│  not in anyone's account.                                │
│  Transparent chit funds on MST Blockchain.               │
│  [ Create a circle ]  [ Browse circles ]                 │
│                                                          │
│  ┌ 3 stat tiles ─────────────────────────────────────┐   │
│  │ Circles live: 3 │ MSTC in contracts: 42.0 │ Txs: 118│ │
│  └───────────────────────────────────────────────────┘   │
│                                                          │
│  Circles                                  [Open][Active][Done] │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐      │
│  │ Circle #3    │ │ Circle #2    │ │ Circle #1    │      │
│  │ ● Active R2/5│ │ ○ Open 3/5   │ │ ✓ Completed  │      │
│  │ Pot 5.00 MSTC│ │ 1 MSTC/round │ │ 5 rounds     │      │
│  │ ●●●●○ members│ │ fills in 7:12│ │              │      │
│  │ [ Open room ]│ │ [ Join ]     │ │ [ View ]     │      │
│  └──────────────┘ └──────────────┘ └──────────────┘      │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Create `/create`

Single card form (shadcn `Form` + zod):
- Contribution per round (MSTC) · Members (slider 2–20) · Round length (select: 30 s demo / 1 min / 1 day / 30 days) · Join window · Platform fee (0–3%) · Base collateral (MSTC, min = contribution).
- **Live summary panel** on the right (below on mobile):
  - Pot per round: `members × contribution`
  - Collateral by tier: Low / Medium / High / Unassessed amounts
  - Total duration
- Submit → wallet signature → toast with MSTScan link → redirect to room.

### 6.3 Circle Room `/circle/[id]` — **hero screen**

Desktop (3-column):
```
┌───────────────────────────────────────────────────────────────────────────┐
│ Circle #3 · Active · Round 2 of 5                 ⏱ 00:18  [Contract ↗]  │
├───────────────────────────────┬───────────────────────┬──────────────────┤
│ POT (in contract)             │ AUCTION               │ LIVE FEED        │
│  4.00 / 5.00 MSTC             │ Best bid: 0.60 MSTC   │ ● B won R1 ↗     │
│  ███████████████░░░░ 80%      │ by Member C           │ ● D covered ⚠ ↗  │
│  Reserve 0.05 · Fee 1%        │ Max 2.00 MSTC         │ ● A paid ✓ ↗     │
│                               │ [ discount input ]    │ ● Agent bid 🤖 ↗ │
│ [ Contribute 1.00 MSTC ]      │ [ Place bid ]         │ ...              │
├───────────────────────────────┴───────────────────────┤                  │
│ MEMBERS                                                │                  │
│ ┌─────────┐┌─────────┐┌─────────┐┌─────────┐┌─────────┐│                  │
│ │A  0x12… ││B  0x34… ││C  0x56… ││D  0x78… ││E  0x9a… ││                  │
│ │🛡 Low   ││🛡 Med   ││🛡 Low   ││⚠ High   ││🛡 Med   ││                  │
│ │✓ Paid   ││🏆 Won R1││✓ Paid   ││⚠Covered ││○ Pending││                  │
│ │Coll ▓▓░ ││Coll ▓▓▓ ││Coll ▓▓░ ││Coll ▓░░ ││Coll ▓▓░ ││                  │
│ └─────────┘└─────────┘└─────────┘└─────────┘└─────────┘│                  │
├────────────────────────────────────────────────────────┤                  │
│ 🤖 AI BIDDING AGENT                                    │                  │
│ "I need money before Diwali"            [ Ask agent ]  │                  │
│ Agent: Bidding 0.7 MSTC now — 3 rounds left, current   │                  │
│ best is 0.6; winning now fits your deadline. ↗ tx      │                  │
└────────────────────────────────────────────────────────┴──────────────────┘
```
Mobile order: header → Pot → primary action button (sticky bottom) → Members (horizontal scroll) → Auction → Agent → Feed.

**Primary action button logic (one clear CTA at a time):**
| Member state | Button |
|---|---|
| Not connected | Connect BridgeKey |
| Wrong network | Switch to MST Testnet |
| Circle Open, not joined | Join · lock X MSTC |
| Active, not paid this round | Contribute 1.00 MSTC |
| Paid, eligible, no bid | Place a bid (secondary: "Skip") |
| Has claimable > 0 | Withdraw X MSTC |
| Removed | Disabled: "Removed — collateral exhausted" |

**Member card anatomy:**
- Avatar (generated from address, e.g. blockies) + label (A–E in demo) + short address
- Tier chip (§3)
- Round status chip: `✓ Paid` (success) · `○ Pending` (muted) · `⚠ Covered by collateral` (warning) · `🏆 Won R1` (primary) · `✕ Removed` (danger, card greyed)
- Collateral bar: filled = current collateral, outline = required; holdback segment striped in `--primary` with tooltip "Held back to secure future contributions"
- "You" ring around the connected wallet's card

**Countdown:** ring or pill; turns `--warning` under 10 s; at 0 shows "Settling…" spinner until `RoundSettled` arrives.

### 6.4 Member profile `/member/[addr]`

```
┌─────────────────────────────────────────────────────────┐
│ 0x78…c2 · Member D                         [MSTScan ↗]  │
│ ┌─────────────┐  Heuristic risk score                   │
│ │    42       │  ⚠ High risk · collateral 2×            │
│ │  /100 gauge │  "Missed 3 of 10 past payments and was  │
│ └─────────────┘   removed from one circle." (AI)        │
│ Factors: On-time 70% · Circles completed 1 · Removed 1  │
│ ⓘ Heuristic on synthetic demo history — not a credit score │
│                                                          │
│ On-chain history (timeline)                              │
│ ● Circle #3 R2 · Covered by collateral · 1.00 MSTC ↗     │
│ ● Circle #3 R1 · Paid on time ↗                          │
│ ● Joined Circle #3 · High · locked 2.00 MSTC ↗           │
│ [ Re-assess (sets tier on-chain) ]                       │
└─────────────────────────────────────────────────────────┘
```

### 6.5 Demo console `/demo` (not linked in nav)

Operator-only: fund demo wallets from faucet key · per-member toggle "skip payment this round" · "Assess all" · "New demo circle (30 s rounds)" · tx counter ("24 txs this demo"). Plain utilitarian styling, amber header "DEMO CONTROLS".

---

## 7. Components (shadcn/ui)

| Need | Component |
|---|---|
| Cards, stat tiles | `Card` |
| Buttons | `Button` (variants: default = primary, secondary, outline, destructive, ghost) |
| Chips | `Badge` with custom variants `tier-low/medium/high/unassessed`, `status-*` |
| Bars | `Progress` (custom striped segment for holdback) |
| Forms | `Form`, `Input`, `Slider`, `Select` + zod |
| Wallet menu | `DropdownMenu` |
| Feed | `ScrollArea` |
| Toasts | `Sonner` |
| Tooltips | `Tooltip` on every jargon term (collateral, holdback, reserve, discount, dividend) |
| Confirm big txs | `AlertDialog` for join (shows exact collateral) and withdraw |
| Loading | `Skeleton` |

Custom components: `TxLink`, `AddressPill`, `MstcAmount`, `TierChip`, `MemberCard`, `PotMeter`, `Countdown`, `FeedItem`, `AgentPanel`, `NetworkPill`.

---

## 8. Transaction UX (every write)

1. Button → `loading` state "Confirm in BridgeKey…"
2. Signed → toast "Submitted" with `TxLink` (MSTScan ↗)
3. Mined → toast success "Contribution recorded on-chain" + link; UI updates from event
4. Error → decode custom error to plain English:

| Contract error | Message |
|---|---|
| `WrongAmount` | "Send exactly X MSTC." |
| `AlreadyPaid` | "You've already paid this round." |
| `RoundClosed` | "This round has closed — wait for settlement." |
| `BidNotHigher` | "Someone bid X MSTC; bid more to lead." |
| `BidTooHigh` | "Max discount this round is X MSTC." |
| `JoinWindowClosed` | "This circle is no longer accepting members." |
| user rejected | "Cancelled in wallet." (neutral, not red) |

Never show a success state before the tx is mined.

---

## 9. Feed item format

`[icon] [actor] [action] [amount] · [time ago] · ↗`

| Event | Icon | Colour | Text |
|---|---|---|---|
| Contributed | `CheckCircle2` | success | "A paid 1.00 MSTC" |
| BidPlaced | `Gavel` / `Bot` if agent | primary / agent | "C bid 0.60" / "🤖 Agent for B bid 0.70 — *reason*" |
| Covered | `ShieldHalf` | warning | "D missed — collateral covered 1.00" |
| Removed | `XCircle` | danger | "D removed — collateral exhausted" |
| HoldbackApplied | `Lock` | primary | "0.40 held back to secure B's future dues" |
| RoundSettled | `Trophy` | primary | "B won Round 1 · 4.35 MSTC payout" |
| DividendCredited | `Coins` | success | "A earned 0.15 dividend" |

---

## 10. Motion

- Pot bar fills with a 400 ms ease-out on each `Contributed`.
- Winner card: brief scale 1.03 + confetti-lite (10 particles, 600 ms) on `RoundSettled`.
- Covered: member card shakes 2px once, collateral bar animates down.
- Respect `prefers-reduced-motion` (disable all of the above).

---

## 11. Accessibility

- Contrast ≥ 4.5:1 for text in both themes.
- Status always = icon + text + colour.
- All buttons keyboard-reachable; visible focus ring (`ring-2 ring-primary`).
- `aria-live="polite"` on the feed and countdown.
- Amounts read as "1 point 0 0 MSTC" via `aria-label` with full precision.

---

## 12. Empty, loading and edge states

| State | Design |
|---|---|
| No wallet | Hero + "Connect BridgeKey" + link to install extension / Android app |
| No MSTC | "Get test MSTC" button → faucet link |
| No circles | Illustration + "Create the first circle" |
| RPC slow | Skeletons; after 10 s show "MST testnet is slow — retrying" |
| Keeper late | Countdown at 0 shows "Waiting for settlement… anyone can settle" + `Settle round` button |
| Circle cancelled | Banner "Didn't fill in time — withdraw your collateral" + Withdraw |
| Completed | Summary: who won which round, payouts, dividends, reserve to treasury; "Withdraw all" |

---

## 13. Pitch-friendly touches

- Header link **"Contract ↗"** opens the contract on MSTScan — judges love clicking this.
- Small persistent badge bottom-left: **"All money held by contract 0xAB…12 · MST Testnet"**.
- Tx counter on the room page: "22 on-chain transactions in this circle".
- Footer: "Prototype on MST Testnet · Not a registered chit company · Chit Funds Act, 1982".

---

## 14. v2 dark theme (2026-09-29)

The light liquid-glass theme was replaced by a dark midnight base with an MST red accent. `:root` in `frontend/app/globals.css` is the only token set; there is no `.dark` block and no glass utilities.

| Token | Value | Tailwind | Use |
|---|---|---|---|
| background | `#0D0F13` | `bg-background` | Page base, flat; `body::before` adds a 1 px grid at 4 % and one radial red glow at 6 % top-left |
| surface | `#151820` | `bg-surface` | Cards (`rounded-2xl border border-white/[0.08] shadow-card`), sidebar, mobile tabs |
| surface-2 | `#191C24` | `bg-surface2` | Popovers, dialogs, table headers, tab lists |
| surface-3 | `#20242D` | `bg-surface3` | Tooltips, hover fills, icon wells |
| border | `rgba(255,255,255,.08)` | `border-border`, `border-white/[0.08]` | All dividers; hover raises to `white/14` via `.card-hover` |
| foreground | `#F3F4F6` | `text-foreground` | Body text |
| muted-foreground | `#8B93A7` | `text-muted-foreground` | Meta text (4.5:1 on surface) |
| primary (MST red) | `#D7263D`, hover `#B81E32` | `bg-primary`, `bg-primary-hover` | Primary buttons, active nav bar, chain references, focus ring at 60 % |
| success | `#22C55E` | `text-success` | Paid, confirmed, connected |
| warning | `#F59E0B` | `text-warning` | Pending, slow network, testnet caveats |
| danger | `#EF4444` | `text-danger` | Failed, removed, wrong network |
| pot | `#38BDF8` | `text-pot` | Money held by the contract |
| agent | `#8B7CF6` | `text-agent` | AI bidding agent |
| chain | `= primary` | `text-chain` | On-chain events and the contract |

Utilities: `.card-hover` (translateY(-2px) + border white/14, 150 ms), `.grid-texture` (24 px grid at 4 %), `.status-dot` (2 s pulse, colour from the element's `bg-*`), `.tnum`, `.surface`, `.surface-2`. Keyframes `shimmer` (skeletons) and `pulseDot` live in `tailwind.config.ts` with `boxShadow.card` (`inset 0 1px 0 rgba(255,255,255,.04)`).

Buttons: `default` red pill, `secondary` and `outline` (`bg-white/[0.06] border-white/10`), `ghost`, `destructive`, `link`; hover `scale-[1.02]`, active `scale-[0.98]`. Dialogs fade and scale in 150 ms over `bg-black/60`; dropdowns fade and translate; tooltips fade and rise; skeletons shimmer. All motion is transform and opacity only and stops under reduced motion.

Shell: 240 px sidebar at xl (72 px icon rail with tooltips between md and xl, hidden below md), 64 px top header with the page title from `lib/routes.ts`, five-tab mobile bar. The signature animation is `components/landing/MoneyFlow.tsx`: Members → Collateral → Smart contract → Pot → Auction → Winner → Dividends → Reputation with two particles on a 6 s loop, paused under reduced motion and while the tab is hidden.

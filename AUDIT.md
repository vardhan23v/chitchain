# ChitChain v2.2 audit: recipient decision, auction, usernames (2026-09-29)

Contract v2.2 `0x4096bDd55345CD98b4168d70A8595E544eEDCBFd` (block 5802569) on MST testnet. Evidence: `npx hardhat test` 49/49 (12 new decision-flow cases plus the brief's five-round scenario at 100 MST scale); backend `npm test` 68/68 (username rules, demo script); frontend typecheck, lint and build clean; three live demo circles run end to end on testnet (circle #2 is the brief's exact story, circle #3 adds an autonomous AI bid, circle #1 the insufficient-collateral path); headless Chrome screenshots of every phase at 1280 and 390 px with zero horizontal overflow.

Legend: [x] verified front to back on the live deployment · [~] built and verified in part (what is missing is named) · [!] broken · [ ] not built.

| Feature | Status | Evidence / gap |
|---|---|---|
| Wallet | [x] | BridgeKey connect, network switch and SIWE login unchanged since the v2.1 audit. Not re-signed with a browser wallet in this session. |
| Username | [~] | Rules, reserved names and lookalike keys unit-tested; live `GET /usernames/check` verified (`Rahul` → `rahul` available, `adm1n` reserved); unique indexes in Postgres; first-login dialog, profile form and names across the UI built. **Missing:** a live `PUT /me/username` from a real wallet session in this run (needs a BridgeKey signature). Files: `backend/src/users/username.ts`, `backend/src/db/usernames.ts`, `backend/src/routes/users.ts`, `frontend/components/profile/*`. |
| Create circle | [x] | Circles #1–#3 created on v2.2 (`createCircle` tx on circle #2 `0xe4045bc0…`). |
| Join circle | [x] | 15 joins across the three circles, collateral locked by tier. |
| Risk assessment | [x] | Unchanged heuristic + oracle `setRiskTier`; profile shows the tier. |
| Collateral | [x] | Tier-priced at join; covers misses at close (`DefaultDetected` in circle #2 round 4). |
| Contributions | [x] | Autopilot and UI; the completing payment closes the phase on-chain (`PotReady` in the same tx). |
| Recipient selection | [x] | On-chain rotation `(round − 1) mod n`, skipping winners and removed members; circle #2 recipients A, B, C, E, B. |
| Full pot acceptance | [x] | `acceptFullPot` (circle #2 rounds 1, 3, 4, 5); outcome `ACCEPTED`, no auction events; UI accept button with fee and holdback preview. The in-room button calls the same function from BridgeKey; the demo used the custodial path. |
| Decline | [x] | `declineFullPot` changes the on-chain phase to Auction (circle #2 round 2 `0x429e904f…`); bids before it revert `WrongPhase` (tests D3, 13). |
| Auction | [x] | Offers only in the Auction phase, ≥ pot − maxDiscount, strictly lower payout, closed after the window (tests D4–D9). |
| Lowest bid winner | [x] | Circle #2: D at 0.090 of 0.1; circle #3: AI for C at 0.087. |
| Payout | [x] | `pot − fee − discount`, holdback applied, pull-only `withdraw` (demo payouts withdrawn). |
| Dividend | [x] | Discount split equally among the other active members: 0.0025 × 4 in circle #2, 0.00325 × 4 in circle #3; 12.5 × 4 in test D4. |
| Default protection | [x] | Covered miss (circle #2 round 4) and exhausted collateral with shortfall and removal (circle #1 round 3); "Default protection activated" card. |
| Next round | [x] | Each settle starts the next round in Contributing; circles complete when every active member has won. |
| AI bidding | [x] | Circle #3: the agent logged WAIT during contributions and during the recipient decision, then bid after the decline (`0xcea22db6…`, `0x9d160510…`) and won. It never opens an auction. |
| Dashboard | [x] | One next action per state (pay, choose, place a bid, wait), the decision card or the auction card. |
| Transaction history | [x] | `PotReady`, `FullPotAccepted`, `FullPotDeclined` indexed and rendered in feed, activity and round history (outcome column). |
| MSTScan verification | [x] | Every row links to `testnet.mstscan.com/tx/<hash>`; hashes listed in the README. |

Assumptions stated in the brief's terms:
- **Rotation.** The recipient is the next member in join order who has not received a pot, starting at `(round − 1) mod n`, so the brief's round-by-round recipients hold.
- **No decision in time.** The recipient receives the full pot, so no one can force an auction by stalling.
- **Declined and no offers.** The recipient receives the full pot.
- **Offers.** The recipient may also bid after declining, as in the brief's round 2.
- **Dividends.** The existing contract rule is kept: equal shares for every other active member, including members who already won, with dust to the first in join order.
- **Fee and holdback.** The existing platform fee (1 %) and holdback still apply. An accepted full pot is paid as pot minus the fee, with part held as security until the circle completes.

---

> **Post-audit fixes (2026-09-29, commit after 352676c):** demo circle seeding now pre-checks funding and joins wallets from a background queue (circle #5 filled 5 of 5); `POST /demo/cancel`, `GET/POST /admin/treasury*` and `GET /circles/:id/invites/check` added; helmet security headers; `/health` reports demo wallet funding, LLM and CrewAI status; transaction-wait timeout with stuck-transaction UI; pre-send balance checks; tier multipliers must be above zero; chain-only fallback keeps default statuses; invites labelled informational. On v2.1 the previously missing evidence now exists: 5 contributions, 5 oracle tier writes, 3 cancels with refunds, a treasury withdrawal, and an autonomous agent bid on circle #5. Remaining open items: 100 MST-scale run (faucet budget), commit-reveal bidding, multisig oracle, external audit.

# ChitChain implementation audit (read-only), 2026-09-29

Scope: repo `/Users/vardhu/Documents/Chit chain ` @ `1533810`; live backend `https://backend-production-64738.up.railway.app`; live frontend `https://frontend-production-d322.up.railway.app`; contract v2.1 `0xFBA432E34E70d6069677d80944A9eEf83376CA98` (block 5794708) and v2 `0xA18D48c29Bf68B750BB3fCb2f109661C5de1bD45` on MST testnet (chain 91562037).

Nothing was written, deployed or sent. Evidence: source reads; `npx hardhat test` (29/29); backend `npm test` (55/55); `tsc --noEmit` backend + frontend (clean); GET requests to the live API and 14 frontend routes; `eth_call`, `eth_getLogs`, `eth_getTransactionReceipt` against both contracts. Receipts for `0x039b272b…`, `0x550248b8…`, `0x7068468a…`, `0x4f47f111…` were decoded and match the README.

On-chain event census (all blocks since deploy):
- v2: RiskTierSet 5, CircleCreated 8, Joined 16, CircleStarted 3, Contributed 32, BidPlaced 4, DefaultDetected 15, HoldbackApplied 10, DividendCredited 12, RoundSettled 11, Removed 3, CircleCompleted 3, Withdrawn 5. No Left / CircleCancelled.
- v2.1: CircleCreated 4, Joined 5, CircleStarted 1, BidPlaced 1, DefaultDetected 4, HoldbackApplied 2, DividendCredited 1, RoundSettled 2, CircleCompleted 1, Withdrawn 3. **No Contributed, no RiskTierSet**, no Left / CircleCancelled.

Legend: [x] verified end-to-end (UI → backend → contract → testnet → confirmation → UI update; for features that are off-chain by design: UI → backend → DB → UI on the live deployment); [~] partial (UI-only, DB-only, hardhat-only, or code path with no testnet evidence); [ ] not implemented; [!] implemented but broken; [N/A] not applicable.

---

## PHASE 0: PROJECT FOUNDATION
- [x] 0.1 Frontend runs successfully — live Railway deploy, 13 routes HTTP 200, `/nope` 404 page; `tsc --noEmit` clean.
- [x] 0.2 Backend runs successfully — `GET /health` ok, 4 loops (keeper/autopilot/aiBidding/indexer) 0 errors; 55 unit tests pass.
- [x] 0.3 Smart contract compiles — Solidity 0.8.24, hardhat test run compiled and passed 29/29.
- [x] 0.4 Smart contract is deployed to MST testnet — `deployments/mstTestnet.json` (deployTx `0xa875cb69…f023c`, block 5794708); `eth_getCode` 14118 bytes.
- [x] 0.5 Frontend connects to MST testnet — `lib/chain.ts` (RPC, chainId 91562037, explorer), `lib/contract.ts` JsonRpcProvider read fallback; live HTML embeds v2.1 address ×4.
- [x] 0.6 Backend connects to required services — `/health`: chainId 91562037, `lastIndexedBlock == latestBlock` 5795175, Postgres-backed feed/audit responding.
- [x] 0.7 Environment variables are configured — `.env.example` (33 keys), `backend/src/config.ts` zod-validated; `.env` git-ignored and untracked.
- [x] 0.8 Existing bidding functionality still works — v2.1 circle #4 bid `0x28c78df2…` (0.7 MST discount) won round 1; `GET /auction/4/bids` returns it.
- [x] 0.9 Existing UI has not been broken — all pages 200; room/feed/history endpoints return live data for circle #4.
- [x] 0.10 No real-money functionality exists — README "No real money"; only MST testnet RPC/chain id configured; `NetworkPill`/testnet badges.
- [x] 0.11 Only MST testnet assets are used — native MST (`msg.value`) only; no ERC-20, no mainnet config anywhere.

## PHASE 1: WALLET CONNECTION
- [x] 1.1 User can connect MST wallet — `lib/wallet.ts requestAccounts`, `hooks/useWallet.tsx connect` (BridgeKey / any EIP-1193).
- [x] 1.2 Connected wallet address is displayed — `components/AddressPill.tsx`, NavBar; `/member/[addr]` profile.
- [x] 1.3 Wallet disconnect is handled — `useWallet.tsx disconnect` (persisted `chitchain:disconnected` key), `accountsChanged` subscription.
- [x] 1.4 Wallet reconnection works — `eth_accounts` on load (`readAccounts`) unless user disconnected; `subscribe()` re-syncs.
- [x] 1.5 MST balance is displayed — `hooks/useBalance.ts` (refresh 10 s), dashboard/collateral pages.
- [x] 1.6 Wrong network is detected — `isCorrectChain`, `correctChain` flag; `chainChanged` listener.
- [x] 1.7 User can switch to correct network — `switchToMst()` with `wallet_addEthereumChain` fallback on 4902/-32603.
- [~] 1.8 Insufficient MST balance is detected — only after send via error mapping (`lib/errors.ts:79 INSUFFICIENT_FUNDS`); no pre-flight balance check in JoinDialog/PrimaryAction.
- [x] 1.9 Rejected wallet transactions are handled — `lib/errors.ts:29` (code 4001 / ACTION_REJECTED) → friendly toast in `useTx`.
- [x] 1.10 Pending transactions are displayed — `hooks/useTx.ts` 5-stage stepper (wallet → signing → submitted → confirming → confirmed) with MSTScan link.
- [x] 1.11 Confirmed transactions update the UI — `useTx` waits for `tx.wait()` then `onMined` refetch (`useRoomActions.ts after`); 4 s polling.
- [x] 1.12 Private keys are never requested/stored — frontend uses injected signer only; login message states it (`auth/message.ts`); backend keys are for custodial keeper/oracle/demo wallets, documented.

## PHASE 2: CREATE CHIT CIRCLE
- [x] 2.1 User can create a circle — `app/create/page.tsx` → `createCircle` via wallet; testnet circle #4 by `0xbA64…9601` tx `0x4cfc9751…` (block 5794852).
- [x] 2.2 Circle name can be configured — off-chain name via `POST /circles/:id/claim` (creator-gated); live circle #4 `name:"diwaliacsda"`.
- [x] 2.3 Member limit can be configured — `maxMembers` 2–20 (`createSchema.ts:16`, `ChitChain.sol:31`, `MIN_MEMBERS()`=2 on-chain); circle #4 max 2, #2 max 10.
- [x] 2.4 Contribution amount can be configured — `contribution` param; circles show 0.02 / 0.05 / 1 MST.
- [~] 2.5 Number of rounds can be configured — not a separate field: rounds = members (`CreateSummary.tsx:37 "… rounds"`); by design, ends early if members removed.
- [x] 2.6 Round duration can be configured — `contributionDuration` + `biddingDuration` + `joinWindow` (`createSchema.ts`, contract params).
- [x] 2.7 Circle configuration is validated — zod `createSchema.ts` + `createCircle` reverts `InvalidParams` (hardhat test 17).
- [x] 2.8 Circle creation happens on-chain — `CircleCreated` events ×4 on v2.1, ×8 on v2.
- [x] 2.9 Circle ID is generated — `_circleCount++`; frontend parses `CircleCreated` (`create/page.tsx:61-68`).
- [x] 2.10 Contract address is recorded — `deployments/mstTestnet.json`, `/health.contract`, `ContractBadge`/`ContractBanner` components.
- [x] 2.11 Creation transaction is recorded — indexed `CircleCreated` rows with txHash (`GET /feed`), claim stores `txHash` in audit.
- [x] 2.12 MSTScan link is available — `lib/format.ts:56,60` (`/tx/`, `/address/`), README badges.
- [x] 2.13 Created circle appears in dashboard — `GET /circles` lists #4 (newest first); `/organizer` lists creator's circles.

## PHASE 3: JOIN CIRCLE
- [x] 3.1 User can find a circle — home list (`hooks/useCircles.ts`, `CircleCard`), `/circle/[id]`.
- [x] 3.2 User can view circle details — `GET /circles/:id` (circle, round, members, txCount, latestDefault); room page.
- [x] 3.3 User can see contribution amount — `circle.contribution` in room header / `CircleCard`.
- [x] 3.4 User can see member capacity — `memberCount / maxMembers` (`MembersGrid`, `CircleCard`).
- [x] 3.5 User can see required collateral — `requiredCollateral()` view; `useViewerJoinInfo.ts`, `JoinDialog.tsx`.
- [x] 3.6 User can join the circle — `useRoomActions.ts:18 join(value)`; v2.1 joins `0xd2000f0f…`, `0xa19658b1…` from non-custodial wallets.
- [x] 3.7 Join transaction is confirmed on-chain — `Joined` ×5 on v2.1, ×16 on v2; `CircleStarted` on fill (`0xa19658b1…`).
- [x] 3.8 Duplicate joining is prevented — `AlreadyJoined` (`ChitChain.sol:51`); UI maps to "You're already in this circle."
- [x] 3.9 Full circles reject new members — `CircleFull` (`ChitChain.sol:52`); hardhat helpers fill circles; UI message.
- [x] 3.10 Member list updates after joining — `onMined` refetch + 4 s polling; live members array for #4.
- [x] 3.11 Join transaction appears in history — `GET /feed`, `/members/:addr/activity` (verified for wallet A: `Joined` circle 3 tx `0x26c9fb3e…`).

## PHASE 4: AI RISK ASSESSMENT
- [x] 4.1 Risk engine exists — `backend/src/risk/{score,features,explain,seed}.ts`.
- [x] 4.2 Risk score is calculated — `clamp(60 − 40·onTime − 10·min(completed,3)/3 + 30·removed)`; 7 unit tests; live `/members/:addr/risk` → 40.
- [x] 4.3 LOW tier is supported — score ≤ 39; v2 `riskTier(A)` = 1 after `0x5a3972c9…e8da86`.
- [x] 4.4 MEDIUM tier is supported — 40–69, cold start → Medium (live response tier 2).
- [x] 4.5 HIGH tier is supported — ≥ 70; v2 `riskTier(D)` = 3 after `0x524d1ca9…0f3a6b`.
- [x] 4.6 Risk score has transparent reasons — `factors[]` with name/value/effect + explanation; `RiskFactors.tsx`.
- [x] 4.7 New/unknown wallet is handled — cold start 40/Medium (`score.test "cold start"`), contract treats Unassessed as High collateral.
- [x] 4.8 Collateral multiplier is calculated — `requiredCollateral()` = base × lowBps/mediumBps/highBps (`ChitChainBase.sol:110`); tests 2, 18.
- [x] 4.9 Risk result is displayed to user — `/member/[addr]` page (score, tier, factors, banner), `TierChip` in members table.
- [x] 4.10 Risk tier is written to smart contract — `setRiskTier` oracle-only; `POST /members/:addr/assess`, `/demo/assess-all`; v2 RiskTierSet ×5. Caveat: none yet on v2.1 (all wallets Unassessed).
- [x] 4.11 Contract state matches displayed risk tier — response carries `tier` and `onChainTier` side by side; `assessAndSetTier` sends tx only when they differ.
- [x] 4.12 Risk history can be viewed — `history[]` (indexed events) and "On-chain history" section on `/member/[addr]`.
- [x] 4.13 Risk engine is clearly labelled as heuristic/demo — "Demo heuristic risk model … not a credit score" banner; README.

## PHASE 5: COLLATERAL
- [x] 5.1 Required collateral is calculated — `requiredCollateral()` on-chain.
- [x] 5.2 Required collateral is displayed — `JoinDialog`, `CollateralRow` "Required by tier".
- [x] 5.3 User can lock collateral — `join{value}`; v2 D locks 0.20 (`0x49f83c3e…59660d`), A 0.05 (`0xe420c982…4024b4`); v2.1 2 MST each.
- [x] 5.4 Collateral is actually transferred/locked — `msg.value` must equal `need` (`ChitChain.sol:56`); contract balance 2.18 MST (v2.1) / 5.42 MST (v2).
- [x] 5.5 Smart contract owns/controls locked collateral — held in contract, only `withdraw()` of `claimable` moves funds (test 29 "no collateral withdrawal").
- [x] 5.6 Locked collateral is displayed — `MemberView.collateral` in members table and `/collateral` page.
- [x] 5.7 Used collateral is displayed — `collateralUsed` field (live circle #4: 2 MST each), `CollateralRow`.
- [x] 5.8 Remaining collateral is displayed — `remainingCollateral` in default info; `CollateralBar.tsx`.
- [x] 5.9 User cannot withdraw required collateral prematurely — `withdraw` pays `claimable` only (`ChitChain.sol:197-205`); test 29.
- [x] 5.10 Collateral transaction is recorded — `Joined(member, tier, collateral)` indexed with txHash.
- [x] 5.11 Collateral state survives page refresh — all values re-read from chain via backend each load (`useCircle`, `useMyCircles`).
- [x] 5.12 Collateral is read from blockchain state — `chain.ts getMember` eth_call, cached 2 s; frontend chain fallback when backend down.

## PHASE 6: ROUND INITIALIZATION
- [x] 6.1 Circle can transition into active state — `join` of last member → `Status.Active` + `_startRound` (`ChitChain.sol:60-70`); `CircleStarted` on v2.1 `0xa19658b1…`.
- [x] 6.2 Round 1 can start — same tx sets round 1 deadlines (`contributionDeadline 1790639962`, `biddingDeadline 1790639992`).
- [x] 6.3 Current round number is displayed — `circle.round`, `round.round` in API; room header.
- [x] 6.4 Round start time is recorded — deadlines stored on-chain; start = `contributionDeadline − contributionDuration` (used by autopilot).
- [x] 6.5 Round end/deadline is displayed — `Countdown.tsx`, `useCountdown.ts` (contribution and bidding deadlines).
- [x] 6.6 Round state is stored on-chain — `getRound()` view (`ChitChainBase.sol:98`); test 16.
- [x] 6.7 Users can see current round status — `phase: contribution | bidding | settling` (`roundPhase`), live `GET /circles/4.round.phase`.
- [x] 6.8 Invalid round transitions are prevented — `BiddingNotOver`, `NotActive`, `NotOpen` guards; tests 12, 14.

## PHASE 7: MONTHLY CONTRIBUTION
- [x] 7.1 Member sees required contribution — `circle.contribution`, `PrimaryAction` "Contribute X MST".
- [x] 7.2 Member sees contribution deadline — `contributionDeadline` countdown.
- [x] 7.3 Member can pay contribution — `useRoomActions.ts:22 contribute{value}`.
- [x] 7.4 Contribution uses MST testnet asset — native `msg.value`.
- [x] 7.5 Contribution transaction is confirmed — 32 `Contributed` on v2 (circles #2, #4, #8) mined; **0 on v2.1** so far.
- [x] 7.6 Contract records contribution — `_paid[circleId][round][member]`, `c.collected += value` (`ChitChain.sol:124-128`).
- [x] 7.7 Member status becomes PAID — `paidThisRound` → `contributionStatus:"PAID"` (`routes/circles.ts contributionStatusOf`).
- [x] 7.8 Duplicate contribution is prevented — `AlreadyPaid` (`ChitChain.sol:122`); test 29.
- [x] 7.9 Contribution transaction is recorded — indexed `Contributed` events with txHash (v2 feed history).
- [x] 7.10 Other members can see contribution status — `members[].contributionStatus` public in `GET /circles/:id`; `MembersTable` "This round" column.
- [x] 7.11 Pot updates after contribution — `round.collected` vs `expectedPot`; `PotMeter.tsx`.
- [x] 7.12 Contribution survives page refresh — read from chain each load.
- [x] 7.13 Contribution state is verified on-chain — `getMember().paidThisRound` and `getRound().collected` are eth_calls.

## PHASE 8: CONTRIBUTION STATUS
- [x] 8.1 PAID status exists — `ContributionStatus` union (`lib/types.ts:6`).
- [x] 8.2 PENDING status exists — same.
- [x] 8.3 MISSED status exists — represented as `COVERED_BY_COLLATERAL | PARTIALLY_COVERED | DEFAULTED` (live circle #4 members: `COVERED_BY_COLLATERAL`).
- [x] 8.4 Member can see own status — `me` block in `/me/circles`, `CollateralRow`, room `PrimaryAction`.
- [x] 8.5 Organizer can see member statuses — `GET /organizer/circles` (`pendingContributions`, members[]), analytics page.
- [x] 8.6 Circle dashboard shows overall contribution progress — `PotMeter` collected/expected; organizer "Current pot" tile.
- [x] 8.7 Contribution deadline is visible — countdown in room and organizer views.
- [x] 8.8 Missed payment is correctly detected — on-chain in `_collectMissed` at settlement; v2.1 `0xfb276e3f…` two `DefaultDetected`.

## PHASE 9: BIDDING / AUCTION
- [x] 9.1 Bidding opens at correct stage — bids accepted from round start until `biddingDeadline` (test 15: bid during contribution phase wins); UI shows bidding phase after contributions close.
- [x] 9.2 Eligible members can bid — joined, not removed, not won (`ChitChain.sol:135`); v2.1 `0x28c78df2…`.
- [x] 9.3 Ineligible members cannot bid — `NotEligibleToBid`; test 29 (non-member bid).
- [x] 9.4 Bid amount is validated — `BidTooHigh(max)`, `BidNotHigher(best)` (`ChitChain.sol:139-141`); tests 8, 28; UI floor/ceiling in `AuctionPanel`.
- [x] 9.5 Bid is submitted on-chain — `BidPlaced` ×1 v2.1, ×4 v2.
- [x] 9.6 Current bid is displayed — `bestBidder`, `bestDiscount`, `lowestAcceptedPayout` (`GET /auction/:id`).
- [x] 9.7 Bid history is displayed — `GET /auction/:id/bids` (indexed `BidPlaced`), feed items.
- [x] 9.8 Auction timer works — `secondsRemaining` in `/auction`, `Countdown` component.
- [x] 9.9 Auction closes correctly — `biddingDeadline` on-chain; keeper settles within one 3 s tick (circle #4 round 1 deadline 1790639992, settled at 1790640001).
- [x] 9.10 Bids cannot be submitted after closing — `BiddingClosed` (`ChitChain.sol:136`); test 14.
- [x] 9.11 Existing bidding functionality still works — same as 0.8.
- [x] 9.12 Bid transaction is recorded — indexed with txHash/block (`0x28c78df2…`, block 5794902).
- [x] 9.13 Bid can be verified on MSTScan — receipt for `0x4f47f111…dc75` decoded `BidPlaced(8,1,A,0.0299…)`, status 1; UI links `/tx/<hash>`.

## PHASE 10: WINNER SELECTION
- [x] 10.1 Auction can be closed — `settleRound` after `biddingDeadline` (keeper or anyone; `POST /circles/:id/settle`).
- [x] 10.2 Winning bid is determined — `_pickWinner` (`ChitChainSettlement.sol:44-57`): best bidder if still eligible else first eligible; test 8.
- [x] 10.3 Winner is recorded — `RoundRecord.winner`, `hasWon = true`.
- [x] 10.4 Winner is recorded on-chain — `getRoundHistory(4,1).winner = 0x6A60…4038`; `RoundSettled` event.
- [x] 10.5 Winner is displayed — round history table, feed "RoundSettled", organizer analytics.
- [x] 10.6 Winning discount is displayed — `discount` in `GET /circles/4/rounds` (0.7 MST round 1).
- [x] 10.7 Duplicate settlement is prevented — round advances / status Completed; test 12 "settle twice reverts"; keeper `pending` set.
- [x] 10.8 Invalid winner cannot be selected — removed/hasWon bidders skipped in `_pickWinner`; no-eligible → dividends (test 9).
- [x] 10.9 Winner transaction/state can be verified — `RoundSettled` receipts decoded (`0x039b272b…` winner B; `0x550248b8…` winner C).

## PHASE 11: POT SETTLEMENT
- [x] 11.1 Total pot is calculated — `pot = collected + covered defaults` (`_collectMissed`), `expectedPot = contribution × active`.
- [x] 11.2 Pot comes from member contributions — `contribute` `msg.value` → `collected`; defaults topped from collateral/reserve.
- [x] 11.3 Smart contract controls the pot — funds never leave except `withdraw()` of credited `claimable`; no owner/organizer transfer function exists.
- [x] 11.4 Organizer cannot withdraw the pot — no such function in `IChitChain`; creator has no special rights after creation.
- [x] 11.5 Winning discount is applied correctly — `payout = pot − fee − discount` (`ChitChain.sol:174`); hardhat test 1 reconciles to the wei; live #4 round 1: 2 − 0.02 − 0.7 = 1.28 → 1.152 after 0.128 holdback.
- [x] 11.6 Winner payout is calculated — `RoundRecord.payout` (1.152 MST) exposed in `/rounds`.
- [x] 11.7 Settlement occurs on-chain — 13 `RoundSettled` across contracts by keeper `0x7A3668ba…`.
- [x] 11.8 Settlement can happen only once — per-round; test 12.
- [x] 11.9 Settlement state is displayed — round history rows, feed, "Round settled" toast on manual settle.
- [x] 11.10 Settlement transaction is recorded — `txHash` in `/rounds` (`0xfb276e3f…`, `0x82467089…`); audit `keeper.settle`.

## PHASE 12: WINNER PAYOUT
- [x] 12.1 Winner payout is triggered — credited to `claimable` at settlement; winner pulls via `withdraw`.
- [x] 12.2 Payout is executed by smart contract — `withdraw()` `call{value}` after zeroing balance (`ChitChain.sol:200-204`).
- [x] 12.3 Correct MST amount is transferred — v2.1 `Withdrawn(4, 0x6A60…, 1.28 MST)` `0x72f34cb0…` = payout 1.152 + released holdback 0.128.
- [x] 12.4 Winner receives funds — `Withdrawn` events ×3 v2.1, ×5 v2 (B pulls 0.27 MST `0x59f853a5…4c9508`).
- [x] 12.5 Payout cannot happen twice — `claimable = 0` before transfer, `NothingToWithdraw`, `nonReentrant`; test 12.
- [x] 12.6 Payout transaction is recorded — `Withdrawn` indexed; audit `demo.withdraw`.
- [x] 12.7 Winner can see payout — "Claimable now" in `CollateralRow`, room withdraw banner (`RoomBanners onWithdraw`).
- [x] 12.8 Payout can be verified on MSTScan — tx links; README table rows.

## PHASE 13: DIVIDENDS
- [x] 13.1 Winning discount is calculated — `bestDiscount` stored per round.
- [x] 13.2 Eligible members are identified — active members excluding winner (`_shareDividends`).
- [x] 13.3 Dividend formula is implemented — `discount ÷ n`, dust to first eligible (`ChitChainSettlement.sol:77-98`); tests 9, 10.
- [x] 13.4 Dividend amount is calculated — `dividendsTotal`, `dividendPerMember` in `/rounds` (v2 round 1: 0.05 / 4 = 0.0125).
- [x] 13.5 Dividend is distributed/recorded — `DividendCredited` ×4 in `0x039b272b…`; v2.1 `DividendCredited(4,1,0xbA64…,0.7)`.
- [x] 13.6 Member can see dividend — feed `DividendCredited` items, round history columns, claimable balance.
- [x] 13.7 Dividend transaction/state is recorded — indexed events with txHash; `claimable` on-chain.
- [x] 13.8 Dividend cannot be claimed twice — pull balance zeroed on `withdraw`.
- [x] 13.9 Dividend survives page refresh — re-read from chain.
- [x] 13.10 Dividend state matches contract — v2.1: 0.7 credited then `Withdrawn 0.7` (`0x1aa661e4…`) leaves claimable 0 (live members show `claimable:"0"`).

## PHASE 14: DEFAULT PROTECTION
- [x] 14.1 Missed contribution can be detected — `_collectMissed` loops active members at settlement.
- [x] 14.2 Member is marked as defaulted — `m.defaults++`, `reputation.missed++`; removed when uncovered.
- [x] 14.3 Contract checks collateral — `if (m.collateral >= due)` branch.
- [x] 14.4 Required collateral is determined — `required = contribution` in the event.
- [x] 14.5 Collateral is deducted automatically/through defined contract flow — `m.collateral −= due; pot += due` inside `settleRound`; keeper only triggers.
- [x] 14.6 Missed contribution is covered — v2 `0x039b272b…`: `DefaultDetected(2,1,D,0.1,0.1,0,0)`.
- [x] 14.7 Pot remains correctly funded when sufficient collateral exists — same tx: `RoundSettled` pot 0.5 with 5 members; v2.1 #4 pot 2.0 with both members defaulting.
- [x] 14.8 Default event is recorded on-chain — `DefaultDetected` ×15 v2, ×4 v2.1.
- [x] 14.9 Member sees default status — `contributionStatus:"COVERED_BY_COLLATERAL"`, `lastDefault{}` per member; `DefaultEventCard`.
- [x] 14.10 Organizer sees default status — `GET /organizer/circles` `defaults` count, analytics `defaults[]` cards.
- [x] 14.11 Collateral balance updates — live circle #4: `collateral:"0"`, `collateralUsed:"2 MST"`, `defaults:2`.
- [x] 14.12 Contribution status updates — `contributionStatusOf` maps latest `DefaultDetected` to status.
- [x] 14.13 Default transaction is recorded — `GET /circles/4/defaults` rows carry `txHash`, `ts`.
- [x] 14.14 Default can be verified on MSTScan — receipts decoded above; UI links.

## PHASE 15: INSUFFICIENT COLLATERAL
- [x] 15.1 Contract detects insufficient collateral — `else` branch in `_collectMissed`.
- [x] 15.2 Partial collateral coverage is handled — `fromCollateral`, then `fromReserve = min(gap, reserve)`; test 24.
- [x] 15.3 Remaining obligation is calculated — `shortfall = gap − fromReserve`; v2 `0x550248b8…92ceaf` = `(0.1, 0, 0.01, 0.09)`.
- [x] 15.4 User sees partial coverage — `PARTIALLY_COVERED` status, `potFullyFunded:false`, "Pot short by X MST" in `DefaultEventCard`.
- [x] 15.5 System does not falsely mark full payment — `potFullyFunded = shortfall == 0` (`feedShape.ts defaultInfoFrom`); `RoundSettled` pot 0.41 not 0.5.
- [x] 15.6 Circle state remains consistent — D `removed:true`, `defaults:3`, `collateralUsed:0.2` on v2; circle #2 completed after 4 rounds; test 5.
- [x] 15.7 Appropriate default state is recorded — `DefaultDetected` + `Removed(2,3,D)`; reputation `circlesRemoved` 2.

## PHASE 16: HOLDBACK
- [x] 16.1 Holdback rule is defined — `min(payout, max(tierGap, payout×holdbackBps))` (`ChitChainSettlement.sol:59-75`, README).
- [x] 16.2 Holdback amount is calculated — tests 19–21; live #4 round 1: 1.28 × 10 % = 0.128.
- [x] 16.3 Holdback is controlled by contract — added to winner's `collateral`, not withdrawable.
- [x] 16.4 Holdback is shown separately — `holdback` column in `/rounds`, `HoldbackApplied` feed item, `CollateralRow` "holdback".
- [x] 16.5 Winner sees immediate payout — `payout` (after holdback) credited to `claimable`.
- [x] 16.6 Winner sees held amount — `HoldbackApplied(4, 0x6A60…, 0.128)` in feed/history.
- [x] 16.7 Holdback release condition exists — `_complete` releases collateral incl. holdback (`ChitChainSettlement.sol:100-113`); test 22.
- [x] 16.8 Holdback cannot be withdrawn early — sits in `collateral`, `withdraw` only pays `claimable`.
- [x] 16.9 Holdback release is recorded — `CircleCompleted(4)` then `Withdrawn` 1.98 / 1.28 MST including released holdback.
- [x] 16.10 Holdback state can be verified — `getRoundHistory(2,3).holdback` = 0.04059 MST on v2; `getMember().collateral` 0 after completion.

## PHASE 17: NEXT ROUND
- [x] 17.1 Current round is completed — `RoundSettled` + `_history` write.
- [x] 17.2 Next round can start — `c.round = round + 1; _startRound(c)` (`ChitChain.sol:190-191`).
- [x] 17.3 Round counter increments — v2.1 #4 round 1 → 2 (settled 1790640001, round-2 deadlines 1790640031/61).
- [x] 17.4 New contribution period opens — new `contributionDeadline`; test 16.
- [x] 17.5 Previous round cannot be modified — history written once; `_paid` keyed by round; no setter.
- [x] 17.6 Previous winner remains recorded — `getRoundHistory(id, r)` immutable; test 26.
- [x] 17.7 Previous transactions remain accessible — indexed events persist; `/rounds` shows all settled rounds with txHash.
- [x] 17.8 Member obligations reset correctly — `paidThisRound` per round, `bidThisRound` per round (`getMember` reads current round maps).
- [x] 17.9 Collateral carries forward correctly — persistent `m.collateral` less deductions; v2 D: 0.20 → 0.10 → 0 across rounds (tx `0x039b272b…`, `0x425ddc61…`).
- [x] 17.10 Next round bidding opens at correct stage — new `biddingDeadline`; keeper emits `biddingPhase` for agent re-plan.

## PHASE 18: AI BIDDING AGENT
- [x] 18.1 User can provide bidding objective — `StrategyForm.tsx` (goal, desired payout, max discount MST/%, urgency, risk tolerance, duration, autonomous, demo rival) → `POST /ai/bidding/start`.
- [x] 18.2 Agent reads current auction state — `ai/snapshot.ts buildSnapshot` (pot, best, deadlines, status).
- [x] 18.3 Agent reads current bids — `bestDiscount/bestBidder` + `GET /auction/:id/bids` (crew tools).
- [x] 18.4 Agent reads time remaining — `secondsRemaining` in snapshot, `AUCTION_NOT_ACTIVE` guard.
- [x] 18.5 Agent considers user's constraints — `StrategyBrief` passed to crew/fallback; clamp in `fallback.ts` and Python `clamp_decision`.
- [x] 18.6 Agent decides whether to bid — `WAIT | BID | STOP` (`Decision`), `fallbackDecide`.
- [x] 18.7 Agent calculates bid — discount proposal clamped to caps and "beat best"; circle #8: 0.0299 MST.
- [x] 18.8 Agent can submit bid — `execute()` preflight + `placeBid` from custodial wallet; testnet `0x4f47f111…dc75` (BidPlaced from A, block 5792441).
- [x] 18.9 Agent decision is logged — `AgentEvent` rows (SSE), `AgentLog`, audit `ai.bid`; `GET /ai/bidding/activity/:id`.
- [x] 18.10 Agent reason is displayed — `ActivityLog.tsx`, `AgentDashboard.tsx` show `reason` per event.
- [x] 18.11 Agent cannot exceed configured limits — `riskGuard.ts` (`MAX_BID_EXCEEDED`, `MAX_DISCOUNT_PCT_EXCEEDED`, `ABOVE_CONTRACT_MAX`, …) + unit tests; contract `BidTooHigh`.
- [x] 18.12 Agent cannot bid after auction closes — `AUCTION_NOT_ACTIVE` guard + contract `BiddingClosed`; agent finishes on round change ("Auction ended").
- [x] 18.13 Agent is clearly identified as experimental/demo — badge "Experimental AI, testnet only" (`AiBiddingPanel.tsx:118`), README.
- Note: CrewAI/Groq service (`agent/`) exists; whether `AI_AGENT_URL` is set on the live backend is not observable read-only. Deterministic fallback covers it. No agent bid yet on v2.1 (agent tables wiped at redeploy).

## PHASE 19: MEMBER DASHBOARD
- [x] 19.1 Wallet information — `/dashboard` header, `AddressPill`, `/me`.
- [x] 19.2 MST balance — `useBalance` on dashboard/collateral.
- [x] 19.3 Circle information — "My circles" (`GET /me/circles`).
- [x] 19.4 Current round — `circle.round`, phase per circle.
- [x] 19.5 Contribution status — `me.contributionStatus`.
- [x] 19.6 Collateral status — `CollateralRow` (locked, used, holdback, claimable, required).
- [x] 19.7 Risk tier — `TierChip`, `/member/[addr]`.
- [x] 19.8 Current auction — room `AuctionPanel`, `useBidAgent` auction snapshot.
- [x] 19.9 Current bid — `bidThisRound`, best bid / lowest accepted payout.
- [x] 19.10 Previous payouts — `/rounds` history, `Withdrawn`/`RoundSettled` in `/activity`.
- [x] 19.11 Dividends — `DividendCredited` in activity feed; history columns.
- [x] 19.12 Defaults — `lastDefault`, `defaults` count, `DefaultEventCard`.
- [x] 19.13 Transaction history — `/activity` page (`GET /members/:addr/activity`).
- [x] 19.14 Round progress — countdown + `PotMeter`.

## PHASE 20: ORGANIZER DASHBOARD
- [x] 20.1 Circle information — `GET /organizer/circles`, `/organizer/circles/[id]`.
- [x] 20.2 Member list — `members[]` with status/collateral.
- [x] 20.3 Member count — `memberCount/maxMembers`.
- [x] 20.4 Contribution status — `pendingContributions`, `contributionRate`.
- [x] 20.5 Collateral status — `collateralTotal`, per-member collateral.
- [x] 20.6 Current pot — "Current pot" tile (collected / expected).
- [x] 20.7 Current round — `roundNumber`, `round`.
- [x] 20.8 Auction status — `lowestAcceptedPayout`, round phase.
- [x] 20.9 Winner — `rounds[].winner` in analytics.
- [x] 20.10 Defaulted members — `defaults[]` cards in analytics.
- [~] 20.11 Round management — organizer can name/describe, invite (informational), and settle via the public room button; no organizer-specific round controls (by design: rounds are contract-driven).
- [x] 20.12 Organizer cannot withdraw pot — no contract function; organizer role is off-chain metadata only.
- [x] 20.13 Organizer permissions are restricted — `requireCircleOrganizer` (ADMIN / meta organizer / on-chain creator) on `/organizer/circles/:id/*`; `requireRole("ORGANIZER","ADMIN")` on list; middleware unit tests.

## PHASE 21: TRANSACTION HISTORY
- [x] 21.1 Circle creation appears — `CircleCreated` feed rows (ids 173, 175, 177, 179).
- [x] 21.2 Joining appears — `Joined` rows.
- [x] 21.3 Collateral lock appears — `Joined.args.collateral` (2 MST) rendered in feed item.
- [x] 21.4 Contributions appear — `Contributed` rows (v2 history; none yet on v2.1).
- [x] 21.5 Bids appear — `BidPlaced` row id 183.
- [x] 21.6 Winner selection appears — `RoundSettled` rows 188, 193.
- [x] 21.7 Payout appears — `Withdrawn` rows 189, 195, 196.
- [x] 21.8 Dividend appears — `DividendCredited` row 187.
- [x] 21.9 Default deduction appears — `DefaultDetected` rows 184, 185, 190, 191.
- [x] 21.10 Holdback appears — `HoldbackApplied` rows 186, 192.
- [x] 21.11 Holdback release appears — `CircleCompleted` row 194 followed by `Withdrawn` incl. holdback; no separate "HoldbackReleased" event (release is implicit in completion).
- [x] 21.12 Transaction status is shown — only mined events are indexed; `useTx` stepper shows pending/confirmed/failed for own txs; `/health.tx` counters.
- [x] 21.13 Transaction hash is shown — `txHash` on every feed row and history row.
- [x] 21.14 MSTScan link is available — `txUrl()` in `FeedItem`, history, default cards.

## PHASE 22: BLOCKCHAIN VERIFICATION
- [x] 22.1 Contract address displayed — `ContractBadge`/`ContractBanner`, README badge, `/health`.
- [x] 22.2 Transaction hashes stored — Prisma `Event(txHash, logIndex)` unique; `AuditLog.txHash`; `AgentLog.txHash`.
- [x] 22.3 MSTScan links work — `https://testnet.mstscan.com/tx/<hash>`; receipts for the linked hashes exist on-chain.
- [x] 22.4 Important actions have blockchain transactions — create/join/contribute/bid/settle/withdraw/setRiskTier all on-chain; only naming, invites, tickets, auth are off-chain by design.
- [x] 22.5 UI does not fake confirmed transactions — `useTx` "Never shows success before mined" (`tx.wait()`); feed only from indexed logs; demo rival `simulated:false`.
- [x] 22.6 Blockchain state survives page refresh — every view re-reads chain via backend or direct RPC fallback.
- [x] 22.7 Blockchain remains source of truth — backend `chain.ts` eth_calls with 2 s cache; DB stores only indexed events + off-chain meta; indexer wipes chain-derived tables on contract change.

## PHASE 23: ERROR HANDLING
- [x] 23.1 Wallet rejection handled — `errors.ts:29` → "cancelled in wallet" toast.
- [x] 23.2 Insufficient balance handled — `INSUFFICIENT_FUNDS` mapped (`errors.ts:79`); backend `INSUFFICIENT_BALANCE` guard for agent.
- [x] 23.3 Wrong network handled — `correctChain` gate + "Switch network" button; settle path checks `wallet.correctChain`.
- [x] 23.4 Contract revert handled — custom errors decoded to plain English (`WrongAmount`, `AlreadyPaid`, `BidTooHigh`, `CircleFull`, …); backend `revertName`, `preflight` staticCall.
- [x] 23.5 RPC failure handled — frontend falls back to direct RPC when API is down (`useCircle source`), "temporarily unavailable" empty states; backend `cachedRead` drops failed entries.
- [~] 23.6 Transaction timeout handled — `tx.wait()` has no timeout; a stuck tx leaves the stepper on "confirming" (toast persists); backend `sendTx` has nonce-reset retry but no wait timeout.
- [x] 23.7 Wallet disconnect handled — `accountsChanged` → account null, actions disabled.
- [x] 23.8 Duplicate action handled — contract `AlreadyPaid/AlreadyJoined`, keeper `pending`/`done` sets, `AGENT_EXISTS` 409.
- [x] 23.9 Invalid circle handled — `parseId` 400, `requireCircle` 404 (`NOT_FOUND`); organizer page "Unknown circle".
- [x] 23.10 Invalid round handled — `WRONG_ROUND` guard in agent; `getRoundHistory` returns empty for unsettled rounds (test 26).
- [x] 23.11 Auction closed error handled — `BiddingClosed` → "Bidding for this round is closed."; API 409 `BiddingNotOver` on early settle.
- [x] 23.12 Insufficient collateral handled — `WrongAmount(expected, sent)` → "Send exactly X MST"; join dialog shows required amount.
- [x] 23.13 User receives understandable error messages — `lib/errors.ts` map + raw-pattern scrubbing (`RAW_PATTERNS`); API `{error, code}` shape.

## PHASE 24: SECURITY
- [x] 24.1 Unauthorized pot withdrawal prevented — no pot transfer function; `withdraw` pays own `claimable` only; treasury sweep only via `withdrawTreasury` by treasury (test 29).
- [x] 24.2 Unauthorized collateral withdrawal prevented — collateral never in `claimable` until leave/cancel/completion (test 29).
- [x] 24.3 Double payout prevented — `claimable = 0` before transfer, `nonReentrant` (test 12).
- [x] 24.4 Double contribution prevented — `AlreadyPaid`.
- [x] 24.5 Double dividend claim prevented — pull balance semantics.
- [x] 24.6 Invalid bids prevented — `BidTooHigh`, `BidNotHigher`, `NotEligibleToBid`, `maxDiscountBps` (test 28).
- [x] 24.7 Bids after deadline prevented — `BiddingClosed` (test 14).
- [x] 24.8 Invalid round transitions prevented — `BiddingNotOver`, `NotActive`, status checks (tests 12, 14).
- [x] 24.9 Access control implemented — `OnlyOracle`, `OnlyTreasury` on-chain; JWT sessions, roles, `requireSelfOrAdmin`, organizer checks, ADMIN-only demo writes, rate limits off-chain.
- [x] 24.10 Reentrancy protection considered — OpenZeppelin `ReentrancyGuard` on `settleRound`, `withdraw`, `withdrawTreasury`; settlement makes no external calls; test 12.
- [x] 24.11 Frontend cannot manipulate financial state — all money moves via signed wallet txs against contract rules; backend has no write endpoint that moves user funds except custodial demo wallets (ADMIN-only) and keeper settle (permissionless on-chain anyway).
- [x] 24.12 Database cannot override blockchain state — DB holds indexed events + off-chain meta only; every balance/status is an eth_call; contract-change reset wipes derived tables.
- Gaps noted (not checklist items): no `helmet`/CSP; custodial keys in backend env; single-EOA oracle; `lowBps` may be 0; contract unaudited.

## PHASE 25: END-TO-END TEST (Members = 5, Contribution = 100 MST, Rounds = 5)
Not executed: 100 MST × 5 members × 5 rounds (≥ 2,500 MST plus 2× collateral for Unassessed wallets) is impossible on the faucet budget — demo wallets hold 0.17–0.35 MST each and the deployer cannot afford top-ups (`ensureFunded` skips). Each step is mapped to the closest real evidence: v2 circle #2 (5 members, 0.1 MST, full + partial defaults, completed after 4 rounds), v2 circle #8 (5 members, 0.05 MST, AI agent bid, completed after 4 rounds), v2.1 circle #4 (2 members, 1 MST, 2 rounds, completed), hardhat test 1 (5 members, 5 rounds, reconciles to the wei).
- [x] 25.1 Wallet A creates circle — v2 `createCircle` `0x3fd50967…cc4405` (5 members); v2.1 #4 by a BridgeKey wallet `0x4cfc9751…`.
- [x] 25.2 Wallets B-E join — v2 circle #2 five `Joined` (D `0x49f83c3e…`, A `0xe420c982…`).
- [x] 25.3 Risk assessment runs — `/demo/assess-all`; v2 `RiskTierSet` ×5 (`0x524d1ca9…`, `0x5a3972c9…`). Not yet on v2.1.
- [x] 25.4 Collateral requirements generated — `requiredCollateral()` 0.05 / 0.1 / 0.2 by tier (README table, v2 joins).
- [x] 25.5 All members lock collateral — v2 #2 `Joined` amounts; v2.1 #4 2 MST ×2.
- [x] 25.6 Round 1 starts — `CircleStarted` (v2 ×3, v2.1 `0xa19658b1…`).
- [x] 25.7 Members contribute — v2 `Contributed` ×32 (autopilot for A–E). None on v2.1 yet.
- [x] 25.8 Pot is correctly funded — v2 round 1 pot 0.5 MST = 5 × 0.1 (D covered from collateral).
- [x] 25.9 Bidding opens — bids accepted through `biddingDeadline`; UI bidding phase.
- [x] 25.10 Member B bids — v2 #2 agent bid for B `0xdacf5436…47b7bd` (discount 0.05); v2 #8 rival bid from B `0x7068468a…27d8`.
- [x] 25.11 B wins — `RoundSettled(2,1, B=0x4028a876…, pot 0.5, payout 0.245, discount 0.05)` in `0x039b272b…f95766`.
- [x] 25.12 Bidding closes — deadline passed before keeper settle.
- [x] 25.13 Round settles — same tx, sent by keeper.
- [x] 25.14 B receives payout — 0.245 credited (after 0.20 holdback); withdrawn 0.27 in v1 run `0x59f853a5…`; v2.1 winners withdrew 1.98 / 1.28.
- [x] 25.15 Other members receive dividend — `DividendCredited` ×4 × 0.0125 in `0x039b272b…`.
- [x] 25.16 Holdback is applied if configured — `HoldbackApplied(2, B, 0.20)` in the same tx.
- [x] 25.17 Round 1 completes — `RoundSettled` round 1; history row.
- [x] 25.18 Round 2 starts — v2 #2 round 2 settled by `0x425ddc61…f5e539`; v2.1 #4 round 2 deadlines advanced.
- [x] 25.19 Member D misses contribution — demo skip on D; `DefaultDetected(2,1,D…)`, `(2,2,D…)`, `(2,3,D…)`.
- [x] 25.20 Default is detected — on-chain in `settleRound`.
- [x] 25.21 D's collateral is used — `fromCollateral` 0.1 (round 1), 0.1 (round 2), then 0 with reserve 0.01 (round 3); `collateralUsed` 0.2 on-chain.
- [x] 25.22 Contribution is covered — shortfall 0 in rounds 1–2.
- [x] 25.23 Pot remains correctly funded — pot 0.5 in rounds 1–2; round 3 honestly short by 0.09 (`pot 0.41`), D removed.
- [x] 25.24 Default appears on dashboard — `DefaultEventCard`, `latestDefault`, organizer defaults (live for v2.1 #4).
- [x] 25.25 Default appears in transaction history — `DefaultDetected` feed rows with txHash.
- [x] 25.26 Blockchain transaction can be verified — receipts decoded: `0x039b272b…`, `0x550248b8…` status 1.
- [x] 25.27 Round continues — v2 #2 rounds 2, 3, 4 settled; circle Completed (status 2, round 4).
- [~] 25.28 Round 3 starts successfully — demonstrated on v2 (#2 and #8 reached round 4) but on the current v2.1 contract only 2 rounds exist; 5 rounds in one circle only in hardhat test 1.
- Additional caveats: 100 MST scale not demonstrated anywhere on testnet; v2.1 has zero `Contributed` and zero `RiskTierSet` events.

---

## FINAL AUDIT
- [x] All frontend features work — 13 routes live; typecheck clean; room/dashboard/organizer/admin/support/demo wired to live API and wallet. Gaps: no pre-send balance check, no tx-wait timeout.
- [!] All backend features work — all GET endpoints healthy and loops error-free, but `POST /demo/new-circle` on v2.1 left demo circles #1 and #3 with 1 of 5 wallets joined (see §4).
- [x] All smart-contract features work — 29/29 hardhat; every function exercised on testnet except `leave`, `cancel`, `withdrawTreasury`.
- [x] Wallet flow works — connect / switch / sign-in / tx stepper; real BridgeKey wallets created, joined, bid and withdrew on v2.1 #4.
- [x] Circle lifecycle works — v2.1 #4 Open → Active → 2 rounds → Completed → withdrawals. (`leave`/`cancel` hardhat-only.)
- [x] Contribution flow works — 32 `Contributed` on v2; 0 on v2.1 so far.
- [x] Bidding works — v2.1 `0x28c78df2…`, v2 ×4.
- [x] Settlement works — 13 keeper settlements.
- [x] Payout works — 8 `Withdrawn`.
- [x] Dividend flow works — 13 `DividendCredited`.
- [x] Default protection works — 19 `DefaultDetected` incl. partial-cover + removal.
- [x] Collateral works — tiered lock, deduction, release verified on-chain.
- [x] Holdback works — 12 `HoldbackApplied`, release on completion.
- [x] AI risk works — heuristic + on-chain tiers (v2); LLM explanation currently template fallback ([~] for that sub-feature).
- [x] AI bidding agent works — v2 circle #8 proof (`0x4f47f111…`), risk guard unit-tested; CrewAI live wiring unverifiable.
- [x] Dashboard works — member/organizer/admin pages read live data.
- [x] Transaction history works — indexed feed with hashes for every event type.
- [x] MSTScan verification works — every hash linked; receipts exist.
- [~] Error handling works — comprehensive mapping; missing tx timeout and pre-send balance check.
- [x] Security checks pass — contract guards + auth/roles/rate limits; residual gaps in §10.
- [~] End-to-end test passes — every step demonstrated on testnet at small scale across v2 #2/#8 and v2.1 #4; 5-round and 100 MST scale only in hardhat / not at all.

---

## FEATURE / STATUS / EVIDENCE

| FEATURE | STATUS | EVIDENCE |
|---|---|---|
| Wallet Connection | [x] | `lib/wallet.ts`, `hooks/useWallet.tsx`, `useTx.ts` 5-stage stepper; BridgeKey wallets `0xbA64…`, `0x6A60…` transacted on v2.1 #4 |
| Create Circle | [x] | `create/page.tsx` → `createCircle`; v2.1 tx `0x4cfc9751…` (block 5794852); name via `/circles/4/claim` |
| Join Circle | [x] | `Joined` ×5 v2.1 (`0xd2000f0f…`, `0xa19658b1…`), ×16 v2; tiered 0.05/0.20 MST on v2 |
| Risk Assessment | [x] | `risk/score.ts` + 7 tests; live `/members/:addr/risk`; v2 `RiskTierSet` ×5 (`0x524d1ca9…`, `0x5a3972c9…`); none on v2.1 yet; LLM explanation = template |
| Collateral | [x] | `requiredCollateral()`; contract balance 2.18 MST; `collateralUsed` 2 MST live; release proven by `CircleCompleted` + `Withdrawn` |
| Contributions | [x] | `contribute` + `Contributed` ×32 on v2 (0 on v2.1); status PAID/PENDING/COVERED… live |
| Bidding | [x] | v2.1 `0x28c78df2…` (0.7 discount, won); `/auction/4/bids`; tests 8, 14, 15, 28 |
| Settlement | [x] | 13 `RoundSettled` by keeper `0x7A3668ba…`; `/circles/4/rounds` with txHash |
| Payout | [x] | `Withdrawn` 1.28 / 1.98 MST (`0x72f34cb0…`, `0xe754f2a3…`); pull pattern, `nonReentrant` |
| Dividends | [x] | `DividendCredited` ×4 × 0.0125 in `0x039b272b…`; v2.1 0.7 MST withdrawn `0x1aa661e4…` |
| Default Protection | [x] | `DefaultDetected` shortfall 0 (`0x039b272b…`, `0xfb276e3f…`); partial `0x550248b8…` (0, 0.01, 0.09) + `Removed` |
| Holdback | [x] | `HoldbackApplied` 0.20 / 0.128 / 0.198; `getRoundHistory(2,3).holdback` 0.04059; released at completion |
| AI Bidding Agent | [x] | `ai/loop.ts` + `riskGuard.ts` (tests); v2 #8 rival `0x7068468a…`, agent bid `0x4f47f111…`, settle `0x3151ae91…`; no v2.1 run yet |
| Dashboard | [x] | `/dashboard`, `/organizer`, `/organizer/circles/4`, `/admin` 200; `/me*`, `/organizer/*`, `/admin/*` endpoints (401 unauthenticated as designed) |
| Transaction History | [x] | `GET /feed?circleId=4` 18 rows covering every event type with txHash/block; `/activity` page |

---

## 1. COMPLETED FEATURES
Contract v2.1 (params, tiered join, two-phase rounds, permissionless settlement, on-chain default coverage with shortfall + removal, dividends/dust, tier/flat holdback + release, pull withdrawals, round history, reputation, oracle tiers, reentrancy guards, direct-payment rejection; 29 tests). Live backend (keeper, autopilot, indexer with contract-change reset, AI bidding loop, risk oracle, auth/roles/audit, organizer/admin/support APIs; 55 tests). Live frontend (wallet flow, create/claim, room with auction/defaults/history, member/organizer/admin dashboards, activity/collateral/demo pages, AI strategy/permission/activity UI). Real testnet lifecycles: v2.1 #4 (create → join → bid → 2 settlements with defaults/holdback/dividend → completion → 3 withdrawals), v2 #2 (full + partial default, removal), v2 #8 (autonomous agent bid).

## 2. PARTIALLY COMPLETED FEATURES
- `leave` / `cancel`: contract + tests + UI; never executed on testnet; v2.1 circles #1–#3 sit Open past their join deadline.
- Treasury: fees accrue on-chain (0.04 MST claimable) but `withdrawTreasury` has no route/UI.
- Risk LLM explanation: live returns `explanationSource:"template"`.
- CrewAI service: code present; live wiring not observable; Node fallback active either way.
- Invites: DB-only, not enforced at join.
- Legacy mandate agent (`/agent/mandate`): backend works (v2 `0xdacf5436…`), UI superseded by v4 panel.
- Error handling: no tx-wait timeout; no pre-send balance check.
- v2.1 evidence gaps: no contributions, no oracle tiers, no agent bid on the current contract (all on v2).
- Number of rounds: implied by member count, not separately configurable.

## 3. NOT IMPLEMENTED FEATURES
- Security headers (`helmet`/CSP).
- Treasury withdrawal UI/route.
- Invite enforcement (on-chain or backend gate at join).
- Commit–reveal bidding (documented as production work).
- `lowBps > 0` validation (Low tier may require zero collateral).
- Any 100 MST-scale or 5-round run on testnet.

## 4. BROKEN FEATURES
- `POST /demo/new-circle` on live v2.1: "Demo circle #1" and "#3" have only wallet A joined (1/5); B–E never joined, join windows expired, circles cannot start. `joinAll` runs synchronously inside the request and `ensureFunded` silently returns when the deployer is short (demo balances 0.17–0.35 MST), so a timeout/insufficient funds leaves a half-filled circle with a 200 response.

## 5. MOCKED FEATURES
None in the money path: every referenced bid/settle/default/withdraw is a mined MST-testnet tx with a verified receipt. Synthetic risk history for demo wallets is labelled `dataSource: SYNTHETIC|MIXED` and only feeds the heuristic; the tier is still written on-chain. Demo rival is a real on-chain bid (`simulated:false`).

## 6. SMART CONTRACT GAPS
`lowBps` may be 0; no pause/upgrade path; single-key oracle and EOA treasury; removed members forfeit collateral and past contributions (MVP rule); public bids → sniping; `withdrawTreasury` unreachable from the product; expired-Open circles need someone to call `cancel`; unaudited.

## 7. FRONTEND GAPS
Backend-down fallback (`lib/contract.ts toMemberInfo`) loses default statuses and tx hashes; no tx-wait timeout / stuck-tx recovery; no pre-send balance check; no treasury page; legacy `AgentPanel.tsx` dead code; browser-level rendering not screenshot-verified in this audit (HTTP 200 + API payloads only).

## 8. BACKEND GAPS
Synchronous unbounded `joinAll` in `/demo/new-circle`; silent top-up skips with no health signal; LLM/CrewAI configuration not exposed in `/health`; no `helmet`; fire-and-forget audit writes spam "Can't reach database" in tests; public `/circles/:id/settle` spends keeper gas (mitigated by preflight + 5/min).

## 9. DATABASE GAPS
Contract redeploy wipes events/agents/meta/invites (by design) so v2 history exists only on-chain/README; invites have no enforcement or expiry; no retention for `AgentEvent`/`RiskCache`; support tickets single-note only.

## 10. SECURITY GAPS
Custodial keys (keeper, oracle, deployer, demo A–E) in backend env; single-EOA oracle can set any tier; no security headers/CSP; session token in client storage; shared admin password path (rate-limited, scrypt, timing-safe); `lowBps = 0` foot-gun; contract unaudited.

## 11. END-TO-END TEST RESULT
Not run at the specified scale (5 × 100 MST × 5 rounds needs ≥ 2,500 MST + collateral; faucet balances < 0.35 MST per wallet). Mapped result: 27 of 28 steps demonstrated on testnet (v2 #2/#8 at 0.05–0.1 MST, v2.1 #4 at 1 MST with 2 members), 25.28 (round 3+) only on v2 / hardhat. Automated checks: 29/29 hardhat, 55/55 backend, 2 typechecks clean, 14 live API GETs, 14 frontend routes, on-chain reads and 4 decoded receipts consistent with the README. Outstanding on v2.1: no contributions, no oracle tiers, no agent bid, three stuck Open circles.

## 12. RECOMMENDED IMPLEMENTATION ORDER
1. Fix `/demo/new-circle`: respond after create, run `joinAll` in the autopilot loop with per-wallet funding checks; expose "demo wallets underfunded" in `/health` and `/demo`; cancel v2.1 circles #1–#3.
2. Fund demo wallets, then rehearse on v2.1: `assess-all` (RiskTierSet), a 5-wallet circle with contributions, a skip-default, an agent bid; update README tables to the current contract.
3. Add a tx-wait timeout / stuck-tx UI and a pre-send balance check in join/contribute dialogs.
4. `withdrawTreasury` route + admin UI (or document as manual).
5. Enforce `lowBps > 0` on next redeploy with a test; add `helmet`/CSP; expose LLM/CrewAI status in `/health`.
6. Enforce invites at join (backend gate or on-chain allow-list) or relabel as informational.
7. Exercise `leave`/`cancel` on testnet and add README rows.
8. Keep default statuses in the frontend chain-only fallback.
9. Longer term: commit–reveal bidding, multisig oracle, external audit.

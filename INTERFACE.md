# ChitChain — Contract Interface (v3, deployed as contract v2)

Reference for `ChitChain.sol` on **MST Testnet**. Frontend, backend and tests should code against this file. Matches `ARCHITECTURE.md` v2.

- Language: Solidity `^0.8.20` · Libraries: OpenZeppelin `ReentrancyGuard`
- Currency: native **MST** (all amounts in wei, 18 decimals)
- RPC: `https://testnetrpc.mstblockchain.com` · Chain ID: `91562037` · Explorer: `https://testnet.mstscan.com`
- Contract address: see `deployments/mstTestnet.json` and README
- Currency: native **MST** testnet coin (18 decimals, no monetary value)

---

## 1. Solidity interface

The file `contracts/IChitChain.sol` is the source of truth; reproduced here:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IChitChain v2 — types, events, errors and function signatures (see INTERFACE.md)
interface IChitChain {
    // ───────────────────────── Types ─────────────────────────
    enum Status { Open, Active, Completed, Cancelled }
    enum Tier   { Unassessed, Low, Medium, High } // Unassessed = 0 → treated as High

    /// @notice Everything a circle creator configures. Passed as calldata to avoid stack-too-deep.
    struct CircleParams {
        uint256 contribution;          // per member per round (wei)
        uint256 baseCollateral;        // Medium-tier reference; must be >= contribution
        uint8   maxMembers;            // 3..20
        uint32  contributionDuration;  // seconds contributions stay open each round (demo: 30)
        uint32  biddingDuration;       // seconds bidding stays open after contributions close (demo: 30)
        uint32  joinWindow;            // seconds to fill the circle
        uint16  feeBps;                // <= 300; goes to circle reserve, leftover to treasury
        uint16  holdbackBps;           // 0..10000; flat share of a winner's payout locked until completion
        uint16  maxDiscountBps;        // 0..5000; max bid discount as share of expected pot
        uint16  lowBps;                // collateral multipliers (of baseCollateral), low <= medium <= high
        uint16  mediumBps;
        uint16  highBps;               // Unassessed uses highBps
    }

    struct CircleView {
        address creator;
        uint256 contribution;
        uint256 baseCollateral;
        uint8   maxMembers;
        uint32  contributionDuration;
        uint32  biddingDuration;
        uint64  joinDeadline;
        uint16  feeBps;
        uint16  holdbackBps;
        uint16  maxDiscountBps;
        uint16  lowBps;
        uint16  mediumBps;
        uint16  highBps;
        Status  status;
        uint8   round;
        uint64  contributionDeadline;  // current round: contributions close
        uint64  roundDeadline;         // current round: bidding closes (= settle-able time)
        uint256 reserve;
        uint8   memberCount;
    }

    struct MemberView {
        bool    joined;
        Tier    tier;            // snapshot at join
        bool    hasWon;
        bool    removed;
        uint256 collateral;      // currently locked (incl. holdback)
        uint256 claimable;       // pull balance
        bool    paidThisRound;
        uint256 bidThisRound;    // discount offered this round (0 = none)
        uint32  defaults;        // missed contributions in this circle
        uint256 collateralUsed;  // total collateral consumed to cover misses in this circle
    }

    struct RoundView {
        uint8   round;
        uint64  contributionDeadline;
        uint64  biddingDeadline;
        uint256 expectedPot;     // contribution × active members
        uint256 collected;       // contributions received so far this round
        address bestBidder;
        uint256 bestDiscount;
        uint256 maxDiscount;     // maxDiscountBps of expectedPot
    }

    struct RoundRecord {          // written at settlement, one per round
        address winner;          // address(0) = pot shared as dividends
        uint64  settledAt;
        uint256 pot;
        uint256 payout;          // credited to winner after holdback
        uint256 discount;
        uint256 fee;
        uint256 holdback;
    }

    struct Reputation {
        uint32 paidOnTime;
        uint32 missed;
        uint32 circlesCompleted;
        uint32 circlesRemoved;
    }

    // ───────────────────────── Events ─────────────────────────
    event CircleCreated(uint256 indexed circleId, address indexed creator, uint256 contribution, uint8 maxMembers, uint32 contributionDuration, uint32 biddingDuration, uint64 joinDeadline);
    event Joined(uint256 indexed circleId, address indexed member, Tier tier, uint256 collateral);
    event Left(uint256 indexed circleId, address indexed member, uint256 refund);
    event CircleStarted(uint256 indexed circleId, uint64 contributionDeadline, uint64 biddingDeadline);
    event CircleCancelled(uint256 indexed circleId);
    event Contributed(uint256 indexed circleId, uint8 indexed round, address indexed member, uint256 amount);
    event BidPlaced(uint256 indexed circleId, uint8 indexed round, address indexed member, uint256 discount);
    /// @notice A member missed a contribution. shortfall = required − fromCollateral − fromReserve (the real hole in the pot).
    event DefaultDetected(uint256 indexed circleId, uint8 indexed round, address indexed member, uint256 required, uint256 fromCollateral, uint256 fromReserve, uint256 shortfall);
    event Removed(uint256 indexed circleId, uint8 indexed round, address indexed member);
    event HoldbackApplied(uint256 indexed circleId, address indexed member, uint256 amount);
    event RoundSettled(uint256 indexed circleId, uint8 indexed round, address indexed winner, uint256 pot, uint256 payout, uint256 discount, uint256 fee);
    event DividendCredited(uint256 indexed circleId, uint8 indexed round, address indexed member, uint256 amount);
    event CircleCompleted(uint256 indexed circleId);
    event Withdrawn(uint256 indexed circleId, address indexed member, uint256 amount);
    event RiskTierSet(address indexed member, Tier tier);

    // ───────────────────────── Errors ─────────────────────────
    error InvalidParams();
    error NotOpen();
    error NotActive();
    error AlreadyJoined();
    error NotMember();
    error CircleFull();
    error JoinWindowClosed();
    error JoinWindowStillOpen();
    error WrongAmount(uint256 expected, uint256 sent);
    error AlreadyPaid();
    error ContributionClosed();
    error BiddingClosed();
    error BiddingNotOver();
    error NotEligibleToBid();
    error BidTooHigh(uint256 max);
    error BidNotHigher(uint256 currentBest);
    error MemberRemoved();
    error NothingToWithdraw();
    error OnlyOracle();
    error OnlyTreasury();
    error DirectPaymentRejected();

    // ───────────────────────── Write ─────────────────────────
    function createCircle(CircleParams calldata p) external returns (uint256 circleId);
    function join(uint256 circleId) external payable;
    function leave(uint256 circleId) external;
    function cancel(uint256 circleId) external;
    function contribute(uint256 circleId) external payable;
    function placeBid(uint256 circleId, uint256 discount) external;
    function settleRound(uint256 circleId) external;
    function withdraw(uint256 circleId) external;
    function withdrawTreasury() external;
    function setRiskTier(address member, Tier tier) external;

    // ───────────────────────── Read ─────────────────────────
    function circleCount() external view returns (uint256);
    function getCircle(uint256 circleId) external view returns (CircleView memory);
    function getMembers(uint256 circleId) external view returns (address[] memory);
    function getMember(uint256 circleId, address member) external view returns (MemberView memory);
    function getRound(uint256 circleId) external view returns (RoundView memory);
    function getRoundHistory(uint256 circleId, uint8 round) external view returns (RoundRecord memory);
    function requiredCollateral(address member, uint256 circleId) external view returns (uint256);
    function riskTier(address member) external view returns (Tier);
    function reputation(address member) external view returns (Reputation memory);
    function treasuryClaimable() external view returns (uint256);
    function riskOracle() external view returns (address);
    function treasury() external view returns (address);
}
```

Constructor: `constructor(address riskOracle, address treasury)`.

---

## 2. Rules at a glance

| Rule | Value |
|---|---|
| Members per circle | 3–20 |
| Rounds | Until every active member has won (≤ maxMembers) |
| Round phases | contributions open for `contributionDuration`, then bidding stays open for `biddingDuration` (bids accepted from round start); `settleRound` after the bidding deadline |
| Pre-win collateral | `baseCollateral × {Low lowBps, Medium mediumBps, High/Unassessed highBps} / 10000` (defaults 0.5× / 1× / 2×, per circle) |
| Post-win security (holdback) | `max(tierGap, payout × holdbackBps / 10000)`, capped at payout, where `tierGap = owed × {Low 50%, Medium 75%, High/Unassessed 100%} − collateral` and `owed = contribution × active members who haven't won` |
| Max bid discount | `maxDiscountBps` of expected pot (≤ 50%, default 40%) |
| Tie-break | Earliest bid (new bid must be strictly higher) |
| No bids | First eligible member in join order wins |
| No eligible member | Pot shared as dividends |
| Missed payment | `DefaultDetected(required, fromCollateral, fromReserve, shortfall)`: collateral → then reserve; if collateral < due the member is removed; `shortfall` is the real hole in the pot (never hidden) |
| Fee | `feeBps` of pot → circle reserve → leftover to treasury at completion |
| Dividend dust | To first eligible recipient in join order |
| All payouts | Pull only via `withdraw` |

---

## 3. State machine

```
            createCircle
                 │
                 ▼
   ┌──────────  OPEN  ──────────┐
   │ join / leave               │ joinDeadline passed & not full
   │                            ▼
   │ last seat filled       CANCELLED ──► withdraw refunds
   ▼
 ACTIVE ──► round r: contribute (≤ contributionDeadline) · placeBid (≤ biddingDeadline) ──► settleRound
   ▲                                                            │
   └──────────────── more members still to win ◄───────────────┘
                                                                │ all active members have won
                                                                ▼
                                                           COMPLETED ──► withdraw (payouts + collateral)
```

---

## 4. Who calls what

| Caller | Functions | From |
|---|---|---|
| Member | `join`, `leave`, `contribute`, `placeBid`, `withdraw` | Frontend via **BridgeKey** |
| Anyone / creator | `createCircle`, `cancel`, `settleRound` | Frontend or keeper |
| Keeper (backend) | `settleRound` | MST SDK / ethers v6 |
| Risk oracle (backend) | `setRiskTier` | MST SDK / ethers v6 |
| AI bidding agent (backend) | `placeBid` (from custodial demo agent wallet) | MST SDK / ethers v6 |
| Treasury | `withdrawTreasury` | Admin script |

---

## 5. Usage examples (ethers v6)

```ts
import { BrowserProvider, Contract, parseEther } from "ethers";
import abi from "./ChitChain.abi.json";

// VERIFY: BridgeKey's injected provider name
const provider = new BrowserProvider((window as any).ethereum);
const signer = await provider.getSigner();
const chit = new Contract(process.env.NEXT_PUBLIC_CHITCHAIN_ADDRESS!, abi, signer);

// Create: 1 MST per round, 5 members, 30 s contributions + 30 s bidding, 10 min to fill, 1% fee,
// 1 MST base collateral, 10% flat holdback, 40% max discount, 0.5×/1×/2× collateral multipliers
const tx = await chit.createCircle({
  contribution: parseEther("1"), baseCollateral: parseEther("1"), maxMembers: 5,
  contributionDuration: 30, biddingDuration: 30, joinWindow: 600, feeBps: 100,
  holdbackBps: 1000, maxDiscountBps: 4000, lowBps: 5000, mediumBps: 10000, highBps: 20000,
});
const rc = await tx.wait();

// Join with the exact required collateral
const need = await chit.requiredCollateral(await signer.getAddress(), id);
await (await chit.join(id, { value: need })).wait();

// Contribute this round
const c = await chit.getCircle(id);
await (await chit.contribute(id, { value: c.contribution })).wait();

// Bid: accept 4.5 of a 5 MST pot → discount 0.5 (UI shows "payout I'd accept"; contract stores the discount)
await (await chit.placeBid(id, parseEther("0.5"))).wait();

// Withdraw payouts / dividends / refunds
await (await chit.withdraw(id)).wait();

// Explorer link — VERIFY path format
const link = `${process.env.NEXT_PUBLIC_EXPLORER}/tx/${tx.hash}`;
```

Listening for the live feed (backend, polling):
```ts
const logs = await chit.queryFilter("*", fromBlock, "latest");
for (const l of logs) { /* store l.eventName, l.args, l.transactionHash */ }
```

Decoding custom errors in the UI:
```ts
try { await chit.contribute(id, { value }); }
catch (e: any) {
  const parsed = chit.interface.parseError(e.data); // e.g. WrongAmount(expected, sent)
  toast.error(parsed?.name ?? "Transaction failed");
}
```

---

## 6. Event → UI mapping

| Event | UI effect |
|---|---|
| `Joined` | Member card appears with tier badge + collateral bar |
| `CircleStarted` | Countdown starts |
| `Contributed` | ✓ on member card, pot counter rises |
| `BidPlaced` | Bid shown in auction panel; agent reason if placed by agent |
| `DefaultDetected` | Default event card: required / used / from reserve / shortfall; "Pot fully funded" only when shortfall = 0 |
| `Removed` | Member card greyed out |
| `HoldbackApplied` | Winner's collateral bar rises, "secured" tag |
| `RoundSettled` | Winner banner, payout + discount shown, MSTScan link |
| `DividendCredited` | Claimable balance updates |
| `CircleCompleted` | Final summary + "Withdraw all" button |
| `RiskTierSet` | Profile tier updates |

---

## 7. Invariants (assert in tests)

1. `contract balance == Σ collateral + Σ claimable + Σ reserve + treasuryClaimable + current-round collected`
2. A member is paid out **at most once** per circle.
3. `settleRound` can succeed **once per round** and only after the bidding deadline.
4. A removed member can never win or receive dividends afterwards.
5. Tier used for a circle never changes after join.

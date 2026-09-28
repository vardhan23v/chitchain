# ChitChain — Contract Interface (v2)

Reference for `ChitChain.sol` on **MST Testnet**. Frontend, backend and tests should code against this file. Matches `ARCHITECTURE.md` v2.

- Language: Solidity `^0.8.20` · Libraries: OpenZeppelin `ReentrancyGuard`
- Currency: native **MSTC** (all amounts in wei, 18 decimals)
- RPC: `https://testnetrpc.mstblockchain.com` · Chain ID: `VERIFY` · Explorer: `https://mstscan.com`
- Contract address: `TBD after deploy` (put in README + `.env`)

---

## 1. Solidity interface

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IChitChain {
    // ───────────────────────── Types ─────────────────────────
    enum Status { Open, Active, Completed, Cancelled }
    enum Tier   { Unassessed, Low, Medium, High } // Unassessed = 0 → treated as High

    struct CircleView {
        address creator;
        uint256 contribution;
        uint8   maxMembers;
        uint32  roundDuration;
        uint64  joinDeadline;
        uint16  feeBps;
        uint256 baseCollateral;
        Status  status;
        uint8   round;
        uint64  roundDeadline;
        uint256 reserve;
        uint8   memberCount;
    }

    struct MemberView {
        bool    joined;
        Tier    tier;        // snapshot at join
        bool    hasWon;
        bool    removed;
        uint256 collateral;
        uint256 claimable;
        bool    paidThisRound;
        uint256 bidThisRound;
    }

    struct RoundView {
        uint8   round;
        uint64  deadline;
        uint256 expectedPot;   // contribution × active members
        uint256 collected;     // contributions received so far
        address bestBidder;
        uint256 bestDiscount;
        uint256 maxDiscount;   // 40% of expectedPot
    }

    struct Reputation {
        uint32 paidOnTime;
        uint32 missed;
        uint32 circlesCompleted;
        uint32 circlesRemoved;
    }

    // ───────────────────────── Events ─────────────────────────
    event CircleCreated(uint256 indexed circleId, address indexed creator, uint256 contribution, uint8 maxMembers, uint32 roundDuration, uint64 joinDeadline);
    event Joined(uint256 indexed circleId, address indexed member, Tier tier, uint256 collateral);
    event Left(uint256 indexed circleId, address indexed member, uint256 refund);
    event CircleStarted(uint256 indexed circleId, uint64 firstDeadline);
    event CircleCancelled(uint256 indexed circleId);
    event Contributed(uint256 indexed circleId, uint8 indexed round, address indexed member, uint256 amount);
    event BidPlaced(uint256 indexed circleId, uint8 indexed round, address indexed member, uint256 discount);
    event Covered(uint256 indexed circleId, uint8 indexed round, address indexed member, uint256 fromCollateral, uint256 fromReserve);
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
    error RoundClosed();
    error RoundNotOver();
    error NotEligibleToBid();
    error BidTooHigh(uint256 max);
    error BidNotHigher(uint256 currentBest);
    error MemberRemoved();
    error NothingToWithdraw();
    error OnlyOracle();
    error OnlyTreasury();
    error DirectPaymentRejected();

    // ───────────────────────── Write ─────────────────────────
    /// @notice Create a circle. Requires baseCollateral ≥ contribution, 3 ≤ maxMembers ≤ 20, feeBps ≤ 300.
    function createCircle(
        uint256 contribution,
        uint8   maxMembers,
        uint32  roundDuration,
        uint32  joinWindow,
        uint16  feeBps,
        uint256 baseCollateral
    ) external returns (uint256 circleId);

    /// @notice Join by locking pre-win collateral. msg.value must equal requiredCollateral(msg.sender, circleId).
    ///         Snapshots the caller's tier. Starts the circle when full.
    function join(uint256 circleId) external payable;

    /// @notice Leave an Open circle; collateral moves to claimable.
    function leave(uint256 circleId) external;

    /// @notice Cancel a circle that did not fill before joinDeadline; everyone's collateral → claimable.
    function cancel(uint256 circleId) external;

    /// @notice Pay this round's contribution. msg.value must equal contribution.
    function contribute(uint256 circleId) external payable;

    /// @notice Offer a discount (portion of pot given up) to win this round.
    ///         Must be > current best and ≤ maxDiscount. Only active members who haven't won.
    function placeBid(uint256 circleId, uint256 discount) external;

    /// @notice Settle the current round after its deadline. Callable by anyone (keeper in MVP).
    ///         Covers missed payments, picks winner, applies holdback, credits dividends, advances or completes.
    function settleRound(uint256 circleId) external;

    /// @notice Pull the caller's claimable balance for a circle.
    function withdraw(uint256 circleId) external;

    /// @notice Treasury pulls accumulated fees/reserve leftovers.
    function withdrawTreasury() external;

    /// @notice Risk oracle sets a member's tier for FUTURE joins.
    function setRiskTier(address member, Tier tier) external;

    // ───────────────────────── Read ─────────────────────────
    function circleCount() external view returns (uint256);
    function getCircle(uint256 circleId) external view returns (CircleView memory);
    function getMembers(uint256 circleId) external view returns (address[] memory);
    function getMember(uint256 circleId, address member) external view returns (MemberView memory);
    function getRound(uint256 circleId) external view returns (RoundView memory);
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
| Pre-win collateral | `baseCollateral × {Unassessed 2, Low 0.5, Medium 1, High 2}` |
| Post-win security (holdback) | `owed × {Unassessed 100%, High 100%, Medium 75%, Low 50%}` where `owed = contribution × active members who haven't won` |
| Max bid discount | 40% of expected pot |
| Tie-break | Earliest bid (new bid must be strictly higher) |
| No bids | First eligible member in join order wins |
| No eligible member | Pot shared as dividends |
| Missed payment | Collateral → then reserve → else member removed |
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
 ACTIVE ──► round r: contribute · placeBid ──► deadline ──► settleRound
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

// Create: 1 MSTC per round, 5 members, 30 s rounds, 10 min to fill, 1% fee, 1 MSTC base collateral
const tx = await chit.createCircle(parseEther("1"), 5, 30, 600, 100, parseEther("1"));
const rc = await tx.wait();

// Join with the exact required collateral
const need = await chit.requiredCollateral(await signer.getAddress(), id);
await (await chit.join(id, { value: need })).wait();

// Contribute this round
const c = await chit.getCircle(id);
await (await chit.contribute(id, { value: c.contribution })).wait();

// Bid: give up 0.5 MSTC of the pot to win now
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
| `Covered` | ⚠ on member card, collateral bar drops, "pot still full" toast |
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
3. `settleRound` can succeed **once per round** and only after `roundDeadline`.
4. A removed member can never win or receive dividends afterwards.
5. Tier used for a circle never changes after join.

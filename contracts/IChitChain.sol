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

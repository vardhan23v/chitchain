// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title IChitChain — types, events, errors and function signatures (see INTERFACE.md)
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
    function createCircle(uint256 contribution, uint8 maxMembers, uint32 roundDuration, uint32 joinWindow, uint16 feeBps, uint256 baseCollateral) external returns (uint256 circleId);
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
    function requiredCollateral(address member, uint256 circleId) external view returns (uint256);
    function riskTier(address member) external view returns (Tier);
    function reputation(address member) external view returns (Reputation memory);
    function treasuryClaimable() external view returns (uint256);
    function riskOracle() external view returns (address);
    function treasury() external view returns (address);
}

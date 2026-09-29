// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IChitChain} from "./IChitChain.sol";

/// @title ChitChainBase — storage, constants, views and pure helpers.
/// @dev Split across files only for readability; exactly one contract (ChitChain) is deployed.
abstract contract ChitChainBase is IChitChain {
    struct Circle {
        address creator;
        CircleParams params;
        uint64  joinDeadline;
        Status  status;
        uint8   round;
        uint64  contributionDeadline;
        uint64  biddingDeadline;
        uint256 reserve;
        uint256 collected;      // contributions this round; after close = the assembled pot (incl. collateral cover)
        address[] members;      // join order (deterministic tie-breaks, recipient rotation)
        Phase   phase;          // v2.2: Contributing → Deciding → (Auction only after a decline)
        uint64  decisionDeadline;
        address recipient;      // designated recipient of the current round, set when contributions close
    }

    struct MemberState {
        bool    joined;
        Tier    tier;           // snapshot at join
        bool    hasWon;
        bool    removed;
        uint256 collateral;
        uint256 claimable;
        uint32  defaults;
        uint256 collateralUsed;
    }

    uint8   public constant MIN_MEMBERS = 2;
    uint8   public constant MAX_MEMBERS = 20;
    uint16  public constant MAX_FEE_BPS = 300;
    uint16  public constant MAX_DISCOUNT_BPS = 5000;
    uint16  public constant BPS = 10_000;

    address public immutable override riskOracle;
    address public immutable override treasury;
    uint256 public override treasuryClaimable;
    uint256 internal _circleCount;

    mapping(uint256 => Circle) internal _circles;
    mapping(uint256 => mapping(address => MemberState)) internal _ms;
    mapping(uint256 => mapping(uint8 => mapping(address => bool))) internal _paid;
    mapping(uint256 => mapping(uint8 => mapping(address => uint256))) internal _bidOf;
    mapping(uint256 => mapping(uint8 => address)) internal _bestBidder;
    mapping(uint256 => mapping(uint8 => uint256)) internal _bestDiscount;
    mapping(uint256 => mapping(uint8 => RoundRecord)) internal _history;
    mapping(address => Tier) public override riskTier;
    mapping(address => Reputation) internal _reputation;

    constructor(address riskOracle_, address treasury_) {
        if (riskOracle_ == address(0) || treasury_ == address(0)) revert InvalidParams();
        riskOracle = riskOracle_;
        treasury = treasury_;
    }

    // ───────────────────────── Views ─────────────────────────
    function circleCount() external view override returns (uint256) { return _circleCount; }

    function getCircle(uint256 circleId) external view override returns (CircleView memory v) {
        Circle storage c = _circles[circleId];
        CircleParams storage p = c.params;
        v.creator = c.creator;
        v.contribution = p.contribution;
        v.baseCollateral = p.baseCollateral;
        v.maxMembers = p.maxMembers;
        v.contributionDuration = p.contributionDuration;
        v.biddingDuration = p.biddingDuration;
        v.joinDeadline = c.joinDeadline;
        v.feeBps = p.feeBps;
        v.holdbackBps = p.holdbackBps;
        v.maxDiscountBps = p.maxDiscountBps;
        v.lowBps = p.lowBps;
        v.mediumBps = p.mediumBps;
        v.highBps = p.highBps;
        v.status = c.status;
        v.round = c.round;
        v.contributionDeadline = c.contributionDeadline;
        v.roundDeadline = c.biddingDeadline;
        v.reserve = c.reserve;
        v.memberCount = uint8(c.members.length);
        v.phase = c.phase;
        v.decisionDeadline = c.decisionDeadline;
        v.recipient = c.recipient;
    }

    function getMembers(uint256 circleId) external view override returns (address[] memory) {
        return _circles[circleId].members;
    }

    function getMember(uint256 circleId, address member) external view override returns (MemberView memory v) {
        MemberState storage m = _ms[circleId][member];
        uint8 round = _circles[circleId].round;
        v = MemberView(m.joined, m.tier, m.hasWon, m.removed, m.collateral, m.claimable,
            _paid[circleId][round][member], _bidOf[circleId][round][member], m.defaults, m.collateralUsed);
    }

    function getRound(uint256 circleId) external view override returns (RoundView memory v) {
        Circle storage c = _circles[circleId];
        uint8 round = c.round;
        v = RoundView(round, c.contributionDeadline, c.biddingDeadline,
            c.params.contribution * _activeCount(c, circleId), c.collected,
            _bestBidder[circleId][round], _bestDiscount[circleId][round], _maxDiscount(c, circleId),
            c.phase, c.recipient, c.decisionDeadline, c.phase == Phase.Contributing ? 0 : c.collected);
    }

    function getRoundHistory(uint256 circleId, uint8 round) external view override returns (RoundRecord memory) {
        return _history[circleId][round];
    }

    function requiredCollateral(address member, uint256 circleId) external view override returns (uint256) {
        Circle storage c = _circles[circleId];
        MemberState storage m = _ms[circleId][member];
        Tier tier = m.joined ? m.tier : riskTier[member];
        return _preWin(c, tier);
    }

    function reputation(address member) external view override returns (Reputation memory) {
        return _reputation[member];
    }

    // ───────────────────────── Pure / view helpers ─────────────────────────
    /// @dev Pre-win collateral = baseCollateral × tier multiplier. Unassessed pays the High multiplier.
    function _preWin(Circle storage c, Tier tier) internal view returns (uint256) {
        CircleParams storage p = c.params;
        uint16 bps = tier == Tier.Low ? p.lowBps : tier == Tier.Medium ? p.mediumBps : p.highBps;
        return (p.baseCollateral * bps) / BPS;
    }

    /// @dev Post-win security floor: share of remaining dues a winner must keep locked.
    function _coveragePct(Tier tier) internal pure returns (uint256) {
        if (tier == Tier.Low) return 50;
        if (tier == Tier.Medium) return 75;
        return 100;
    }

    /// @dev Max discount = maxDiscountBps of the pot: the expected pot while contributing, the assembled pot after close.
    function _maxDiscount(Circle storage c, uint256 circleId) internal view returns (uint256) {
        uint256 base = c.phase == Phase.Contributing ? c.params.contribution * _activeCount(c, circleId) : c.collected;
        return (base * c.params.maxDiscountBps) / BPS;
    }

    /// @dev Rotation: the first member who has not won and is not removed, starting at position (round − 1) mod n in
    ///      join order and wrapping. Round 1 → A, round 2 → B, …; members who already won are skipped.
    function _recipientFor(Circle storage c, uint256 circleId, uint8 round) internal view returns (address) {
        uint256 n = c.members.length;
        if (n == 0) return address(0);
        uint256 start = (uint256(round) - 1) % n;
        for (uint256 k = 0; k < n; k++) {
            address a = c.members[(start + k) % n];
            MemberState storage m = _ms[circleId][a];
            if (!m.removed && !m.hasWon) return a;
        }
        return address(0);
    }

    function _activeCount(Circle storage c, uint256 circleId) internal view returns (uint256 n) {
        for (uint256 i = 0; i < c.members.length; i++) {
            if (!_ms[circleId][c.members[i]].removed) n++;
        }
    }

    function _eligibleCount(Circle storage c, uint256 circleId) internal view returns (uint256 n) {
        for (uint256 i = 0; i < c.members.length; i++) {
            MemberState storage m = _ms[circleId][c.members[i]];
            if (!m.removed && !m.hasWon) n++;
        }
    }

    /// @dev Opens the contribution phase of the current round. Decision and auction deadlines are set later, only
    ///      when the pot is ready and only if the recipient declines.
    function _startRound(Circle storage c) internal {
        c.phase = Phase.Contributing;
        c.contributionDeadline = uint64(block.timestamp) + c.params.contributionDuration;
        c.decisionDeadline = 0;
        c.biddingDeadline = 0;
        c.recipient = address(0);
    }
}

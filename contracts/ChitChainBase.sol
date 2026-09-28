// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IChitChain} from "./IChitChain.sol";

/// @title ChitChainBase — storage, views and pure/internal helpers shared by ChitChain.
/// @dev Split out only to keep each file readable; there is exactly one deployed contract (ChitChain).
abstract contract ChitChainBase is IChitChain {
    // ───────────────────────── Storage ─────────────────────────
    struct Circle {
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
        uint256 collected;      // contributions received in the current round
        address[] members;      // join order (deterministic tie-breaks)
    }

    struct MemberState {
        bool    joined;
        Tier    tier;           // snapshot at join
        bool    hasWon;
        bool    removed;
        uint256 collateral;
        uint256 claimable;
    }

    uint8   public constant MIN_MEMBERS = 3;
    uint8   public constant MAX_MEMBERS = 20;
    uint16  public constant MAX_FEE_BPS = 300;
    uint256 public constant MAX_DISCOUNT_PCT = 40;

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
    mapping(address => Tier) public override riskTier;
    mapping(address => Reputation) internal _reputation;

    // ───────────────────────── Views ─────────────────────────
    function circleCount() external view override returns (uint256) { return _circleCount; }

    function getCircle(uint256 circleId) external view override returns (CircleView memory v) {
        Circle storage c = _circles[circleId];
        v = CircleView(c.creator, c.contribution, c.maxMembers, c.roundDuration, c.joinDeadline, c.feeBps,
            c.baseCollateral, c.status, c.round, c.roundDeadline, c.reserve, uint8(c.members.length));
    }

    function getMembers(uint256 circleId) external view override returns (address[] memory) {
        return _circles[circleId].members;
    }

    function getMember(uint256 circleId, address member) external view override returns (MemberView memory v) {
        MemberState storage m = _ms[circleId][member];
        uint8 round = _circles[circleId].round;
        v = MemberView(m.joined, m.tier, m.hasWon, m.removed, m.collateral, m.claimable,
            _paid[circleId][round][member], _bidOf[circleId][round][member]);
    }

    function getRound(uint256 circleId) external view override returns (RoundView memory v) {
        Circle storage c = _circles[circleId];
        uint8 round = c.round;
        v = RoundView(round, c.roundDeadline, c.contribution * _activeCount(c, circleId), c.collected,
            _bestBidder[circleId][round], _bestDiscount[circleId][round], _maxDiscount(c, circleId));
    }

    function requiredCollateral(address member, uint256 circleId) external view override returns (uint256) {
        Circle storage c = _circles[circleId];
        MemberState storage m = _ms[circleId][member];
        Tier tier = m.joined ? m.tier : riskTier[member];
        return _preWin(c.baseCollateral, tier);
    }

    function reputation(address member) external view override returns (Reputation memory) {
        return _reputation[member];
    }

    // ───────────────────────── Internals ─────────────────────────
    function _preWin(uint256 base, Tier tier) internal pure returns (uint256) {
        if (tier == Tier.Low) return base / 2;
        if (tier == Tier.Medium) return base;
        return base * 2; // High and Unassessed
    }

    function _coveragePct(Tier tier) internal pure returns (uint256) {
        if (tier == Tier.Low) return 50;
        if (tier == Tier.Medium) return 75;
        return 100;
    }

    function _maxDiscount(Circle storage c, uint256 circleId) internal view returns (uint256) {
        return (c.contribution * _activeCount(c, circleId) * MAX_DISCOUNT_PCT) / 100;
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

    /// @dev Step 1 of settlement: cover missed payments from collateral, then reserve, else remove. Returns the pot.
    function _collectMissed(Circle storage c, uint256 circleId, uint8 round) internal returns (uint256 pot) {
        pot = c.collected;
        uint256 due = c.contribution;
        for (uint256 i = 0; i < c.members.length; i++) {
            address a = c.members[i];
            MemberState storage m = _ms[circleId][a];
            if (m.removed) continue;
            if (_paid[circleId][round][a]) { _reputation[a].paidOnTime++; continue; }

            _reputation[a].missed++;
            if (m.collateral >= due) {
                m.collateral -= due;
                pot += due;
                emit Covered(circleId, round, a, due, 0);
            } else {
                uint256 fromColl = m.collateral;
                uint256 shortfall = due - fromColl;
                uint256 fromReserve = shortfall > c.reserve ? c.reserve : shortfall;
                m.collateral = 0;
                c.reserve -= fromReserve;
                pot += fromColl + fromReserve;
                m.removed = true;
                _reputation[a].circlesRemoved++;
                emit Covered(circleId, round, a, fromColl, fromReserve);
                emit Removed(circleId, round, a);
            }
        }
    }

    /// @dev Step 4: highest bidder if still eligible, else first eligible member in join order (discount 0).
    function _pickWinner(Circle storage c, uint256 circleId, uint8 round) internal view returns (address, uint256) {
        address best = _bestBidder[circleId][round];
        if (best != address(0)) {
            MemberState storage b = _ms[circleId][best];
            if (!b.removed && !b.hasWon) return (best, _bestDiscount[circleId][round]);
        }
        for (uint256 i = 0; i < c.members.length; i++) {
            MemberState storage m = _ms[circleId][c.members[i]];
            if (!m.removed && !m.hasWon) return (c.members[i], 0);
        }
        return (address(0), 0);
    }

    /// @dev Step 5: post-win security — hold back part of the payout so collateral ≥ owed × coverage(tier).
    function _applyHoldback(Circle storage c, uint256 circleId, address winner, MemberState storage w, uint256 payout)
        internal returns (uint256)
    {
        uint256 owed = c.contribution * _eligibleCount(c, circleId); // winner already marked hasWon
        uint256 required = (owed * _coveragePct(w.tier)) / 100;
        if (w.collateral < required) {
            uint256 gap = required - w.collateral;
            uint256 holdback = gap < payout ? gap : payout;
            if (holdback > 0) {
                payout -= holdback;
                w.collateral += holdback;
                emit HoldbackApplied(circleId, winner, holdback);
            }
        }
        return payout;
    }

    /// @dev Step 6: split `amount` equally among active members other than `exclude`; dust → first recipient.
    function _shareDividends(Circle storage c, uint256 circleId, uint8 round, uint256 amount, address exclude) internal {
        if (amount == 0) return;
        uint256 n;
        address first;
        for (uint256 i = 0; i < c.members.length; i++) {
            address a = c.members[i];
            if (a == exclude || _ms[circleId][a].removed) continue;
            if (first == address(0)) first = a;
            n++;
        }
        if (n == 0) { c.reserve += amount; return; } // nobody left: keep it in the reserve
        uint256 each = amount / n;
        uint256 dust = amount - each * n;
        for (uint256 i = 0; i < c.members.length; i++) {
            address a = c.members[i];
            if (a == exclude || _ms[circleId][a].removed) continue;
            uint256 share = each + (a == first ? dust : 0);
            _ms[circleId][a].claimable += share;
            emit DividendCredited(circleId, round, a, share);
        }
    }

    /// @dev Step 8: everyone active has won → release collateral, sweep reserve to treasury.
    function _complete(Circle storage c, uint256 circleId) internal {
        c.status = Status.Completed;
        for (uint256 i = 0; i < c.members.length; i++) {
            address a = c.members[i];
            MemberState storage m = _ms[circleId][a];
            if (m.removed) continue;
            m.claimable += m.collateral;
            m.collateral = 0;
            _reputation[a].circlesCompleted++;
        }
        treasuryClaimable += c.reserve;
        c.reserve = 0;
        emit CircleCompleted(circleId);
    }
}

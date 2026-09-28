// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ChitChainBase} from "./ChitChainBase.sol";

/// @title ChitChainSettlement — the round-settlement steps (ARCHITECTURE.md §3.3). No external calls anywhere here.
abstract contract ChitChainSettlement is ChitChainBase {
    /// @dev Step 1: every active member who did not pay is a default. Cover from collateral, then reserve; remove if
    ///      collateral could not cover the full amount. Returns the pot actually assembled this round.
    function _collectMissed(Circle storage c, uint256 circleId, uint8 round) internal returns (uint256 pot) {
        pot = c.collected;
        uint256 due = c.params.contribution;
        for (uint256 i = 0; i < c.members.length; i++) {
            address a = c.members[i];
            MemberState storage m = _ms[circleId][a];
            if (m.removed) continue;
            if (_paid[circleId][round][a]) { _reputation[a].paidOnTime++; continue; }

            _reputation[a].missed++;
            m.defaults++;
            if (m.collateral >= due) {
                m.collateral -= due;
                m.collateralUsed += due;
                pot += due;
                emit DefaultDetected(circleId, round, a, due, due, 0, 0);
            } else {
                uint256 fromColl = m.collateral;
                uint256 gap = due - fromColl;
                uint256 fromReserve = gap > c.reserve ? c.reserve : gap;
                uint256 shortfall = gap - fromReserve;
                m.collateral = 0;
                m.collateralUsed += fromColl;
                c.reserve -= fromReserve;
                pot += fromColl + fromReserve;
                m.removed = true;
                _reputation[a].circlesRemoved++;
                emit DefaultDetected(circleId, round, a, due, fromColl, fromReserve, shortfall);
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

    /// @dev Step 5: holdback = min(payout, max(tier coverage gap, payout × holdbackBps)). Locked in the winner's
    ///      collateral until completion. Returns (payout after holdback, holdback).
    function _applyHoldback(Circle storage c, uint256 circleId, address winner, MemberState storage w, uint256 payout)
        internal returns (uint256, uint256)
    {
        uint256 owed = c.params.contribution * _eligibleCount(c, circleId); // winner already marked hasWon
        uint256 required = (owed * _coveragePct(w.tier)) / 100;
        uint256 tierHold = w.collateral < required ? required - w.collateral : 0;
        uint256 flatHold = (payout * c.params.holdbackBps) / BPS;
        uint256 holdback = tierHold > flatHold ? tierHold : flatHold;
        if (holdback > payout) holdback = payout;
        if (holdback > 0) {
            payout -= holdback;
            w.collateral += holdback;
            emit HoldbackApplied(circleId, winner, holdback);
        }
        return (payout, holdback);
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

    /// @dev Step 8: everyone active has won → release collateral (incl. holdback), sweep reserve to treasury.
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

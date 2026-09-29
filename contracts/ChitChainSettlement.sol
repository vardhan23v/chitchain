// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ChitChainBase} from "./ChitChainBase.sol";

/// @title ChitChainSettlement — the round-settlement steps (ARCHITECTURE.md §3.3). No external calls anywhere here.
abstract contract ChitChainSettlement is ChitChainBase {
    /// @dev Contributions close: cover misses from collateral/reserve, freeze the pot in `collected`, pick the
    ///      designated recipient and give them the first choice until decisionDeadline. With no eligible recipient the
    ///      round settles at once and the pot is shared as dividends.
    function _closeContributions(Circle storage c, uint256 circleId) internal {
        uint8 round = c.round;
        c.collected = _collectMissed(c, circleId, round);
        address recipient = _recipientFor(c, circleId, round);
        if (recipient == address(0)) {
            _settle(c, circleId, address(0), 0, Outcome.NoRecipient);
            return;
        }
        c.recipient = recipient;
        c.phase = Phase.Deciding;
        c.decisionDeadline = uint64(block.timestamp) + c.params.biddingDuration;
        emit PotReady(circleId, round, recipient, c.collected, c.decisionDeadline);
    }

    /// @dev Settles the current round. `winner` = address(0) shares the pot (minus fee) as dividends. The winner gets
    ///      pot − fee − discount (minus holdback); the discount is split equally among the other active members.
    function _settle(Circle storage c, uint256 circleId, address winner, uint256 discount, Outcome outcome) internal {
        uint8 round = c.round;
        uint256 pot = c.collected;
        c.collected = 0;

        uint256 fee = (pot * c.params.feeBps) / BPS;
        c.reserve += fee;
        uint256 payout;
        uint256 holdback;

        if (winner == address(0)) {
            _shareDividends(c, circleId, round, pot - fee, address(0));
            discount = 0;
        } else {
            MemberState storage w = _ms[circleId][winner];
            w.hasWon = true;
            payout = pot - fee - discount;
            (payout, holdback) = _applyHoldback(c, circleId, winner, w, payout);
            if (_activeCount(c, circleId) > 1) {
                _shareDividends(c, circleId, round, discount, winner);
            } else {
                payout += discount; // no one else to share with
            }
            w.claimable += payout;
        }
        _history[circleId][round] = RoundRecord(winner, uint64(block.timestamp), pot, payout, discount, fee, holdback, outcome, c.recipient);
        emit RoundSettled(circleId, round, winner, pot, payout, discount, fee);

        if (_eligibleCount(c, circleId) == 0) {
            _complete(c, circleId);
        } else {
            c.round = round + 1;
            _startRound(c);
        }
    }

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

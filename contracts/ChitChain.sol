// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IChitChain} from "./IChitChain.sol";
import {ChitChainBase} from "./ChitChainBase.sol";

/// @title ChitChain — a trust-minimised chit fund. The pot sits in this contract, not in anyone's account.
/// @notice One contract, many circles. Native MSTC. All payouts are pull-based via `withdraw`.
///         Behaviour follows ARCHITECTURE.md §3; signatures follow INTERFACE.md.
contract ChitChain is ChitChainBase, ReentrancyGuard {
    constructor(address riskOracle_, address treasury_) {
        if (riskOracle_ == address(0) || treasury_ == address(0)) revert InvalidParams();
        riskOracle = riskOracle_;
        treasury = treasury_;
    }

    receive() external payable { revert DirectPaymentRejected(); }
    fallback() external payable { revert DirectPaymentRejected(); }

    // ───────────────────────── Oracle ─────────────────────────
    /// @inheritdoc IChitChain
    function setRiskTier(address member, Tier tier) external override {
        if (msg.sender != riskOracle) revert OnlyOracle();
        riskTier[member] = tier;
        emit RiskTierSet(member, tier);
    }

    // ───────────────────────── Lifecycle ─────────────────────────
    /// @inheritdoc IChitChain
    function createCircle(
        uint256 contribution, uint8 maxMembers, uint32 roundDuration,
        uint32 joinWindow, uint16 feeBps, uint256 baseCollateral
    ) external override returns (uint256 circleId) {
        if (contribution == 0 || roundDuration == 0 || joinWindow == 0) revert InvalidParams();
        if (maxMembers < MIN_MEMBERS || maxMembers > MAX_MEMBERS) revert InvalidParams();
        if (feeBps > MAX_FEE_BPS || baseCollateral < contribution) revert InvalidParams();

        circleId = ++_circleCount;
        Circle storage c = _circles[circleId];
        c.creator = msg.sender;
        c.contribution = contribution;
        c.maxMembers = maxMembers;
        c.roundDuration = roundDuration;
        c.joinDeadline = uint64(block.timestamp) + joinWindow;
        c.feeBps = feeBps;
        c.baseCollateral = baseCollateral;
        c.status = Status.Open;
        emit CircleCreated(circleId, msg.sender, contribution, maxMembers, roundDuration, c.joinDeadline);
    }

    /// @inheritdoc IChitChain
    function join(uint256 circleId) external payable override {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Open) revert NotOpen();
        if (block.timestamp > c.joinDeadline) revert JoinWindowClosed();
        MemberState storage m = _ms[circleId][msg.sender];
        if (m.joined) revert AlreadyJoined();
        if (c.members.length >= c.maxMembers) revert CircleFull();

        Tier tier = riskTier[msg.sender];
        uint256 need = _preWin(c.baseCollateral, tier);
        if (msg.value != need) revert WrongAmount(need, msg.value);

        m.joined = true;
        m.tier = tier;
        m.collateral = need;
        c.members.push(msg.sender);
        emit Joined(circleId, msg.sender, tier, need);

        if (c.members.length == c.maxMembers) {
            c.status = Status.Active;
            c.round = 1;
            c.roundDeadline = uint64(block.timestamp) + c.roundDuration;
            emit CircleStarted(circleId, c.roundDeadline);
        }
    }

    /// @inheritdoc IChitChain
    function leave(uint256 circleId) external override {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Open) revert NotOpen();
        MemberState storage m = _ms[circleId][msg.sender];
        if (!m.joined) revert NotMember();

        uint256 refund = m.collateral;
        m.joined = false;
        m.collateral = 0;
        m.tier = Tier.Unassessed;
        m.claimable += refund;

        // ordered removal keeps join order for the remaining members (≤ 20 iterations)
        address[] storage list = c.members;
        uint256 n = list.length;
        for (uint256 i = 0; i < n; i++) {
            if (list[i] == msg.sender) {
                for (uint256 j = i; j + 1 < n; j++) list[j] = list[j + 1];
                list.pop();
                break;
            }
        }
        emit Left(circleId, msg.sender, refund);
    }

    /// @inheritdoc IChitChain
    function cancel(uint256 circleId) external override {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Open) revert NotOpen();
        if (block.timestamp <= c.joinDeadline) revert JoinWindowStillOpen();

        c.status = Status.Cancelled;
        for (uint256 i = 0; i < c.members.length; i++) {
            MemberState storage m = _ms[circleId][c.members[i]];
            m.claimable += m.collateral;
            m.collateral = 0;
        }
        emit CircleCancelled(circleId);
    }

    // ───────────────────────── Rounds ─────────────────────────
    /// @inheritdoc IChitChain
    function contribute(uint256 circleId) external payable override {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Active) revert NotActive();
        MemberState storage m = _ms[circleId][msg.sender];
        if (!m.joined) revert NotMember();
        if (m.removed) revert MemberRemoved();
        if (block.timestamp > c.roundDeadline) revert RoundClosed();
        if (_paid[circleId][c.round][msg.sender]) revert AlreadyPaid();
        if (msg.value != c.contribution) revert WrongAmount(c.contribution, msg.value);

        _paid[circleId][c.round][msg.sender] = true;
        c.collected += msg.value;
        emit Contributed(circleId, c.round, msg.sender, msg.value);
    }

    /// @inheritdoc IChitChain
    function placeBid(uint256 circleId, uint256 discount) external override {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Active) revert NotActive();
        MemberState storage m = _ms[circleId][msg.sender];
        if (!m.joined || m.removed || m.hasWon) revert NotEligibleToBid();
        if (block.timestamp > c.roundDeadline) revert RoundClosed();

        uint256 max = _maxDiscount(c, circleId);
        if (discount > max) revert BidTooHigh(max);
        uint256 best = _bestDiscount[circleId][c.round];
        if (discount <= best) revert BidNotHigher(best);

        _bidOf[circleId][c.round][msg.sender] = discount;
        _bestDiscount[circleId][c.round] = discount;
        _bestBidder[circleId][c.round] = msg.sender;
        emit BidPlaced(circleId, c.round, msg.sender, discount);
    }

    /// @inheritdoc IChitChain
    /// @dev No external calls; loops bounded by MAX_MEMBERS. See ARCHITECTURE.md §3.3.
    function settleRound(uint256 circleId) external override nonReentrant {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Active) revert NotActive();
        if (block.timestamp <= c.roundDeadline) revert RoundNotOver();

        uint8 round = c.round;
        uint256 pot = _collectMissed(c, circleId, round);
        c.collected = 0;

        uint256 fee = (pot * c.feeBps) / 10_000;
        c.reserve += fee;

        (address winner, uint256 discount) = _pickWinner(c, circleId, round);

        if (winner == address(0)) {
            // nobody eligible: share the whole pot (minus fee) as dividends
            _shareDividends(c, circleId, round, pot - fee, address(0));
            emit RoundSettled(circleId, round, address(0), pot, 0, 0, fee);
        } else {
            MemberState storage w = _ms[circleId][winner];
            w.hasWon = true;
            uint256 payout = pot - fee - discount;
            payout = _applyHoldback(c, circleId, winner, w, payout);
            if (_activeCount(c, circleId) > 1) {
                _shareDividends(c, circleId, round, discount, winner);
            } else {
                payout += discount; // no one else to share with
            }
            w.claimable += payout;
            emit RoundSettled(circleId, round, winner, pot, payout, discount, fee);
        }

        if (_eligibleCount(c, circleId) == 0) {
            _complete(c, circleId);
        } else {
            c.round = round + 1;
            c.roundDeadline = uint64(block.timestamp) + c.roundDuration;
        }
    }

    // ───────────────────────── Withdrawals ─────────────────────────
    /// @inheritdoc IChitChain
    function withdraw(uint256 circleId) external override nonReentrant {
        MemberState storage m = _ms[circleId][msg.sender];
        uint256 amount = m.claimable;
        if (amount == 0) revert NothingToWithdraw();
        m.claimable = 0;
        emit Withdrawn(circleId, msg.sender, amount);
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "transfer failed");
    }

    /// @inheritdoc IChitChain
    function withdrawTreasury() external override nonReentrant {
        if (msg.sender != treasury) revert OnlyTreasury();
        uint256 amount = treasuryClaimable;
        if (amount == 0) revert NothingToWithdraw();
        treasuryClaimable = 0;
        (bool ok, ) = treasury.call{value: amount}("");
        require(ok, "transfer failed");
    }

}

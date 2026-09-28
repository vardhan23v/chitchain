// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IChitChain} from "./IChitChain.sol";
import {ChitChainBase} from "./ChitChainBase.sol";
import {ChitChainSettlement} from "./ChitChainSettlement.sol";

/// @title ChitChain v2 — a trust-minimised chit fund. The pot sits in this contract, not in anyone's account.
/// @notice One contract, many circles. Native MST (testnet). All payouts are pull-based via `withdraw`.
///         Each round has two phases: contributions (contributionDuration) then bidding (biddingDuration);
///         bids are accepted from round start until the bidding deadline. Behaviour follows ARCHITECTURE.md §3.
contract ChitChain is ChitChainSettlement, ReentrancyGuard {
    constructor(address riskOracle_, address treasury_) ChitChainBase(riskOracle_, treasury_) {}

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
    function createCircle(CircleParams calldata p) external override returns (uint256 circleId) {
        if (p.contribution == 0 || p.contributionDuration == 0 || p.biddingDuration == 0 || p.joinWindow == 0) revert InvalidParams();
        if (p.maxMembers < MIN_MEMBERS || p.maxMembers > MAX_MEMBERS) revert InvalidParams();
        if (p.feeBps > MAX_FEE_BPS || p.baseCollateral < p.contribution) revert InvalidParams();
        if (p.holdbackBps > BPS || p.maxDiscountBps > MAX_DISCOUNT_BPS) revert InvalidParams();
        if (p.highBps == 0 || p.lowBps > p.mediumBps || p.mediumBps > p.highBps) revert InvalidParams();

        circleId = ++_circleCount;
        Circle storage c = _circles[circleId];
        c.creator = msg.sender;
        c.params = p;
        c.joinDeadline = uint64(block.timestamp) + p.joinWindow;
        c.status = Status.Open;
        emit CircleCreated(circleId, msg.sender, p.contribution, p.maxMembers, p.contributionDuration, p.biddingDuration, c.joinDeadline);
    }

    /// @inheritdoc IChitChain
    function join(uint256 circleId) external payable override {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Open) revert NotOpen();
        if (block.timestamp > c.joinDeadline) revert JoinWindowClosed();
        MemberState storage m = _ms[circleId][msg.sender];
        if (m.joined) revert AlreadyJoined();
        if (c.members.length >= c.params.maxMembers) revert CircleFull();

        Tier tier = riskTier[msg.sender];
        uint256 need = _preWin(c, tier);
        if (msg.value != need) revert WrongAmount(need, msg.value);

        m.joined = true;
        m.tier = tier;
        m.collateral = need;
        c.members.push(msg.sender);
        emit Joined(circleId, msg.sender, tier, need);

        if (c.members.length == c.params.maxMembers) {
            c.status = Status.Active;
            c.round = 1;
            _startRound(c);
            emit CircleStarted(circleId, c.contributionDeadline, c.biddingDeadline);
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
        if (block.timestamp > c.contributionDeadline) revert ContributionClosed();
        if (_paid[circleId][c.round][msg.sender]) revert AlreadyPaid();
        if (msg.value != c.params.contribution) revert WrongAmount(c.params.contribution, msg.value);

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
        if (block.timestamp > c.biddingDeadline) revert BiddingClosed();

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
    /// @dev No external calls; loops bounded by MAX_MEMBERS. Defaults are detected and covered here, on-chain.
    function settleRound(uint256 circleId) external override nonReentrant {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Active) revert NotActive();
        if (block.timestamp <= c.biddingDeadline) revert BiddingNotOver();

        uint8 round = c.round;
        uint256 pot = _collectMissed(c, circleId, round);
        c.collected = 0;

        uint256 fee = (pot * c.params.feeBps) / BPS;
        c.reserve += fee;

        (address winner, uint256 discount) = _pickWinner(c, circleId, round);
        uint256 payout;
        uint256 holdback;

        if (winner == address(0)) {
            // nobody eligible: share the whole pot (minus fee) as dividends
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
        _history[circleId][round] = RoundRecord(winner, uint64(block.timestamp), pot, payout, discount, fee, holdback);
        emit RoundSettled(circleId, round, winner, pot, payout, discount, fee);

        if (_eligibleCount(c, circleId) == 0) {
            _complete(c, circleId);
        } else {
            c.round = round + 1;
            _startRound(c);
        }
    }

    // ───────────────────────── Withdrawals ─────────────────────────
    /// @inheritdoc IChitChain
    /// @dev Pays only `claimable`. Locked collateral and holdback are never withdrawable while a circle is active.
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

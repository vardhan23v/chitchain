// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IChitChain} from "./IChitChain.sol";
import {ChitChainBase} from "./ChitChainBase.sol";
import {ChitChainSettlement} from "./ChitChainSettlement.sol";

/// @title ChitChain v2.2 — a trust-minimised chit fund. The pot sits in this contract, not in anyone's account.
/// @notice One contract, many circles. Native MST (testnet). All payouts are pull-based via `withdraw`.
///         Round flow: contributions (contributionDuration, closes early once everyone paid) → pot ready, the designated
///         recipient accepts the full pot or declines (biddingDuration) → only after a decline, an auction
///         (biddingDuration) where the lowest payout offer (= highest discount) wins. Behaviour follows ARCHITECTURE.md §3.
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
    /// @dev The contribution that completes the pot closes the phase immediately (recipient decision opens).
    function contribute(uint256 circleId) external payable override nonReentrant {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Active) revert NotActive();
        MemberState storage m = _ms[circleId][msg.sender];
        if (!m.joined) revert NotMember();
        if (m.removed) revert MemberRemoved();
        if (c.phase != Phase.Contributing || block.timestamp > c.contributionDeadline) revert ContributionClosed();
        if (_paid[circleId][c.round][msg.sender]) revert AlreadyPaid();
        if (msg.value != c.params.contribution) revert WrongAmount(c.params.contribution, msg.value);

        _paid[circleId][c.round][msg.sender] = true;
        c.collected += msg.value;
        emit Contributed(circleId, c.round, msg.sender, msg.value);
        if (c.collected == c.params.contribution * _activeCount(c, circleId)) _closeContributions(c, circleId);
    }

    /// @inheritdoc IChitChain
    /// @dev Permissionless once the contribution deadline passed; misses are covered from collateral here, on-chain.
    function closeContributions(uint256 circleId) external override nonReentrant {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Active) revert NotActive();
        if (c.phase != Phase.Contributing) revert WrongPhase(c.phase);
        if (block.timestamp <= c.contributionDeadline) revert ContributionsOpen();
        _closeContributions(c, circleId);
    }

    /// @inheritdoc IChitChain
    /// @dev Only the designated recipient, only while deciding. Settles at once: full pot (minus fee/holdback), no auction.
    function acceptFullPot(uint256 circleId) external override nonReentrant {
        Circle storage c = _circles[circleId];
        _requireDeciding(c);
        emit FullPotAccepted(circleId, c.round, msg.sender, c.collected);
        _settle(c, circleId, msg.sender, 0, Outcome.Accepted);
    }

    /// @inheritdoc IChitChain
    /// @dev Only the designated recipient, only while deciding. Opens the auction for biddingDuration.
    function declineFullPot(uint256 circleId) external override {
        Circle storage c = _circles[circleId];
        _requireDeciding(c);
        c.phase = Phase.Auction;
        c.biddingDeadline = uint64(block.timestamp) + c.params.biddingDuration;
        emit FullPotDeclined(circleId, c.round, msg.sender, c.biddingDeadline);
    }

    function _requireDeciding(Circle storage c) internal view {
        if (c.status != Status.Active) revert NotActive();
        if (c.phase != Phase.Deciding) revert WrongPhase(c.phase);
        if (msg.sender != c.recipient) revert NotRecipient();
        if (block.timestamp > c.decisionDeadline) revert DecisionClosed();
    }

    /// @inheritdoc IChitChain
    /// @dev `discount` = pot − the payout the bidder is willing to accept. A bid must offer a strictly lower payout
    ///      (higher discount) than the current best. Only during an auction opened by the recipient's decline.
    function placeBid(uint256 circleId, uint256 discount) external override {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Active) revert NotActive();
        if (c.phase != Phase.Auction) revert WrongPhase(c.phase);
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
    /// @dev Permissionless. Deciding past its deadline → the recipient receives the full pot (DecisionTimeout).
    ///      Auction past its deadline → the lowest payout offer wins; with no bids the recipient receives the full pot.
    ///      No external calls; loops bounded by MAX_MEMBERS.
    function settleRound(uint256 circleId) external override nonReentrant {
        Circle storage c = _circles[circleId];
        if (c.status != Status.Active) revert NotActive();
        if (c.phase == Phase.Contributing) revert WrongPhase(c.phase);
        if (c.phase == Phase.Deciding) {
            if (block.timestamp <= c.decisionDeadline) revert DecisionNotOver();
            _settle(c, circleId, c.recipient, 0, Outcome.DecisionTimeout);
            return;
        }
        if (block.timestamp <= c.biddingDeadline) revert BiddingNotOver();
        address best = _bestBidder[circleId][c.round];
        if (best != address(0)) {
            _settle(c, circleId, best, _bestDiscount[circleId][c.round], Outcome.Auction);
        } else {
            _settle(c, circleId, c.recipient, 0, Outcome.NoBids);
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

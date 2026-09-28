// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IChit {
    function join(uint256 id) external payable;
    function leave(uint256 id) external;
    function withdraw(uint256 id) external;
}

/// @dev Test helper: joins a circle, leaves, then tries to re-enter withdraw() from receive().
contract ReentrantAttacker {
    IChit public chit;
    uint256 public circleId;
    uint256 public reentered;

    constructor(address chit_) { chit = IChit(chit_); }

    function joinAndLeave(uint256 id) external payable {
        circleId = id;
        chit.join{value: msg.value}(id);
        chit.leave(id);
    }

    function attack() external { chit.withdraw(circleId); }

    receive() external payable {
        // try to withdraw again while the first withdraw is still executing
        try chit.withdraw(circleId) { reentered++; } catch {}
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IFaucetFactory {
    function recordTransaction(
        address _faucetAddress,
        string memory _transactionType,
        address _initiator,
        uint256 _amount,
        bool _isEther
    ) external;
    
    function owner() external view returns (address);
}
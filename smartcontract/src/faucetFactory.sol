
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./FaucetFactoryLibrary.sol";
import "./TransactionLibrary.sol";

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

contract FaucetFactory is Ownable {
    using FaucetFactoryLibrary for FaucetFactoryLibrary.Storage;

    FaucetFactoryLibrary.Storage private factoryStorage;

    constructor() Ownable(msg.sender) {}

    function createFaucet(
        string memory _name,
        address _token,
        address _backend,
        bool _useBackend
    ) external returns (address) {
        // The caller (msg.sender) will be the owner of the created faucet
        address faucetAddress = factoryStorage.createFaucet(_name, _token, _backend, _useBackend, msg.sender, address(this));
        return faucetAddress;
    }

    function recordTransaction(
        address _faucetAddress,
        string memory _transactionType,
        address _initiator,
        uint256 _amount,
        bool _isEther
    ) external {
        factoryStorage.recordTransaction(_faucetAddress, _transactionType, _initiator, _amount, _isEther, msg.sender, factoryStorage.faucets);
    }

    function getFaucetTransactions(address _faucetAddress) external view returns (TransactionLibrary.Transaction[] memory) {
        return factoryStorage.getFaucetTransactions(_faucetAddress);
    }

    function getAllTransactions() external view returns (TransactionLibrary.Transaction[] memory) {
        return factoryStorage.getAllTransactions();
    }

   
    function getFaucetDetails(address faucetAddress) external view returns (FaucetFactoryLibrary.FaucetDetails memory) {
        return factoryStorage.getFaucetDetails(faucetAddress);
    }

    function getAllFaucets() external view returns (address[] memory) {
        return factoryStorage.getAllFaucets();
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./FaucetFactoryLibrary.sol";
import "./TransactionLibrary.sol";
import "./IFaucetFactory.sol";
import "./quizFaucet.sol";

contract QuizRewardFactory is Ownable, IFaucetFactory {
    using FaucetFactoryLibrary for FaucetFactoryLibrary.Storage;
    using TransactionLibrary for TransactionLibrary.Transaction[];

    FaucetFactoryLibrary.Storage private factoryStorage;

    event QuizRewardCreated(
        address indexed quizReward,
        address indexed owner,
        string name,
        address token,
        address backend,
        uint256 claimWindowDuration  // seconds — mirrors what the contract stores
    );

    constructor() Ownable(msg.sender) {}

    function owner() public view override(Ownable, IFaucetFactory) returns (address) {
        return Ownable.owner();
    }

    
    function createQuizReward(
        string memory _name,
        address _token,
        address _backend,
        uint256 _claimWindowDuration
    ) external returns (address) {
        QuizReward quizReward = new QuizReward(
            _name,
            _token,
            _backend,
            msg.sender,
            address(this),
            _claimWindowDuration
        );
        address quizAddress = address(quizReward);

        factoryStorage.faucets.push(quizAddress);
        factoryStorage.userFaucets[msg.sender].push(quizAddress);

        factoryStorage.allTransactions.recordTransaction(quizAddress, "CreateQuizReward", msg.sender, 0, false);

        emit QuizRewardCreated(
            quizAddress,
            msg.sender,
            _name,
            _token,
            _backend,
            _claimWindowDuration
        );
        return quizAddress;
    }

    function recordTransaction(
        address _faucetAddress,
        string memory _transactionType,
        address _initiator,
        uint256 _amount,
        bool _isEther
    ) external {
        factoryStorage.recordTransaction(
            _faucetAddress,
            _transactionType,
            _initiator,
            _amount,
            _isEther,
            msg.sender,
            factoryStorage.faucets
        );
    }

    // ── Getters ──

    function getQuizTransactions(address _quizAddress) external view returns (TransactionLibrary.Transaction[] memory) {
        return factoryStorage.getFaucetTransactions(_quizAddress);
    }

    function getAllTransactions() external view returns (TransactionLibrary.Transaction[] memory) {
        return factoryStorage.getAllTransactions();
    }

    function getQuizDetails(address quizAddress) external view returns (FaucetFactoryLibrary.FaucetDetails memory) {
        return factoryStorage.getFaucetDetails(quizAddress);
    }

    function getAllQuizzes() external view returns (address[] memory) {
        return factoryStorage.getAllFaucets();
    }
}
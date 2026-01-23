// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./FaucetFactoryLibrary.sol";
import "./TransactionLibrary.sol";
import "./IFaucetFactory.sol";
import "./quest.sol"; // Updated import

contract QuestRewardFactory is Ownable, IFaucetFactory {
    using FaucetFactoryLibrary for FaucetFactoryLibrary.Storage;
    using TransactionLibrary for TransactionLibrary.Transaction[];
    
    FaucetFactoryLibrary.Storage private factoryStorage;

    event QuestRewardCreated(address indexed questReward, address owner, string name, address token, address backend);

    constructor() Ownable(msg.sender) {}

    function owner() public view override(Ownable, IFaucetFactory) returns (address) {
        return Ownable.owner();
    }

    // Updated function name
    function createQuestReward(
        string memory _name,
        address _token,
        address _backend,
        uint256 _questEndTime,
        uint256 _claimWindowHours
    ) external returns (address) {
        // Create new QuestReward contract
        QuestReward questReward = new QuestReward(
            _name, 
            _token, 
            _backend, 
            msg.sender, 
            address(this),
            _questEndTime,
            _claimWindowHours
        );
        address questAddress = address(questReward);

        factoryStorage.faucets.push(questAddress);
        factoryStorage.userFaucets[msg.sender].push(questAddress);

        factoryStorage.allTransactions.recordTransaction(questAddress, "CreateQuestReward", msg.sender, 0, false);
        
        emit QuestRewardCreated(questAddress, msg.sender, _name, _token, _backend);
        return questAddress;
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

    // Getters
    function getQuestTransactions(address _questAddress) external view returns (TransactionLibrary.Transaction[] memory) {
        return factoryStorage.getFaucetTransactions(_questAddress);
    }

    function getAllTransactions() external view returns (TransactionLibrary.Transaction[] memory) {
        return factoryStorage.getAllTransactions();
    }
   
    function getQuestDetails(address questAddress) external view returns (FaucetFactoryLibrary.FaucetDetails memory) {
        return factoryStorage.getFaucetDetails(questAddress);
    }

    function getAllQuests() external view returns (address[] memory) {
        return factoryStorage.getAllFaucets();
    }
}
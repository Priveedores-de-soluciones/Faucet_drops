// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./factoryLibrary.sol";
import "./transaction.sol";
import "./IFaucetFactory.sol";
import "./faucetBE.sol";



contract FaucetFactoryDC is Ownable, IFaucetFactory {
    using FaucetFactoryLibrary for FaucetFactoryLibrary.Storage;
    using TransactionLibrary for TransactionLibrary.Transaction[];
    
    FaucetFactoryLibrary.Storage private factoryStorage;

    event FaucetCreated(address indexed faucet, address owner, string name, address token, address backend);

    constructor() Ownable(msg.sender) {}

    // Override to resolve conflict between Ownable and IFaucetFactory
    function owner() public view override(Ownable, IFaucetFactory) returns (address) {
        return Ownable.owner();
    }

    function createBackendFaucet(
        string memory _name,
        address _token,
        address _backend
    ) external returns (address) {
        // Create new backend faucet directly (not in library to reduce contract size)
        DropCodeFaucet faucet = new DropCodeFaucet(_name, _token, _backend, msg.sender, address(this));
        address faucetAddress = address(faucet);

        // Add to registry using library
        factoryStorage.faucets.push(faucetAddress);
        factoryStorage.userFaucets[msg.sender].push(faucetAddress);

        // Record transaction
        factoryStorage.allTransactions.recordTransaction(faucetAddress, "CreateBackendFaucet", msg.sender, 0, false);
        
        emit FaucetCreated(faucetAddress, msg.sender, _name, _token, _backend);
        return faucetAddress;
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
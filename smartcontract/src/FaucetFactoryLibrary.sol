

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./faucet.sol";
import "./TransactionLibrary.sol";

interface IFaucetDrops {
    function owner() external view returns (address);
    function name() external view returns (string memory);
    function claimAmount() external view returns (uint256);
    function token() external view returns (address);
    function startTime() external view returns (uint256);
    function endTime() external view returns (uint256);
    function isClaimActive() external view returns (bool);
    function getFaucetBalance() external view returns (uint256 balance, bool isEther);
    function getUseBackend() external view returns (bool);
}

library FaucetFactoryLibrary {
    using TransactionLibrary for TransactionLibrary.Transaction[];

    struct Storage {
        address[] faucets;
        mapping(address => address[]) userFaucets;
        TransactionLibrary.Transaction[] allTransactions;
        mapping(address => bool) deletedFaucets;
    }

    event FaucetCreated(address indexed faucet, address owner, string name, address token, address backend);
    event TransactionRecorded(address indexed faucet, string transactionType, address initiator, uint256 amount, bool isEther, uint256 timestamp);

    error FaucetNotRegistered();
    error InvalidFaucet();
    error FaucetDeletedError(address faucet);

    function createFaucet(
        Storage storage self,
        string memory _name,
        address _token,
        address _backend,
        bool _useBackend,
        address owner,
        address _factory
    ) internal returns (address) {
        // Create new faucet with the specified owner
        FaucetDrops faucet = new FaucetDrops(_name, _token, _backend, _useBackend, owner, _factory);
        address faucetAddress = address(faucet);

        // Add faucet to global registry
        self.faucets.push(faucetAddress);
        // Add faucet to the owner's personal list
        self.userFaucets[owner].push(faucetAddress);

        // Record the creation transaction
        self.allTransactions.recordTransaction(faucetAddress, "CreateFaucet", owner, 0, false);
        emit FaucetCreated(faucetAddress, owner, _name, _token, _backend);
        return faucetAddress;
    }

    function recordTransaction(
        Storage storage self,
        address _faucetAddress,
        string memory _transactionType,
        address _initiator,
        uint256 _amount,
        bool _isEther,
        address _sender,
        address[] memory _faucets
    ) internal {
        if (self.deletedFaucets[_faucetAddress]) revert FaucetDeletedError(_faucetAddress);
        bool isValidFaucet = false;
        for (uint256 i = 0; i < _faucets.length; ) {
            if (_faucets[i] == _sender) {
                isValidFaucet = true;
                break;
            }
            unchecked { i++; }
        }
        if (!isValidFaucet) revert InvalidFaucet();

        self.allTransactions.recordTransaction(_faucetAddress, _transactionType, _initiator, _amount, _isEther);
        emit TransactionRecorded(_faucetAddress, _transactionType, _initiator, _amount, _isEther, block.timestamp);
    }

    function getFaucetTransactions(
        Storage storage self,
        address _faucetAddress
    ) internal view returns (TransactionLibrary.Transaction[] memory) {
        if (self.deletedFaucets[_faucetAddress]) revert FaucetDeletedError(_faucetAddress);
        uint256 count = 0;
        for (uint256 i = 0; i < self.allTransactions.length; ) {
            if (self.allTransactions[i].faucetAddress == _faucetAddress) {
                count++;
            }
            unchecked { i++; }
        }

        TransactionLibrary.Transaction[] memory faucetTransactions = new TransactionLibrary.Transaction[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < self.allTransactions.length; ) {
            if (self.allTransactions[i].faucetAddress == _faucetAddress) {
                faucetTransactions[index] = self.allTransactions[i];
                index++;
            }
            unchecked { i++; }
        }
        return faucetTransactions;
    }

    function getAllTransactions(
        Storage storage self
    ) internal view returns (TransactionLibrary.Transaction[] memory) {
        return self.allTransactions;
    }

    function getFaucetDetails(
        Storage storage self,
        address faucetAddress
    ) internal view returns (FaucetDetails memory) {
        if (!_isFaucetRegistered(self, faucetAddress)) revert FaucetNotRegistered();
        if (self.deletedFaucets[faucetAddress]) revert FaucetDeletedError(faucetAddress);
        IFaucetDrops faucet = IFaucetDrops(faucetAddress);
        (uint256 balance, bool isEther) = faucet.getFaucetBalance();
        return FaucetDetails({
            faucetAddress: faucetAddress,
            owner: faucet.owner(),
            name: faucet.name(),
            claimAmount: faucet.claimAmount(),
            tokenAddress: faucet.token(),
            startTime: faucet.startTime(),
            endTime: faucet.endTime(),
            isClaimActive: faucet.isClaimActive(),
            balance: balance,
            isEther: isEther,
            useBackend: faucet.getUseBackend()
        });
    }

    function _isFaucetRegistered(Storage storage self, address faucetAddress) internal view returns (bool) {
        for (uint256 i = 0; i < self.faucets.length; ) {
            if (self.faucets[i] == faucetAddress) {
                return true;
            }
            unchecked { i++; }
        }
        return false;
    }

    function getAllFaucets(Storage storage self) internal view returns (address[] memory) {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < self.faucets.length; ) {
            if (!self.deletedFaucets[self.faucets[i]]) {
                activeCount++;
            }
            unchecked { i++; }
        }

        address[] memory activeFaucets = new address[](activeCount);
        uint256 index = 0;
        for (uint256 i = 0; i < self.faucets.length; ) {
            if (!self.deletedFaucets[self.faucets[i]]) {
                activeFaucets[index] = self.faucets[i];
                index++;
            }
            unchecked { i++; }
        }
        return activeFaucets;
    }


    struct FaucetDetails {
        address faucetAddress;
        address owner;
        string name;
        uint256 claimAmount;
        address tokenAddress;
        uint256 startTime;
        uint256 endTime;
        bool isClaimActive;
        uint256 balance;
        bool isEther;
        bool useBackend;
    }
}
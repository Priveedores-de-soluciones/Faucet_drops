// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

library TransactionLibrary {
    struct Transaction {
        address faucetAddress;
        string transactionType;
        address initiator;
        uint256 amount;
        bool isEther;
        uint256 timestamp;
    }

    function recordTransaction(
        Transaction[] storage self,
        address _faucetAddress,
        string memory _transactionType,
        address _initiator,
        uint256 _amount,
        bool _isEther
    ) internal {
        self.push(
            Transaction({
                faucetAddress: _faucetAddress,
                transactionType: _transactionType,
                initiator: _initiator,
                amount: _amount,
                isEther: _isEther,
                timestamp: block.timestamp
            })
        );
    }
}
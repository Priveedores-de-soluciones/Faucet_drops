"""
abis.py — All smart contract ABIs.
No internal imports — pure data.
"""

ERC20_ABI = [
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "symbol",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
    }
]

FAUCET_ABI_ANALYTICS = [
    {
        "inputs": [],
        "name": "name",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "token",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "tokenAddress",
        "outputs": [{"internalType": "address", "name": "", "type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
]

FACTORY_ABI = [
    {
        "inputs": [],
        "stateMutability": "nonpayable",
        "type": "constructor"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "faucet",
                "type": "address"
            }
        ],
        "name": "FaucetDeletedError",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "FaucetNotRegistered",
        "type": "error"
    },
    {
        "inputs": [],
        "name": "InvalidFaucet",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "owner",
                "type": "address"
            }
        ],
        "name": "OwnableInvalidOwner",
        "type": "error"
    },
    {
        "inputs": [
            {
                "internalType": "address",
                "name": "account",
                "type": "address"
            }
        ],
        "name": "OwnableUnauthorizedAccount",
        "type": "error"
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address",
                "name": "faucet",
                "type": "address"
            },
            {
                "indexed": False,
                "internalType": "address",
                "name": "owner",
                "type": "address"
            },
            {
                "indexed": False,
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "indexed": False,
                "internalType": "address",
                "name": "token",
                "type": "address"
            },
            {
                "indexed": False,
                "internalType": "address",
                "name": "backend",
                "type": "address"
            }
        ],
        "name": "FaucetCreated",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address",
                "name": "faucet",
                "type": "address"
            },
            {
                "indexed": True,
                "internalType": "address",
                "name": "initiator",
                "type": "address"
            }
        ],
        "name": "FaucetDeleted",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address",
                "name": "previousOwner",
                "type": "address"
            },
            {
                "indexed": True,
                "internalType": "address",
                "name": "newOwner",
                "type": "address"
            }
        ],
        "name": "OwnershipTransferred",
        "type": "event"
    },
    {
        "anonymous": False,
        "inputs": [
            {
                "indexed": True,
                "internalType": "address",
                "name": "faucet",
                "type": "address"
            },
            {
                "indexed": False,
                "internalType": "string",
                "name": "transactionType",
                "type": "string"
            },
            {
                "indexed": False,
                "internalType": "address",
                "name": "initiator",
                "type": "address"
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "amount",
                "type": "uint256"
            },
            {
                "indexed": False,
                "internalType": "bool",
                "name": "isEther",
                "type": "bool"
            },
            {
                "indexed": False,
                "internalType": "uint256",
                "name": "timestamp",
                "type": "uint256"
            }
        ],
        "name": "TransactionRecorded",
        "type": "event"
    },
    {
        "inputs": [],
        "name": "getAllFaucets",
        "outputs": [
            {
                "internalType": "address[]",
                "name": "",
                "type": "address[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getAllTransactions",
        "outputs": [
            {
                "components": [
                    {
                        "internalType": "address",
                        "name": "faucetAddress",
                        "type": "address"
                    },
                    {
                        "internalType": "string",
                        "name": "transactionType",
                        "type": "string"
                    },
                    {
                        "internalType": "address",
                        "name": "initiator",
                        "type": "address"
                    },
                    {
                        "internalType": "uint256",
                        "name": "amount",
                        "type": "uint256"
                    },
                    {
                        "internalType": "bool",
                        "name": "isEther",
                        "type": "bool"
                    },
                    {
                        "internalType": "uint256",
                        "name": "timestamp",
                        "type": "uint256"
                    }
                ],
                "internalType": "struct TransactionLibrary.Transaction[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

ERC20_BALANCE_ABI = [
    {
        "constant": True,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function"
    },
    {
        "constant": True,
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function"
    }
]

QUEST_ABI= [
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_name",
				"type": "string"
			},
			{
				"internalType": "address",
				"name": "_token",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_backend",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_owner",
				"type": "address"
			},
			{
				"internalType": "address",
				"name": "_factory",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "_questEndTime",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_claimWindowHours",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"inputs": [],
		"name": "AlreadyClaimed",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ArrayLengthMismatch",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "CannotRemoveFactoryOwner",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ClaimPeriodEnded",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ClaimPeriodNotStarted",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ClaimWindowStillOpen",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ContractPaused",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "EmptyName",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InsufficientBalance",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidAddress",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidAmount",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "InvalidTime",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NoRewardAmountSet",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "NoUsersProvided",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "OnlyAdmin",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "OnlyBackend",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "owner",
				"type": "address"
			}
		],
		"name": "OwnableInvalidOwner",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "account",
				"type": "address"
			}
		],
		"name": "OwnableUnauthorizedAccount",
		"type": "error"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "questReward",
				"type": "address"
			}
		],
		"name": "QuestDeletedError",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "ReentrancyGuardReentrantCall",
		"type": "error"
	},
	{
		"inputs": [],
		"name": "TransferFailed",
		"type": "error"
	},
	{
		"anonymous": False,
		"inputs": [
			{
				"indexed": True,
				"internalType": "address",
				"name": "admin",
				"type": "address"
			}
		],
		"name": "AdminAdded",
		"type": "event"
	},
	{
		"anonymous": False,
		"inputs": [
			{
				"indexed": True,
				"internalType": "address",
				"name": "admin",
				"type": "address"
			}
		],
		"name": "AdminRemoved",
		"type": "event"
	},
	{
		"anonymous": False,
		"inputs": [
			{
				"indexed": False,
				"internalType": "uint256",
				"name": "userCount",
				"type": "uint256"
			}
		],
		"name": "BatchClaimReset",
		"type": "event"
	},
	{
		"anonymous": False,
		"inputs": [
			{
				"indexed": False,
				"internalType": "uint256",
				"name": "userCount",
				"type": "uint256"
			}
		],
		"name": "BatchRewardAmountsSet",
		"type": "event"
	},
	{
		"anonymous": False,
		"inputs": [
			{
				"indexed": False,
				"internalType": "uint256",
				"name": "questEndTime",
				"type": "uint256"
			},
			{
				"indexed": False,
				"internalType": "uint256",
				"name": "claimWindowHours",
				"type": "uint256"
			}
		],
		"name": "ClaimParametersUpdated",
		"type": "event"
	},
	{
		"anonymous": False,
		"inputs": [
			{
				"indexed": True,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": False,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": False,
				"internalType": "bool",
				"name": "isEther",
				"type": "bool"
			}
		],
		"name": "Claimed",
		"type": "event"
	},
	{
		"anonymous": False,
		"inputs": [
			{
				"indexed": True,
				"internalType": "address",
				"name": "funder",
				"type": "address"
			},
			{
				"indexed": False,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": False,
				"internalType": "uint256",
				"name": "backendFee",
				"type": "uint256"
			},
			{
				"indexed": False,
				"internalType": "uint256",
				"name": "vaultFee",
				"type": "uint256"
			},
			{
				"indexed": False,
				"internalType": "bool",
				"name": "isEther",
				"type": "bool"
			}
		],
		"name": "Funded",
		"type": "event"
	},
	{
		"anonymous": False,
		"inputs": [
			{
				"indexed": False,
				"internalType": "string",
				"name": "newName",
				"type": "string"
			}
		],
		"name": "NameUpdated",
		"type": "event"
	},
	{
		"anonymous": False,
		"inputs": [
			{
				"indexed": True,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": True,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"anonymous": False,
		"inputs": [
			{
				"indexed": False,
				"internalType": "bool",
				"name": "paused",
				"type": "bool"
			}
		],
		"name": "Paused",
		"type": "event"
	},
	{
		"anonymous": False,
		"inputs": [
			{
				"indexed": True,
				"internalType": "address",
				"name": "questReward",
				"type": "address"
			},
			{
				"indexed": False,
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"indexed": False,
				"internalType": "address",
				"name": "token",
				"type": "address"
			}
		],
		"name": "QuestRewardCreated",
		"type": "event"
	},
	{
		"anonymous": False,
		"inputs": [
			{
				"indexed": True,
				"internalType": "address",
				"name": "questReward",
				"type": "address"
			}
		],
		"name": "QuestRewardDeleted",
		"type": "event"
	},
	{
		"anonymous": False,
		"inputs": [
			{
				"indexed": True,
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "RewardAmountRemoved",
		"type": "event"
	},
	{
		"anonymous": False,
		"inputs": [
			{
				"indexed": True,
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"indexed": False,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "RewardAmountSet",
		"type": "event"
	},
	{
		"anonymous": False,
		"inputs": [
			{
				"indexed": True,
				"internalType": "address",
				"name": "owner",
				"type": "address"
			},
			{
				"indexed": False,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": False,
				"internalType": "bool",
				"name": "isEther",
				"type": "bool"
			}
		],
		"name": "Withdrawn",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "BACKEND",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "BACKEND_FEE_PERCENT",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "VAULT_ADDRESS",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "VAULT_FEE_PERCENT",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "admins",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address[]",
				"name": "users",
				"type": "address[]"
			}
		],
		"name": "claim",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "claims",
		"outputs": [
			{
				"internalType": "address",
				"name": "recipient",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "customClaimAmounts",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "deleted",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "endTime",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "factory",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_tokenAmount",
				"type": "uint256"
			}
		],
		"name": "fund",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			}
		],
		"name": "getClaimStatus",
		"outputs": [
			{
				"internalType": "bool",
				"name": "claimed",
				"type": "bool"
			},
			{
				"internalType": "bool",
				"name": "hasRewardAmount",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "rewardAmount",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "canClaim",
				"type": "bool"
			},
			{
				"internalType": "uint256",
				"name": "timeUntilStart",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "timeRemaining",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "hasClaimed",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "isAdmin",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "isClaimActive",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "name",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "paused",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address[]",
				"name": "users",
				"type": "address[]"
			},
			{
				"internalType": "uint256[]",
				"name": "amounts",
				"type": "uint256[]"
			}
		],
		"name": "setRewardAmountsBatch",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "startTime",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "token",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "_newName",
				"type": "string"
			}
		],
		"name": "updateName",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "_questEndTime",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "_claimWindowHours",
				"type": "uint256"
			}
		],
		"name": "updateQuestTimings",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "withdraw",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	}
]

FAUCET_ABI = [
{
"inputs": [
{
"internalType": "string",
"name": "_name",
"type": "string"
},
{
"internalType": "address",
"name": "_token",
"type": "address"
},
{
"internalType": "address",
"name": "_backend",
"type": "address"
},
{
"internalType": "address",
"name": "_owner",
"type": "address"
},
{
"internalType": "address",
"name": "_factory",
"type": "address"
}
],
"stateMutability": "nonpayable",
"type": "constructor"
},
{
"inputs": [],
"name": "AlreadyClaimed",
"type": "error"
},
{
"inputs": [],
"name": "ArrayLengthMismatch",
"type": "error"
},
{
"inputs": [],
"name": "ClaimAmountNotSet",
"type": "error"
},
{
"inputs": [],
"name": "ClaimPeriodEnded",
"type": "error"
},
{
"inputs": [],
"name": "ClaimPeriodNotStarted",
"type": "error"
},
{
"inputs": [],
"name": "ContractPaused",
"type": "error"
},
{
"inputs": [],
"name": "EmptyName",
"type": "error"
},
{
"inputs": [],
"name": "InsufficientBalance",
"type": "error"
},
{
"inputs": [],
"name": "InvalidAddress",
"type": "error"
},
{
"inputs": [],
"name": "InvalidAmount",
"type": "error"
},
{
"inputs": [],
"name": "InvalidTime",
"type": "error"
},
{
"inputs": [],
"name": "NoUsersProvided",
"type": "error"
},
{
"inputs": [],
"name": "NotWhitelisted",
"type": "error"
},
{
"inputs": [],
"name": "OnlyAdmin",
"type": "error"
},
{
"inputs": [],
"name": "OnlyBackend",
"type": "error"
},
{
"inputs": [
{
"internalType": "address",
"name": "owner",
"type": "address"
}
],
"name": "OwnableInvalidOwner",
"type": "error"
},
{
"inputs": [
{
"internalType": "address",
"name": "account",
"type": "address"
}
],
"name": "OwnableUnauthorizedAccount",
"type": "error"
},
{
"inputs": [],
"name": "ReentrancyGuardReentrantCall",
"type": "error"
},
{
"inputs": [],
"name": "TransferFailed",
"type": "error"
},
{
"anonymous": False,
"inputs": [
{
"indexed": True,
"internalType": "address",
"name": "admin",
"type": "address"
}
],
"name": "AdminAdded",
"type": "event"
},
{
"anonymous": False,
"inputs": [
{
"indexed": True,
"internalType": "address",
"name": "newBackend",
"type": "address"
}
],
"name": "BackendUpdated",
"type": "event"
},
{
"anonymous": False,
"inputs": [
{
"indexed": False,
"internalType": "uint256",
"name": "userCount",
"type": "uint256"
}
],
"name": "BatchClaimReset",
"type": "event"
},
{
"anonymous": False,
"inputs": [
{
"indexed": False,
"internalType": "uint256",
"name": "userCount",
"type": "uint256"
}
],
"name": "BatchCustomClaimAmountsSet",
"type": "event"
},
{
"anonymous": False,
"inputs": [
{
"indexed": False,
"internalType": "uint256",
"name": "claimAmount",
"type": "uint256"
},
{
"indexed": False,
"internalType": "uint256",
"name": "startTime",
"type": "uint256"
},
{
"indexed": False,
"internalType": "uint256",
"name": "endTime",
"type": "uint256"
}
],
"name": "ClaimParametersUpdated",
"type": "event"
},
{
"inputs": [
{
"internalType": "address",
"name": "user",
"type": "address"
}
],
"name": "hasCustomClaimAmount",
"outputs": [
{
"internalType": "bool",
"name": "",
"type": "bool"
}
],
"stateMutability": "view",
"type": "function"
},
{
"anonymous": False,
"inputs": [
{
"indexed": True,
"internalType": "address",
"name": "user",
"type": "address"
}
],
"name": "ClaimReset",
"type": "event"
},
{
"anonymous": False,
"inputs": [
{
"indexed": True,
"internalType": "address",
"name": "user",
"type": "address"
},
{
"indexed": False,
"internalType": "uint256",
"name": "amount",
"type": "uint256"
},
{
"indexed": False,
"internalType": "bool",
"name": "isEther",
"type": "bool"
}
],
"name": "Claimed",
"type": "event"
},
{
"anonymous": False,
"inputs": [
{
"indexed": True,
"internalType": "address",
"name": "user",
"type": "address"
}
],
"name": "CustomClaimAmountRemoved",
"type": "event"
},
{
"anonymous": False,
"inputs": [
{
"indexed": True,
"internalType": "address",
"name": "user",
"type": "address"
},
{
"indexed": False,
"internalType": "uint256",
"name": "amount",
"type": "uint256"
}
],
"name": "CustomClaimAmountSet",
"type": "event"
},
{
"anonymous": False,
"inputs": [
{
"indexed": True,
"internalType": "address",
"name": "faucet",
"type": "address"
},
{
"indexed": False,
"internalType": "string",
"name": "name",
"type": "string"
},
{
"indexed": False,
"internalType": "address",
"name": "token",
"type": "address"
}
],
"name": "FaucetCreated",
"type": "event"
},
{
"anonymous": False,
"inputs": [
{
"indexed": True,
"internalType": "address",
"name": "faucet",
"type": "address"
}
],
"name": "FaucetDeleted",
"type": "event"
},
{
"anonymous": False,
"inputs": [
{
"indexed": True,
"internalType": "address",
"name": "funder",
"type": "address"
},
{
"indexed": False,
"internalType": "uint256",
"name": "amount",
"type": "uint256"
},
{
"indexed": False,
"internalType": "uint256",
"name": "backendFee",
"type": "uint256"
},
{
"indexed": False,
"internalType": "bool",
"name": "isEther",
"type": "bool"
}
],
"name": "Funded",
"type": "event"
},
{
"anonymous": False,
"inputs": [
{
"indexed": False,
"internalType": "string",
"name": "newName",
"type": "string"
}
],
"name": "NameUpdated",
"type": "event"
},
{
"anonymous": False,
"inputs": [
{
"indexed": True,
"internalType": "address",
"name": "previousOwner",
"type": "address"
},
{
"indexed": True,
"internalType": "address",
"name": "newOwner",
"type": "address"
}
],
"name": "OwnershipTransferred",
"type": "event"
},
{
"anonymous": False,
"inputs": [
{
"indexed": False,
"internalType": "bool",
"name": "paused",
"type": "bool"
}
],
"name": "Paused",
"type": "event"
},
{
"anonymous": False,
"inputs": [
{
"indexed": True,
"internalType": "address",
"name": "user",
"type": "address"
},
{
"indexed": False,
"internalType": "bool",
"name": "status",
"type": "bool"
}
],
"name": "WhitelistUpdated",
"type": "event"
},
{
"anonymous": False,
"inputs": [
{
"indexed": True,
"internalType": "address",
"name": "owner",
"type": "address"
},
{
"indexed": False,
"internalType": "uint256",
"name": "amount",
"type": "uint256"
},
{
"indexed": False,
"internalType": "bool",
"name": "isEther",
"type": "bool"
}
],
"name": "Withdrawn",
"type": "event"
},
{
"inputs": [],
"name": "BACKEND",
"outputs": [
{
"internalType": "address",
"name": "",
"type": "address"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "BACKEND_FEE_PERCENT",
"outputs": [
{
"internalType": "uint256",
"name": "",
"type": "uint256"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{
"internalType": "address",
"name": "_admin",
"type": "address"
}
],
"name": "addAdmin",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{
"internalType": "address[]",
"name": "users",
"type": "address[]"
}
],
"name": "claim",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [],
"name": "claimAmount",
"outputs": [
{
"internalType": "uint256",
"name": "",
"type": "uint256"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{
"internalType": "address[]",
"name": "users",
"type": "address[]"
}
],
"name": "claimWhenActive",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{
"internalType": "uint256",
"name": "",
"type": "uint256"
}
],
"name": "claims",
"outputs": [
{
"internalType": "address",
"name": "recipient",
"type": "address"
},
{
"internalType": "uint256",
"name": "amount",
"type": "uint256"
},
{
"internalType": "uint256",
"name": "timestamp",
"type": "uint256"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{
"internalType": "address",
"name": "",
"type": "address"
}
],
"name": "customClaimAmounts",
"outputs": [
{
"internalType": "uint256",
"name": "",
"type": "uint256"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "deleteFaucet",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [],
"name": "endTime",
"outputs": [
{
"internalType": "uint256",
"name": "",
"type": "uint256"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "factory",
"outputs": [
{
"internalType": "address",
"name": "",
"type": "address"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{
"internalType": "uint256",
"name": "_tokenAmount",
"type": "uint256"
}
],
"name": "fund",
"outputs": [],
"stateMutability": "payable",
"type": "function"
},
{
"inputs": [
{
"internalType": "address",
"name": "_address",
"type": "address"
}
],
"name": "getAdminStatus",
"outputs": [
{
"internalType": "bool",
"name": "",
"type": "bool"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "getAllClaims",
"outputs": [
{
"components": [
{
"internalType": "address",
"name": "recipient",
"type": "address"
},
{
"internalType": "uint256",
"name": "amount",
"type": "uint256"
},
{
"internalType": "uint256",
"name": "timestamp",
"type": "uint256"
}
],
"internalType": "struct FaucetDrops.ClaimDetail[]",
"name": "",
"type": "tuple[]"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{
"internalType": "address",
"name": "user",
"type": "address"
}
],
"name": "getClaimStatus",
"outputs": [
{
"internalType": "bool",
"name": "claimed",
"type": "bool"
},
{
"internalType": "bool",
"name": "whitelisted",
"type": "bool"
},
{
"internalType": "bool",
"name": "canClaim",
"type": "bool"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{
"internalType": "address",
"name": "user",
"type": "address"
}
],
"name": "getCustomClaimAmount",
"outputs": [
{
"internalType": "uint256",
"name": "",
"type": "uint256"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{
"internalType": "address",
"name": "user",
"type": "address"
}
],
"name": "getDetailedClaimStatus",
"outputs": [
{
"internalType": "bool",
"name": "claimed",
"type": "bool"
},
{
"internalType": "bool",
"name": "whitelisted",
"type": "bool"
},
{
"internalType": "bool",
"name": "canClaim",
"type": "bool"
},
{
"internalType": "uint256",
"name": "claimAmountForUser",
"type": "uint256"
},
{
"internalType": "bool",
"name": "hasCustom",
"type": "bool"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "getFaucetBalance",
"outputs": [
{
"internalType": "uint256",
"name": "balance",
"type": "uint256"
},
{
"internalType": "bool",
"name": "isEther",
"type": "bool"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{
"internalType": "address",
"name": "user",
"type": "address"
}
],
"name": "getUserClaimAmount",
"outputs": [
{
"internalType": "uint256",
"name": "",
"type": "uint256"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{
"internalType": "address",
"name": "",
"type": "address"
}
],
"name": "hasClaimed",
"outputs": [
{
"internalType": "bool",
"name": "",
"type": "bool"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{
"internalType": "address",
"name": "",
"type": "address"
}
],
"name": "hasCustomAmount",
"outputs": [
{
"internalType": "bool",
"name": "",
"type": "bool"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{
"internalType": "address",
"name": "",
"type": "address"
}
],
"name": "isAdmin",
"outputs": [
{
"internalType": "bool",
"name": "",
"type": "bool"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "isClaimActive",
"outputs": [
{
"internalType": "bool",
"name": "",
"type": "bool"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{
"internalType": "address",
"name": "",
"type": "address"
}
],
"name": "isWhitelisted",
"outputs": [
{
"internalType": "bool",
"name": "",
"type": "bool"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "name",
"outputs": [
{
"internalType": "string",
"name": "",
"type": "string"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "owner",
"outputs": [
{
"internalType": "address",
"name": "",
"type": "address"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "paused",
"outputs": [
{
"internalType": "bool",
"name": "",
"type": "bool"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "renounceOwnership",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [],
"name": "resetAllClaimed",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{
"internalType": "address[]",
"name": "users",
"type": "address[]"
}
],
"name": "resetClaimedBatch",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{
"internalType": "address",
"name": "user",
"type": "address"
}
],
"name": "resetClaimedSingle",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{
"internalType": "uint256",
"name": "_claimAmount",
"type": "uint256"
},
{
"internalType": "uint256",
"name": "_startTime",
"type": "uint256"
},
{
"internalType": "uint256",
"name": "_endTime",
"type": "uint256"
}
],
"name": "setClaimParameters",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{
"internalType": "address",
"name": "user",
"type": "address"
},
{
"internalType": "uint256",
"name": "amount",
"type": "uint256"
}
],
"name": "setCustomClaimAmount",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{
"internalType": "address[]",
"name": "users",
"type": "address[]"
},
{
"internalType": "uint256[]",
"name": "amounts",
"type": "uint256[]"
}
],
"name": "setCustomClaimAmountsBatch",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{
"internalType": "bool",
"name": "_paused",
"type": "bool"
}
],
"name": "setPaused",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{
"internalType": "address",
"name": "user",
"type": "address"
},
{
"internalType": "bool",
"name": "status",
"type": "bool"
}
],
"name": "setWhitelist",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{
"internalType": "address[]",
"name": "users",
"type": "address[]"
},
{
"internalType": "bool",
"name": "status",
"type": "bool"
}
],
"name": "setWhitelistBatch",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [],
"name": "startTime",
"outputs": [
{
"internalType": "uint256",
"name": "",
"type": "uint256"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [],
"name": "token",
"outputs": [
{
"internalType": "address",
"name": "",
"type": "address"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{
"internalType": "address",
"name": "newOwner",
"type": "address"
}
],
"name": "transferOwnership",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{
"internalType": "string",
"name": "_newName",
"type": "string"
}
],
"name": "updateName",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"inputs": [
{
"internalType": "address",
"name": "user",
"type": "address"
}
],
"name": "userHasCustomAmount",
"outputs": [
{
"internalType": "bool",
"name": "",
"type": "bool"
}
],
"stateMutability": "view",
"type": "function"
},
{
"inputs": [
{
"internalType": "uint256",
"name": "amount",
"type": "uint256"
}
],
"name": "withdraw",
"outputs": [],
"stateMutability": "nonpayable",
"type": "function"
},
{
"stateMutability": "payable",
"type": "receive"
}
]

ERC20_ABI = [{"constant":True,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function"}]

ERC721_ABI = [{"constant":True,"inputs":[{"name":"owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"","type":"uint256"}],"type":"function"}]

JOIN_ABI = [{
    "inputs": [{"internalType": "address", "name": "participant", "type": "address"}],
    "name": "joinQuiz", "outputs": [],
    "stateMutability": "nonpayable", "type": "function",
}]

SUBMIT_ABI = [{
    "inputs": [{"internalType": "address", "name": "participant", "type": "address"}],
    "name": "submitQuiz", "outputs": [],
    "stateMutability": "nonpayable", "type": "function",
}]

SET_REWARDS_ABI = [
    {
        "inputs": [
            {"internalType": "address[]", "name": "users",   "type": "address[]"},
            {"internalType": "uint256[]", "name": "amounts", "type": "uint256[]"},
        ],
        "name": "setRewardAmountsBatch", "outputs": [],
        "stateMutability": "nonpayable", "type": "function",
    },
    {
        "inputs": [], "name": "openClaimWindow", "outputs": [],
        "stateMutability": "nonpayable", "type": "function",
    },
]

HAS_JOINED_ABI = [{
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "hasJoined",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view", "type": "function",
}]


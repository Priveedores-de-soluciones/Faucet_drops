// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IFaucetFactory.sol";

contract QuestReward is Ownable, ReentrancyGuard {
    string public name;
    address public token;
    
    // Timing Variables
    uint256 public startTime; 
    uint256 public endTime;   
    
    mapping(address => bool) public hasClaimed;
    mapping(address => uint256) public customClaimAmounts;
    mapping(address => bool) public isAdmin;
    address[] public admins;
    address public BACKEND;
    address public VAULT_ADDRESS = 0x97841b00B8Ad031FB30495eCeF2B2DbB6FCaCE30;
    address public factory;
    uint256 public constant BACKEND_FEE_PERCENT = 2;
    uint256 public constant VAULT_FEE_PERCENT = 5;
    bool public deleted;

    struct ClaimDetail {
        address recipient;
        uint256 amount;
        uint256 timestamp;
    }

    ClaimDetail[] public claims;

    event Claimed(address indexed user, uint256 amount, bool isEther);
    event Funded(address indexed funder, uint256 amount, uint256 backendFee, uint256 vaultFee, bool isEther);
    event Withdrawn(address indexed owner, uint256 amount, bool isEther);
    event ClaimParametersUpdated(uint256 questEndTime, uint256 claimWindowHours);
    event RewardAmountSet(address indexed user, uint256 amount);
    event RewardAmountRemoved(address indexed user);
    event BatchRewardAmountsSet(uint256 userCount);
    event QuestRewardCreated(address indexed questReward, string name, address token);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event BatchClaimReset(uint256 userCount);
    event Paused(bool paused);
    event QuestRewardDeleted(address indexed questReward);
    event NameUpdated(string newName);

    error InvalidAddress();
    error OnlyBackend();
    error OnlyAdmin();
    error ClaimWindowStillOpen();
    error NoUsersProvided();
    error ClaimPeriodNotStarted();
    error ClaimPeriodEnded();
    error InsufficientBalance();
    error TransferFailed();
    error NoRewardAmountSet();
    error AlreadyClaimed();
    error InvalidAmount();
    error InvalidTime();
    error ContractPaused();
    error EmptyName();
    error ArrayLengthMismatch();
    error QuestDeletedError(address questReward);
    error CannotRemoveFactoryOwner();

    modifier onlyBackend() {
        if (msg.sender != BACKEND) revert OnlyBackend();
        _;
    }

    modifier onlyAdmin() {
        if (!isAdmin[msg.sender] && msg.sender != BACKEND && msg.sender != owner() && msg.sender != IFaucetFactory(factory).owner())
            revert OnlyAdmin();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier checkNotDeleted() {
        if (deleted) revert QuestDeletedError(address(this));
        _;
    }

    bool public paused;

    constructor(
        string memory _name,
        address _token,
        address _backend,
        address _owner,
        address _factory,
        uint256 _questEndTime,
        uint256 _claimWindowHours
    ) Ownable(_owner) {
        name = _name;
        BACKEND = _backend;
        token = _token;
        factory = _factory;
        
        startTime = _questEndTime; 
        endTime = _questEndTime + (_claimWindowHours * 1 hours);

        isAdmin[_owner] = true;
        admins.push(_owner);
        
        address factoryOwner = IFaucetFactory(_factory).owner();
        isAdmin[factoryOwner] = true;
        admins.push(factoryOwner);

        emit QuestRewardCreated(address(this), _name, _token);
        emit ClaimParametersUpdated(_questEndTime, _claimWindowHours);
        emit AdminAdded(_owner);
        emit AdminAdded(factoryOwner);
    }

    // ==========================================
    //          CORE BATCH CLAIM FUNCTION
    // ==========================================

    /**
     * @dev Backend triggers claim for a batch of users.
     * STRICT MODE: If any user in the list is invalid, the entire transaction reverts.
     * This is safer for gasless relaying to ensure data integrity.
     */
    function claim(address[] calldata users) external onlyBackend nonReentrant whenNotPaused checkNotDeleted {
        if (users.length == 0) revert NoUsersProvided();
        if (block.timestamp < startTime) revert ClaimPeriodNotStarted();
        if (block.timestamp > endTime) revert ClaimPeriodEnded();

        uint256 totalAmount = 0;

        // 1. VALIDATION LOOP
        // Calculate total and verify every user is valid before sending anything
        for (uint256 i = 0; i < users.length; ) {
            address user = users[i];
            if (user == address(0)) revert InvalidAddress();
            
            // Strict checks: Revert if ANY user is invalid
            if (hasClaimed[user]) revert AlreadyClaimed();
            if (customClaimAmounts[user] == 0) revert NoRewardAmountSet();
            
            totalAmount += customClaimAmounts[user];
            unchecked { i++; }
        }

        // 2. BALANCE CHECK
        if (token == address(0)) {
            if (address(this).balance < totalAmount) revert InsufficientBalance();
        } else {
            if (IERC20(token).balanceOf(address(this)) < totalAmount) revert InsufficientBalance();
        }

        // 3. EXECUTION LOOP
        for (uint256 i = 0; i < users.length; ) {
            address user = users[i];
            uint256 amount = customClaimAmounts[user];
            
            // Update state FIRST
            hasClaimed[user] = true;
            claims.push(ClaimDetail({
                recipient: user,
                amount: amount,
                timestamp: block.timestamp
            }));

            // Execute Transfer
            if (token == address(0)) {
                (bool sent, ) = user.call{value: amount}("");
                if (!sent) revert TransferFailed();
                IFaucetFactory(factory).recordTransaction(address(this), "ClaimBackend", user, amount, true);
                emit Claimed(user, amount, true);
            } else {
                if (!IERC20(token).transfer(user, amount)) revert TransferFailed();
                IFaucetFactory(factory).recordTransaction(address(this), "ClaimBackend", user, amount, false);
                emit Claimed(user, amount, false);
            }
            
            unchecked { i++; }
        }
    }

    // ==========================================
    //          ADMIN & UTILITY FUNCTIONS
    // ==========================================

    function updateQuestTimings(uint256 _questEndTime, uint256 _claimWindowHours) external onlyAdmin whenNotPaused checkNotDeleted {
        startTime = _questEndTime;
        endTime = _questEndTime + (_claimWindowHours * 1 hours);
        if (endTime <= startTime) revert InvalidTime();
        IFaucetFactory(factory).recordTransaction(address(this), "UpdateQuestTimings", msg.sender, 0, false);
        emit ClaimParametersUpdated(_questEndTime, _claimWindowHours);
    }

    function fund(uint256 _tokenAmount) external payable nonReentrant whenNotPaused checkNotDeleted {
        uint256 backendFee = 0;
        uint256 vaultFee = 0;

        if (token == address(0)) {
            if (msg.value == 0) revert InvalidAmount();
            backendFee = (msg.value * BACKEND_FEE_PERCENT) / 100;
            vaultFee = (msg.value * VAULT_FEE_PERCENT) / 100;

            if (backendFee > 0 && BACKEND != address(0)) {
                (bool sentBackend, ) = BACKEND.call{value: backendFee}("");
                if (!sentBackend) revert TransferFailed();
            }
            if (vaultFee > 0 && VAULT_ADDRESS != address(0)) {
                (bool sentVault, ) = VAULT_ADDRESS.call{value: vaultFee}("");
                if (!sentVault) revert TransferFailed();
            }
            IFaucetFactory(factory).recordTransaction(address(this), "Fund", msg.sender, msg.value, true);
            emit Funded(msg.sender, msg.value, backendFee, vaultFee, true);
        } else {
            if (_tokenAmount == 0) revert InvalidAmount();
            if (msg.value != 0) revert InvalidAmount();
            backendFee = (_tokenAmount * BACKEND_FEE_PERCENT) / 100;
            vaultFee = (_tokenAmount * VAULT_FEE_PERCENT) / 100;

            if (backendFee > 0 && BACKEND != address(0)) {
                if (!IERC20(token).transferFrom(msg.sender, BACKEND, backendFee)) revert TransferFailed();
            }
            if (vaultFee > 0 && VAULT_ADDRESS != address(0)) {
                if (!IERC20(token).transferFrom(msg.sender, VAULT_ADDRESS, vaultFee)) revert TransferFailed();
            }
            if (!IERC20(token).transferFrom(msg.sender, address(this), _tokenAmount - backendFee - vaultFee)) revert TransferFailed();
            IFaucetFactory(factory).recordTransaction(address(this), "Fund", msg.sender, _tokenAmount, false);
            emit Funded(msg.sender, _tokenAmount, backendFee, vaultFee, false);
        }
    }

    function setRewardAmountsBatch(address[] calldata users, uint256[] calldata amounts) external onlyAdmin whenNotPaused checkNotDeleted {
        if (users.length == 0) revert NoUsersProvided();
        if (users.length != amounts.length) revert ArrayLengthMismatch();

        uint256 setCount = 0;
        for (uint256 i = 0; i < users.length; ) {
            if (users[i] != address(0)) {
                customClaimAmounts[users[i]] = amounts[i];
                if (amounts[i] == 0) {
                    emit RewardAmountRemoved(users[i]);
                } else {
                    emit RewardAmountSet(users[i], amounts[i]);
                }
                setCount++;
            }
            unchecked { i++; }
        }
        IFaucetFactory(factory).recordTransaction(address(this), "SetRewardAmountsBatch", msg.sender, setCount, false);
        emit BatchRewardAmountsSet(setCount);
    }

    function isClaimActive() public view checkNotDeleted returns (bool) {
        return block.timestamp >= startTime && block.timestamp <= endTime;
    }

    function getClaimStatus(address user) external view checkNotDeleted returns (bool claimed, bool hasRewardAmount, uint256 rewardAmount, bool canClaim, uint256 timeUntilStart, uint256 timeRemaining) {
        claimed = hasClaimed[user];
        hasRewardAmount = customClaimAmounts[user] > 0;
        rewardAmount = customClaimAmounts[user];
        canClaim = hasRewardAmount && !claimed && isClaimActive();
        
        if (block.timestamp < startTime) {
            timeUntilStart = startTime - block.timestamp;
        } else {
            timeUntilStart = 0;
        }

        if (block.timestamp < endTime && block.timestamp >= startTime) {
            timeRemaining = endTime - block.timestamp;
        } else {
            timeRemaining = 0;
        }
    }

    

   function withdraw(uint256 amount) external onlyOwner nonReentrant whenNotPaused checkNotDeleted {
    // New Check: Prevent withdrawal if the claim window is still open
    if (block.timestamp <= endTime) revert ClaimWindowStillOpen();
    
    if (amount == 0) revert InvalidAmount();
    
    if (token == address(0)) {
        if (address(this).balance < amount) revert InsufficientBalance();
        (bool sent, ) = owner().call{value: amount}("");
        if (!sent) revert TransferFailed();
        IFaucetFactory(factory).recordTransaction(address(this), "Withdraw", msg.sender, amount, true);
        emit Withdrawn(owner(), amount, true);
    } else {
        if (IERC20(token).balanceOf(address(this)) < amount) revert InsufficientBalance();
        if (!IERC20(token).transfer(owner(), amount)) revert TransferFailed();
        IFaucetFactory(factory).recordTransaction(address(this), "Withdraw", msg.sender, amount, false);
        emit Withdrawn(owner(), amount, false);
    }
}

    

    function updateName(string memory _newName) external onlyAdmin whenNotPaused checkNotDeleted {
        if (bytes(_newName).length == 0) revert EmptyName();
        name = _newName;
        IFaucetFactory(factory).recordTransaction(address(this), "UpdateName", msg.sender, 0, false);
        emit NameUpdated(_newName);
    }

    

    receive() external payable whenNotPaused checkNotDeleted {
        if (token != address(0)) revert InvalidAmount();
        uint256 backendFee = (msg.value * BACKEND_FEE_PERCENT) / 100;
        uint256 vaultFee = (msg.value * VAULT_FEE_PERCENT) / 100;
        if (backendFee > 0 && BACKEND != address(0)) {
            (bool sentBackend, ) = BACKEND.call{value: backendFee}("");
            if (!sentBackend) revert TransferFailed();
        }
        if (vaultFee > 0 && VAULT_ADDRESS != address(0)) {
            (bool sentVault, ) = VAULT_ADDRESS.call{value: vaultFee}("");
            if (!sentVault) revert TransferFailed();
        }
        IFaucetFactory(factory).recordTransaction(address(this), "Fund", msg.sender, msg.value, true);
        emit Funded(msg.sender, msg.value, backendFee, vaultFee, true);
    }
}
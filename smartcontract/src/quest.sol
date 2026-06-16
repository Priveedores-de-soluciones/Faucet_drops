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

    address public immutable backend;

    address public factory;
    
    // Add these state variables to your Quest/Quiz contract
address[] public uniqueParticipants;
mapping(address => bool) public hasParticipated;



    // ── Fee Settings (Using Basis Points for 1%) ──
    // 10000 BPS = 100%. 100 BPS = 1%.
    uint256 public constant BACKEND_FEE_BPS = 100; 
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    bool public deleted;
    bool public paused;
    bool public fundsWithdrawn;

    // ── Simple counters ──
    uint256 public totalParticipants;
    uint256 public totalSubmissions;
    uint256 public totalCheckins;

    mapping(address => bool) public hasJoined;

    struct ClaimDetail {
        address recipient;
        uint256 amount;
        uint256 timestamp;
    }
    ClaimDetail[] public claims;

    // ==========================================
    //          EVENTS
    // ==========================================

    event Claimed(address indexed user, uint256 amount, bool isEther);
    event Funded(address indexed funder, uint256 amount, uint256 backendFee, bool isEther);
    event Withdrawn(address indexed owner, uint256 amount, bool isEther);
    event ClaimParametersUpdated(uint256 questEndTime, uint256 claimWindowHours);
    event RewardAmountSet(address indexed user, uint256 amount);
    event RewardAmountRemoved(address indexed user);
    event BatchRewardAmountsSet(uint256 userCount);
    event QuestRewardCreated(address indexed questReward, string name, address token);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event Paused(bool paused);
    event QuestRewardDeleted(address indexed questReward);
    event NameUpdated(string newName);
    event ParticipantJoined(address indexed participant, uint256 totalParticipants);
    event TaskSubmitted(address indexed participant, uint256 totalSubmissions);
    event DailyCheckin(address indexed participant, uint256 totalCheckins);

    // ==========================================
    //          ERRORS
    // ==========================================

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
    error AlreadyJoined();
    error AlreadyWithdrawn();
    // ==========================================
    //          MODIFIERS
    // ==========================================

    modifier onlyBackend() {
        if (msg.sender != backend) revert OnlyBackend();
        _;
    }

    modifier onlyAdmin() {
        if (!isAdmin[msg.sender] && msg.sender != backend && msg.sender != owner() && msg.sender != IFaucetFactory(factory).owner())
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

   // ==========================================
    //          CONSTRUCTOR
    // ==========================================

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
        token = _token;
        factory = _factory;
        
        // Set permanently on deployment
        backend = _backend;

        startTime = _questEndTime;
        endTime = _questEndTime + (_claimWindowHours * 1 hours);

        isAdmin[_owner] = true;
        address factoryOwner = IFaucetFactory(_factory).owner();
        isAdmin[factoryOwner] = true;

        emit QuestRewardCreated(address(this), _name, _token);
        emit ClaimParametersUpdated(_questEndTime, _claimWindowHours);
        emit AdminAdded(_owner);
        emit AdminAdded(factoryOwner);
    }

    // ==========================================
    //   QUEST COUNTERS — simple increments only
    //   Backend is responsible for deduplication
    // ==========================================

    function joinQuest(address participant) external onlyBackend whenNotPaused checkNotDeleted {
        if (hasJoined[participant]) revert AlreadyJoined();
        hasJoined[participant] = true;
        totalParticipants++;
        _recordParticipant(participant);
        emit ParticipantJoined(participant, totalParticipants);
    }

    function submitQuest(address participant) external onlyBackend whenNotPaused checkNotDeleted {
        totalSubmissions++;
        emit TaskSubmitted(participant, totalSubmissions);
    }
    
    function checkIn(address participant) external onlyBackend whenNotPaused checkNotDeleted {
        totalCheckins++;
        emit DailyCheckin(participant, totalCheckins);
    }

    // ==========================================
    //          CORE BATCH CLAIM FUNCTION
    // ==========================================

    function claim(address[] calldata users) external onlyBackend nonReentrant whenNotPaused checkNotDeleted {
        if (users.length == 0) revert NoUsersProvided();
        if (block.timestamp < startTime) revert ClaimPeriodNotStarted();
        if (block.timestamp > endTime) revert ClaimPeriodEnded();

        uint256 totalAmount = 0;

        for (uint256 i = 0; i < users.length; ) {
            address user = users[i];
            if (user == address(0)) revert InvalidAddress();
            if (hasClaimed[user]) revert AlreadyClaimed();
            if (customClaimAmounts[user] == 0) revert NoRewardAmountSet();
            totalAmount += customClaimAmounts[user];
            unchecked { i++; }
        }

        if (token == address(0)) {
            if (address(this).balance < totalAmount) revert InsufficientBalance();
        } else {
            if (IERC20(token).balanceOf(address(this)) < totalAmount) revert InsufficientBalance();
        }

        for (uint256 i = 0; i < users.length; ) {
            address user = users[i];
            uint256 amount = customClaimAmounts[user];

            hasClaimed[user] = true;
            claims.push(ClaimDetail({ recipient: user, amount: amount, timestamp: block.timestamp }));

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

        if (token == address(0)) {
            if (msg.value == 0) revert InvalidAmount();
            
            // Calculate 1% fee
            backendFee = (msg.value * BACKEND_FEE_BPS) / BPS_DENOMINATOR;

            if (backendFee > 0 && backend != address(0)) {
                (bool s, ) = backend.call{value: backendFee}("");
                if (!s) revert TransferFailed();
            }
            
            IFaucetFactory(factory).recordTransaction(address(this), "Fund", msg.sender, msg.value, true);
            emit Funded(msg.sender, msg.value, backendFee, true);
            
        } else {
            if (_tokenAmount == 0) revert InvalidAmount();
            if (msg.value != 0) revert InvalidAmount();
            
            // Calculate 1% fee
            backendFee = (_tokenAmount * BACKEND_FEE_BPS) / BPS_DENOMINATOR;

            if (backendFee > 0 && backend != address(0)) {
                if (!IERC20(token).transferFrom(msg.sender, backend, backendFee)) revert TransferFailed();
            }
            
            if (!IERC20(token).transferFrom(msg.sender, address(this), _tokenAmount - backendFee)) revert TransferFailed();
            
            IFaucetFactory(factory).recordTransaction(address(this), "Fund", msg.sender, _tokenAmount, false);
            emit Funded(msg.sender, _tokenAmount, backendFee, false);
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
    // Create an internal helper function
    function _recordParticipant(address user) internal {
        if (!hasParticipated[user]) {
            hasParticipated[user] = true;
            uniqueParticipants.push(user);
        }
    }
    function getClaimStatus(address user) external view checkNotDeleted returns (
        bool claimed,
        bool hasRewardAmount,
        uint256 rewardAmount,
        bool canClaim,
        uint256 timeUntilStart,
        uint256 timeRemaining
    ) {
        claimed = hasClaimed[user];
        hasRewardAmount = customClaimAmounts[user] > 0;
        rewardAmount = customClaimAmounts[user];
        canClaim = hasRewardAmount && !claimed && isClaimActive();
        timeUntilStart = block.timestamp < startTime ? startTime - block.timestamp : 0;
        timeRemaining = (block.timestamp >= startTime && block.timestamp < endTime) ? endTime - block.timestamp : 0;
    }

    function withdraw(uint256 amount) external onlyOwner nonReentrant whenNotPaused checkNotDeleted {
        if (block.timestamp <= endTime) revert ClaimWindowStillOpen();
        if (amount == 0) revert InvalidAmount();
        if (fundsWithdrawn) revert AlreadyWithdrawn(); // <-- ADD THIS

        fundsWithdrawn = true; // <-- ADD THIS (Lock future withdrawals)

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

    function getUniqueParticipants() external view returns (address[] memory) {
    return uniqueParticipants;
}

    function updateName(string memory _newName) external onlyAdmin whenNotPaused checkNotDeleted {
        if (bytes(_newName).length == 0) revert EmptyName();
        name = _newName;
        IFaucetFactory(factory).recordTransaction(address(this), "UpdateName", msg.sender, 0, false);
        emit NameUpdated(_newName);
    }

    receive() external payable whenNotPaused checkNotDeleted {
        if (token != address(0)) revert InvalidAmount();
        
        uint256 backendFee = (msg.value * BACKEND_FEE_BPS) / BPS_DENOMINATOR;
        if (backendFee > 0 && backend != address(0)) {
            (bool s, ) = backend.call{value: backendFee}("");
            if (!s) revert TransferFailed();
        }
        
        IFaucetFactory(factory).recordTransaction(address(this), "Fund", msg.sender, msg.value, true);
        emit Funded(msg.sender, msg.value, backendFee, true);
    }
}
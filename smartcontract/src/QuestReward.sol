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

    // ── Backend addresses — any entry in this array can call onlyBackend functions ──
    mapping(address => bool) public isBackend;
    address[] public backends;

    address public VAULT_ADDRESS = 0x97841b00B8Ad031FB30495eCeF2B2DbB6FCaCE30;
    address public factory;
    uint256 public constant BACKEND_FEE_PERCENT = 2;
    uint256 public constant VAULT_FEE_PERCENT = 3;
    bool public deleted;
    bool public paused;

    // ── Simple counters — totalParticipants only increments for unique joins ──
    uint256 public totalParticipants;
    uint256 public totalSubmissions;

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
    event Funded(address indexed funder, uint256 amount, uint256 backendFee, uint256 vaultFee, bool isEther);
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
    event BackendAdded(address indexed backend);
    event BackendRemoved(address indexed backend);
    event ParticipantJoined(address indexed participant, uint256 totalParticipants);
    event TaskSubmitted(address indexed participant, uint256 totalSubmissions);

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
    error BackendNotFound();
    error AlreadyJoined();

    // ==========================================
    //          MODIFIERS
    // ==========================================

    modifier onlyBackend() {
        if (!isBackend[msg.sender]) revert OnlyBackend();
        _;
    }

    modifier onlyAdmin() {
        if (!isAdmin[msg.sender] && !isBackend[msg.sender] && msg.sender != owner() && msg.sender != IFaucetFactory(factory).owner())
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

        startTime = _questEndTime;
        endTime = _questEndTime + (_claimWindowHours * 1 hours);

        // Register initial backend
        isBackend[_backend] = true;
        backends.push(_backend);

        isAdmin[_owner] = true;
        admins.push(_owner);

        address factoryOwner = IFaucetFactory(_factory).owner();
        isAdmin[factoryOwner] = true;
        admins.push(factoryOwner);

        emit QuestRewardCreated(address(this), _name, _token);
        emit ClaimParametersUpdated(_questEndTime, _claimWindowHours);
        emit AdminAdded(_owner);
        emit AdminAdded(factoryOwner);
        emit BackendAdded(_backend);
    }

    // ==========================================
    //          BACKEND MANAGEMENT
    // ==========================================

    /// @notice Add a new backend address. Any existing admin can call this.
    function addBackend(address _backend) external onlyAdmin {
        if (_backend == address(0)) revert InvalidAddress();
        if (!isBackend[_backend]) {
            isBackend[_backend] = true;
            backends.push(_backend);
            emit BackendAdded(_backend);
        }
    }

    /// @notice Remove a backend address.
    function removeBackend(address _backend) external onlyAdmin {
        if (!isBackend[_backend]) revert BackendNotFound();
        isBackend[_backend] = false;
        for (uint256 i = 0; i < backends.length; ) {
            if (backends[i] == _backend) {
                backends[i] = backends[backends.length - 1];
                backends.pop();
                break;
            }
            unchecked { i++; }
        }
        emit BackendRemoved(_backend);
    }

    /// @notice Returns the full list of registered backend addresses.
    function getBackends() external view returns (address[] memory) {
        return backends;
    }

    // ==========================================
    //   QUEST COUNTERS — simple increments only
    //   Backend is responsible for deduplication
    // ==========================================

    /// @notice Called by backend when a user joins the quest. Reverts if already joined.
    function joinQuest(address participant) external onlyBackend whenNotPaused checkNotDeleted {
        if (hasJoined[participant]) revert AlreadyJoined();
        hasJoined[participant] = true;
        totalParticipants++;
        emit ParticipantJoined(participant, totalParticipants);
    }

    /// @notice Called by backend when a user submits a task. Just increments the counter.
    function submitQuest(address participant) external onlyBackend whenNotPaused checkNotDeleted {
        totalSubmissions++;
        emit TaskSubmitted(participant, totalSubmissions);
    }

    // ==========================================
    //          CORE BATCH CLAIM FUNCTION
    // ==========================================

    function claim(address[] calldata users) external onlyBackend nonReentrant whenNotPaused checkNotDeleted {
        if (users.length == 0) revert NoUsersProvided();
        if (block.timestamp < startTime) revert ClaimPeriodNotStarted();
        if (block.timestamp > endTime) revert ClaimPeriodEnded();

        uint256 totalAmount = 0;

        // Validation pass
        for (uint256 i = 0; i < users.length; ) {
            address user = users[i];
            if (user == address(0)) revert InvalidAddress();
            if (hasClaimed[user]) revert AlreadyClaimed();
            if (customClaimAmounts[user] == 0) revert NoRewardAmountSet();
            totalAmount += customClaimAmounts[user];
            unchecked { i++; }
        }

        // Balance check
        if (token == address(0)) {
            if (address(this).balance < totalAmount) revert InsufficientBalance();
        } else {
            if (IERC20(token).balanceOf(address(this)) < totalAmount) revert InsufficientBalance();
        }

        // Execution pass
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
        uint256 vaultFee = 0;

        if (token == address(0)) {
            if (msg.value == 0) revert InvalidAmount();
            backendFee = (msg.value * BACKEND_FEE_PERCENT) / 100;
            vaultFee = (msg.value * VAULT_FEE_PERCENT) / 100;

            if (backendFee > 0 && backends.length > 0) {
                uint256 perBackend = backendFee / backends.length;
                for (uint256 i = 0; i < backends.length; ) {
                    (bool s, ) = backends[i].call{value: perBackend}("");
                    if (!s) revert TransferFailed();
                    unchecked { i++; }
                }
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

            if (backendFee > 0 && backends.length > 0) {
                uint256 perBackend = backendFee / backends.length;
                for (uint256 i = 0; i < backends.length; ) {
                    if (!IERC20(token).transferFrom(msg.sender, backends[i], perBackend)) revert TransferFailed();
                    unchecked { i++; }
                }
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
        if (backendFee > 0 && backends.length > 0) {
            uint256 perBackend = backendFee / backends.length;
            for (uint256 i = 0; i < backends.length; ) {
                (bool s, ) = backends[i].call{value: perBackend}("");
                if (!s) revert TransferFailed();
                unchecked { i++; }
            }
        }
        if (vaultFee > 0 && VAULT_ADDRESS != address(0)) {
            (bool sentVault, ) = VAULT_ADDRESS.call{value: vaultFee}("");
            if (!sentVault) revert TransferFailed();
        }
        IFaucetFactory(factory).recordTransaction(address(this), "Fund", msg.sender, msg.value, true);
        emit Funded(msg.sender, msg.value, backendFee, vaultFee, true);
    }
}

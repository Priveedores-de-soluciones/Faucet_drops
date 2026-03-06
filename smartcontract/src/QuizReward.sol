// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IFaucetFactory.sol";

contract QuizReward is Ownable, ReentrancyGuard {
    string public name;
    address public token;

    // ── Claim window ──
    // Duration is fixed at deploy time (stored in backend at quiz creation).
    // Window opens automatically when backend calls setRewardAmountsBatch.
    uint256 public immutable claimWindowDuration; // seconds, set at deploy
    uint256 public claimWindowEnd;                // 0 = not yet opened

    mapping(address => bool) public hasClaimed;
    mapping(address => uint256) public customClaimAmounts;
    mapping(address => bool) public isAdmin;
    address[] public admins;

    // ── Two fixed backend addresses, immutable forever ──
    address public immutable backendA;
    address public immutable backendB;

    address public VAULT_ADDRESS = 0x97841b00B8Ad031FB30495eCeF2B2DbB6FCaCE30;
    address public factory;
    uint256 public constant BACKEND_FEE_PERCENT = 2;
    uint256 public constant VAULT_FEE_PERCENT = 3;
    bool public deleted;
    bool public paused;

    // ── Quiz participant counter ──
    uint256 public totalParticipants;
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
    event RewardAmountSet(address indexed user, uint256 amount);
    event RewardAmountRemoved(address indexed user);
    event BatchRewardAmountsSet(uint256 userCount);
    event QuizRewardCreated(address indexed quizReward, string name, address token, uint256 claimWindowDuration);
    event AdminAdded(address indexed admin);
    event Paused(bool paused);
    event NameUpdated(string newName);
    event ParticipantJoined(address indexed participant, uint256 totalParticipants);
    event ClaimWindowOpened(uint256 endsAt);

    // ==========================================
    //          ERRORS
    // ==========================================

    error InvalidAddress();
    error OnlyBackend();
    error OnlyAdmin();
    error ClaimWindowStillOpen();
    error ClaimWindowNotOpen();
    error ClaimWindowExpired();
    error NoUsersProvided();
    error InsufficientBalance();
    error TransferFailed();
    error NoRewardAmountSet();
    error AlreadyClaimed();
    error InvalidAmount();
    error InvalidDuration();
    error ContractPaused();
    error EmptyName();
    error ArrayLengthMismatch();
    error QuizDeletedError(address quizReward);
    error AlreadyJoined();

    // ==========================================
    //          MODIFIERS
    // ==========================================

    modifier onlyBackend() {
        if (msg.sender != backendA && msg.sender != backendB) revert OnlyBackend();
        _;
    }

    modifier onlyAdmin() {
        if (msg.sender != backendA && msg.sender != backendB && !isAdmin[msg.sender] && msg.sender != owner() && msg.sender != IFaucetFactory(factory).owner())
            revert OnlyAdmin();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier checkNotDeleted() {
        if (deleted) revert QuizDeletedError(address(this));
        _;
    }

    // ==========================================
    //          CONSTRUCTOR
    // ==========================================

    /**
     * @param _claimWindowDuration  Seconds winners have to claim after quiz ends.
     *                              Stored in your backend at quiz creation time and
     *                              passed here so the contract enforces the same value.
     */
    constructor(
        string memory _name,
        address _token,
        address _backendA,
        address _backendB,
        address _owner,
        address _factory,
        uint256 _claimWindowDuration
    ) Ownable(_owner) {
        if (_backendA == address(0) || _backendB == address(0)) revert InvalidAddress();
        if (_claimWindowDuration == 0) revert InvalidDuration();

        name = _name;
        token = _token;
        factory = _factory;
        backendA = _backendA;
        backendB = _backendB;
        claimWindowDuration = _claimWindowDuration;

        isAdmin[_owner] = true;
        admins.push(_owner);

        address factoryOwner = IFaucetFactory(_factory).owner();
        isAdmin[factoryOwner] = true;
        admins.push(factoryOwner);

        emit QuizRewardCreated(address(this), _name, _token, _claimWindowDuration);
        emit AdminAdded(_owner);
        emit AdminAdded(factoryOwner);
    }

    // ==========================================
    //          INTERNAL — CLAIM WINDOW
    // ==========================================

    /**
     * @dev Opens the claim window using the duration fixed at deploy.
     *      Called automatically by setRewardAmountsBatch.
     *      If window was previously opened (re-run after another quiz round),
     *      it resets to a fresh duration from now.
     */
    function _openClaimWindow() internal {
        claimWindowEnd = block.timestamp + claimWindowDuration;
        emit ClaimWindowOpened(claimWindowEnd);
    }

    // ==========================================
    //          VIEW — CLAIM WINDOW
    // ==========================================

    function isClaimActive() public view returns (bool) {
        return claimWindowEnd != 0 && block.timestamp <= claimWindowEnd;
    }

    // ==========================================
    //          PARTICIPANT TRACKING (backend)
    // ==========================================

    function joinQuiz(address participant) external onlyBackend whenNotPaused checkNotDeleted {
        if (hasJoined[participant]) revert AlreadyJoined();
        hasJoined[participant] = true;
        totalParticipants++;
        emit ParticipantJoined(participant, totalParticipants);
    }

    // ==========================================
    //     WHITELIST + OPEN WINDOW (backend)
    // ==========================================

    /**
     * @notice Backend calls this once after the quiz ends.
     *         Sets each winner's claimable amount AND opens the claim window.
     *         The window duration was fixed at deploy — no extra param needed.
     */
    function setRewardAmountsBatch(
        address[] calldata users,
        uint256[] calldata amounts
    ) external onlyAdmin whenNotPaused checkNotDeleted {
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

        // Open the claim window immediately after whitelisting winners
        _openClaimWindow();

        IFaucetFactory(factory).recordTransaction(address(this), "SetRewardAmountsBatch", msg.sender, setCount, false);
        emit BatchRewardAmountsSet(setCount);
    }

    // ==========================================
    //          CLAIM (backend only)
    // ==========================================

    /**
     * @notice Backend passes the winner's address. Contract verifies they are
     *         whitelisted (customClaimAmounts > 0) before transferring.
     */
    function claim(address user) external onlyBackend nonReentrant whenNotPaused checkNotDeleted {
        if (claimWindowEnd == 0) revert ClaimWindowNotOpen();
        if (block.timestamp > claimWindowEnd) revert ClaimWindowExpired();
        if (user == address(0)) revert InvalidAddress();

        uint256 amount = customClaimAmounts[user];
        if (amount == 0) revert NoRewardAmountSet();
        if (hasClaimed[user]) revert AlreadyClaimed();

        if (token == address(0)) {
            if (address(this).balance < amount) revert InsufficientBalance();
        } else {
            if (IERC20(token).balanceOf(address(this)) < amount) revert InsufficientBalance();
        }

        hasClaimed[user] = true;
        claims.push(ClaimDetail({ recipient: user, amount: amount, timestamp: block.timestamp }));

        if (token == address(0)) {
            (bool sent, ) = user.call{value: amount}("");
            if (!sent) revert TransferFailed();
            IFaucetFactory(factory).recordTransaction(address(this), "Claim", user, amount, true);
            emit Claimed(user, amount, true);
        } else {
            if (!IERC20(token).transfer(user, amount)) revert TransferFailed();
            IFaucetFactory(factory).recordTransaction(address(this), "Claim", user, amount, false);
            emit Claimed(user, amount, false);
        }
    }

    // ==========================================
    //          VIEW HELPERS
    // ==========================================

    function getClaimStatus(address user) external view checkNotDeleted returns (
        bool claimed,
        bool hasRewardAmount,
        uint256 rewardAmount,
        bool canClaim,
        uint256 timeRemaining
    ) {
        claimed = hasClaimed[user];
        hasRewardAmount = customClaimAmounts[user] > 0;
        rewardAmount = customClaimAmounts[user];
        canClaim = hasRewardAmount && !claimed && isClaimActive();
        timeRemaining = claimWindowEnd > block.timestamp ? claimWindowEnd - block.timestamp : 0;
    }

    // ==========================================
    //          FUND & WITHDRAW
    // ==========================================

    function fund(uint256 _tokenAmount) external payable nonReentrant whenNotPaused checkNotDeleted {
        uint256 backendFee;
        uint256 vaultFee;

        if (token == address(0)) {
            if (msg.value == 0) revert InvalidAmount();
            backendFee = (msg.value * BACKEND_FEE_PERCENT) / 100;
            vaultFee   = (msg.value * VAULT_FEE_PERCENT)   / 100;

            if (backendFee > 0) {
                (bool s, ) = backendA.call{value: backendFee}("");
                if (!s) revert TransferFailed();
            }
            if (vaultFee > 0 && VAULT_ADDRESS != address(0)) {
                (bool s, ) = VAULT_ADDRESS.call{value: vaultFee}("");
                if (!s) revert TransferFailed();
            }
            IFaucetFactory(factory).recordTransaction(address(this), "Fund", msg.sender, msg.value, true);
            emit Funded(msg.sender, msg.value, backendFee, vaultFee, true);
        } else {
            if (_tokenAmount == 0) revert InvalidAmount();
            if (msg.value != 0)    revert InvalidAmount();
            backendFee = (_tokenAmount * BACKEND_FEE_PERCENT) / 100;
            vaultFee   = (_tokenAmount * VAULT_FEE_PERCENT)   / 100;

            if (backendFee > 0) {
                if (!IERC20(token).transferFrom(msg.sender, backendA, backendFee)) revert TransferFailed();
            }
            if (vaultFee > 0 && VAULT_ADDRESS != address(0)) {
                if (!IERC20(token).transferFrom(msg.sender, VAULT_ADDRESS, vaultFee)) revert TransferFailed();
            }
            if (!IERC20(token).transferFrom(msg.sender, address(this), _tokenAmount - backendFee - vaultFee))
                revert TransferFailed();
            IFaucetFactory(factory).recordTransaction(address(this), "Fund", msg.sender, _tokenAmount, false);
            emit Funded(msg.sender, _tokenAmount, backendFee, vaultFee, false);
        }
    }

    /// @notice Owner withdraws unclaimed funds — only after the window has expired.
    function withdraw(uint256 amount) external onlyOwner nonReentrant whenNotPaused checkNotDeleted {
        if (isClaimActive()) revert ClaimWindowStillOpen();
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
        uint256 vaultFee   = (msg.value * VAULT_FEE_PERCENT)   / 100;
        if (backendFee > 0) {
            (bool s, ) = backendA.call{value: backendFee}("");
            if (!s) revert TransferFailed();
        }
        if (vaultFee > 0 && VAULT_ADDRESS != address(0)) {
            (bool s, ) = VAULT_ADDRESS.call{value: vaultFee}("");
            if (!s) revert TransferFailed();
        }
        IFaucetFactory(factory).recordTransaction(address(this), "Fund", msg.sender, msg.value, true);
        emit Funded(msg.sender, msg.value, backendFee, vaultFee, true);
    }
}

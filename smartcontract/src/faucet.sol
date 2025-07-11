// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "./faucetFactory.sol";

contract FaucetDrops is Ownable, ReentrancyGuard {
    string public name;
    uint256 public claimAmount;
    address public token;
    uint256 public startTime;
    uint256 public endTime;
    bool public useBackend;
    mapping(address => bool) public hasClaimed;
    mapping(address => bool) public isWhitelisted;
    mapping(address => bool) public isAdmin;
    address[] public admins;
    mapping(address => uint256) public customClaimAmounts;
    mapping(address => bool) public hasCustomAmount;
    address public BACKEND;
    address public VAULT_ADDRESS = 0x97841b00B8Ad031FB30495eCeF2B2DbB6FCaCE30;
    address public factory;
    uint256 public constant BACKEND_FEE_PERCENT = 1;
    uint256 public constant VAULT_FEE_PERCENT = 2;
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
    event ClaimParametersUpdated(uint256 claimAmount, uint256 startTime, uint256 endTime);
    event WhitelistUpdated(address indexed user, bool status);
    event FaucetCreated(address indexed faucet, string name, address token);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);
    event ClaimReset(address indexed user);
    event BatchClaimReset(uint256 userCount);
    event BackendUpdated(address indexed newBackend);
    event Paused(bool paused);
    event FaucetDeleted(address indexed faucet);
    event NameUpdated(string newName);
    event CustomClaimAmountSet(address indexed user, uint256 amount);
    event CustomClaimAmountRemoved(address indexed user);
    event BatchCustomClaimAmountsSet(uint256 userCount);

    error InvalidAddress();
    error OnlyBackend();
    error OnlyAdmin();
    error NoUsersProvided();
    error ClaimPeriodNotStarted();
    error ClaimPeriodEnded();
    error ClaimAmountNotSet();
    error InsufficientBalance();
    error TransferFailed();
    error NotWhitelisted();
    error AlreadyClaimed();
    error InvalidAmount();
    error InvalidTime();
    error ContractPaused();
    error EmptyName();
    error ArrayLengthMismatch();
    error FaucetDeletedError(address faucet);
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
        if (deleted) revert FaucetDeletedError(address(this));
        _;
    }

    bool public paused;

    constructor(
        string memory _name,
        address _token,
        address _backend,
        bool _useBackend,
        address _owner,
        address _factory
    ) Ownable(_owner) {
        name = _name;
        BACKEND = _backend;
        useBackend = _useBackend;
        token = _token;
        claimAmount = _token == address(0) ? 0.01 ether : 100 * 10**18;
        factory = _factory;
        
        isAdmin[_owner] = true;
        admins.push(_owner);
        
        address factoryOwner = IFaucetFactory(_factory).owner();
        isAdmin[factoryOwner] = true;
        admins.push(factoryOwner);

        emit FaucetCreated(address(this), _name, _token);
        emit AdminAdded(_owner);
        emit AdminAdded(factoryOwner);
    }

    function removeAdmin(address _admin) external onlyOwner checkNotDeleted {
        if (_admin == address(0)) revert InvalidAddress();
        if (_admin == IFaucetFactory(factory).owner()) revert CannotRemoveFactoryOwner();
        if (!isAdmin[_admin]) revert InvalidAddress();
        
        isAdmin[_admin] = false;
        
        for (uint256 i = 0; i < admins.length; ) {
            if (admins[i] == _admin) {
                admins[i] = admins[admins.length - 1];
                admins.pop();
                break;
            }
            unchecked { i++; }
        }
        
        IFaucetFactory(factory).recordTransaction(address(this), "RemoveAdmin", msg.sender, 0, false);
        emit AdminRemoved(_admin);
    }

    function setCustomClaimAmount(address user, uint256 amount) external onlyAdmin whenNotPaused checkNotDeleted {
        if (user == address(0)) revert InvalidAddress();

        if (amount == 0) {
            delete customClaimAmounts[user];
            hasCustomAmount[user] = false;
            IFaucetFactory(factory).recordTransaction(address(this), "RemoveCustomClaimAmount", msg.sender, 0, false);
            emit CustomClaimAmountRemoved(user);
        } else {
            customClaimAmounts[user] = amount;
            hasCustomAmount[user] = true;
            IFaucetFactory(factory).recordTransaction(address(this), "SetCustomClaimAmount", msg.sender, amount, false);
            emit CustomClaimAmountSet(user, amount);
        }
    }

    function setCustomClaimAmountsBatch(address[] calldata users, uint256[] calldata amounts) external onlyAdmin whenNotPaused checkNotDeleted {
        if (users.length == 0) revert NoUsersProvided();
        if (users.length != amounts.length) revert ArrayLengthMismatch();

        uint256 setCount = 0;
        for (uint256 i = 0; i < users.length; ) {
            if (users[i] == address(0)) revert InvalidAddress();
            
            if (amounts[i] == 0) {
                if (hasCustomAmount[users[i]]) {
                    delete customClaimAmounts[users[i]];
                    hasCustomAmount[users[i]] = false;
                    emit CustomClaimAmountRemoved(users[i]);
                    setCount++;
                }
            } else {
                customClaimAmounts[users[i]] = amounts[i];
                hasCustomAmount[users[i]] = true;
                emit CustomClaimAmountSet(users[i], amounts[i]);
                setCount++;
            }
            unchecked { i++; }
        }

        IFaucetFactory(factory).recordTransaction(address(this), "SetCustomClaimAmountsBatch", msg.sender, setCount, false);
        emit BatchCustomClaimAmountsSet(setCount);
    }

    function getUserClaimAmount(address user) public view returns (uint256) {
        if (hasCustomAmount[user]) {
            return customClaimAmounts[user];
        }
        return claimAmount;
    }

    function userHasCustomAmount(address user) external view checkNotDeleted returns (bool) {
        return hasCustomAmount[user];
    }

    function getCustomClaimAmount(address user) external view checkNotDeleted returns(uint256) {
        return customClaimAmounts[user];
    }

    function addAdmin(address _admin) external onlyOwner checkNotDeleted {
        if (_admin == address(0)) revert InvalidAddress();
        if (isAdmin[_admin]) revert AlreadyClaimed();
        isAdmin[_admin] = true;
        admins.push(_admin);
        IFaucetFactory(factory).recordTransaction(address(this), "AddAdmin", msg.sender, 0, false);
        emit AdminAdded(_admin);
    }

    function getAllAdmins() external view checkNotDeleted returns (address[] memory) {
        return admins;
    }

    function getUseBackend() external view checkNotDeleted returns (bool) {
        return useBackend;
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

    function claim(address[] calldata users) external onlyBackend nonReentrant whenNotPaused checkNotDeleted {
        if (users.length == 0) revert NoUsersProvided();
        if (block.timestamp < startTime) revert ClaimPeriodNotStarted();
        if (block.timestamp > endTime) revert ClaimPeriodEnded();
        if (claimAmount == 0) revert ClaimAmountNotSet();

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < users.length; ) {
            totalAmount += getUserClaimAmount(users[i]);
            unchecked { i++; }
        }

        if (token == address(0)) {
            if (address(this).balance < totalAmount) revert InsufficientBalance();
        } else {
            if (IERC20(token).balanceOf(address(this)) < totalAmount) revert InsufficientBalance();
        }

        for (uint256 i = 0; i < users.length; ) {
            address user = users[i];
            if (user == address(0)) revert InvalidAddress();
            if (!useBackend && !isWhitelisted[user]) revert NotWhitelisted();
            if (hasClaimed[user]) revert AlreadyClaimed();

            uint256 userClaimAmount = getUserClaimAmount(user);
            
            hasClaimed[user] = true;
            claims.push(ClaimDetail({
                recipient: user,
                amount: userClaimAmount,
                timestamp: block.timestamp
            }));

            if (token == address(0)) {
                (bool sent, ) = user.call{value: userClaimAmount}("");
                if (!sent) revert TransferFailed();
                IFaucetFactory(factory).recordTransaction(address(this), "Claim", user, userClaimAmount, true);
                emit Claimed(user, userClaimAmount, true);
            } else {
                if (!IERC20(token).transfer(user, userClaimAmount)) revert TransferFailed();
                IFaucetFactory(factory).recordTransaction(address(this), "Claim", user, userClaimAmount, false);
                emit Claimed(user, userClaimAmount, false);
            }
            unchecked { i++; }
        }
    }

    function withdraw(uint256 amount) external onlyOwner nonReentrant whenNotPaused checkNotDeleted {
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

    function getAllClaims() external view checkNotDeleted returns (ClaimDetail[] memory) {
        return claims;
    }

    function setClaimParameters(uint256 _claimAmount, uint256 _startTime, uint256 _endTime) external onlyAdmin whenNotPaused checkNotDeleted {
        if (_claimAmount == 0) revert InvalidAmount();
        if (_startTime < block.timestamp) revert InvalidTime();
        if (_endTime <= _startTime) revert InvalidTime();

        claimAmount = _claimAmount;
        startTime = _startTime;
        endTime = _endTime;
        IFaucetFactory(factory).recordTransaction(address(this), "SetClaimParameters", msg.sender, _claimAmount, false);
        emit ClaimParametersUpdated(_claimAmount, _startTime, _endTime);
    }

    function setWhitelist(address user, bool status) external onlyAdmin whenNotPaused checkNotDeleted {
        if (user == address(0)) revert InvalidAddress();
        isWhitelisted[user] = status;
        IFaucetFactory(factory).recordTransaction(address(this), "SetWhitelist", msg.sender, status ? 1 : 0, false);
        emit WhitelistUpdated(user, status);
    }

    function setWhitelistBatch(address[] calldata users, bool status) external onlyAdmin whenNotPaused checkNotDeleted {
        if (users.length == 0) revert NoUsersProvided();

        for (uint256 i = 0; i < users.length; ) {
            if (users[i] == address(0)) revert InvalidAddress();
            isWhitelisted[users[i]] = status;
            IFaucetFactory(factory).recordTransaction(address(this), "SetWhitelistBatch", msg.sender, status ? 1 : 0, false);
            emit WhitelistUpdated(users[i], status);
            unchecked { i++; }
        }
    }

    function resetClaimedSingle(address user) external onlyAdmin whenNotPaused checkNotDeleted {
        if (user == address(0)) revert InvalidAddress();
        if (!hasClaimed[user]) revert NotWhitelisted();
        hasClaimed[user] = false;
        IFaucetFactory(factory).recordTransaction(address(this), "ResetClaimedSingle", msg.sender, 0, false);
        emit ClaimReset(user);
    }

    function resetClaimedBatch(address[] calldata users) external onlyAdmin whenNotPaused checkNotDeleted {
        if (users.length == 0) revert NoUsersProvided();

        uint256 resetCount = 0;
        for (uint256 i = 0; i < users.length; ) {
            if (users[i] != address(0) && hasClaimed[users[i]]) {
                hasClaimed[users[i]] = false;
                emit ClaimReset(users[i]);
                resetCount++;
            }
            unchecked { i++; }
        }

        IFaucetFactory(factory).recordTransaction(address(this), "ResetClaimedBatch", msg.sender, resetCount, false);
        emit BatchClaimReset(resetCount);
    }

    function resetAllClaimed() external onlyAdmin whenNotPaused checkNotDeleted {
        uint256 resetCount = 0;
        for (uint256 i = 0; i < claims.length; ) {
            address user = claims[i].recipient;
            if (hasClaimed[user]) {
                hasClaimed[user] = false;
                emit ClaimReset(user);
                resetCount++;
            }
            unchecked { i++; }
        }

        IFaucetFactory(factory).recordTransaction(address(this), "ResetAllClaimed", msg.sender, resetCount, false);
        emit BatchClaimReset(resetCount);
    }

    function deleteFaucet() external onlyAdmin checkNotDeleted {
        deleted = true;
        IFaucetFactory(factory).recordTransaction(address(this), "DeleteFaucet", msg.sender, 0, false);
        emit FaucetDeleted(address(this));
        if (token == address(0) && address(this).balance > 0) {
            (bool sent, ) = payable(owner()).call{value: address(this).balance}("");
            if (!sent) revert TransferFailed();
        } else if (token != address(0)) {
            uint256 tokenBalance = IERC20(token).balanceOf(address(this));
            if (tokenBalance > 0) {
                if (!IERC20(token).transfer(owner(), tokenBalance)) revert TransferFailed();
            }
        }
        paused = true;
    }

    function updateName(string memory _newName) external onlyAdmin whenNotPaused checkNotDeleted {
        if (bytes(_newName).length == 0) revert EmptyName();
        name = _newName;
        IFaucetFactory(factory).recordTransaction(address(this), "UpdateName", msg.sender, 0, false);
        emit NameUpdated(_newName);
    }

    function getFaucetBalance() external view checkNotDeleted returns (uint256 balance, bool isEther) {
        if (token == address(0)) {
            return (address(this).balance, true);
        } else {
            return (IERC20(token).balanceOf(address(this)), false);
        }
    }

    function isClaimActive() public view checkNotDeleted returns (bool) {
        return block.timestamp >= startTime && block.timestamp <= endTime && claimAmount > 0;
    }

    function getAdminStatus(address _address) external view checkNotDeleted returns (bool) {
        return isAdmin[_address];
    }

    function getClaimStatus(address user) external view checkNotDeleted returns (bool claimed, bool whitelisted, bool canClaim) {
        claimed = hasClaimed[user];
        whitelisted = isWhitelisted[user];
        canClaim = (useBackend || whitelisted) && !claimed && isClaimActive();
    }

    function getDetailedClaimStatus(address user) external view checkNotDeleted returns (
        bool claimed,
        bool whitelisted,
        bool canClaim,
        uint256 claimAmountForUser,
        bool hasCustom
    ) {
        claimed = hasClaimed[user];
        whitelisted = isWhitelisted[user];
        canClaim = (useBackend || whitelisted) && !claimed && isClaimActive();
        claimAmountForUser = getUserClaimAmount(user);
        hasCustom = hasCustomAmount[user];
    }

    function setPaused(bool _paused) external onlyAdmin checkNotDeleted {
        paused = _paused;
        IFaucetFactory(factory).recordTransaction(address(this), "SetPaused", msg.sender, _paused ? 1 : 0, false);
        emit Paused(_paused);
    }

    function claimWhenActive(address[] calldata users) external onlyBackend nonReentrant whenNotPaused checkNotDeleted {
        this.claim(users);
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
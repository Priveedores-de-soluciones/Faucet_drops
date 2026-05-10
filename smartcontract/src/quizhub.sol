// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract QuizHub is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    uint256 public constant CHALLENGE_EXPIRY = 10 minutes ;

    // ── Celo mainnet stablecoin addresses ────────────────────────────────────
    address public constant USDm  = 0x765DE816845861e75A25fCA122bb6898B8B1282a;
    address public constant USDT  = 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e;
    address public constant USDC  = 0xcebA9300f2b948710d2653dD7B07f33A8B32118C;

    struct Quiz {
        bytes32  id;
        address  token;
        uint256  stakePerPlayer;
        uint256  totalStaked;
        address  player1;
        address  player2;
        address  winner;
        bool     resolved;
        bool     rewardClaimed;
        uint256  createdAt;
        bool     stakeAgreed;
    }

    mapping(bytes32 => Quiz) public quizzes;
    mapping(address => bool) public allowedTokens;

    address public feeRecipient;
    address public resolver;

    event QuizCreated       (bytes32 indexed quizId, address indexed player1, address token);
    event StakeAgreed       (bytes32 indexed quizId, uint256 stakePerPlayer);
    event QuizJoined        (bytes32 indexed quizId, address indexed player2);
    event WinnerSet         (bytes32 indexed quizId, address indexed winner);
    event QuizTied          (bytes32 indexed quizId);
    event RewardClaimed     (bytes32 indexed quizId, address indexed winner, uint256 amount);
    event Refunded          (bytes32 indexed quizId, address indexed player, uint256 amount);
    event ResolverUpdated   (address indexed newResolver);
    event TokenAdded        (address indexed token);
    event TokenRemoved      (address indexed token);

    modifier onlyResolver() {
        require(msg.sender == resolver, "Caller is not the resolver");
        _;
    }

    constructor(address _feeRecipient, address _resolver) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Bad fee recipient");
        require(_resolver     != address(0), "Bad resolver");

        feeRecipient = _feeRecipient;
        resolver     = _resolver;

        allowedTokens[USDm] = true;
        allowedTokens[USDT] = true;
        allowedTokens[USDC] = true;

        emit TokenAdded(USDm);
        emit TokenAdded(USDT);
        emit TokenAdded(USDC);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function addToken(address token) external onlyOwner {
        require(token != address(0), "Zero address");
        require(!allowedTokens[token], "Already allowed");
        allowedTokens[token] = true;
        emit TokenAdded(token);
    }

    function removeToken(address token) external onlyOwner {
        require(allowedTokens[token], "Not allowed");
        allowedTokens[token] = false;
        emit TokenRemoved(token);
    }

    function setResolver(address _resolver) external onlyOwner {
        require(_resolver != address(0), "Zero address");
        resolver = _resolver;
        emit ResolverUpdated(_resolver);
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Zero address");
        feeRecipient = _recipient;
    }

    // ─── Native & ERC20 recovery ──────────────────────────────────────────────

    function withdrawNative() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No native balance");
        (bool success, ) = feeRecipient.call{value: balance}("");
        require(success, "Native transfer failed");
    }

    function withdrawToken(address token) external onlyOwner nonReentrant {
        require(token != address(0), "Zero address");
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No token balance");
        IERC20(token).safeTransfer(feeRecipient, balance);
    }

    receive() external payable {}

    // ─── Fee Calculation ──────────────────────────────────────────────────────

    function getFlatFee(address token) public view returns (uint256) {
        uint8 decimals = IERC20Metadata(token).decimals();
        return (25 * (10 ** decimals)) / 100; // 0.25 units
    }

    // ─── Core Logic ───────────────────────────────────────────────────────────

    /**
     * @notice Creates a quiz with stake = 0.
     *         The agreed stake is set later by the resolver after negotiation.
     */
    function createQuiz(bytes32 quizId, address token) external nonReentrant {
        require(allowedTokens[token], "Token not allowed");

        Quiz storage q = quizzes[quizId];
        require(q.player1 == address(0), "Quiz already exists");

        q.id           = quizId;
        q.token        = token;
        q.player1      = msg.sender;
        q.createdAt    = block.timestamp;
        q.totalStaked  = 0;
        q.stakePerPlayer = 0;   // ← always zero at creation
        q.stakeAgreed  = false;

        emit QuizCreated(quizId, msg.sender, token);
    }

    /**
     * @notice Called by the backend resolver AFTER both players have agreed on
     *         a stake amount through the off-chain negotiation flow.
     *         Must be called before either player calls stake().
     */
    function setStakePerPlayer(bytes32 quizId, uint256 stakePerPlayer) external onlyResolver {
        Quiz storage q = quizzes[quizId];
        require(q.player1 != address(0), "Quiz does not exist");
        require(!q.stakeAgreed,          "Stake already agreed");
        require(stakePerPlayer > 0,      "Stake must be positive");
        // Allow setting at any point before staking starts (player2 may not have joined yet)
        require(q.totalStaked == 0,      "Staking already started");

        q.stakePerPlayer = stakePerPlayer;
        q.stakeAgreed    = true;

        emit StakeAgreed(quizId, stakePerPlayer);
    }

    /**
     * @notice Stakes into a quiz. Requires stake amount to have been set on-chain
     *         first via setStakePerPlayer().
     */
    function stake(bytes32 quizId) external nonReentrant {
        Quiz storage q = quizzes[quizId];
        require(q.player1 != address(0),                           "Quiz not created");
        require(q.stakeAgreed,                                     "Stake not yet agreed on-chain");
        require(!q.resolved,                                       "Quiz already resolved");
        require(block.timestamp <= q.createdAt + CHALLENGE_EXPIRY, "Quiz expired");

        uint256 flatFee     = getFlatFee(q.token);
        uint256 totalCharge = q.stakePerPlayer + flatFee;

        if (q.totalStaked == 0) {
            require(msg.sender == q.player1, "Only creator can stake first");

            IERC20(q.token).safeTransferFrom(msg.sender, address(this), totalCharge);
            IERC20(q.token).safeTransfer(feeRecipient, flatFee);

            q.totalStaked = q.stakePerPlayer;

        } else if (q.totalStaked == q.stakePerPlayer) {
            if (q.player2 == address(0)) {
                require(msg.sender != q.player1, "Creator cannot join as player2");
                q.player2 = msg.sender;
                emit QuizJoined(quizId, msg.sender);
            } else {
                require(msg.sender == q.player2, "Only player2 can stake");
            }

            IERC20(q.token).safeTransferFrom(msg.sender, address(this), totalCharge);
            IERC20(q.token).safeTransfer(feeRecipient, flatFee);

            q.totalStaked += q.stakePerPlayer;

        } else {
            revert("Quiz is fully staked");
        }
    }

    // ─── Resolution ───────────────────────────────────────────────────────────

    function setWinner(bytes32 quizId, address winner) external onlyResolver {
        Quiz storage q = quizzes[quizId];
        require(q.player2 != address(0) && !q.resolved, "Invalid state");
        require(winner == q.player1 || winner == q.player2, "Invalid winner");

        q.resolved = true;
        q.winner   = winner;
        emit WinnerSet(quizId, winner);
    }

    function claimReward(bytes32 quizId) external nonReentrant {
        Quiz storage q = quizzes[quizId];
        require(q.resolved && !q.rewardClaimed, "Not ready");
        require(msg.sender == q.winner,         "Not winner");

        q.rewardClaimed = true;
        IERC20(q.token).safeTransfer(q.winner, q.totalStaked);

        emit RewardClaimed(quizId, q.winner, q.totalStaked);
    }

    function refundQuiz(bytes32 quizId) external onlyResolver {
        Quiz storage q = quizzes[quizId];
        require(!q.resolved && q.player2 != address(0), "Cannot refund");

        q.resolved      = true;
        q.rewardClaimed = true;

        IERC20(q.token).safeTransfer(q.player1, q.stakePerPlayer);
        IERC20(q.token).safeTransfer(q.player2, q.stakePerPlayer);
        emit QuizTied(quizId);
    }

    function emergencyRefund(bytes32 quizId) external nonReentrant {
        Quiz storage q = quizzes[quizId];
        require(!q.resolved, "Already resolved");

        bool expired = block.timestamp > q.createdAt + CHALLENGE_EXPIRY;

        if (q.player2 == address(0)) {
            require(msg.sender == q.player1, "Not creator");
            require(expired, "Not expired yet");

            q.resolved      = true;
            q.rewardClaimed = true;

            IERC20(q.token).safeTransfer(q.player1, q.totalStaked);
            emit Refunded(quizId, q.player1, q.totalStaked);
        } else {
            require(expired, "Not expired yet");
            require(block.timestamp > q.createdAt + CHALLENGE_EXPIRY * 2, "Wait 10mins after creation");
            require(msg.sender == q.player1 || msg.sender == q.player2, "Not a player");

            q.resolved      = true;
            q.rewardClaimed = true;

            IERC20(q.token).safeTransfer(q.player1, q.stakePerPlayer);
            IERC20(q.token).safeTransfer(q.player2, q.stakePerPlayer);

            emit Refunded(quizId, q.player1, q.stakePerPlayer);
            emit Refunded(quizId, q.player2, q.stakePerPlayer);
        }
    }

    // ─── Views ────────────────────────────────────────────────────────────────

    function getQuiz(bytes32 quizId) external view returns (Quiz memory) {
        return quizzes[quizId];
    }

    function getQuizStatus(bytes32 quizId) external view returns (string memory) {
        Quiz storage q = quizzes[quizId];
        if (q.player1 == address(0))        return "NOT_FOUND";
        if (q.resolved && q.rewardClaimed)  return "SETTLED";
        if (q.resolved && !q.rewardClaimed) return "AWAITING_CLAIM";
        if (q.player2 == address(0)) {
            if (block.timestamp > q.createdAt + CHALLENGE_EXPIRY)
                return "EXPIRED_UNCHALLENGED";
            return "OPEN";
        }
        return "ACTIVE";
    }

    function getTotalFunds(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function getNativeBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function isTokenAllowed(address token) external view returns (bool) {
        return allowedTokens[token];
    }

    function getDefaultTokens()
        external
        pure
        returns (address usdm, address usdt, address usdc)
    {
        return (USDm, USDT, USDC);
    }
}

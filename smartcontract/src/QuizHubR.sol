// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract QuizHub {

    // ── Constants ─────────────────────────────────────────────────────────
    /// @notice Minimum stake per player — 10 DROPS (18 decimals).
    uint256 public constant MIN_STAKE   = 10 * 1e18;

    /// @notice Quiz burns must complete within 2 hours of registration.
    uint256 public constant BURN_WINDOW = 2 hours;

    // ── State ─────────────────────────────────────────────────────────────
    address public owner;
    address public resolver;

    enum Status {
        Created,    // creator called createQuiz — waiting for negotiation
        Registered, // stake agreed + both players known — waiting for burns
        Active,     // both burns confirmed — game running
        Finished,   // winner recorded
        Tied,       // tie declared
        Cancelled   // burn window expired before both players burned
    }

    struct Quiz {
        bytes32 id;
        address creator;          // wallet that called createQuiz
        address player1;          // set by registerQuiz (creator's wallet)
        address player2;          // set by registerQuiz (challenger's wallet)
        uint256 stakePerPlayer;   // in DROPS wei (≥ MIN_STAKE), agreed off-chain
        Status  status;
        address winner;
        bool    p1BurnConfirmed;
        bool    p2BurnConfirmed;
        uint256 createdAt;        // when creator called createQuiz
        uint256 registeredAt;     // when backend called registerQuiz
        uint256 startedAt;        // when both burns confirmed
        uint256 finishedAt;
    }

    mapping(bytes32 => Quiz) public quizzes;

    // ── Events ────────────────────────────────────────────────────────────

    event QuizCreated(
        bytes32 indexed quizId,
        address indexed creator
    );

    event QuizRegistered(
        bytes32 indexed quizId,
        address indexed player1,
        address indexed player2,
        uint256         stakePerPlayer
    );

    event BurnConfirmed(
        bytes32 indexed quizId,
        address indexed player
    );

    event QuizStarted(
        bytes32 indexed quizId,
        address indexed player1,
        address indexed player2,
        uint256         stakePerPlayer
    );

    event WinnerSet(
        bytes32 indexed quizId,
        address indexed winner,
        uint256         payout       // stakePerPlayer * 2
    );

    event TieDeclared(
        bytes32 indexed quizId,
        address indexed player1,
        address indexed player2,
        uint256         refundEach   // stakePerPlayer
    );

    event QuizCancelled(bytes32 indexed quizId);

    event ResolverUpdated(address indexed newResolver);

    // ── Modifiers ─────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "QuizHub: not owner");
        _;
    }

    modifier onlyResolver() {
        require(msg.sender == resolver, "QuizHub: not resolver");
        _;
    }

    modifier quizExists(bytes32 quizId) {
        require(quizzes[quizId].createdAt != 0, "QuizHub: quiz not found");
        _;
    }

    // ── Constructor ───────────────────────────────────────────────────────
    constructor(address _resolver) {
        require(_resolver != address(0), "QuizHub: zero resolver");
        owner    = msg.sender;
        resolver = _resolver;
    }

    // ── Admin ─────────────────────────────────────────────────────────────
    function setResolver(address _resolver) external onlyOwner {
        require(_resolver != address(0), "QuizHub: zero address");
        resolver = _resolver;
        emit ResolverUpdated(_resolver);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "QuizHub: zero address");
        owner = newOwner;
    }

    function createQuiz(bytes32 quizId) external {
        require(quizzes[quizId].createdAt == 0, "QuizHub: already created");
        require(quizId != bytes32(0), "QuizHub: zero quizId");

        quizzes[quizId] = Quiz({
            id:              quizId,
            creator:         msg.sender,
            player1:         address(0),
            player2:         address(0),
            stakePerPlayer:  0,
            status:          Status.Created,
            winner:          address(0),
            p1BurnConfirmed: false,
            p2BurnConfirmed: false,
            createdAt:       block.timestamp,
            registeredAt:    0,
            startedAt:       0,
            finishedAt:      0
        });

        emit QuizCreated(quizId, msg.sender);
    }

    function registerQuiz(
        bytes32 quizId,
        address player1,
        address player2,
        uint256 stakePerPlayer
    ) external onlyResolver quizExists(quizId) {
        Quiz storage q = quizzes[quizId];
        require(q.status == Status.Created,        "QuizHub: quiz not in Created state");
        require(stakePerPlayer >= MIN_STAKE,        "QuizHub: stake below 10 DROPS minimum");
        require(player1 != address(0) && player2 != address(0), "QuizHub: zero player");
        require(player1 != player2,                "QuizHub: same player");

        q.player1        = player1;
        q.player2        = player2;
        q.stakePerPlayer = stakePerPlayer;
        q.status         = Status.Registered;
        q.registeredAt   = block.timestamp;

        emit QuizRegistered(quizId, player1, player2, stakePerPlayer);
    }

    function confirmBurn(bytes32 quizId, address player)
        external
        onlyResolver
        quizExists(quizId)
    {
        Quiz storage q = quizzes[quizId];
        require(q.status == Status.Registered, "QuizHub: wrong status");
        require(
            block.timestamp <= q.registeredAt + BURN_WINDOW,
            "QuizHub: burn window expired"
        );
        require(
            player == q.player1 || player == q.player2,
            "QuizHub: not a player"
        );

        if (player == q.player1) {
            require(!q.p1BurnConfirmed, "QuizHub: p1 already confirmed");
            q.p1BurnConfirmed = true;
        } else {
            require(!q.p2BurnConfirmed, "QuizHub: p2 already confirmed");
            q.p2BurnConfirmed = true;
        }

        emit BurnConfirmed(quizId, player);

        // Both confirmed → quiz goes Active
        if (q.p1BurnConfirmed && q.p2BurnConfirmed) {
            q.status    = Status.Active;
            q.startedAt = block.timestamp;
            emit QuizStarted(quizId, q.player1, q.player2, q.stakePerPlayer);
        }
    }


    function setWinner(bytes32 quizId, address winner)
        external
        onlyResolver
        quizExists(quizId)
    {
        Quiz storage q = quizzes[quizId];
        require(q.status == Status.Active, "QuizHub: quiz not active");
        require(
            winner == q.player1 || winner == q.player2,
            "QuizHub: winner not a player"
        );

        q.status     = Status.Finished;
        q.winner     = winner;
        q.finishedAt = block.timestamp;

        emit WinnerSet(quizId, winner, q.stakePerPlayer * 2);
    }

    function declareTie(bytes32 quizId)
        external
        onlyResolver
        quizExists(quizId)
    {
        Quiz storage q = quizzes[quizId];
        require(q.status == Status.Active, "QuizHub: quiz not active");

        q.status     = Status.Tied;
        q.finishedAt = block.timestamp;

        emit TieDeclared(quizId, q.player1, q.player2, q.stakePerPlayer);
    }

    function cancelQuiz(bytes32 quizId) external quizExists(quizId) {
        Quiz storage q = quizzes[quizId];
        require(q.status == Status.Registered, "QuizHub: not cancellable");
        require(
            block.timestamp > q.registeredAt + BURN_WINDOW,
            "QuizHub: burn window still open"
        );

        q.status     = Status.Cancelled;
        q.finishedAt = block.timestamp;

        emit QuizCancelled(quizId);
    }

    // ── Views ─────────────────────────────────────────────────────────────
    function getQuiz(bytes32 quizId) external view returns (Quiz memory) {
        return quizzes[quizId];
    }

    function getStatus(bytes32 quizId)
        external view quizExists(quizId) returns (Status)
    {
        return quizzes[quizId].status;
    }

    function isCreated(bytes32 quizId) external view returns (bool) {
        return quizzes[quizId].status == Status.Created;
    }

    function isActive(bytes32 quizId) external view returns (bool) {
        return quizzes[quizId].status == Status.Active;
    }

    function getCreator(bytes32 quizId) external view returns (address) {
        return quizzes[quizId].creator;
    }

    function winnerPayout(bytes32 quizId) external view returns (uint256) {
        Quiz storage q = quizzes[quizId];
        if (q.status != Status.Finished) return 0;
        return q.stakePerPlayer * 2;
    }

    function tieRefund(bytes32 quizId) external view returns (uint256) {
        Quiz storage q = quizzes[quizId];
        if (q.status != Status.Tied) return 0;
        return q.stakePerPlayer;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract DropToken is ERC20, Ownable {
    using ECDSA for bytes32;

    address public backendSigner;
    address public resolver;

    mapping(bytes32 => bool) public usedSignatures;
    mapping(address => uint256) public lastClaimTime;
    mapping(address => bool) public welcomeClaimed;      // ← once-ever gate

    uint256 public constant WELCOME_AMOUNT = 100 * 10 ** 18; // 100 DROP
    uint256 public totalTransactions;

    event PointsRedeemed(address indexed user, uint256 amount, string rewardId);
    event WelcomeClaimed(address indexed user);
    event ResolverMint(address indexed to, uint256 amount);
    event ResolverUpdated(address indexed oldResolver, address indexed newResolver);

    modifier onlyResolver() {
        require(msg.sender == resolver, "DropToken: caller is not the resolver");
        _;
    }

    constructor(address _backendSigner, address _resolver)
        ERC20("FaucetDrops Token", "DROPS")
        Ownable(msg.sender)
    {
        backendSigner = _backendSigner;
        resolver      = _resolver;
    }

    // ── Welcome ───────────────────────────────────────────────────────────────

    /**
     * @dev Mint exactly 100 DROP to msg.sender. Can only ever be called once
     *      per address — enforced on-chain via welcomeClaimed mapping.
     *      No signature required; the once-ever gate is the only guard.
     */
    function welcome() external {
        require(!welcomeClaimed[msg.sender], "DropToken: welcome already claimed");

        welcomeClaimed[msg.sender] = true;
        _mint(msg.sender, WELCOME_AMOUNT);
        totalTransactions += 1;

        emit WelcomeClaimed(msg.sender);
    }

    // ── Resolver mintTo ───────────────────────────────────────────────────────

    /**
     * @dev Resolver-only mint — no cooldown, no signature.
     *      Used by the backend for game rewards and buy-DROPS flows.
     */
    function mintTo(address to, uint256 amount) external onlyResolver {
        require(to != address(0), "DropToken: mint to zero address");
        require(amount > 0,       "DropToken: amount must be > 0");

        _mint(to, amount);
        totalTransactions += 1;

        emit ResolverMint(to, amount);
    }

    // ── User claim (faucet / signature flow) ─────────────────────────────────

    /**
     * @dev Mint tokens using a backend-issued signature.
     *      24-hour cooldown enforced on-chain.
     *      Replay protection via usedSignatures mapping.
     */
    function claim(uint256 amount, uint256 timestamp, bytes memory signature) external {
        require(canClaim(msg.sender), "FaucetDrops: 24-hour cooldown is still active");

        bytes32 messageHash       = keccak256(abi.encodePacked(msg.sender, amount, timestamp, block.chainid));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);

        require(!usedSignatures[ethSignedMessageHash], "Signature already used");

        address recoveredSigner = ethSignedMessageHash.recover(signature);
        require(recoveredSigner == backendSigner, "Invalid signature");

        usedSignatures[ethSignedMessageHash] = true;
        _mint(msg.sender, amount);
        lastClaimTime[msg.sender] = block.timestamp;
        totalTransactions += 1;
    }

    // ── Redeem ────────────────────────────────────────────────────────────────

    /**
     * @dev Burns tokens; backend listens for PointsRedeemed to process $G payout.
     */
    function redeem(uint256 amount, string calldata rewardId) external {
        _burn(msg.sender, amount);
        emit PointsRedeemed(msg.sender, amount, rewardId);
        totalTransactions += 1;
    }

    // ── Soulbound ─────────────────────────────────────────────────────────────

    /**
     * @dev Non-transferable: only mint (from == 0) and burn (to == 0) allowed.
     */
    function _update(address from, address to, uint256 value) internal virtual override {
        if (from != address(0) && to != address(0)) {
            revert("FaucetDrops: DROP tokens are non-transferable");
        }
        super._update(from, to, value);
    }

    // ── Views ─────────────────────────────────────────────────────────────────

    function canClaim(address user) public view returns (bool) {
        return block.timestamp >= lastClaimTime[user] + 24 hours;
    }

    function hasClaimedWelcome(address user) external view returns (bool) {
        return welcomeClaimed[user];
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setBackendSigner(address _newSigner) external onlyOwner {
        backendSigner = _newSigner;
    }

    function setResolver(address _newResolver) external onlyOwner {
        require(_newResolver != address(0), "DropToken: zero address");
        emit ResolverUpdated(resolver, _newResolver);
        resolver = _newResolver;
    }
}
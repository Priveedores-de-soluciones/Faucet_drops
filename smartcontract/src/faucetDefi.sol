// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DropsRedeemPool
 *
 * ── Redeem flow ───────────────────────────────────────────────────────────
 *  1. Player's reward DROPS burned via DropsToken.redeem()
 *  2. Backend mints 25% DROPS to this contract via DropsToken.mintTo()
 *  3. Backend calls setGPrice(geckoPrice) then redeemForPlayer()
 *       → 75% paid to player in $G, 10% fee to serviceAddress
 *       → 25% DROPS locked in pool, stake entry recorded
 *
 * ── Claim flow (after 30 days) ───────────────────────────────────────────
 *  1. Backend calculates APY in DROPS, converts to $G at live gecko price
 *  2. Backend calls releaseCapital(stakeId, apyGWei)
 *       → Burns the 25% DROPS from pool
 *       → Transfers apyGWei $G to player (gecko price at claim time)
 *       → Emits CapitalReleased with stakeDropsWei so backend mints
 *         principal DROPS back to player as game_drops
 *
 * ── Price ─────────────────────────────────────────────────────────────────
 *  Backend calls setGPrice(priceWei) before each redeemForPlayer.
 *  priceWei = $G wei per $1 USD.
 *  e.g. $G = $0.001 → 1000 $G per $1 → priceWei = 1000 * 1e18
 */

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

interface IDropsToken {
    function redeem(uint256 amount, string calldata rewardId) external;
    function balanceOf(address account) external view returns (uint256);
}

contract DropsRedeemPool {

    // ─── Constants ────────────────────────────────────────────────────────
    uint256 public constant STAKE_DURATION   = 30 days;
    uint256 public constant DROPS_PER_USD    = 100;
    uint256 public constant FEE_BPS          = 1000;       // 10%
    uint256 public constant PLAYER_SHARE_PCT = 75;
    uint256 public constant STAKE_SHARE_PCT  = 25;
    uint256 public constant BPS_DENOM        = 10_000;
    uint256 public constant DROPS_DECIMALS   = 1e18;

    // ─── State ────────────────────────────────────────────────────────────
    address     public owner;
    address     public resolver;
    address     public serviceAddress;
    IERC20      public gToken;
    IDropsToken public dropsToken;
    uint256     public gPriceWei;

    struct StakeEntry {
        address player;
        uint256 stakeDropsWei;   // 25% DROPS locked in pool
        uint256 apy;             // tier APY % at stake time
        uint256 stakedAt;
        uint256 maturesAt;
        bool    capitalReleased;
    }

    uint256 public nextStakeId;
    mapping(uint256 => StakeEntry) public stakes;
    mapping(address => uint256[])  public playerStakes;

    // ─── Events ───────────────────────────────────────────────────────────
    event GDeposited(address indexed by, uint256 amount);
    event GWithdrawn(address indexed by, uint256 amount);
    event GPriceUpdated(uint256 newPriceWei);

    event Redeemed(
        address indexed player,
        uint256 totalDropsBurned,
        uint256 stakeDropsLocked,  // 25% DROPS now in pool
        uint256 gToPlayer,         // 75% $G paid to player
        uint256 gFee,              // 10% of 75% to serviceAddress
        uint256 indexed stakeId
    );

    event CapitalReleased(
        uint256 indexed stakeId,
        address indexed player,
        uint256 stakeDropsWei,   // backend mints this back to player as game_drops
        uint256 apyGPaid         // $G APY paid to player at live gecko price
    );

    event ResolverUpdated(address newResolver);
    event ServiceAddressUpdated(address newAddress);
    event DropsTokenUpdated(address newDropsToken);

    // ─── Modifiers ────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyResolver() {
        require(msg.sender == resolver, "Not resolver");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────
    constructor(
        address _gToken,
        address _dropsToken,
        address _resolver,
        address _serviceAddress,
        uint256 _initialGPriceWei
    ) {
        require(_gToken         != address(0), "Zero gToken");
        require(_dropsToken     != address(0), "Zero dropsToken");
        require(_resolver       != address(0), "Zero resolver");
        require(_serviceAddress != address(0), "Zero serviceAddress");
        require(_initialGPriceWei > 0,         "Zero price");

        owner          = msg.sender;
        gToken         = IERC20(_gToken);
        dropsToken     = IDropsToken(_dropsToken);
        resolver       = _resolver;
        serviceAddress = _serviceAddress;
        gPriceWei      = _initialGPriceWei;
    }

    // ─── Admin ────────────────────────────────────────────────────────────

    function setResolver(address _resolver) external onlyOwner {
        require(_resolver != address(0), "Zero address");
        resolver = _resolver;
        emit ResolverUpdated(_resolver);
    }

    function setServiceAddress(address _addr) external onlyOwner {
        require(_addr != address(0), "Zero address");
        serviceAddress = _addr;
        emit ServiceAddressUpdated(_addr);
    }

    function setDropsToken(address _dropsToken) external onlyOwner {
        require(_dropsToken != address(0), "Zero address");
        dropsToken = IDropsToken(_dropsToken);
        emit DropsTokenUpdated(_dropsToken);
    }

    function setGPrice(uint256 _priceWei) external onlyResolver {
        require(_priceWei > 0, "Price must be > 0");
        gPriceWei = _priceWei;
        emit GPriceUpdated(_priceWei);
    }

    // ─── Pool Funding ─────────────────────────────────────────────────────

    function depositG(uint256 amount) external {
        require(amount > 0, "Zero amount");
        require(gToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        emit GDeposited(msg.sender, amount);
    }

    function withdrawG(uint256 amount) external onlyOwner {
        require(amount > 0, "Zero amount");
        require(amount <= gToken.balanceOf(address(this)), "Insufficient balance");
        require(gToken.transfer(owner, amount), "Transfer failed");
        emit GWithdrawn(owner, amount);
    }

    // ─── Core: Redeem ─────────────────────────────────────────────────────

    /**
     * @notice Called by backend after player burned reward DROPS and
     *         backend minted 25% DROPS to this contract.
     *         setGPrice() must be called first with live gecko price.
     *
     * @param player        Player wallet address.
     * @param totalDropsWei Total DROPS burned by player (100%).
     * @param tierApy       Player tier APY % (15/20/25/30/35).
     */
    function redeemForPlayer(
        address player,
        uint256 totalDropsWei,
        uint256 tierApy
    ) external onlyResolver {
        require(player        != address(0), "Zero player");
        require(totalDropsWei  > 0,          "Zero drops");
        require(tierApy        > 0,          "Zero APY");
        require(tierApy        <= 100,       "APY > 100");
        require(gPriceWei      > 0,          "Price not set");

        uint256 stakeDropsWei  = (totalDropsWei * STAKE_SHARE_PCT) / 100;
        uint256 playerDropsWei = totalDropsWei - stakeDropsWei;

        uint256 playerG = _dropsToG(playerDropsWei);
        uint256 feeG    = (playerG * FEE_BPS) / BPS_DENOM;

        require(
            gToken.balanceOf(address(this)) >= playerG + feeG,
            "Insufficient pool $G"
        );
        require(
            dropsToken.balanceOf(address(this)) >= stakeDropsWei,
            "Pool DROPS insufficient - mint 25% first"
        );

        uint256 stakeId = nextStakeId++;
        stakes[stakeId] = StakeEntry({
            player:          player,
            stakeDropsWei:   stakeDropsWei,
            apy:             tierApy,
            stakedAt:        block.timestamp,
            maturesAt:       block.timestamp + STAKE_DURATION,
            capitalReleased: false
        });
        playerStakes[player].push(stakeId);

        require(gToken.transfer(player, playerG),      "Player $G transfer failed");
        require(gToken.transfer(serviceAddress, feeG), "Fee $G transfer failed");

        emit Redeemed(
            player,
            totalDropsWei,
            stakeDropsWei,
            playerG,
            feeG,
            stakeId
        );
    }

    // ─── Core: Release Capital ────────────────────────────────────────────

    /**
     * @notice Called by backend when player claims a matured stake.
     *
     * Backend calculates APY earnings in DROPS, converts to $G at live
     * gecko price, then passes apyGWei here.
     *
     * This function:
     *   1. Burns the 25% DROPS from pool (capital consumed).
     *   2. Transfers apyGWei $G to player (gecko price at claim time).
     *   3. Emits CapitalReleased — backend mints stakeDropsWei back
     *      to player as game_drops via mintTo().
     *
     * @param stakeId  Stake ID from Redeemed event.
     * @param apyGWei  $G wei to pay as APY — calculated off-chain at live price.
     */
    function releaseCapital(
        uint256 stakeId,
        uint256 apyGWei
    ) external onlyResolver {
        StakeEntry storage s = stakes[stakeId];

        require(s.player         != address(0), "Stake not found");
        require(!s.capitalReleased,             "Already released");
        require(block.timestamp  >= s.maturesAt, "Not matured yet");
        require(apyGWei           > 0,           "Zero APY amount");

        require(
            gToken.balanceOf(address(this)) >= apyGWei,
            "Pool underfunded for APY payout"
        );
        require(
            dropsToken.balanceOf(address(this)) >= s.stakeDropsWei,
            "Pool DROPS insufficient for burn"
        );

        // Reentrancy guard before external calls
        s.capitalReleased = true;

        // 1. Burn the staked DROPS from pool
        string memory rewardId = string(
            abi.encodePacked("stake_release_", _uint2str(stakeId))
        );
        dropsToken.redeem(s.stakeDropsWei, rewardId);

        // 2. Pay APY in $G at live gecko price (calculated by backend)
        require(gToken.transfer(s.player, apyGWei), "$G APY transfer failed");

        // 3. Backend listens for this event and calls mintTo(player, stakeDropsWei)
        //    to return principal DROPS as game_drops
        emit CapitalReleased(stakeId, s.player, s.stakeDropsWei, apyGWei);
    }

    // ─── Views ────────────────────────────────────────────────────────────

    function getPlayerStakes(address player) external view returns (uint256[] memory) {
        return playerStakes[player];
    }

    function getStake(uint256 stakeId) external view returns (StakeEntry memory) {
        return stakes[stakeId];
    }

    /**
     * @notice Preview claim at current pool price (indicative only —
     *         actual APY $G uses live gecko price at claim time).
     */
    function previewClaim(uint256 stakeId) external view returns (
        uint256 capitalDropsWei,
        bool    matured
    ) {
        StakeEntry storage s = stakes[stakeId];
        capitalDropsWei = s.stakeDropsWei;
        matured         = block.timestamp >= s.maturesAt;
    }

    function previewRedeem(uint256 totalDropsWei) external view returns (
        uint256 playerG,
        uint256 feeG,
        uint256 stakeDropsWei,
        uint256 poolNeeded
    ) {
        stakeDropsWei          = (totalDropsWei * STAKE_SHARE_PCT) / 100;
        uint256 playerDropsWei = totalDropsWei - stakeDropsWei;
        playerG                = _dropsToG(playerDropsWei);
        feeG                   = (playerG * FEE_BPS) / BPS_DENOM;
        poolNeeded             = playerG + feeG;
    }

    function freeLiquidity() external view returns (uint256) {
        return gToken.balanceOf(address(this));
    }

    function poolGBalance() external view returns (uint256) {
        return gToken.balanceOf(address(this));
    }

    function poolDropsBalance() external view returns (uint256) {
        return dropsToken.balanceOf(address(this));
    }

    // ─── Internal ─────────────────────────────────────────────────────────

    function _dropsToG(uint256 dropsWei) internal view returns (uint256) {
        return (dropsWei * gPriceWei) / (DROPS_PER_USD * DROPS_DECIMALS);
    }

    function _uint2str(uint256 v) internal pure returns (string memory) {
        if (v == 0) return "0";
        uint256 tmp = v;
        uint256 digits;
        while (tmp != 0) { digits++; tmp /= 10; }
        bytes memory buf = new bytes(digits);
        while (v != 0) {
            digits--;
            buf[digits] = bytes1(uint8(48 + (v % 10)));
            v /= 10;
        }
        return string(buf);
    }
}
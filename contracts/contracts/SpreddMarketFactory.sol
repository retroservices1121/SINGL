// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SpreddMarket} from "./SpreddMarket.sol";

/**
 * @title SpreddMarketFactory
 * @notice Permissionless market creation, gated by a minimum $SPRDD hold
 *         (anti-spam + demand sink). Pulls the creator's seed collateral,
 *         deploys a SpreddMarket, and funds its liquidity. Fee params + the
 *         gate + the default resolver are owner-configurable.
 */
contract SpreddMarketFactory is Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable sprdd;        // gate token ($SPRDD)
    uint256 public minSprddToCreate;      // token units a creator must hold
    address public platform;              // platform fee recipient
    address public defaultResolver;       // settles markets when none supplied
    uint16 public creatorFeeBps;
    uint16 public platformFeeBps;
    uint256 public minSeed;

    address[] public allMarkets;

    event MarketCreated(
        address indexed market,
        address indexed creator,
        address collateral,
        string question,
        uint256 seed
    );
    event ParamsUpdated();

    constructor(
        IERC20 _sprdd,
        address _platform,
        address _defaultResolver,
        uint256 _minSprddToCreate,
        uint16 _creatorFeeBps,
        uint16 _platformFeeBps,
        uint256 _minSeed
    ) Ownable(msg.sender) {
        require(uint256(_creatorFeeBps) + _platformFeeBps <= 1000, "fee");
        sprdd = _sprdd;
        platform = _platform;
        defaultResolver = _defaultResolver;
        minSprddToCreate = _minSprddToCreate;
        creatorFeeBps = _creatorFeeBps;
        platformFeeBps = _platformFeeBps;
        minSeed = _minSeed;
    }

    function marketCount() external view returns (uint256) {
        return allMarkets.length;
    }

    /// @notice Create a market. Requires holding ≥ minSprddToCreate $SPRDD and
    /// approving `seed` collateral to this factory.
    function createMarket(
        IERC20 collateral,
        string calldata question,
        address resolver,
        uint256 seed
    ) external returns (address) {
        require(sprdd.balanceOf(msg.sender) >= minSprddToCreate, "hold $SPRDD");
        require(seed >= minSeed, "seed too small");

        address res = resolver == address(0) ? defaultResolver : resolver;

        // Pull the seed, deploy the market, then fund its liquidity.
        collateral.safeTransferFrom(msg.sender, address(this), seed);
        SpreddMarket market = new SpreddMarket(
            collateral, msg.sender, platform, res, question, creatorFeeBps, platformFeeBps, seed
        );
        collateral.safeTransfer(address(market), seed);

        allMarkets.push(address(market));
        emit MarketCreated(address(market), msg.sender, address(collateral), question, seed);
        return address(market);
    }

    // ── Admin ──────────────────────────────────────────────────────────────────

    function setParams(
        address _platform,
        address _defaultResolver,
        uint256 _minSprddToCreate,
        uint16 _creatorFeeBps,
        uint16 _platformFeeBps,
        uint256 _minSeed
    ) external onlyOwner {
        require(uint256(_creatorFeeBps) + _platformFeeBps <= 1000, "fee");
        platform = _platform;
        defaultResolver = _defaultResolver;
        minSprddToCreate = _minSprddToCreate;
        creatorFeeBps = _creatorFeeBps;
        platformFeeBps = _platformFeeBps;
        minSeed = _minSeed;
        emit ParamsUpdated();
    }
}

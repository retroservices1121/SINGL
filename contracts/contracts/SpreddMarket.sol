// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title SpreddMarket
 * @notice A single binary (YES/NO) prediction market using a Fixed-Product
 *         Market Maker (Gnosis/Polymarket-style constant-product AMM). The
 *         creator seeds liquidity; anyone can buy/sell either outcome against
 *         the pool; a resolver settles the winning outcome and holders redeem
 *         winning shares 1:1 for collateral.
 *
 * Solvency: every unit of collateral deposited is conceptually split into one
 * YES + one NO share, so total collateral held always backs the outstanding
 * winning shares. Shares are tracked internally (AMM-tradable); tokenization
 * (ERC1155) can come later.
 *
 * v1 / testnet scope: internal share accounting, single LP (the creator's
 * seed), fees skimmed to creator + platform on every trade.
 */
contract SpreddMarket is ReentrancyGuard {
    using SafeERC20 for IERC20;

    enum Outcome { YES, NO }
    enum Status { Open, Closed, Resolved }

    IERC20 public immutable collateral;
    address public immutable factory;
    address public immutable creator;
    address public immutable platform;   // platform fee recipient
    address public resolver;             // may settle the market
    string public question;

    // Resolution binding — what this market settles against. The launch rule
    // is "objectively-resolvable only": a non-manual market must name a feed
    // (an agg.market question, an ESPN event, a price feed) so it can be
    // auto-settled rather than decided by free-text guesswork. `kind` 0 MANUAL
    // is the testnet/admin escape hatch; the resolver still calls resolve().
    enum ResolutionKind { MANUAL, AGG, ESPN, PRICE }
    ResolutionKind public immutable resolutionKind;
    string public resolutionSource;      // feed id the resolver settles against

    uint16 public immutable creatorFeeBps;   // e.g. 100 = 1%
    uint16 public immutable platformFeeBps;  // e.g. 100 = 1%
    uint16 public constant MAX_TOTAL_FEE_BPS = 1000; // 10% hard cap

    // FPMM pool reserves of outcome shares + the collateral backing them.
    uint256 public reserveYes;
    uint256 public reserveNo;
    uint256 public collateralPool;

    Status public status;
    Outcome public winningOutcome;

    mapping(address => uint256) public yesShares;
    mapping(address => uint256) public noShares;

    event Bought(address indexed buyer, Outcome outcome, uint256 collateralIn, uint256 sharesOut, uint256 fee);
    event Sold(address indexed seller, Outcome outcome, uint256 sharesIn, uint256 collateralOut, uint256 fee);
    event Closed();
    event Resolved(Outcome outcome);
    event Redeemed(address indexed holder, uint256 payout);

    error NotOpen();
    error NotResolver();
    error NotResolved();
    error ZeroAmount();
    error Slippage();

    constructor(
        IERC20 _collateral,
        address _creator,
        address _platform,
        address _resolver,
        string memory _question,
        uint16 _creatorFeeBps,
        uint16 _platformFeeBps,
        uint256 seed,
        ResolutionKind _resolutionKind,
        string memory _resolutionSource
    ) {
        require(seed > 0, "seed");
        require(uint256(_creatorFeeBps) + _platformFeeBps <= MAX_TOTAL_FEE_BPS, "fee");
        // Objectively-resolvable launch rule: any non-manual market must bind a
        // resolution feed. Manual markets (testnet/admin) may leave it empty.
        if (_resolutionKind != ResolutionKind.MANUAL) {
            require(bytes(_resolutionSource).length > 0, "source");
        }
        factory = msg.sender;
        collateral = _collateral;
        creator = _creator;
        platform = _platform;
        resolver = _resolver;
        question = _question;
        creatorFeeBps = _creatorFeeBps;
        platformFeeBps = _platformFeeBps;
        resolutionKind = _resolutionKind;
        resolutionSource = _resolutionSource;

        // The factory transfers `seed` collateral to this market right after
        // deploy; reserves start balanced (50/50 price). 1 collateral backs
        // 1 YES + 1 NO, so the seed funds equal reserves.
        reserveYes = seed;
        reserveNo = seed;
        collateralPool = seed;
        status = Status.Open;
    }

    // ── Views ────────────────────────────────────────────────────────────────

    /** Instantaneous price of an outcome in 1e18 fixed point (YES + NO = 1e18). */
    function price(Outcome o) external view returns (uint256) {
        uint256 total = reserveYes + reserveNo;
        if (total == 0) return 0.5e18;
        // price of YES = reserveNo / total (scarcer side is pricier).
        return ((o == Outcome.YES ? reserveNo : reserveYes) * 1e18) / total;
    }

    /** Shares received for `collateralIn` of an outcome (after fees). */
    function calcBuy(Outcome o, uint256 collateralIn) public view returns (uint256 sharesOut, uint256 fee) {
        fee = (collateralIn * totalFeeBps()) / 10000;
        uint256 net = collateralIn - fee;
        (uint256 a, uint256 b) = o == Outcome.YES ? (reserveYes, reserveNo) : (reserveNo, reserveYes);
        // sharesOut = a + net - (a*b)/(b+net)
        sharesOut = a + net - Math.mulDiv(a, b, b + net);
    }

    /** Collateral returned for selling `sharesIn` of an outcome (after fees). */
    function calcSell(Outcome o, uint256 sharesIn) public view returns (uint256 collateralOut, uint256 fee) {
        (uint256 a, uint256 b) = o == Outcome.YES ? (reserveYes, reserveNo) : (reserveNo, reserveYes);
        // Solve r² - r(a+s+b) + s*b = 0  →  r = [(a+s+b) - sqrt((a+s+b)² - 4sb)]/2
        uint256 s = sharesIn;
        uint256 sumv = a + s + b;
        uint256 disc = sumv * sumv - 4 * s * b;
        uint256 r = (sumv - Math.sqrt(disc)) / 2; // gross collateral out
        fee = (r * totalFeeBps()) / 10000;
        collateralOut = r - fee;
    }

    function totalFeeBps() public view returns (uint256) {
        return uint256(creatorFeeBps) + platformFeeBps;
    }

    // ── Trading ──────────────────────────────────────────────────────────────

    function buy(Outcome o, uint256 collateralIn, uint256 minSharesOut) external nonReentrant returns (uint256 sharesOut) {
        if (status != Status.Open) revert NotOpen();
        if (collateralIn == 0) revert ZeroAmount();

        uint256 fee;
        (sharesOut, fee) = calcBuy(o, collateralIn);
        if (sharesOut < minSharesOut) revert Slippage();

        collateral.safeTransferFrom(msg.sender, address(this), collateralIn);
        _payFees(fee);

        uint256 net = collateralIn - fee;
        collateralPool += net;
        if (o == Outcome.YES) {
            reserveYes = reserveYes + net - sharesOut;
            reserveNo += net;
            yesShares[msg.sender] += sharesOut;
        } else {
            reserveNo = reserveNo + net - sharesOut;
            reserveYes += net;
            noShares[msg.sender] += sharesOut;
        }
        emit Bought(msg.sender, o, collateralIn, sharesOut, fee);
    }

    function sell(Outcome o, uint256 sharesIn, uint256 minCollateralOut) external nonReentrant returns (uint256 collateralOut) {
        if (status != Status.Open) revert NotOpen();
        if (sharesIn == 0) revert ZeroAmount();

        mapping(address => uint256) storage bal = o == Outcome.YES ? yesShares : noShares;
        require(bal[msg.sender] >= sharesIn, "balance");

        uint256 fee;
        (collateralOut, fee) = calcSell(o, sharesIn);
        if (collateralOut < minCollateralOut) revert Slippage();

        uint256 gross = collateralOut + fee;
        bal[msg.sender] -= sharesIn;
        collateralPool -= gross;
        if (o == Outcome.YES) {
            reserveYes = reserveYes + sharesIn - gross;
            reserveNo -= gross;
        } else {
            reserveNo = reserveNo + sharesIn - gross;
            reserveYes -= gross;
        }

        _payFees(fee);
        collateral.safeTransfer(msg.sender, collateralOut);
        emit Sold(msg.sender, o, sharesIn, collateralOut, fee);
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────

    /** Creator/resolver can stop trading (the "owner closes it" path). */
    function close() external {
        require(msg.sender == creator || msg.sender == resolver, "auth");
        if (status != Status.Open) revert NotOpen();
        status = Status.Closed;
        emit Closed();
    }

    /** Resolver settles the outcome (matched off ESPN/agg or admin for v1). */
    function resolve(Outcome o) external {
        if (msg.sender != resolver) revert NotResolver();
        require(status == Status.Open || status == Status.Closed, "done");
        status = Status.Resolved;
        winningOutcome = o;
        emit Resolved(o);
    }

    /** After resolution, winning shares pay 1 collateral each. */
    function redeem() external nonReentrant returns (uint256 payout) {
        if (status != Status.Resolved) revert NotResolved();
        if (winningOutcome == Outcome.YES) {
            payout = yesShares[msg.sender];
            yesShares[msg.sender] = 0;
        } else {
            payout = noShares[msg.sender];
            noShares[msg.sender] = 0;
        }
        if (payout == 0) revert ZeroAmount();
        // Cap to backing in case of rounding dust.
        if (payout > collateralPool) payout = collateralPool;
        collateralPool -= payout;
        collateral.safeTransfer(msg.sender, payout);
        emit Redeemed(msg.sender, payout);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _payFees(uint256 fee) internal {
        if (fee == 0) return;
        uint256 total = totalFeeBps();
        uint256 creatorCut = total == 0 ? 0 : (fee * creatorFeeBps) / total;
        uint256 platformCut = fee - creatorCut;
        if (creatorCut > 0) collateral.safeTransfer(creator, creatorCut);
        if (platformCut > 0) collateral.safeTransfer(platform, platformCut);
    }
}

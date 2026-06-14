const { expect } = require('chai');
const { ethers } = require('hardhat');

const usdc = (n) => ethers.parseUnits(n.toString(), 6); // collateral: 6 decimals
const tok = (n) => ethers.parseUnits(n.toString(), 18); // $SPRDD: 18 decimals
const YES = 0, NO = 1;

async function deploy() {
  const [deployer, platform, resolver, creator, trader] = await ethers.getSigners();
  const Mock = await ethers.getContractFactory('MockERC20');
  const sprdd = await Mock.deploy('SPRDD', 'SPRDD', 18);
  const coll = await Mock.deploy('USD Coin', 'USDC', 6);

  const Factory = await ethers.getContractFactory('SpreddMarketFactory');
  const factory = await Factory.deploy(
    sprdd.target, platform.address, resolver.address,
    tok(1000),  // minSprddToCreate
    100, 100,   // creator 1% + platform 1%
    usdc(10),   // minSeed
  );

  // Fund creator ($SPRDD gate + seed) and trader (collateral).
  await sprdd.mint(creator.address, tok(1000));
  await coll.mint(creator.address, usdc(1000));
  await coll.mint(trader.address, usdc(1000));

  return { deployer, platform, resolver, creator, trader, sprdd, coll, factory };
}

async function createMarket(ctx, seed = usdc(100)) {
  const { factory, coll, creator } = ctx;
  await coll.connect(creator).approve(factory.target, seed);
  const tx = await factory.connect(creator).createMarket(coll.target, 'Will X happen?', ethers.ZeroAddress, seed);
  const rc = await tx.wait();
  const ev = rc.logs.map(l => { try { return factory.interface.parseLog(l); } catch { return null; } }).find(e => e && e.name === 'MarketCreated');
  return ethers.getContractAt('SpreddMarket', ev.args.market);
}

describe('SpreddMarket (FPMM)', () => {
  it('gates creation on $SPRDD hold', async () => {
    const ctx = await deploy();
    const { factory, coll, trader } = ctx; // trader has no $SPRDD
    await coll.connect(trader).approve(factory.target, usdc(100));
    await expect(
      factory.connect(trader).createMarket(coll.target, 'q', ethers.ZeroAddress, usdc(100)),
    ).to.be.revertedWith('hold $SPRDD');
  });

  it('starts at 50/50 and moves price up on a YES buy', async () => {
    const ctx = await deploy();
    const market = await createMarket(ctx);
    expect(await market.price(YES)).to.equal(ethers.parseUnits('0.5', 18));

    const [sharesOut, fee] = await market.calcBuy(YES, usdc(50));
    expect(sharesOut).to.be.gt(0);
    expect(fee).to.equal(usdc(1)); // 2% of 50

    await ctx.coll.connect(ctx.trader).approve(market.target, usdc(50));
    await market.connect(ctx.trader).buy(YES, usdc(50), 0);

    expect(await market.yesShares(ctx.trader.address)).to.equal(sharesOut);
    expect(await market.price(YES)).to.be.gt(ethers.parseUnits('0.5', 18)); // YES got pricier
  });

  it('pays creator + platform fees on a buy', async () => {
    const ctx = await deploy();
    const market = await createMarket(ctx);
    const before = { c: await ctx.coll.balanceOf(ctx.creator.address), p: await ctx.coll.balanceOf(ctx.platform.address) };
    await ctx.coll.connect(ctx.trader).approve(market.target, usdc(50));
    await market.connect(ctx.trader).buy(YES, usdc(50), 0);
    const after = { c: await ctx.coll.balanceOf(ctx.creator.address), p: await ctx.coll.balanceOf(ctx.platform.address) };
    expect(after.c - before.c).to.equal(usdc(0.5)); // 1% creator
    expect(after.p - before.p).to.equal(usdc(0.5)); // 1% platform
  });

  it('round-trips buy then sell for less than paid (fees + impact)', async () => {
    const ctx = await deploy();
    const market = await createMarket(ctx);
    await ctx.coll.connect(ctx.trader).approve(market.target, usdc(50));
    await market.connect(ctx.trader).buy(YES, usdc(50), 0);
    const shares = await market.yesShares(ctx.trader.address);

    const balBefore = await ctx.coll.balanceOf(ctx.trader.address);
    await market.connect(ctx.trader).sell(YES, shares, 0);
    const out = (await ctx.coll.balanceOf(ctx.trader.address)) - balBefore;
    expect(out).to.be.gt(0);
    expect(out).to.be.lt(usdc(50)); // can't profit from a flat round-trip
    expect(await market.yesShares(ctx.trader.address)).to.equal(0);
  });

  it('resolves and redeems winning shares 1:1, stays solvent', async () => {
    const ctx = await deploy();
    const market = await createMarket(ctx);
    await ctx.coll.connect(ctx.trader).approve(market.target, usdc(80));
    await market.connect(ctx.trader).buy(YES, usdc(80), 0);
    const shares = await market.yesShares(ctx.trader.address);

    await market.connect(ctx.resolver).resolve(YES);

    // Contract must hold at least the winning payout (solvency).
    expect(await ctx.coll.balanceOf(market.target)).to.be.gte(shares).catch?.(() => {});
    const bal = await ctx.coll.balanceOf(market.target);
    expect(bal).to.be.gte(shares);

    const before = await ctx.coll.balanceOf(ctx.trader.address);
    await market.connect(ctx.trader).redeem();
    const payout = (await ctx.coll.balanceOf(ctx.trader.address)) - before;
    expect(payout).to.equal(shares); // 1 collateral per winning share
  });

  it('only the resolver can resolve', async () => {
    const ctx = await deploy();
    const market = await createMarket(ctx);
    await expect(market.connect(ctx.trader).resolve(YES)).to.be.revertedWithCustomError(market, 'NotResolver');
  });
});

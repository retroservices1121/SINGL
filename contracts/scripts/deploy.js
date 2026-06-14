const { ethers, network } = require('hardhat');

// Deploys the Spredd Markets stack to the configured network (Base Sepolia).
// On testnet we deploy mock $SPRDD + mock USDC (real $SPRDD is Base mainnet).
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network: ${network.name}  Deployer: ${deployer.address}`);

  const Mock = await ethers.getContractFactory('MockERC20');
  const sprdd = await Mock.deploy('Spredd (test)', 'SPRDD', 18);
  await sprdd.waitForDeployment();
  const usdc = await Mock.deploy('USD Coin (test)', 'USDC', 6);
  await usdc.waitForDeployment();

  const Factory = await ethers.getContractFactory('SpreddMarketFactory');
  const factory = await Factory.deploy(
    sprdd.target,
    deployer.address,                       // platform fee recipient
    deployer.address,                       // default resolver (admin for v1)
    ethers.parseUnits('1000', 18),          // minSprddToCreate (1,000 $SPRDD)
    70,                                     // creatorFeeBps (0.70% — 70% of the 1% fee)
    30,                                     // platformFeeBps (0.30% — 30% of the 1% fee)
    ethers.parseUnits('10', 6),             // minSeed (10 USDC)
  );
  await factory.waitForDeployment();

  // Seed the deployer with test tokens so you can immediately create + trade.
  await (await sprdd.mint(deployer.address, ethers.parseUnits('5000', 18))).wait();
  await (await usdc.mint(deployer.address, ethers.parseUnits('10000', 6))).wait();

  console.log('\n── Deployed ──────────────────────────────');
  console.log('SPRDD (test):   ', sprdd.target);
  console.log('USDC  (test):   ', usdc.target);
  console.log('MarketFactory:  ', factory.target);
  console.log('\nNext: approve USDC to the factory, then factory.createMarket(usdc, question, 0x0, seed).');
}

main().catch((e) => { console.error(e); process.exit(1); });

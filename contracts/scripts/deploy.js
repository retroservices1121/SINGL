const { ethers, network } = require('hardhat');

// Deploys the Spredd Markets stack to the configured network (Base Sepolia).
// On testnet we deploy mock $SPRDD + mock USDC (real $SPRDD is Base mainnet).
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Network: ${network.name}  Deployer: ${deployer.address}`);

  const Mock = await ethers.getContractFactory('MockERC20');
  // $SPRDD = the create-gate token (distribute to chosen testers; don't
  // expose a public faucet so the gate actually gates).
  const sprdd = await Mock.deploy('Spredd (test)', 'SPRDD', 18);
  await sprdd.waitForDeployment();
  // PTS = free testnet points = the trading collateral (open-mint faucet).
  const usdc = await Mock.deploy('Spredd Points (test)', 'PTS', 6);
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
  console.log('SPRDD (gate):     ', sprdd.target, '→ NEXT_PUBLIC ... (gate; distribute to testers)');
  console.log('PTS (points/coll):', usdc.target, '→ NEXT_PUBLIC_MARKET_COLLATERAL');
  console.log('MarketFactory:    ', factory.target, '→ NEXT_PUBLIC_MARKET_FACTORY');
  console.log('\nTestnet: trading uses free PTS points (open-mint faucet in the UI).');
  console.log('Creation is gated by holding >= 1,000 SPRDD — mint SPRDD to your testers.');
}

main().catch((e) => { console.error(e); process.exit(1); });

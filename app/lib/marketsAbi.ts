// Spredd Markets — on-chain config + minimal ABIs (Base Sepolia).
// Addresses come from env so the UI activates once contracts are deployed.
import { baseSepolia } from 'wagmi/chains';

export const MARKETS_CHAIN_ID = baseSepolia.id; // 84532

/** Deployed addresses (set after `npm run deploy:baseSepolia`). */
export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_MARKET_FACTORY || '') as `0x${string}` | '';
export const COLLATERAL_ADDRESS = (process.env.NEXT_PUBLIC_MARKET_COLLATERAL || '') as `0x${string}` | '';
export const COLLATERAL_DECIMALS = Number(process.env.NEXT_PUBLIC_MARKET_COLLATERAL_DECIMALS || 6);
export const COLLATERAL_SYMBOL = process.env.NEXT_PUBLIC_MARKET_COLLATERAL_SYMBOL || 'USDC';

export const isMarketplaceLive = !!FACTORY_ADDRESS && !!COLLATERAL_ADDRESS;

export const OUTCOME = { YES: 0, NO: 1 } as const;

export const FACTORY_ABI = [
  { type: 'function', name: 'marketCount', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allMarkets', stateMutability: 'view', inputs: [{ type: 'uint256' }], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'minSprddToCreate', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'minSeed', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'creatorFeeBps', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint16' }] },
  { type: 'function', name: 'platformFeeBps', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint16' }] },
  {
    type: 'function', name: 'createMarket', stateMutability: 'nonpayable',
    inputs: [{ name: 'collateral', type: 'address' }, { name: 'question', type: 'string' }, { name: 'resolver', type: 'address' }, { name: 'seed', type: 'uint256' }],
    outputs: [{ type: 'address' }],
  },
  {
    type: 'event', name: 'MarketCreated',
    inputs: [
      { name: 'market', type: 'address', indexed: true },
      { name: 'creator', type: 'address', indexed: true },
      { name: 'collateral', type: 'address', indexed: false },
      { name: 'question', type: 'string', indexed: false },
      { name: 'seed', type: 'uint256', indexed: false },
    ],
  },
] as const;

export const MARKET_ABI = [
  { type: 'function', name: 'question', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'status', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] }, // 0 Open 1 Closed 2 Resolved
  { type: 'function', name: 'winningOutcome', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
  { type: 'function', name: 'price', stateMutability: 'view', inputs: [{ name: 'o', type: 'uint8' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'reserveYes', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'reserveNo', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'collateral', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] },
  { type: 'function', name: 'yesShares', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'noShares', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'calcBuy', stateMutability: 'view', inputs: [{ name: 'o', type: 'uint8' }, { name: 'collateralIn', type: 'uint256' }], outputs: [{ name: 'sharesOut', type: 'uint256' }, { name: 'fee', type: 'uint256' }] },
  { type: 'function', name: 'calcSell', stateMutability: 'view', inputs: [{ name: 'o', type: 'uint8' }, { name: 'sharesIn', type: 'uint256' }], outputs: [{ name: 'collateralOut', type: 'uint256' }, { name: 'fee', type: 'uint256' }] },
  { type: 'function', name: 'buy', stateMutability: 'nonpayable', inputs: [{ name: 'o', type: 'uint8' }, { name: 'collateralIn', type: 'uint256' }, { name: 'minSharesOut', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'sell', stateMutability: 'nonpayable', inputs: [{ name: 'o', type: 'uint8' }, { name: 'sharesIn', type: 'uint256' }, { name: 'minCollateralOut', type: 'uint256' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'redeem', stateMutability: 'nonpayable', inputs: [], outputs: [{ type: 'uint256' }] },
] as const;

export const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'allowance', stateMutability: 'view', inputs: [{ type: 'address' }, { type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ type: 'address' }, { type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
] as const;

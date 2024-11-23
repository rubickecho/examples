// This file stores web3 related constants such as addresses, token definitions, ETH currency references and ABI's

import { SupportedChainId, Token } from '@uniswap/sdk-core'

// Addresses
// UniswapV3Factory Contract Address
// see: https://etherscan.io/address/0x1F98431c8aD98523631AE4a59f267346ea31F984#code
export const POOL_FACTORY_CONTRACT_ADDRESS =
  '0x1F98431c8aD98523631AE4a59f267346ea31F984'

// Uniswap V3 Quoter Contract Address
// see: https://etherscan.io/address/0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6#code
export const QUOTER_CONTRACT_ADDRESS =
  '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'

// Currencies and Tokens

// see: https://app.uniswap.org/explore/tokens/ethereum/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
export const WETH_TOKEN = new Token(
  SupportedChainId.MAINNET,
  '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  18,
  'WETH',
  'Wrapped Ether'
)

export const USDC_TOKEN = new Token(
  SupportedChainId.MAINNET,
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  6,
  'USDC',
  'USD//C'
)

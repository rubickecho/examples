import { ethers } from 'ethers'
import { CurrentConfig } from '../config'
import { computePoolAddress } from '@uniswap/v3-sdk'
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json'
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
import {
  POOL_FACTORY_CONTRACT_ADDRESS,
  QUOTER_CONTRACT_ADDRESS,
} from '../libs/constants'
import { getProvider } from '../libs/providers'
import { toReadableAmount, fromReadableAmount } from '../libs/conversion'
const tokens = CurrentConfig.tokens02
export async function quote(): Promise<string> {
  // 直接和 Uniswap V3 Quoter Contract 交互，获取报价合约实例
  // 报价合约里封装了 quoteExactInputSingle 方法，用于获取报价
  // see: https://etherscan.io/address/0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6#code
  const quoterContract = new ethers.Contract(
    QUOTER_CONTRACT_ADDRESS,
    Quoter.abi,
    getProvider()
  )
  // 获取流动池实例
  const poolConstants = await getPoolConstants()
  console.log('poolConstants:', poolConstants)
  // 调用报价合约的 quoteExactInputSingle 方法，获取报价

  // quoteExactInputSingle
  //   - given the amount you want to swap, produces a quote for the amount out for a swap of a single pool
  // quoteExactInput
  //   - given the amount you want to swap, produces a quote for the amount out for a swap over multiple pools
  // quoteExactOutputSingle
  //   - given the amount you want to get out, produces a quote for the amount in for a swap over a single pool
  // quoteExactOutput
  //   - given the amount you want to get out, produces a quote for the amount in for a swap over multiple pools
  const quotedAmountOut = await quoterContract.callStatic.quoteExactOutputSingle (
    poolConstants.token0,
    poolConstants.token1,
    poolConstants.fee,
    fromReadableAmount(
      tokens.amountIn,
      tokens.in.decimals
    ).toString(),
    0
  )

  console.log('quotedAmountOut:', quotedAmountOut)
  console.log('toReadableAmount:', toReadableAmount(quotedAmountOut, tokens.out.decimals))
  return toReadableAmount(quotedAmountOut, tokens.out.decimals)
}

async function getPoolConstants(): Promise<{
  token0: string
  token1: string
  fee: number
}> {
  // 计算流动池地址
  const currentPoolAddress = computePoolAddress({
    factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
    tokenA: tokens.in,
    tokenB: tokens.out,
    fee: tokens.poolFee,
  })
  console.log('currentPoolAddress:', currentPoolAddress)

  // 获取流动池实例
  const poolContract = new ethers.Contract(
    currentPoolAddress,
    IUniswapV3PoolABI.abi,
    getProvider()
  )
  // 获取流动池的 token0、token1 和 fee

  // Having constructed our reference to the contract, we can now access its methods through our provider. We use a batch Promise call. This approach queries state data concurrently, rather than sequentially, to minimize the chance of fetching out of sync data that may be returned if sequential queries are executed over the span of two blocks:
  const [token0, token1, fee] = await Promise.all([
    poolContract.token0(),
    poolContract.token1(),
    poolContract.fee(),
  ])

  return {
    token0,
    token1,
    fee,
  }
}

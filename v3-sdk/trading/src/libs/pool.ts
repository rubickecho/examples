import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json'
import { computePoolAddress } from '@uniswap/v3-sdk'
import { ethers } from 'ethers'

import { CurrentConfig } from '../config'
import { POOL_FACTORY_CONTRACT_ADDRESS } from './constants'
import { getProvider } from './providers'

interface PoolInfo {
  // 代币0
  token0: string
  // 代币1
  token1: string
  // 费用
  fee: number
  // 滑点
  tickSpacing: number
  // 平方根价格: 价格的平方根，使用 Q96.64 定点数格式
  sqrtPriceX96: ethers.BigNumber
  // 流动性
  liquidity: ethers.BigNumber
  // 价格刻度，用于在 Uniswap V3 中表示价格范围
  tick: number
}

// 获取池子信息
// 这个方法在进行交易前很重要
// 1. 验证池子是否存在
// 2. 过去当前价格
// 3. 检查流动性情况
// 4. 确认交易参数
export async function getPoolInfo(): Promise<PoolInfo> {
  // 1. 获取提供者
  const provider = getProvider()
  if (!provider) {
    throw new Error('No provider')
  }

  // 计算池子地址
  const currentPoolAddress = computePoolAddress({
    factoryAddress: POOL_FACTORY_CONTRACT_ADDRESS,
    tokenA: CurrentConfig.tokens.in, // 输入代币
    tokenB: CurrentConfig.tokens.out, // 输出代币
    fee: CurrentConfig.tokens.poolFee, // 手续费级别
  })

  // 实例化池子合约
  const poolContract = new ethers.Contract(
    // 池子地址
    currentPoolAddress,
    // 池子ABI
    IUniswapV3PoolABI.abi,
    // 提供者
    provider
  )

  const [token0, token1, fee, tickSpacing, liquidity, slot0] =
    await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
      poolContract.fee(),
      poolContract.tickSpacing(),
      poolContract.liquidity(),
      poolContract.slot0(),
    ])

  return {
    token0,
    token1,
    fee,
    tickSpacing,
    liquidity,
    sqrtPriceX96: slot0[0],
    tick: slot0[1],
  }
}

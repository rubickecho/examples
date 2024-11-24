import {
  Currency,
  CurrencyAmount,
  Percent,
  Token,
  TradeType,
} from '@uniswap/sdk-core'
import {
  Pool,
  Route,
  SwapOptions,
  SwapQuoter,
  SwapRouter,
  Trade,
} from '@uniswap/v3-sdk'
import { ethers } from 'ethers'
import JSBI from 'jsbi'

import { CurrentConfig } from '../config'
import {
  ERC20_ABI,
  QUOTER_CONTRACT_ADDRESS,
  SWAP_ROUTER_ADDRESS,
  TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER,
} from './constants'
import { MAX_FEE_PER_GAS, MAX_PRIORITY_FEE_PER_GAS } from './constants'
import { getPoolInfo } from './pool'
import {
  getProvider,
  getWalletAddress,
  sendTransaction,
  TransactionState,
} from './providers'
import { fromReadableAmount } from './utils'

export type TokenTrade = Trade<Token, Token, TradeType>

// Trading Functions
// 创建交易
export async function createTrade(): Promise<TokenTrade> {
  // 1. 获取池子信息
  const poolInfo = await getPoolInfo()

  // 2. 创建池子实例
  const pool = new Pool(
    CurrentConfig.tokens.in,
    CurrentConfig.tokens.out,
    CurrentConfig.tokens.poolFee,
    poolInfo.sqrtPriceX96.toString(),
    poolInfo.liquidity.toString(),
    poolInfo.tick
  )

  // 3. 创建交易路径
  const swapRoute = new Route(
    [pool], // 池子数组，可以包含多个池子
    CurrentConfig.tokens.in, // 输入代币
    CurrentConfig.tokens.out // 输出代币
  )

  // 4. 获取输出报价
  const amountOut = await getOutputQuote(swapRoute)

  // 5. 创建不检查交易
  // why?
  const uncheckedTrade = Trade.createUncheckedTrade({
    route: swapRoute, // 交易路径
    inputAmount: CurrencyAmount.fromRawAmount(
      CurrentConfig.tokens.in,
      fromReadableAmount(
        CurrentConfig.tokens.amountIn,
        CurrentConfig.tokens.in.decimals
      ).toString()
    ),
    outputAmount: CurrencyAmount.fromRawAmount(
      CurrentConfig.tokens.out,
      JSBI.BigInt(amountOut)
    ),
    tradeType: TradeType.EXACT_INPUT,
  })

  return uncheckedTrade
}

// 核心逻辑，执行交易
export async function executeTrade(
  trade: TokenTrade
): Promise<TransactionState> {
  // 1. 获取基本设置：钱包地址和provider
  const walletAddress = getWalletAddress()
  const provider = getProvider()

  if (!walletAddress || !provider) {
    throw new Error('Cannot execute a trade without a connected wallet')
  }

  // 2. 获取代币授权
  // 用于授权 Uniswap 路由合约使用用户代币
  // 在以太坊上进行代币交换之前，用户需要先授权（approve）代币给 Uniswap 路由合约，这是 ERC20 代币的标准行为（安全机制）
  const tokenApproval = await getTokenTransferApproval(CurrentConfig.tokens.in)
  console.log('executeTrade tokenApproval>>>>', tokenApproval)
  // Fail if transfer approvals do not go through
  if (tokenApproval !== TransactionState.Sent) {
    return TransactionState.Failed
  }

  // 3. 设置交易选项
  const options: SwapOptions = {
    // 滑点容忍度
    slippageTolerance: new Percent(50, 10_000), // 50 bips, or 0.50%
    // 交易截止时间
    deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from the current Unix time
    // 接收地址
    recipient: walletAddress,
  }
  console.log('executeTrade options>>>>', options)

  // 4. 获取交易参数
  // [trade]: 一个交易对象数组，包含了交易的详细信息（输入代币、输出代币、数量等）
  // 连接用户交易意图和区块链实际执行之间的桥梁，它将高级的交易参数转换为底层智能合约可以理解的格式。
  const methodParameters = SwapRouter.swapCallParameters([trade], options)

  // result: { calldata: '0x...', value: '0x...' }

  // 5. 设置交易对象
  // 对应文档链接: https://docs.uniswap.org/sdk/v3/guides/swaps/trading#executing-a-trade
  const tx = {
    data: methodParameters.calldata,
    to: SWAP_ROUTER_ADDRESS,
    value: methodParameters.value,
    from: walletAddress,
    // 可以优化为估算的 gas 费用
    maxFeePerGas: MAX_FEE_PER_GAS, // 最大费用
    maxPriorityFeePerGas: MAX_PRIORITY_FEE_PER_GAS, // 最大优先费用
  }
  console.log('executeTrade tx>>>>', tx)

  // 6. 发送交易
  const res = await sendTransaction(tx)
  console.log('executeTrade res>>>>', res)

  return res
}

// Helper Quoting and Pool Functions

async function getOutputQuote(route: Route<Currency, Currency>) {
  const provider = getProvider()

  if (!provider) {
    throw new Error('Provider required to get pool state')
  }

  const { calldata } = await SwapQuoter.quoteCallParameters(
    route,
    CurrencyAmount.fromRawAmount(
      CurrentConfig.tokens.in,
      fromReadableAmount(
        CurrentConfig.tokens.amountIn,
        CurrentConfig.tokens.in.decimals
      ).toString()
    ),
    TradeType.EXACT_INPUT,
    {
      useQuoterV2: true,
    }
  )

  const quoteCallReturnData = await provider.call({
    to: QUOTER_CONTRACT_ADDRESS,
    data: calldata,
  })

  return ethers.utils.defaultAbiCoder.decode(['uint256'], quoteCallReturnData)
}

// 获取代币授权
export async function getTokenTransferApproval(
  token: Token
): Promise<TransactionState> {
  // 1. 获取基础设置：provider 和 address
  const provider = getProvider()
  const address = getWalletAddress()
  if (!provider || !address) {
    console.log('No Provider Found')
    return TransactionState.Failed
  }

  try {
    // 2. 创建代币合约实例
    const tokenContract = new ethers.Contract(
      token.address, // 代币合约地址
      ERC20_ABI, // ERC20 的标准接口
      provider // Web3 提供者
    )

    // 3. 创建授权交易
    const transaction = await tokenContract.populateTransaction.approve(
      SWAP_ROUTER_ADDRESS, // Uniswap 路由合约地址
      // 授权数量
      fromReadableAmount(
        TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER,
        token.decimals
      ).toString()
    )
    // 4. 发送授权交易
    return sendTransaction({
      ...transaction,
      from: address,
    })
  } catch (e) {
    console.error(e)
    return TransactionState.Failed
  }
}

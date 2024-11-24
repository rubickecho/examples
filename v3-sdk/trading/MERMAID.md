# getPoolInfo
```mermaid
flowchart TD
    A[开始] --> B[获取Provider]
    B --> C{Provider是否存在?}
    
    C -->|否| D[抛出错误: No Provider]
    C -->|是| E[计算池子地址]
    
    E --> F[创建池子合约实例]
    F --> G[并行获取池子信息]
    
    G --> H1[token0]
    G --> H2[token1]
    G --> H3[fee]
    G --> H4[tickSpacing]
    G --> H5[liquidity]
    G --> H6[slot0]
    
    H1 & H2 & H3 & H4 & H5 & H6 --> I[组装PoolInfo对象]
    
    I --> J[返回PoolInfo]
    
    subgraph 计算池子地址参数
    E1[factoryAddress: 工厂合约地址]
    E2[tokenA: 输入代币]
    E3[tokenB: 输出代币]
    E4[fee: 手续费等级]
    end
    
    subgraph PoolInfo返回结构
    I1[token0: 代币0地址]
    I2[token1: 代币1地址]
    I3[fee: 手续费率]
    I4[tickSpacing: tick间距]
    I5[liquidity: 流动性]
    I6[sqrtPriceX96: 价格平方根]
    I7[tick: 当前tick值]
    end
    
    subgraph slot0数据
    H6 --> S1[sqrtPriceX96]
    H6 --> S2[tick]
    end
```

# createTrade

## 交易路径
最佳路径考虑因素
- 流动性深度
- 价格影响
- gas 成本
- 滑点

如何理解流动性深度？
- 流动性深度是指在特定价格范围内，池子中可用于交易的代币数量。
- 流动性深度越深，表示池子中代币数量越多，交易时价格变化越小，滑点越低。

### 单条路径
```mermaid
graph LR
    A[输入代币] -->|Pool| B[输出代币]
```

### 多条路径
```mermaid
graph LR
    A[输入代币] -->|Pool| B[输出代币]
    B -->|Pool| C[输出代币]
```

## 流程图
```mermaid
flowchart TD
    A[开始 createTrade] --> B[获取池子信息]
    B --> C[创建池子实例]
    C --> D[创建交易路径]
    D --> E[获取输出报价]
    E --> F[创建模拟交易]
```

## 为什么创建不检查交易？
`checkedTrade` 和 `uncheckedTrade` 的区别：

1. **checkedTrade（检查型交易）**:
```typescript
// 检查型交易会自动进行以下步骤：
const checkedTrade = await Trade.exactIn(route, inputAmount)

// 内部执行过程：
1. 查询当前价格 -----> 链上调用
2. 计算输出金额 -----> 链上调用
3. 验证滑点    -----> 计算处理
4. 检查路径    -----> 验证处理
// 总共需要多次链上调用
```

2. **uncheckedTrade（未检查型交易）**:
```typescript
// 我们已经提前获取了输出金额
const amountOut = await getOutputQuote(route)  // 只调用一次链上接口

// 直接创建交易，不再需要额外的链上调用
const uncheckedTrade = Trade.createUncheckedTrade({
  route,
  inputAmount,
  outputAmount: amountOut,  // 直接使用已查询的金额
  tradeType
})
```

简单来说：
- `checkedTrade`: 像是去餐厅点菜，每道菜都要问价格、确认库存
- `uncheckedTrade`: 像是先看好了菜单和价格，直接下单

**为什么选择 uncheckedTrade**:
1. 性能更好：减少重复的链上调用
2. 我们已经通过 `getOutputQuote` 获取了准确的输出金额，不需要再查询

# getTokenTransferApproval
```mermaid
flowchart TD
    A[开始 getTokenTransferApproval] --> B[获取Provider和钱包地址]
    B --> C{检查Provider和地址}
    C -->|不存在| D[返回Failed状态]
    C -->|存在| E[创建Token合约实例]
    
    E -->|参数| F[创建合约对象]
    F -->|"token.address: 代币地址
    ERC20_ABI: ERC20标准接口
    provider: Web3提供者"| G[生成合约实例]
    
    G --> H[调用approve方法]
    H -->|参数| I[创建授权交易]
    I -->|"SWAP_ROUTER_ADDRESS: Uniswap路由地址
    TOKEN_AMOUNT_TO_APPROVE_FOR_TRANSFER: 授权数量
    token.decimals: 代币精度"| J[生成交易对象]
    
    J --> K[发送交易]
    K -->|参数| L[执行交易]
    L -->|"transaction: 交易数据
    from: 用户钱包地址"| M[等待交易确认]
    
    M --> N{交易结果}
    N -->|成功| O[返回Sent状态]
    N -->|失败| P[返回Failed状态]
```

# sendTransaction
```mermaid
flowchart TD
    A[开始] --> B{检查环境类型}
    
    B -->|浏览器插件| C[sendTransactionViaExtension]
    B -->|钱包| D[sendTransactionViaWallet]
    
    C --> C1[调用浏览器插件发送交易]
    C1 --> C2{检查交易回执}
    C2 -->|成功| C3[返回 TransactionState.Sent]
    C2 -->|失败| C4[返回 TransactionState.Failed]
    C2 -->|异常| C5[返回 TransactionState.Rejected]
    
    D --> D1[准备交易参数]
    D1 --> D2[转换value为BigNumber]
    D2 --> D3[wallet.sendTransaction发送交易]
    D3 --> D4[等待交易回执]
    
    D4 --> D5{检查回执状态}
    D5 -->|成功| D6[返回 TransactionState.Sent]
    D5 -->|失败| D7[返回 TransactionState.Failed]
    
    subgraph 交易参数
    P1[transaction.from: 发送方地址]
    P2[transaction.to: 接收方地址]
    P3[transaction.data: 调用数据]
    P4[transaction.value: ETH数量]
    P5[transaction.maxFeePerGas: gas费用]
    end
    
    subgraph 交易状态
    S1[TransactionState.Failed]
    S2[TransactionState.Sent]
    S3[TransactionState.Rejected]
    end
```
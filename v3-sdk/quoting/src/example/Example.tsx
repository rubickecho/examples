import React, { useState, useCallback } from 'react'
import './Example.css'
import { CurrentConfig } from '../config'
import { quote } from '../libs/quote'

const Example = () => {
  const [outputAmount, setOutputAmount] = useState<string>()

  const tokens = CurrentConfig.tokens02

  const onQuote = useCallback(async () => {
    setOutputAmount(await quote())
  }, [])

  return (
    <div className="App">
      {CurrentConfig.rpc.mainnet === '' && (
        <h2 className="error">Please set your mainnet RPC URL in config.ts</h2>
      )}
      <small><a href="https://docs.uniswap.org/sdk/v3/guides/swaps/quoting">Docs link</a></small>
      <small><a href={CurrentConfig.rpc.mainnet}>RPC URL</a></small>
      <small><a href="https://www.geckoterminal.com/zh/eth/pools/0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8">Pool Address</a></small>
      <h3>{`Quote input amount: ${tokens.amountIn} ${tokens.in.symbol}`}</h3>
      <h3>{`Quote output amount: ${outputAmount} ${tokens.out.symbol}`}</h3>
      <button onClick={onQuote}>
        <p>Quote</p>
      </button>
    </div>
  )
}

export default Example

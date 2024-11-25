#!/bin/bash

# 检查是否提供了 URL 参数
if [ -z "$1" ]; then
    echo "错误: 请提供 fork URL"
    echo "用法: sh ./start-chain.sh <fork-url>"
    exit 1
fi

FORK_URL=$1

# 基础启动命令
# --block-time 1             # 自动出块时间
# --port 8545               # RPC端口
# --host 0.0.0.0           # 允许远程连接
# --tracing                # 启用跟踪功能
# --block-base-fee-per-gas 0 # 设置基础 gas 费用
anvil --chain-id 1337 --fork-url "$FORK_URL" \
--port 8545 \
--host 0.0.0.0 \
--tracing \
--block-base-fee-per-gas 0
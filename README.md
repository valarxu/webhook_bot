# Solana 交易监控机器人

这是一个基于 Node.js 的 Solana 区块链交易监控系统，可以实时监控指定钱包地址的交易活动，并通过 Telegram 机器人发送通知。

## 主要功能

- 监控 Solana 链上交易
- 支持 TRANSFER 和 SWAP 类型交易识别
- 自动过滤小额转账（< 1 SOL）
- 通过 Telegram 实时推送交易通知
- 支持钱包地址备注
- 自动识别代币信息（通过 OKX API）
- 数据持久化存储（Supabase）

## 技术栈

- Node.js + Express
- Supabase（数据存储）
- Telegram Bot API
- OKX API（代币信息查询）
- Helius Webhook（交易监控）

## 环境要求

- Node.js 16+
- MySQL（可选，用于交易记录存储）
- Supabase 账号
- Telegram Bot Token

## 环境变量配置

需要在 `.env` 文件中配置以下环境变量：
PORT=3000
TELEGRAM_BOT_TOKEN=你的Telegram机器人Token
TELEGRAM_CHAT_ID=接收通知的聊天ID
SUPABASE_URL=你的Supabase项目URL
SUPABASE_ANON_KEY=你的Supabase匿名密钥
NEXT_PUBLIC_OKX_API_KEY=OKX API密钥
OKX_SECRET_KEY=OKX密钥
OKX_PASSPHRASE=OKX密码


## 数据库表结构

### Supabase 表结构

1. wallets 表
- address (text, primary key) - 钱包地址
- note (text) - 地址备注

2. meme_tokens 表
- contract_address (text, primary key) - 代币合约地址
- symbol (text) - 代币符号
- marketCap (numeric) - 市值
- updated_at (timestamp) - 更新时间

## 通知格式

每条交易通知包含以下信息：
- 交易类型
- 交易时间
- 交易链接（Solscan）
- 交易描述（包含钱包备注和代币信息）

## 注意事项

- 请确保所有环境变量都已正确配置
- 建议使用 PM2 等进程管理工具在生产环境运行
- 定期检查和更新代币信息缓存
- 注意保护好各类 API 密钥和 Token
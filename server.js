require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const app = express();
const { fetchOKXToken } = require('./utils/api');

// 设置端口
const PORT = process.env.PORT || 3000;

// MySQL 连接配置
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// 初始化地址映射
let addressMap = new Map();
let tokenInfoMap = new Map();

// 加载钱包地址和代币信息
async function loadCacheData() {
    try {
        // 加载钱包地址
        const [walletRows] = await pool.execute(
            'SELECT address, note FROM wallets LIMIT 100'
        );
        addressMap.clear();
        walletRows.forEach(row => {
            addressMap.set(row.address, row.note);
        });
        console.log('已加载钱包地址映射：', addressMap.size, '条记录');

        // 加载代币信息
        const [tokenRows] = await pool.execute(
            'SELECT address, symbol, market_cap FROM token_info'
        );
        tokenInfoMap.clear();
        tokenRows.forEach(row => {
            tokenInfoMap.set(row.address, {
                symbol: row.symbol,
                marketCap: row.market_cap
            });
        });
        console.log('已加载代币信息映射：', tokenInfoMap.size, '条记录');
    } catch (error) {
        console.error('加载缓存数据失败:', error);
    }
}

// 保存代币信息到数据库
async function saveTokenInfo(address, symbol, marketCap) {
    try {
        await pool.execute(
            'INSERT INTO token_info (address, symbol, market_cap) VALUES (?, ?, ?) ' +
            'ON DUPLICATE KEY UPDATE symbol = VALUES(symbol), market_cap = VALUES(market_cap)',
            [address, symbol, marketCap]
        );
        
        // 更新内存中的缓存
        tokenInfoMap.set(address, { symbol, marketCap });
        
        console.log('代币信息已保存:', { address, symbol, marketCap });
    } catch (error) {
        console.error('保存代币信息失败:', error);
    }
}

// SOL 地址正则表达式
const SOL_ADDRESS_REGEX = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;

// 添加 token 缓存，避免重复请求
const tokenCache = new Map();

// 处理描述文本，将地址替换为备注
async function processDescription(transaction) {
    if (!transaction.description) return '无描述';
    let description = transaction.description;

    // 找出所有 SOL 地址
    const addresses = description.match(SOL_ADDRESS_REGEX) || [];
    
    if (transaction.type === 'TRANSFER') {
        // 替换每个地址为钱包备注
        for (const address of addresses) {
            const note = addressMap.get(address);
            if (note) {
                description = description.replace(new RegExp(address + '\\.?'), note);
            }
        }
    }
    else if (transaction.type === 'SWAP' && addresses.length >= 2) {
        // 处理第一个地址（钱包地址）
        const firstAddress = addresses[0];
        const note = addressMap.get(firstAddress);
        if (note) {
            description = description.replace(new RegExp(firstAddress + '\\.?'), note);
        }

        // 处理剩余的代币地址
        for (let i = 1; i < addresses.length; i++) {
            const address = addresses[i];
            try {
                // 先检查本地缓存
                if (tokenInfoMap.has(address)) {
                    const tokenInfo = tokenInfoMap.get(address);
                    description = description.replace(
                        new RegExp(address + '\\.?'), 
                        `${tokenInfo.symbol}(${tokenInfo.marketCap})`
                    );
                    continue;
                }

                // 如果本地缓存没有，则请求 OKX API
                const response = await fetchOKXToken(address);

                if (response?.data?.data?.[0]) {
                    const tokenInfo = response.data.data[0];
                    const tokenSymbol = tokenInfo.symbol.toUpperCase();
                    const marketCap = tokenInfo.marketCap;
                    
                    // 保存到数据库和更新缓存
                    await saveTokenInfo(address, tokenSymbol, marketCap);
                    
                    // 替换地址为代币信息
                    description = description.replace(
                        new RegExp(address + '\\.?'), 
                        `${tokenSymbol}(${marketCap})`
                    );
                } else {
                    console.log('获取代币信息失败:', response?.data?.msg, response?.data?.code);
                }
            } catch (error) {
                console.error('获取代币信息失败:', error.message);
            }
        }
    }

    return description;
}

// 初始化 Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: false,
    request: {
        timeout: 30000
    }
});
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// 解析 JSON 请求体
app.use(express.json());

function formatTimestamp(timestamp) {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
}

async function saveToMySQL(transaction, formattedTime, retryCount = 3) {
    for (let i = 0; i < retryCount; i++) {
        try {
            const [result] = await pool.execute(
                'INSERT INTO transactions (tx_hash, tx_type, timestamp, raw_data, description) VALUES (?, ?, ?, ?, ?)',
                [
                    transaction.signature,
                    transaction.type,
                    formattedTime,
                    JSON.stringify(transaction),
                    transaction.description || '无描述'
                ]
            );

            console.log('数据已保存到 MySQL');
            return;
        } catch (error) {
            console.error(`MySQL 保存失败 (尝试 ${i + 1}/${retryCount}):`, error);
            if (i === retryCount - 1) {
                console.error('MySQL 保存最终失败');
            } else {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
}

async function sendTelegramMessage(transaction, formattedTime, retryCount = 3) {
    const processedDescription = await processDescription(transaction);
    const message = `
🔔 新交易提醒
━━━━━━━━━━━━━━━
📝 类型: ${transaction.type}
⏰ 时间: ${formattedTime}
🔗 交易哈希: https://solscan.io/tx/${transaction.signature}
📄 描述: ${processedDescription}
`;

    for (let i = 0; i < retryCount; i++) {
        try {
            const result = await bot.sendMessage(TELEGRAM_CHAT_ID, message, {
                disable_web_page_preview: true
            });
            console.log('Telegram 消息发送成功！');
            console.log('消息ID:', result.message_id);
            return;
        } catch (error) {
            console.error(`Telegram 发送失败 (第 ${i + 1} 次尝试)：`, error.message);
            if (i < retryCount - 1) {
                console.log('等待 2 秒后重试...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                console.error('Telegram 发送最终失败');
            }
        }
    }
}

// 添加 SOL 转换函数
function lamportsToSol(lamports) {
    return lamports / 1000000000;
}

// Webhook 接收端点
app.post('/webhook', async (req, res) => {
    console.log('收到新的交易:');
    console.log('------------------------');

    for (const transaction of req.body) {
        const formattedTime = formatTimestamp(transaction.timestamp);
        const txHash = transaction.signature;
        const processedDescription = await processDescription(transaction);

        // 基础信息打印
        console.log(`交易哈希: ${txHash}`);
        console.log(`时间: ${formattedTime}`);
        console.log(`交易类型: ${transaction.type}`);
        console.log(`描述: ${processedDescription}`);

        // 过滤逻辑：跳过小额 TRANSFER 交易
        if (transaction.type === 'TRANSFER' && transaction.nativeTransfers) {
            const totalAmount = transaction.nativeTransfers.reduce((sum, transfer) => {
                return sum + (transfer.amount || 0);
            }, 0);

            const solAmount = lamportsToSol(totalAmount);
            console.log(`转账总金额: ${solAmount} SOL`);

            if (solAmount < 1) {
                console.log('跳过小额转账交易（< 1 SOL）');
                console.log('------------------------');
                continue;
            }
        }

        console.log('处理交易...');
        console.log('------------------------');

        // 保存到 MySQL
        await saveToMySQL(transaction, formattedTime);

        // 发送 Telegram 消息
        await sendTelegramMessage(transaction, formattedTime);
    }

    res.status(200).send('OK');
});

// 启动服务器
app.listen(PORT, async () => {
    // 启动时加载缓存数据
    await loadCacheData();
    
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`监控交易中...`);
});
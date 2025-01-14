require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');
const app = express();

// 设置端口
const PORT = process.env.PORT || 3000;

// 初始化 Supabase 客户端
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

// 初始化 Telegram Bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { 
    polling: false,
    request: {
        timeout: 30000  // 30 秒
    }
});
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// 解析 JSON 请求体
app.use(express.json());

function formatTimestamp(timestamp) {
    return new Date(timestamp * 1000).toLocaleString('zh-CN');
}

async function saveToSupabase(transaction, formattedTime, retryCount = 3) {
    for (let i = 0; i < retryCount; i++) {
        try {
            const { data, error } = await supabase
                .from('transactions')
                .insert([
                    {
                        tx_hash: transaction.signature,
                        tx_type: transaction.type,
                        timestamp: formattedTime,
                        raw_data: transaction,
                        description: transaction.description || '无描述'
                    }
                ]);

            if (error) throw error;
            console.log('数据已保存到 Supabase');
            return;
        } catch (error) {
            console.error(`Supabase 保存失败 (尝试 ${i + 1}/${retryCount}):`, error);
            if (i === retryCount - 1) {
                console.error('Supabase 保存最终失败');
            } else {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }
}

async function sendTelegramMessage(transaction, formattedTime, retryCount = 3) {
    const message = `
🔔 新交易提醒
━━━━━━━━━━━━━━━
📝 类型: ${transaction.type}
⏰ 时间: ${formattedTime}
🔗 交易哈希: ${transaction.signature}
📄 描述: ${transaction.description || '无描述'}
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
    return lamports / 1000000000; // 1 SOL = 10^9 lamports
}

// Webhook 接收端点
app.post('/webhook', async (req, res) => {
    console.log('收到新的交易:');
    console.log('------------------------');

    for (const transaction of req.body) {
        const formattedTime = formatTimestamp(transaction.timestamp);
        const txHash = transaction.signature;

        // 基础信息打印
        console.log(`交易哈希: ${txHash}`);
        console.log(`时间: ${formattedTime}`);
        console.log(`交易类型: ${transaction.type}`);
        console.log(`描述: ${transaction.description || '无描述'}`);

        // 过滤逻辑：跳过小额 TRANSFER 交易
        if (transaction.type === 'TRANSFER' && transaction.nativeTransfers) {
            // 计算总转账金额（可能有多笔转账）
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

        // 保存到 Supabase
        await saveToSupabase(transaction, formattedTime);

        // 发送 Telegram 消息
        await sendTelegramMessage(transaction, formattedTime);
    }

    res.status(200).send('OK');
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`监控交易中...`);
}); 
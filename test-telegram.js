require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// 从.env文件读取配置
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function testTelegramBot() {
    try {
        console.log('开始测试 Telegram Bot...');
        console.log('Bot Token:', TELEGRAM_BOT_TOKEN);
        console.log('Chat ID:', TELEGRAM_CHAT_ID);

        const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { 
            polling: false,
            request: {
                timeout: 30000  // 30 秒
            }
        });
        
        console.log('正在发送测试消息...');
        
        const message = `
🔔 这是一条测试消息
━━━━━━━━━━━━━━━
⏰ 发送时间: ${new Date().toLocaleString('zh-CN')}
✅ 如果您收到这条消息，说明 Telegram Bot 配置正确！
⏰: SWAP | 时间 | <a href="https://solscan.io/}">viewTx</a>
`;

        for (let i = 0; i < 3; i++) {
            try {
                const result = await bot.sendMessage(TELEGRAM_CHAT_ID, message, {
                    parse_mode: 'HTML',
                    disable_web_page_preview: true
                });
                console.log('消息发送成功！');
                console.log('消息ID:', result.message_id);
                return;
            } catch (error) {
                console.error(`第 ${i + 1} 次尝试失败：`, error.message);
                if (i < 2) {
                    console.log('等待 2 秒后重试...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }
        
    } catch (error) {
        console.error('测试失败！错误信息：');
        console.error(error);
    }
}

// 运行测试
testTelegramBot(); 
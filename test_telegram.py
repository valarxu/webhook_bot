import os
import time
from datetime import datetime
import requests
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

# 获取环境变量
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
TELEGRAM_CHAT_ID = os.getenv('TELEGRAM_CHAT_ID')

def send_telegram_message():
    print('开始测试 Telegram Bot...')
    print(f'Bot Token: {TELEGRAM_BOT_TOKEN}')
    print(f'Chat ID: {TELEGRAM_CHAT_ID}')
    
    # Telegram Bot API URL
    url = f'https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage'
    
    # 消息内容
    message = f'''
🔔 这是一条Python测试消息
━━━━━━━━━━━━━━━
⏰ 发送时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
✅ 如果您收到这条消息，说明 Telegram Bot 配置正确！
'''
    
    # 请求参数
    payload = {
        'chat_id': TELEGRAM_CHAT_ID,
        'text': message,
        'parse_mode': 'HTML'
    }
    
    try:
        print('正在发送测试消息...')
        response = requests.post(url, json=payload)
        
        if response.status_code == 200:
            result = response.json()
            print('消息发送成功！')
            print(f'消息ID: {result["result"]["message_id"]}')
        else:
            print(f'发送失败！状态码: {response.status_code}')
            print(f'错误信息: {response.text}')
            
    except Exception as e:
        print('发送出错！错误信息：')
        print(e)

if __name__ == '__main__':
    send_telegram_message() 
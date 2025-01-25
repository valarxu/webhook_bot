// 临时禁用代理
process.env.HTTP_PROXY = '';
process.env.HTTPS_PROXY = '';

require('dotenv').config();
const { fetchOKXToken, fetchOKXTokenPrice } = require('./utils/api');

// ALON 代币地址
const TOKEN_ADDRESS = '8XtRWb4uAAJFMP4QQhoYYCWR6XXb7ybcCdiqPwz9s5WS';

async function testOKXAPI() {
    try {
        console.log('\n测试代币信息...');
        const bonkResponse = await fetchOKXToken(TOKEN_ADDRESS);
        console.log('TOKEN_ADDRESS 响应:', JSON.stringify(bonkResponse.data, null, 2));

        console.log('\n测试代币价格...');
        const bonkPrice = await fetchOKXTokenPrice(TOKEN_ADDRESS);
        console.log('TOKEN_ADDRESS 价格:', JSON.stringify(bonkPrice.data, null, 2));
    } catch (error) {
        if (error.response) {
            // API 响应中的错误
            console.error('API 错误:', {
                status: error.response.status,
                data: error.response.data
            });
        } else if (error.request) {
            // 请求发送失败
            console.error('请求错误:', error.message);
        } else {
            // 其他错误
            console.error('错误:', error.message);
        }
    }
}

// 运行测试
testOKXAPI(); 
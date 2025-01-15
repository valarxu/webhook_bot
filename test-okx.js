// 临时禁用代理
process.env.HTTP_PROXY = '';
process.env.HTTPS_PROXY = '';

require('dotenv').config();
const { fetchOKXToken } = require('./utils/api');

// USDC 代币地址
const USDC_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
// BONK 代币地址
const BONK_ADDRESS = 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263';

async function testOKXAPI() {
    try {
        console.log('测试 USDC 代币信息...');
        const usdcResponse = await fetchOKXToken(USDC_ADDRESS);
        console.log('USDC 响应:', JSON.stringify(usdcResponse.data, null, 2));

        console.log('\n测试 BONK 代币信息...');
        const bonkResponse = await fetchOKXToken(BONK_ADDRESS);
        console.log('BONK 响应:', JSON.stringify(bonkResponse.data, null, 2));
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
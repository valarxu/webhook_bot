const axios = require('axios');
const CryptoJS = require('crypto-js');
const HttpsProxyAgent = require('https-proxy-agent');

async function fetchOKXToken(tokenAddress) {
    const timestamp = new Date().toISOString();
    const method = 'GET';
    const requestPath = '/api/v5/wallet/token/token-detail';

    // 构建查询字符串
    const params = {
        chainIndex: '501',
        tokenAddress
    };
    const queryString = Object.entries(params)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

    const signStr = `${timestamp}${method}${requestPath}?${queryString}`;
    const signature = CryptoJS.enc.Base64.stringify(
        CryptoJS.HmacSHA256(
            signStr,
            process.env.OKX_SECRET_KEY || ''
        )
    );

    // 配置代理
    const httpsAgent = process.env.HTTPS_PROXY ? 
        new HttpsProxyAgent(process.env.HTTPS_PROXY) : 
        null;

    return axios.get(`https://www.okx.com${requestPath}`, {
        params: params,
        headers: {
            'OK-ACCESS-KEY': process.env.NEXT_PUBLIC_OKX_API_KEY,
            'OK-ACCESS-SIGN': signature,
            'OK-ACCESS-TIMESTAMP': timestamp,
            'OK-ACCESS-PASSPHRASE': process.env.OKX_PASSPHRASE,
            'OK-ACCESS-PROJECT': process.env.NEXT_PUBLIC_OKX_PROJECT_ID,
            'Content-Type': 'application/json'
        },
        httpsAgent,
        proxy: false, // 禁用 axios 默认代理
        maxRedirects: 5, // 设置最大重定向次数
        timeout: 10000   // 设置超时时间为 10 秒
    });
}

module.exports = {
    fetchOKXToken
}; 
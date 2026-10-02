// 云函数入口文件: aiRouter/index.js
const cloud = require('wx-server-sdk');
const https = require('https');
const url = require('url');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

/**
 * 封装通用 HTTPS 请求 (支持 DeepSeek / OpenAI 兼容接口)
 */
function makeHttpRequest(targetUrl, headers, data) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new url.URL(targetUrl);
    const postData = JSON.stringify(data);

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers
      },
      timeout: 45000
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        responseBody += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(responseBody);
            resolve(parsed);
          } catch (e) {
            resolve({ raw: responseBody });
          }
        } else {
          reject(new Error(`API Error [${res.statusCode}]: ${responseBody}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('API 请求超时（45秒）'));
    });

    req.write(postData);
    req.end();
  });
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const {
    action = 'chat',
    systemPrompt = '',
    prompt = '',
    userApiKey = '',
    customBaseUrl = '',
    model = 'deepseek-chat',
    temperature = 0.6
  } = event;

  // API Key 策略：优先使用用户自填 Key，否则使用云端环境变量中配置的 Key
  const apiKey = userApiKey || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return {
      success: false,
      code: 'NO_API_KEY',
      message: '未检测到可用 API Key。请在小程序「设置」中填入您的 DeepSeek/OpenAI API Key，或在云开发后台配置环境变量 DEEPSEEK_API_KEY。'
    };
  }

  // API 终结点
  const endpoint = customBaseUrl 
    ? `${customBaseUrl.replace(/\/+$/, '')}/chat/completions`
    : 'https://api.deepseek.com/v1/chat/completions';

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  try {
    const result = await makeHttpRequest(
      endpoint,
      {
        'Authorization': `Bearer ${apiKey}`
      },
      {
        model: model || 'deepseek-chat',
        messages,
        temperature,
        stream: false
      }
    );

    const reply = result.choices && result.choices[0] && result.choices[0].message
      ? result.choices[0].message.content
      : '';

    return {
      success: true,
      data: {
        reply,
        usage: result.usage || null
      }
    };
  } catch (err) {
    console.error('aiRouter 错误:', err);
    return {
      success: false,
      code: 'REQUEST_FAILED',
      message: err.message || '调用大模型接口失败，请检查网络或 Key 有效性'
    };
  }
};

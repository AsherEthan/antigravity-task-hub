// services/ai-advisor.js
const http = require('http');
const https = require('https');
const url = require('url');

/**
 * 战术参谋与双核大模型适配器 (AI Tactical Advisor & Dual-Core Engine)
 * 支持协议自适应 (HTTP/HTTPS)、本地 Ollama / LM Studio 及云端 DeepSeek / OpenAI
 * 具备 5000ms 优雅超时与零延迟离线启发规则库平滑降级机制
 */
class AiAdvisor {
  /**
   * 底层 HTTP / HTTPS 统一请求封装
   * 支持多种调用签名：
   * 1. requestLlm(apiUrl, apiKey, model, messages, optionsOrTemperature)
   * 2. requestLlm(prompt, systemPrompt, options)
   * 3. requestLlm({ apiUrl, baseUrl, apiKey, model, messages, prompt, systemPrompt, temperature, timeout })
   */
  async requestLlm(first, second, third, fourth, fifth) {
    let apiUrl = 'https://api.deepseek.com/v1';
    let apiKey = '';
    let model = 'deepseek-chat';
    let messages = [];
    let temperature = 0.6;
    let timeout = 5000;

    // 解析入参签名
    if (typeof first === 'object' && first !== null && !Array.isArray(first)) {
      // 签名 3: 单一配置对象
      const cfg = first || {};
      apiUrl = cfg.apiUrl || cfg.baseUrl || apiUrl;
      apiKey = cfg.apiKey || '';
      model = cfg.model || model;
      temperature = cfg.temperature ?? temperature;
      timeout = cfg.timeout ?? timeout;
      if (Array.isArray(cfg.messages)) {
        messages = cfg.messages;
      } else if (cfg.prompt) {
        messages = [
          { role: 'system', content: cfg.systemPrompt || '你是一位敏锐冷酷、直击核心因果的战术顾问。' },
          { role: 'user', content: cfg.prompt }
        ];
      }
    } else if (
      typeof first === 'string' &&
      (first.startsWith('http://') || first.startsWith('https://')) &&
      !first.includes(' ') &&
      !first.includes('\n') &&
      (Array.isArray(fourth) || (typeof third !== 'object' && fourth === undefined) || (typeof third === 'string' && !Array.isArray(third)))
    ) {
      // 签名 1: 传统参数 (apiUrl, apiKey, model, messages, optionsOrTemperature)
      apiUrl = first;
      apiKey = second || '';
      model = third || model;
      messages = Array.isArray(fourth) ? fourth : [];
      if (typeof fifth === 'number') {
        temperature = fifth;
      } else if (typeof fifth === 'object' && fifth !== null) {
        temperature = fifth.temperature ?? temperature;
        timeout = fifth.timeout ?? timeout;
      }
    } else if (typeof first === 'string') {
      // 签名 2: (prompt, systemPrompt, options)
      const prompt = first;
      const systemPrompt = typeof second === 'string' ? second : '你是一位敏锐冷酷、直击核心因果的战术顾问。';
      const opts = (typeof third === 'object' && third !== null) ? third : {};
      apiUrl = opts.apiUrl || opts.baseUrl || apiUrl;
      apiKey = opts.apiKey || '';
      model = opts.model || model;
      temperature = opts.temperature ?? temperature;
      timeout = opts.timeout ?? timeout;
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ];
    }

    // 协议与 URL 归一化处理
    let normalizedUrl = (apiUrl || 'https://api.deepseek.com/v1').trim();
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    let endpoint = normalizedUrl.replace(/\/+$/, '');
    if (!endpoint.endsWith('/chat/completions')) {
      endpoint += '/chat/completions';
    }

    let parsedUrl;
    try {
      parsedUrl = new url.URL(endpoint);
    } catch (e) {
      throw new Error(`Invalid API URL: ${apiUrl}`);
    }

    const isLocalhost = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(parsedUrl.hostname);
    // 若非本地服务且缺少 API Key，直接返回 null 触发离线降级
    if (!apiKey && !isLocalhost) {
      return null;
    }

    const isHttps = parsedUrl.protocol === 'https:';
    const transport = isHttps ? https : http;
    const defaultPort = isHttps ? 443 : 80;
    const port = parsedUrl.port ? parseInt(parsedUrl.port, 10) : defaultPort;

    const postData = JSON.stringify({
      model: model || 'deepseek-chat',
      messages,
      temperature,
      stream: false
    });

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'POST',
      headers,
      timeout
    };

    return new Promise((resolve, reject) => {
      let settled = false;

      const req = transport.request(requestOptions, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (!settled) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              settled = true;
              try {
                const parsed = JSON.parse(body);
                const text = parsed.choices?.[0]?.message?.content || parsed.message?.content || parsed.response || '';
                resolve(text);
              } catch (e) {
                resolve(body);
              }
            } else {
              settled = true;
              reject(new Error(`API Error [${res.statusCode}]: ${body}`));
            }
          }
        });

        res.on('error', (err) => {
          if (!settled) {
            settled = true;
            reject(new Error(`大模型响应流网络异常: ${err.message || err.code || err}`));
          }
        });

        res.on('close', () => {
          if (!settled) {
            settled = true;
            reject(new Error('Connection closed before complete response'));
          }
        });
      });

      req.on('error', (err) => {
        if (!settled) {
          settled = true;
          reject(new Error(`大模型请求网络异常: ${err.message || err.code || err}`));
        }
      });

      req.on('timeout', () => {
        req.destroy();
        if (!settled) {
          settled = true;
          reject(new Error(`大模型请求超时 (${timeout}ms)`));
        }
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * 判断当前配置是否具备线上调用能力
   */
  isOnlineConfigured(settings = {}) {
    const st = settings || {};
    const baseUrl = st.baseUrl || st.apiUrl || '';
    const isLocal = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1') || baseUrl.includes('::1') || baseUrl.includes('[::1]');
    return Boolean(st.apiKey || isLocal);
  }

  /**
   * 执行战术透镜推演
   * @param {string} lensKey 'socratic' | 'hypotheses' | 'test' | 'attribution'
   * @param {Object} clueContext 当前选中的线索或目标
   * @param {Object} settings API 配置
   */
  async castLens(lensKey, clueContext, settings = {}) {
    const st = settings || {};
    const promptMap = {
      socratic: {
        title: '🔍 穿透追问分析 (Socratic Drill)',
        instruction: '针对用户的这条记录，指出其中潜藏的未经检验的预设或伪问题。反问：用户现在以为在解决什么，但真正致命的底层问题可能是什么？言简意赅，2条关键追问。'
      },
      hypotheses: {
        title: '💡 竞争性假说发散 (Hypothesis Spectrum)',
        instruction: '切勿押注单一可能，给出 2~3 个相互独立、因果机制迥异的竞争性假说，并指出什么样的关键反例能证伪它们。'
      },
      test: {
        title: '⚡ 最小验证设计 (Minimal Viable Test)',
        instruction: '击破“永远在准备而不行动(Action=0)”的陷阱！设计 1 个极低成本（15~30分钟内完成）、高信息增益的即刻现实验证行动。'
      },
      attribution: {
        title: '🎯 失败层级归因排查 (Failure Attribution)',
        instruction: '结果不如预期并不代表理论错误。从以下层级逐步排查：测量伪迹？参数不当？假设漏洞？工具局限？给出明确的归因判断。'
      }
    };

    const lensMeta = promptMap[lensKey] || promptMap.socratic;
    const targetText = clueContext?.content || clueContext?.title || '当前核心目标';

    // 尝试调用大模型 (支持 HTTPS 云端与 HTTP 本地服务)
    if (this.isOnlineConfigured(st)) {
      try {
        const messages = [
          {
            role: 'system',
            content: '你是一位敏锐冷酷、遵循达·芬奇/马斯克/图灵认知法则的游戏战术顾问（Tactical Advisor）。拒绝说套话空话，字字锋利，直击核心因果。'
          },
          {
            role: 'user',
            content: `【当前推演焦点】:\n${targetText}\n\n【战术任务】:\n${lensMeta.instruction}`
          }
        ];
        const reply = await this.requestLlm(st.baseUrl, st.apiKey, st.model, messages, {
          timeout: st.timeout || 5000
        });
        if (reply) {
          return {
            title: lensMeta.title,
            output: reply,
            isAiGenerated: true
          };
        }
      } catch (err) {
        console.warn('AI 线上推演受限，启用本地战术推演库:', err.message);
      }
    }

    // 离线战术启发库 (Offline Heuristics)
    return {
      title: lensMeta.title,
      output: this.getOfflineInsight(lensKey, targetText),
      isAiGenerated: false
    };
  }

  getOfflineInsight(lensKey, text) {
    switch (lensKey) {
      case 'socratic':
        return `【战术本质性剥离】：你是否默认了所观察到的现象必然是“目标本身”的反应？\n\n关键追问：\n1. 在未严格隔离测试仪器与环境伪迹前，这个现象是否可能纯属系统噪声？\n2. 如果不解决现有假定，会导致整个系统在何种情境下彻底崩溃？`;
      case 'hypotheses':
        return `【竞争性假说矩阵】：针对此现象，请审视两条对立机制：\n\n• 假说 A（内生机制）：这是系统内部核心变量耦合产生的真实高阶相变。\n• 假说 B（外生扰动）：这仅仅是观测探针与受试微动作产生的低频电位耦合伪迹。`;
      case 'test':
        return `【击破 Action=0 方案】：\n停止泛化查阅资料！立刻在 15 分钟内执行单一变量 A/B 对照：\n控制最可疑的扰动源（如佩戴物理眼罩/断开外部电磁源），对比能量方差衰减率。耗时极低，信息增益极高！`;
      case 'attribution':
        return `【失败归因排查】：\n若实测差异不显著，绝不可直接下结论“该方向无效”。\n优先排查：\n1. 测量层级：采样率是否过低或通道接触阻抗过大？\n2. 参数层级：时间窗切片是否错过了关键反应峰值？`;
      default:
        return '战术推演完成。请审视当前假设。';
    }
  }
}

const defaultAdvisor = new AiAdvisor();
defaultAdvisor.AiAdvisor = AiAdvisor;
module.exports = defaultAdvisor;

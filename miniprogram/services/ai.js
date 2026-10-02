// services/ai.js
const { buildLensPrompt, buildCockpitSyncPrompt } = require('./prompts');

class AiService {
  /**
   * 获取当前配置
   */
  getConfig() {
    const app = getApp();
    const settings = (app && app.globalData && app.globalData.settings) || {};
    const isCloudAvailable = !!(app && app.globalData && app.globalData.isCloudAvailable);
    return { settings, isCloudAvailable };
  }

  /**
   * 底层调度大模型
   */
  async requestLlm({ systemPrompt, prompt, temperature = 0.6 }) {
    const { settings, isCloudAvailable } = this.getConfig();
    const userApiKey = settings.userApiKey ? settings.userApiKey.trim() : '';
    const customBaseUrl = settings.customBaseUrl ? settings.customBaseUrl.trim() : '';
    const model = settings.model || 'deepseek-chat';

    // 方案 A: 优先尝试云开发云函数中继
    if (isCloudAvailable && settings.useCloudBackend) {
      try {
        const res = await wx.cloud.callFunction({
          name: 'aiRouter',
          data: {
            action: 'chat',
            systemPrompt,
            prompt,
            userApiKey,
            customBaseUrl,
            model,
            temperature
          }
        });

        if (res.result && res.result.success) {
          return res.result.data.reply;
        } else if (res.result && res.result.code === 'NO_API_KEY' && !userApiKey) {
          // 云函数提示未配置统一 Key 且用户没填 Key，转入降级提示或直连
          console.warn('云函数未配置全局 Key，且用户未填自定义 Key');
        } else {
          throw new Error(res.result?.message || '云函数调用失败');
        }
      } catch (cloudErr) {
        console.warn('云函数调用异常，尝试前端直连或离线启发:', cloudErr);
      }
    }

    // 方案 B: 用户配置了自定义 API Key，在前端直连（开发调试环境）
    if (userApiKey) {
      const endpoint = customBaseUrl
        ? `${customBaseUrl.replace(/\/+$/, '')}/chat/completions`
        : 'https://api.deepseek.com/v1/chat/completions';

      return new Promise((resolve, reject) => {
        wx.request({
          url: endpoint,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userApiKey}`
          },
          data: {
            model,
            temperature,
            messages: [
              ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
              { role: 'user', content: prompt }
            ]
          },
          timeout: 45000,
          success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const reply = res.data?.choices?.[0]?.message?.content || '';
              resolve(reply);
            } else {
              reject(new Error(`API Error [${res.statusCode}]: ${JSON.stringify(res.data)}`));
            }
          },
          fail: (err) => {
            reject(new Error(err.errMsg || '网络请求超时或域名未在小程序后台配置'));
          }
        });
      });
    }

    // 方案 C: 无 Key 时启用内置认知模拟引擎 (Mock Heuristics)
    return null;
  }

  /**
   * 清理与解析 JSON 文本 (容错 markdown 标记)
   */
  parseCleanJson(rawText) {
    if (!rawText) return null;
    let text = rawText.trim();
    // 去掉 ```json 和 ``` 包裹
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    try {
      return JSON.parse(text);
    } catch (e) {
      // 容错提取首个合法的大括号段落
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (e2) {}
      }
      return { summary: text, items: [] };
    }
  }

  /**
   * 执行定向认知透镜
   */
  async runLens({ lensType, item, projectTitle, currentCockpit }) {
    const { systemPrompt, prompt } = buildLensPrompt(
      lensType,
      item.content,
      item.type,
      projectTitle,
      currentCockpit
    );

    try {
      const rawReply = await this.requestLlm({ systemPrompt, prompt, temperature: 0.6 });
      
      if (rawReply) {
        const parsed = this.parseCleanJson(rawReply);
        return {
          lens: lensType,
          content: parsed.summary || rawReply,
          items: parsed.items || [],
          created_at: Date.now()
        };
      }
    } catch (e) {
      console.warn('大模型透镜执行失败，启动离线启发引擎:', e);
      wx.showToast({
        title: '正在展示认知启发引导',
        icon: 'none',
        duration: 2000
      });
    }

    // 内置离线认知启发 (Mock Heuristics)
    return this.getMockLensInsight(lensType, item);
  }

  /**
   * 状态舵盘综合提炼与同步
   */
  async syncCockpitState({ projectTitle, currentCockpit, recentItems }) {
    const { systemPrompt, prompt } = buildCockpitSyncPrompt(projectTitle, currentCockpit, recentItems);

    try {
      const rawReply = await this.requestLlm({ systemPrompt, prompt, temperature: 0.4 });
      if (rawReply) {
        const parsed = this.parseCleanJson(rawReply);
        return parsed;
      }
    } catch (e) {
      console.warn('舵盘同步调用失败，启用离线推演方案:', e);
    }

    // 内置离线推演提炼方案
    return {
      core_question: currentCockpit?.core_question || '围绕当前现象的核心因果机制究竟是什么？',
      unknowns: [
        '是否存在未经检验的测量误差或混杂变量？',
        '当前的实验设计能否支撑所提出的核心假设？'
      ],
      current_bottleneck: '缺乏低成本的对照反馈闭环，信息累积过重而真实验证不足。',
      next_action: '停止泛化搜索，挑选最小变量设计 30 分钟对照验证实验。',
      working_model: '观察现象 -> 排除伪迹 -> 寻找最小验证闭环',
      progress_critique: '系统提示：当前处于离线启发模式。请在「设置」中输入 DeepSeek/OpenAI Key 即可启用实时大模型认知推演。'
    };
  }

  /**
   * 本地智能启发降级库 (为用户在未配置 API Key 前提供绝佳启发示例)
   */
  getMockLensInsight(lensType, item) {
    const text = item.content;
    switch (lensType) {
      case 'socratic':
        return {
          lens: 'socratic',
          content: `【穿透追问】：你记录的现象表面是“${text.slice(0, 18)}...”，但请反思：你是否把“测量手段的困难”与“问题本身的本质”混为一谈了？`,
          items: [
            '如果不依赖现有复杂工具，这个现象能在更简易的场景被观察到吗？',
            '你是否默认了这个现象必然由单一主因导致？'
          ],
          created_at: Date.now()
        };
      case 'hypotheses':
        return {
          lens: 'hypotheses',
          content: `【发散假设】：针对“${text.slice(0, 16)}...”，切勿押注单一可能，请考虑 2 个对立假说：`,
          items: [
            '假设 1 (内生机制)：这是系统内部核心变量耦合产生的真实响应',
            '假设 2 (外生扰动)：这仅仅是测试环境或观测工具自身带来的系统误差'
          ],
          created_at: Date.now()
        };
      case 'test':
        return {
          lens: 'test',
          content: `【最小验证】：警惕“只做调研、迟迟不行动(Action=0)”。请在今天执行以下低成本行动：`,
          items: [
            '设计极简 A/B 对照：控制单一最可疑变量，进行 1 次 20 分钟的对比实测',
            '向 1 位真实做过该实验的同行快速求证其常见伪迹'
          ],
          created_at: Date.now()
        };
      case 'attribution':
        return {
          lens: 'attribution',
          content: `【失败归因排查】：结果不如预期并不意味着核心方向无效，极大概率是方法或参数层级问题：`,
          items: [
            '排查层级 1：观测指标灵敏度是否过低或被噪声淹没？',
            '排查层级 2：实验的边界条件是否与文献基线存在关键偏差？'
          ],
          created_at: Date.now()
        };
      default:
        return {
          lens: lensType,
          content: '【认知分析完成】',
          items: [],
          created_at: Date.now()
        };
    }
  }
}

const aiService = new AiService();
module.exports = aiService;

// services/prompts.js

/**
 * 认知脚手架提示词库 (Cognitive Prompt Library)
 */

const SYSTEM_PROMPT_BASE = `你是一个极其敏锐的“认知探索导航伙伴”（Exploration Navigation Partner）。
你遵循达·芬奇、图灵、特斯拉、屠呦呦与马斯克的探索思维法则。
你的最高准则是：
1. 不替人草率下结论，不讲套话空话；
2. 帮助用户区分“事实观察”、“主观推论”与“未经证实的假设”；
3. 严格警惕“过早定义问题”、“无限收集信息却不实验(Action=0)”、“活动很多却未推进核心瓶颈(Activity≠Progress)”；
4. 语言锋利、言简意赅、高度结构化。`;

/**
 * 构造认知透镜提示词
 */
function buildLensPrompt(lensType, itemContent, itemType, projectTitle, currentCockpit) {
  let instruction = '';
  let formatGuide = '';

  const cockpitContext = currentCockpit 
    ? `当前探索项目：《${projectTitle}》\n当前核心问题：${currentCockpit.core_question || '未明确'}\n当前瓶颈：${currentCockpit.current_bottleneck || '未明确'}`
    : `当前探索项目：《${projectTitle}》`;

  switch (lensType) {
    case 'socratic':
      instruction = `【穿透追问任务】：针对用户记录的这则[${itemType}]进行本质性剥离。
找出其中潜藏的先入为主预设、未证实的逻辑跳跃，或者伪问题陷阱。
指出：“用户现在以为在面对什么，但真正致命的底层问题可能是什么？”`;
      formatGuide = `请按如下 JSON 结构输出（不要输出任何外部多余说明文本）：
{
  "summary": "1-2句犀利的洞察与追问剖析",
  "items": [
    "提炼出的关键追问1（适合作为新问题深入研究）",
    "提炼出的关键追问2"
  ]
}`;
      break;

    case 'hypotheses':
      instruction = `【发散假设任务】：针对这条记录，不要给单一答案，而要生成 2-3 个相互独立、机制不同的竞争性假设，并指出什么样的证据会证伪它们。`;
      formatGuide = `请按如下 JSON 结构输出（不要输出任何外部多余说明文本）：
{
  "summary": "简短说明这些假设背后的核心机制差异",
  "items": [
    "假设1：机制陈述与可能反例",
    "假设2：竞争机制陈述与可能反例"
  ]
}`;
      break;

    case 'test':
      instruction = `【最小验证设计任务】：用户容易陷入“永远在看资料、做准备，却不行动”的陷阱。
请设计 1-2 个极低成本、极低时间消耗（最好在30分钟至2小时内可落地）、但能产生高信息增益的最小现实实验/验证动作。`;
      formatGuide = `请按如下 JSON 结构输出（不要输出任何外部多余说明文本）：
{
  "summary": "最小验证的核心逻辑与阻力破除提示",
  "items": [
    "最小实验1：明确自变量、低成本观测指标与预期耗时",
    "最小实验2（备选）：更轻量的即刻验证动作"
  ]
}`;
      break;

    case 'attribution':
      instruction = `【失败归因排查任务】：当实验或尝试结果不理想时，帮助用户精准归因。
坚决防止轻易下结论“这个想法不行”。从以下层级逐层排查：
1. 观察/测量问题（数据有伪迹？）
2. 实验设计与参数问题（对照缺失/参数不准？）
3. 假设与模型问题（因果链条有漏洞？）
4. 环境与实现问题（工具/代码/受试者干扰？）
定位最可能的失败层级，指出真正的有效教训。`;
      formatGuide = `请按如下 JSON 结构输出（不要输出任何外部多余说明文本）：
{
  "summary": "精准定位最可能的失败层级与核心归因判断",
  "items": [
    "修正建议1（如修正实验参数或控制变量）",
    "修正建议2（如重新审视前置假设）"
  ]
}`;
      break;

    default:
      instruction = '请对该条探索记录提供犀利的认知分析。';
      formatGuide = `{"summary": "分析摘要", "items": ["衍生思考项"]}`;
  }

  const prompt = `${cockpitContext}

【用户当前记录】
类型: ${itemType}
内容: ${itemContent}

【任务要求】
${instruction}

${formatGuide}`;

  return {
    systemPrompt: SYSTEM_PROMPT_BASE,
    prompt
  };
}

/**
 * 构造状态舵盘同步提炼提示词
 */
function buildCockpitSyncPrompt(projectTitle, currentCockpit, recentItems) {
  const itemsText = recentItems.map((item, idx) => {
    return `${idx + 1}. [${item.type}] ${item.content}`;
  }).join('\n');

  const prompt = `项目名称：《${projectTitle}》

【当前已有状态舵盘】
- 核心问题 Qt: ${currentCockpit?.core_question || '未定义'}
- 关键未解之谜: ${(currentCockpit?.unknowns || []).join('; ') || '无'}
- 当前最大瓶颈 Bt: ${currentCockpit?.current_bottleneck || '未定义'}
- 下一步最小行动 At: ${currentCockpit?.next_action || '未定义'}

【近期探索流条目（最新发生的事实）】
${itemsText || '暂无近期条目'}

【任务】
作为探索导航伙伴，请综合评估当前所有探索进展：
1. 用户是在做无意义的琐事忙碌，还是真正推动了核心问题的状态迁移 (ΔProblem State)？
2. 当前真正应该聚焦的【核心问题】是否有更新或深化？
3. 暴露出的最关键【未解之谜】有哪些？
4. 当前阻碍项目前进的真正【第一瓶颈】是什么？
5. 下一步最具性价比、最值得发生的【最小行动】是什么？

请严格输出如下合法的 JSON 格式（不要包含任何 markdown 代码块外部的解释文字）：
{
  "core_question": "更新后的单句核心问题",
  "unknowns": ["未解之谜1", "未解之谜2"],
  "current_bottleneck": "最制约进展的单一关键瓶颈",
  "next_action": "下一步最值得执行的最小低成本行动",
  "working_model": "一句话当前工作模型机制",
  "progress_critique": "一段尖锐的进展点评：指出最近的活动是否真正带来了有效认知增量，或者是否存在偏移"
}`;

  return {
    systemPrompt: SYSTEM_PROMPT_BASE,
    prompt
  };
}

module.exports = {
  SYSTEM_PROMPT_BASE,
  buildLensPrompt,
  buildCockpitSyncPrompt
};

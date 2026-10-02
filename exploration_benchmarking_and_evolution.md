# 探索任务工作台：深度分析提问与 GitHub 开源方案借鉴吸收

## 一、对当前成果的 5 大尖锐分析提问 (Critical Analysis & Socratic Inquiries)

通过对前序实现的理论三元引擎与 Apple Pro 战术看板的系统审查，提出以下 5 个关乎**“真探索 vs 假游戏化”**的核心提问：

### 提问 1：激励机制是“皮相装饰”还是“内在心流”？（The Dopamine Authenticity Paradox）
- **现象反思**：当前给 BOSS 扣除 35 点 HP、弹跳伤害数字、播放音效，确实有第一眼的惊艳感。但当探索者面对持续 3 天没有进展的科研卡点时，这种固定数值的扣血是否会沦为廉价的玩具？
- **核心提问**：如何让游戏激励与**“真实世界的认知推进”**建立不可分割的内生契约？击破瓶颈后，除了数字变动，用户是否能获得具有可沉淀、可继承的**“认知战利品（Epistemic Relics）”**？

### 提问 2：知识图谱在节点膨胀后如何避免“乱麻困境”？（The Graph Chaos Crisis）
- **现象反思**：当线索只有 5 条时，人工拖拽尚可观赏。一旦进行为期两周的深度调研，积累 40-80 条事实、假说与文献时，二维画布极易坍塌为混乱的“意大利面连线”。
- **核心提问**：能否吸收专业知识图谱工具的**层次化自动布局（Hierarchical / DAG Auto-Layout）**与**因果骨干高亮（Causal Backbone Highlighting）**，使得从原始现象到核心检验的推演脉络一目了然？

### 提问 3：连击与心流惯性如何被系统化捕捉？（The Flow Momentum Gap）
- **现象反思**：在面对高难度探索时，最难的是前 15 分钟启动。然而一旦进入状态，人往往在 1 小时内连续完成 2-3 个微验证。现有系统对这种“专注势头（Momentum）”缺乏乘数级的即时正反馈。
- **核心提问**：能否引入格斗游戏与 RPG 的**连击倍率系统（Combo Multiplier）**？连续完成行动悬赏或记录硬核反例时，触发 `x1.5`、`x2.0` 的破防倍率与战意视觉光环？

### 提问 4：键盘优先与系统穿透能力是否足够极致？（The Keyboard-First Imperative）
- **现象反思**：顶尖研究者与开发者在查论文或编写代码时，极度厌恶频繁抬手抓鼠标切换界面。虽然有了 `Alt+Space`，但在指挥大屏内仍需鼠标点击多个透镜。
- **核心提问**：能否借鉴现代生产力神作（如 Raycast、Obsidian、GitHub Command Palette）的全局全局指令中枢，提供全键盘 **`Ctrl+K / ⌘K` 统一指令面板**，毫秒级完成搜索、施法、重排与悬赏打勾？

### 提问 5：探索成果的沉淀资产如何被具象化？（The Inventory & Asset Realization）
- **现象反思**：探索不同于日常打卡，每次击破一个重大伪迹（如剥离眼动伪迹），都是人类认知的一次永久性胜利。
- **核心提问**：能否建立一座**“认知圣物与战利品宝库（Epistemic Relic Vault）”**？击溃 BOSS 随机掉落例如【奥卡姆极简剃刀】、【第一性原理晶核】、【反例偏振棱镜】等圣物，佩戴后赋予真实的系统被动加成（Passive Perks）？

---

## 二、GitHub 相似优秀开源项目调研与借鉴

通过在 GitHub 上对 `#gamified-productivity`、`#investigation-board`、`#knowledge-graph` 与 `#command-palette` 主题的深度检索，我们对标分析了以下 5 个标杆项目并吸收其解法：

| 开源项目 | 核心机制与架构亮点 | 本系统吸收的解决方案 |
| :--- | :--- | :--- |
| **[Habitica](https://github.com/HabitRPG/habitica)**<br>*(Star 10k+)* | • 任务与首领血条严格挂钩<br>• 连击 Streak 机制<br>• 战利品掉落（Loot Drop Table）与装备栏 | **【吸收方案 1】连续实测连击系统 (Combo Streak)**：连续完成悬赏触发暴击乘数。<br>**【吸收方案 2】认知圣物掉落库 (Relic Vault)**：击破 BOSS 掉落专属探索神器。 |
| **[QuestBoard](https://github.com/thillygooth/questboard)** | • 怪物每日韧性条<br>• 任务达成时的 Critical Hit 暴击判定<br>• 连杀奖励倍率 | **【吸收方案 3】弱点暴击属性判定深化**：实测证物命中弱点时激发 2.5x 真实伤害。 |
| **[Detective-Board](https://github.com/stefankober/detective-board)** & **[Obsidian-Canvas-KG](https://github.com/obsidian-community/obsidian-canvas-knowledge-graph)** | • 侦探悬案红线关联<br>• 实体分类分组<br>• 层次化 DAG 有向无环图自动排列 | **【吸收方案 4】因果层级智能重排 (Auto-DAG Layout)**：一键将散乱节点按照 `观察 -> 疑问 -> 假说 -> 证物 -> 瓶颈` 垂直有序流式对齐。 |
| **[CrazyWall](https://github.com/0xsha/CrazyWall)** | • 调查线索高亮检索<br>• 证据链条溯源过滤 | **【吸收方案 5】线索画布聚光灯检索 (Spotlight Filter)**：画布端检索时高亮因果链，淡化无关杂音。 |
| **[electron-command-palette](https://github.com/Armaldio/electron-command-palette)** & **[kbar](https://github.com/timc1/kbar)** | • 键盘中心交互 (`Cmd+K`)<br>• 模糊匹配与动作秒级分发<br>• Apple Spotlight 极简设计 | **【吸收方案 6】全局战术指令中枢 (`Ctrl+K` Command Palette)**：全键盘无摩擦唤起指令，一键搜索与施放战术透镜。 |

---

## 三、吸收解决方案的具体实施规划

```
                 ┌────────────────────────────────────────────────────────┐
                 │          本轮吸收实施的四大增强模块 (Evolution 2.0)     │
                 └───────────────────────────┬────────────────────────────┘
                                             │
      ┌──────────────────────┬───────────────┴───────────────┬──────────────────────┐
      ▼                      ▼                               ▼                      ▼
【1. 连击心流引擎】     【2. 战利品圣物宝库】            【3. 图谱智能重排】       【4. 全局快捷指令中枢】
• Combo Streak ×1.5/2.0 • 击破BOSS掉落探索圣物           • 一键 Auto-DAG 层级重排  • Ctrl+K / ⌘K 秒级唤起
• 战意火花与光环倍增    • 装备栏被动加成 (Passive Perks) • 关键词聚光灯因果链高亮  • 模糊检索课题/线索/透镜
```

### 实施路线：
1. **数据层扩展 (`services/store.js`)**：
   - 增加 `comboStreak`（当前连击次数）与 `maxCombo`。
   - 增加 `relicVault`（已获得的认知圣物，如【奥卡姆极简剃刀】、【第一性原理晶核】、【反例偏振棱镜】）与佩戴槽。
2. **战利品圣物引擎 (`renderer/services/relic-engine.js`)**：
   - 管理掉落判定、Apple 风格炫彩战利品弹窗、圣物装备栏被动加成。
3. **画布智能重排与高亮 (`renderer/services/clue-canvas.js`)**：
   - 新增 `autoLayoutDAG()`：一键将散乱节点按照因果类型和依赖拓扑对齐。
   - 新增 `setSearchFilter(query)`：聚光灯高亮匹配节点，柔化暗淡无关节点。
4. **全局统一指令面板 (`renderer/services/command-palette.js`)**：
   - 支持 `Ctrl+K` 秒级唤起，模糊检索课题、线索、四大透镜与快捷操作。
5. **视窗联动与视听触觉全面升级**：
   - 在 War Room 顶栏与 HUD 显示连击倍数与圣物徽章，连击时播放 Apple 大调琶音跃升。

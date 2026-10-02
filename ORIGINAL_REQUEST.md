# Original User Request

## Initial Request — 2026-09-30T04:10:29Z

构建具备主动感知与认知引导能力的 Windows 桌面「全自动智能探索伴侣」任务工作台：将人类混沌复杂的工作大目标全自动拆解为极低阻力的即刻微动作，主动诊断思维卡点并输出破局启发，自动将碎片化发现编织成因果线索图谱，依托桌面级注意力锁定机制与心流连击系统，帮助用户科学高效地聚焦深度工作。

Working directory: d:/E盘/项目/项目34 探索任务管理
Integrity mode: development

## Requirements

### R1. 认知负荷粉碎与自动化微动作拆解 (Cognitive Load Shredder & Auto Decomposition)
- 用户输入宏观或模糊的目标时，伴侣引擎能主动将其粉碎为一组符合「2分钟启动法则」的极低阻力微动作（Action Cards），消除拖延与启动焦虑。
- 支持完成当前微动作后，系统感知最新状态并动态推荐或生成下一张连贯的微动作卡片，形成连续推进的心流飞轮。
- 采用灵活双核架构：内置高品质离线认知启发与因果推演规则库，同时支持接入云端/本地大模型 API（如 DeepSeek、OpenAI、Ollama 等）。

### R2. 思维卡点主动诊断与破局引导 (Proactive Bottleneck Diagnosis & Breakthrough Guidance)
- 当用户长时间停滞、标记卡点或产生矛盾线索时，系统主动诊断核心障碍类型（如概念混淆、缺乏对照基线、实验变量未隔离等）。
- 结合第一性原理、极简反例法、费曼技巧等科学思维模型，自动生成针对该卡点的「破局启发」和「最小验证动作」。

### R3. 碎片线索拓扑编织与因果图自动生成 (Autonomous Clue Graph & Causal Synthesis)
- 当用户通过桌面录入日常碎片化观察、疑问或数据时，伴侣系统能自动推断线索之间的因果关系与演进关系。
- 自动将新线索编织进可视化因果图，动态对齐逻辑层次（现象 → 疑问 → 假说 → 实测证据 → 难关突破），并实时计算探索清晰度进度。

### R4. 极简桌面焦点与全景作战大屏协同 (Minimal Focus & War Room Synergy)
- 默认呈现 620×420 极简任务聚焦卡片（纯白话、大字号、突出当下一件事），消除新手信息眩晕。
- 具备桌面级心流伴随结界与连击倍率激励（Combo Streak），支持双向平滑切换至 1280×840 全景白板作战大屏，保证极简体验与专业深度两全其美。

## Acceptance Criteria

### Automated Verification
- [ ] 自动化测试套件（scripts/verify-ai-companion.js）在 Electron Headless 下执行并通过所有测试用例。
- [ ] 目标分解测试：输入模糊大目标，引擎在离线模式及 API 模拟下均能输出清晰、可执行且符合低阻力标准的微动作列表。
- [ ] 卡点诊断测试：给定卡点描述，系统能输出对应的诊断原因及可执行的破局验证方案。
- [ ] 拓扑编织测试：录入多条线索后，因果图谱引擎能自动生成正确的拓扑连线与层次化坐标分布。
- [ ] 窗口与性能测试：双视窗（聚焦卡片与全景作战室）状态毫秒级无损同步，控制台 0 错误（Zero Console Errors）。

## Follow-up — 2026-09-30T11:09:48Z

构建借鉴 Google Antigravity 设计哲学的系统级「内生贴附侧边栏」探索任务中枢：紧贴 Windows 屏幕右边缘，不割裂用户当前工作的编辑器、浏览器或阅读视窗；支持全局快捷键（Alt+S）与划选剪贴板上下文随手注入；以 Slash 指令（/plan, /shred, /solve）驱动任务即时拆解，并以真实的交互式产出物（Artifacts / 可执行步骤卡）替代虚假打卡与虚荣游戏化数值，从根本上符合人类认知科学与工作心流心理学。

Working directory: d:/E盘/项目/项目34 探索任务管理
Integrity mode: development

## Requirements

### R1. Windows 屏幕贴边侧边抽屉视窗系统 (Docked Attached Sidebar Architecture)
- 视窗自动吸附并贴合主屏幕右侧边缘（宽度建议 380~420px，高度自动占满当前显示器工作区 workArea.height），不遮挡中央主工作区。
- 支持全局快捷键（Alt+S 或 Alt+A）秒级平滑滑入/呼出与隐藏，支持置顶或与活动窗口协同。
- 采用符合现代苹果/Antigravity 风格的精致深色微透材质（Acrylic/Frosted Glass），具备优雅左侧高光边框，界面纯净无视觉噪音。

### R2. 现场上下文捕获与划选一键注入 (In-Situ Context Ingestion & Shortcuts)
- 用户在代码编辑器、论文 PDF 或网页中划选文本复制后，侧边栏能够一键（或通过全局按键）将当前选区/剪贴板文字挂载为当前思考上下文。
- 支持类似于 Antigravity 的 @ 上下文挂载与引用机制，让用户能够就地对眼前的具体难点、报错信息或代码片段发起探索与分析。

### R3. Antigravity 风格的 Slash 指令与真实产出物驱动 (Slash Commands & Interactive Artifacts)
- 彻底摒弃虚假的怪物扣血、等级数值与打卡表象。
- 在侧边栏输入框中提供纯正的 Antigravity 交互语言：
  - /plan：将当前复杂任务现场转化为清晰严谨的分步推进计划（带勾选框与依赖逻辑）。
  - /shred：调用认知粉碎引擎，将眼前的庞大阻碍粉碎为 3 个 ≤ 2 分钟可立即执行的物理微动作。
  - /solve：运用第一性原理与极简反例法，诊断当前卡点并输出具体的破局思路。
- 所有生成结果以高质感的「交互式产出物（Artifacts）」卡片呈现，支持一键勾选步骤、一键复制产出物、一键沉淀为本地 Markdown 知识资产。

### R4. 真实认知闭环与极低认知负担 (Zero-Friction Cognitive Ergonomics)
- 系统不逼迫用户做繁杂的数据录入，以“现场呼出 → 现场拆解 → 落地执行 → 自然收起”为核心心流周期。
- 提供极简历史任务与产出物抽屉，所有工作进展以真实的 Artifact 沉淀作为自我效能感与内在多巴胺来源。

## Acceptance Criteria

### Automated Verification
- [ ] 自动化测试套件（scripts/verify-attached-sidebar.js）在 Electron Headless 下执行并通过所有测试用例。
- [ ] 视窗几何与吸附测试：验证侧边栏窗口严格贴附在屏幕右侧（x = width - sidebarWidth, y = workArea.y），尺寸符合规范。
- [ ] 快捷键与响应测试：全局热键（Alt+S）在测试中能够成功触发窗口显隐状态切换，往返响应时间 < 20ms。
- [ ] Slash 指令解析测试：模拟用户输入 /plan、/shred 与 /solve，系统均能正确捕获指令并调用对应的认知引擎生成结构化产物。
- [ ] 产出物渲染与交互测试：测试 Artifact 生成、步骤打勾与复制接口，状态准确更新。
- [ ] 跨进程稳定性测试：渲染进程与主进程 IPC 通信顺畅，全过程控制台 0 报错（Zero Console Errors）。

## Follow-up — 2026-10-01T07:33:53Z

落地产品负责人（Product Lead）的核心评审决策，将「Antigravity 贴附侧边栏探索任务中枢」打磨成极致锋利的前额叶外挂协处理器：实现选区零阻力挂载与默认粉碎心流、纯粹物理动词微动作约束、本地工作区 Markdown 资产直接联动、以及 400px 侧边栏内的轻量因果步骤链，全流程保持亚 20ms 极致心流与 0 控制台报错。

Working directory: d:/E盘/项目/项目34 探索任务管理
Integrity mode: development

## Requirements

### R1. 划选零阻力注入与默认粉碎心流 (Selection-to-Action & Fast Summon)
- 用户在外部代码编辑器（VSCode/Cursor）、终端或浏览器划选错误信息或代码段并复制后，按 Alt+S 唤起侧边栏时，系统自动识别并将最新内容预装填为 @selection 上下文芯片，焦点保持在输入框。
- 当输入框为空但已挂载上下文时，用户直接敲回车（Enter）默认自动执行 /shred 认知微动作粉碎，全流程 5 秒内完成，无需额外打字。
- 剪贴板异常监控：若剪贴板内含有明显的堆栈报错（Stack Trace）或错误关键字，侧边栏边缘呈现轻量优雅呼吸光效，提示可一键破局。

### R2. 物理微动作纯洁性与界面彻底清爽化 (Physical Micro-Action Purity & UI De-bloat)
- 强化认知粉碎引擎（cognitive-shredder.js），严格过滤一切“思考”、“分析”、“理解”等非物理模糊动词，强制输出绝对可检验的微物理动作（如：打开、注释、对比、打印、修改、运行测试等），单步耗时严格 <= 2 分钟。
- 界面视觉噪音清零：彻底隐藏和清除所有残留的游戏化文字（如 XP、连击文本等），聚焦在真实步骤打勾与平滑进度条。

### R3. 真实产出物工作区联动闭环 (Artifacts Workspace Closed-Loop)
- 生成的交互式产出物支持一键落地到当前工作区的 artifacts/ 目录，生成标准的 GitHub 风格任务清单文件（带 - [ ] / - [x] 及 YAML Frontmatter）。
- 产出物卡片上增加「在资源管理器中定位」与「在默认编辑器中打开」操作，让探索资产无缝流入开发者的日常工作流。

### R4. 400px 侧边栏内嵌轻量因果拓扑链 (Lightweight Causal Breadcrumbs)
- 将复杂的 1280×840 全景大屏降级为辅助复盘视图，把核心因果拓扑降维内嵌在 400px 贴附侧边栏中。
- 在侧边栏卡片或底部呈现极简因果面包屑（现象 → 疑问 → 假说 → 证据 → 突破）与探索清晰度（ΔQt），让用户一眼可知当前卡点在整体探索路径中的坐标。

## Acceptance Criteria

### Automated Verification
- [ ] 自动化测试套件（scripts/verify-attached-sidebar.js 及新增用例）在 Electron Headless 下执行并通过所有测试。
- [ ] 划选注入测试：模拟系统剪贴板更新后触发 Alt+S，验证自动挂载 @selection 上下文且空回车能正确执行 /shred。
- [ ] 物理微动作校验测试：验证 /shred 输出的微动作动词全部属于物理动词白名单，无模糊虚词，耗时全部 <= 2 分钟。
- [ ] 工作区资产联动测试：验证 Markdown 文件落盘成功，且 IPC 支持调用系统 shell 打开文件或定位目录。
- [ ] 轻量因果链测试：验证侧边栏正确渲染当前因果阶段指示器，数据与 SSoT 状态严格同步。
- [ ] 跨进程稳定性测试：渲染进程与主进程 IPC 通信流畅，全过程控制台 0 报错（Zero Console Errors）。


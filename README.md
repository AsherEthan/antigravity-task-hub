# 🌌 Antigravity Task Hub · 探索任务管理中枢

> **辅助人类前额叶穿越复杂探索的外挂中枢 (Prefrontal Cortex Co-Processor)**  
> 借鉴 **Google Antigravity** 设计哲学与 **Apple Human Interface Guidelines (HIG)**，专为深度探索、复杂工程研发与科学求索打造的 Windows 桌面级内生任务伴侣。

---

## 💡 为什么需要 Antigravity Task Hub？

在探索未知领域的复杂任务时（如技术攻坚、科研探索、创新产品架构），人类前额叶极易遭遇**三大认知陷阱**：
1. **启动阻力过大**：宏观目标庞大模糊，缺乏立即落地的切入口，导致拖延与焦虑。
2. **思维卡点迷失**：遭遇阻碍时容易陷入局部打转，缺乏科学思维模型（第一性原理、反例法等）的破局引导。
3. **线索与上下文割裂**：在代码编辑器、论文、终端与浏览器之间频繁切换，工作记忆（Working Memory）反复清空，探索脉络断裂。

**Antigravity Task Hub** 不是一个传统“已知清单打勾”的静态 Todo 工具，而是**贴附在用户当前工作流边缘的认知协处理器**：
- **不打扰当前主视窗**：贴附屏幕右侧边缘，随时通过 `Alt+S` 唤出，就地捕获屏幕划选或剪贴板上下文。
- **Slash 指令现场粉碎**：`/plan` 制定递进方案、`/shred` 2分钟微动作粉碎、`/solve` 第一性原理破局。
- **真实产出物驱动 (Artifacts)**：用具备可执行价值的交互式步骤卡与 Markdown 沉淀，替代虚假数值打卡。
- **全景战术作战室 (War Room)**：需要全局推演时，一键打开 2D 因果调查图谱与三元状态动力学大屏。

---

## 🚀 核心架构与功能特性

### 1. 🪟 内生贴附侧边栏 (Antigravity Attached Sidebar)
- **屏幕边缘停靠**：自动吸附于 Windows 主屏幕右侧（宽度 400px，自适应屏幕工作区高度），不遮挡中央主编辑器与浏览器。
- **全局毫秒级唤起 (`Alt+S`)**：随时随地滑入/隐退，支持全局热键响应与一键失焦隐藏。
- **现场上下文注入 (`@clipboard` / 划选)**：划选任意代码片段或报错，一键挂载至侧边栏作为思考上下文。
- **纯正 Antigravity 风格 Slash 指令**：
  - `/plan <任务目标>`：全自动生成具备依赖逻辑与勾选框的严谨分步推进计划。
  - `/shred <庞大阻碍>`：将复杂任务粉碎为 3 个 $\le 2$ 分钟可立即执行的物理微动作。
  - `/solve <卡点描述>`：调用思维模型库诊断卡点，输出根因剖析与破局反例。
- **交互式产出物 (Artifacts Engine)**：
  - 每条指令生成高质感 Artifact 卡片，支持步骤实时打勾与进度条更新。
  - 一键复制代码/计划，一键自动导出为持久化 Markdown 知识资产。

```
                    【用户屏幕主工作区】                     【Antigravity Attached Sidebar】
      ┌─────────────────────────────────────────────────┐ ┌───────────────────────────────────┐
      │  VS Code / 浏览器 / PDF 阅读器 / 终端             │ │ 🌌 ANTIGRAVITY TASK HUB     [Alt+S]│
      │                                                 │ ├───────────────────────────────────┤
      │  const result = await exploreUnknownArea();    │ │ 📌 挂载上下文:                      │
      │  // 遇到未知报错或复杂需求...                       │ │    @clipboard "Uncaught Error..."   │
      │                                                 │ ├───────────────────────────────────┤
      │  [划选文字] ──────(自动/快捷键挂载上下文)─────────►│ │ 💬 /shred 排查内存泄漏卡点          │
      │                                                 │ ├───────────────────────────────────┤
      │                                                 │ │ 📄 ARTIFACT: 2分钟微动作粉碎卡      │
      │                                                 │ │  [✓] 1. 打开 Chrome DevTools Memory│
      │                                                 │ │  [ ] 2. 截取初始 Heap Snapshot    │
      │                                                 │ │  [ ] 3. 运行 1 次复现测试并比对   │
      │                                                 │ └───────────────────────────────────┘
```

---

### 2. 🗺️ 战术指挥大屏 (War Room & Dynamic Island HUD)
- **三元状态动力学**：实时追踪 $S_t = \langle A_t, W_t, P_t \rangle$（行动集、当前焦点、可能性探索空间）。
- **Apple Pro 设计系统**：
  - macOS 磨砂毛玻璃 (`backdrop-filter: blur(28px)`) 与连续曲率 Squircle 超圆角。
  - macOS 经典原生交通灯标题栏（🔴 🟡 🟢）。
  - Apple Intelligence / Siri 风格炫彩灵动呼吸光环。
- **Freeform 点阵式 2D 因果调查图谱**：
  - 点阵微网格质感，节点涵盖「观察 👁️ $\rightarrow$ 疑问 ❓ $\rightarrow$ 假说 💡 $\rightarrow$ 实测 🔬 $\rightarrow$ 瓶颈 🚧」。
  - 自动 DAG 拓扑分层，一键梳理错综复杂的证据因果链条。
  - 聚光灯关键词搜索与节点脉冲聚焦。
- **守门瓶颈 BOSS 系统**：将核心难点实体化为可攻克的瓶颈，结合行动削减 BOSS 韧性值，完成攻坚。
- **常驻悬浮 HUD (`Alt+H`)**：类似 iPhone Dynamic Island 的极简微型药丸胶囊，常驻桌面右上角，提供最小视觉阻碍的进度感知。

---

## ⌨️ 全局快捷键一览

| 快捷键 | 功能 | 说明 |
| :--- | :--- | :--- |
| **`Alt + S`** | **唤起 / 隐藏 Antigravity 侧边栏** | 紧贴屏幕右侧，不打断主窗口心流 |
| **`Ctrl + K`** | **全局战术指令面板** | Raycast / Spotlight 风格，模糊搜索与即时操作 |
| **`Alt + H`** | **唤起 / 隐藏常驻悬浮 HUD** | Dynamic Island 风格迷你胶囊 |
| **`Alt + Space`** | **唤起 HUD 快捷录入抽屉** | 快速记录灵感或碎片线索 |
| **`Esc`** | **关闭当前活动抽屉/弹窗** | 极简退出模式 |

---

## 🛠️ 安装与快速启动

### 前置环境
- **Node.js**：推荐 v18.0.0 及以上版本（[Node.js 官网下载](https://nodejs.org/)）
- **Windows**：Windows 10 / 11 操作系统

### 1. 克隆代码仓库
```bash
git clone https://github.com/AsherEthan/antigravity-task-hub.git
cd antigravity-task-hub
```

### 2. 安装依赖
```bash
npm install
```

### 3. 一键启动
- **方式一（推荐）**：双击根目录下的 **`start.bat`** 即可直接启动。
- **方式二（命令行）**：
  ```bash
  npm start
  ```

---

## 🧪 自动化测试验证

本项目配有端到端自动化测试套件（覆盖 Electron 无头环境下的 IPC 通信、视窗贴附几何坐标、Slash 指令解析、Artifacts 交互与极端边缘情况）：

```bash
# 运行完整测试套件 (侧边栏测试 + 认知伴侣测试)
npm test

# 单独运行 Antigravity 贴附侧边栏测试 (46 项测试全通过)
npm run test:sidebar

# 单独运行 AI 伴侣与状态引擎测试 (24 项测试全通过)
npm run test:companion
```

---

## 📁 核心目录架构

```
.
├── main.js                  # Electron 主进程 (多窗口生命周期、屏幕贴边计算、全局热键、IPC总线)
├── preload.js               # 安全沙箱 Context Bridge
├── start.bat                # Windows 一键启动脚本
├── package.json             # 项目元信息与运行脚本
├── exploration_quest_data.json # 离线/内置项目演进演示数据库
├── services/
│   ├── slash-engine.js      # Antigravity Slash 指令解析与执行引擎 (/plan, /shred, /solve)
│   ├── cognitive-shredder.js# 认知负荷粉碎器 (2分钟微动作生成与飞轮递进)
│   ├── bottleneck-diagnostician.js # 思维卡点第一性原理诊断器
│   ├── artifact-exporter.js # 交互式产出物本地 Markdown 导出服务
│   ├── context-manager.js   # 现场上下文捕获与 @ 引用管理
│   ├── state-engine.js      # 三元状态动力学推演引擎
│   └── store.js             # 本地数据持久化存储
├── renderer/
│   ├── sidebar.html         # Antigravity 贴附侧边栏界面 (右侧停靠)
│   ├── sidebar.js           # 侧边栏前端控制器 (指令交互、Artifacts 步骤管理)
│   ├── sidebar.css          # 磨砂深色亚克力风格样式表
│   ├── index.html           # 战术指挥大屏 (War Room) UI 视图
│   ├── hud.html             # Dynamic Island 悬浮微 HUD 视图
│   └── services/            # 渲染层微服务 (Canvas点阵画布、Web Audio微触觉声学、粒子系统等)
└── scripts/
    ├── verify-attached-sidebar.js # 侧边栏端到端综合测试套件
    └── verify-ai-companion.js     # 认知伴侣与拆解测试套件
```

---

## 📄 开源许可证

本项目基于 [MIT License](LICENSE) 开源发布。

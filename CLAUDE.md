# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**The Pawn's Dilemma** is a narrative-driven pawn shop simulation game. Players navigate moral dilemmas between financial survival and ethical principles—every ruble saved extends the player's mother's life, but might kill a customer's hope.

**Core Tension:** "Pawn shop management shell + moral dilemma core"—daily cash flow pressure drives decisions, with item and customer stories creating lasting consequences.

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind CSS (CDN) + Google Gemini API

## Development Philosophy: Data-Driven

**重要：本项目采用数据驱动开发模式。这是最高优先级的架构原则。**

### 核心铁律

**一切玩家可见的文本和策划可调的数值，禁止写在 TypeScript 代码中。**

| 内容类型 | 存放位置 | 编辑者 |
|----------|----------|--------|
| 故事内容 | `systems/narrative/stories-dsl/*.story` | 策划 (无需代码知识) |
| 物品/特征定义 | `assets/data/Items_Base.csv`, `Traits.csv` | 策划 (无需代码知识) |
| 玩家可见文本 | `assets/data/texts/*.csv` | 策划 (无需代码知识) |
| 游戏数值配置 | `config/game.toml` | 策划 (无需代码知识) |
| 游戏机制 | TypeScript 源码 | 程序员 |
| 配置常量导出 | `systems/game/config.ts` | 程序员 |

### 判断标准：什么必须外部化

| 类型 | 示例 | 放哪里 |
|------|------|--------|
| **叙事/对话文本** | NPC 台词、独白、反馈语句 | CSV (`assets/data/texts/`) |
| **物品/配方名称和描述** | "做旧伪造"、"深度清洁物品" | CSV |
| **邮件内容** | 邮件标题、正文、语气变体 | DSL (`.story`) 或 CSV |
| **新闻/传闻文本** | 新闻标题、正文 | CSV |
| **数值参数** | 成本、概率、阈值、天数门槛 | TOML (`config/game.toml`) |
| **里程碑/成就文本** | 声誉里程碑名称和描述 | CSV |

### 什么可以留在代码中

| 类型 | 示例 | 原因 |
|------|------|------|
| 类型定义 | `interface`, `enum`, `type` | 结构不是内容 |
| UI 组件标签 | 按钮文字 "确认"、"取消" | UI 关注点 |
| 开发者错误信息 | `throw new Error(...)` | 不面向玩家 |
| 纯机制逻辑 | 计算公式、状态转换规则 | 代码职责 |
| 数据加载/解析 | CSV reader、TOML parser | 基础设施 |

### 写新功能时的检查清单

每次写新系统或修改现有系统时，**必须自查：**

1. 有没有把中文文本写进 `.ts` 文件？→ 移到 CSV
2. 有没有把数值常量写进 `.ts` 文件？→ 移到 TOML
3. 有没有把对话/邮件内容写进 `.ts` 文件？→ 移到 DSL 或 CSV
4. 策划能不能不碰代码就修改这些内容？→ 如果不能，说明分离不够

### 已有正确范例（参考）

- `systems/characterAbility/moralEchoTexts.ts` — 文本从 `echo_texts.csv` 加载 ✓
- `systems/characterAbility/skillDefinitions.ts` — 技能文本从 CSV 加载 ✓
- `systems/characterAbility/mirrorLawWarnings.ts` — 警告文本从 CSV 加载 ✓
- `systems/game/config.ts` — 数值从 `game.toml` 加载 ✓
- `systems/negotiation/data.ts` — 议价独白/直觉文本从 `negotiation_instinct.csv` 加载 ✓
- `systems/game/templates/appraisalFeedback.ts` — 鉴定反馈从 `appraisal_feedback.csv` 加载 ✓
- `systems/upgrades/spectrometerFeedback.ts` — 光谱仪文本从 `spectrometer_feedback.csv` 加载 ✓
- `systems/workshop/recipes.ts` — 配方数据从 `workshop_recipes.csv` 加载 ✓
- `systems/reputation/milestones.ts` — 里程碑文本从 `milestones.csv` 加载 ✓
- `systems/characterAbility/essenceSystem.ts` — 精魄文本从 `essence_system.csv` 加载 ✓
- `systems/npc/fallback.ts` — 后备客户对话从 `fallback_customers.csv` 加载 ✓
- `systems/narrative/mailUtils.ts` — 威胁邮件从 `threat_mails.csv` + 默认值从 `mail_defaults.csv` 加载 ✓
- `systems/narrative/mailRegistry.ts` — 系统邮件从 `system_mails.csv` 加载 ✓

### 已知违规（待修复）

所有已知违规已迁移完成。如发现新的硬编码内容，请在此处记录。

| 文件 | 硬编码内容 | 目标 |
|------|-----------|------|
| *(暂无)* | | |

**DSL 文件位置：** `systems/narrative/stories-dsl/`
**DSL 语法参考：** `systems/narrative/dsl/types.ts`

**CSV 数据文件位置：** `assets/data/`
- `Items_Base.csv` — 物品模板定义
- `Traits.csv` — 物品特征定义
- `texts/*.csv` — 各系统的文本数据

**TOML 配置文件位置：** `config/`
- `game.toml` — 游戏数值配置（经济、夜间、声誉等参数）

## Scripting Language

**所有新脚本必须使用 Python 编写。** 不要创建 TypeScript/JavaScript 脚本文件（`.ts`、`.js`）用于工具或自动化任务。

脚本位置：`scripts/`

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build to dist/
npm run preview  # Preview production build
```

**Environment:** Set `GEMINI_API_KEY` in `.env` for AI-powered customer generation. The game uses fallback NPCs when API key is unavailable.

## Architecture

### State Management
Centralized Redux-like reducer in `store/GameContext.tsx`. All game state flows through typed actions (60+ action types) dispatched to a single reducer with auto-save to localStorage key `pawns_dilemma_save_v1`.

### Game Phase State Machine

游戏使用显式状态机 (Explicit State Machine) 管理阶段。状态定义为 Discriminated Union 类型：

```typescript
type GamePhase =
    | { type: 'START_SCREEN' }
    | { type: 'MORNING_BRIEF' }
    | { type: 'DAY_START'; subphase: 'EXPIRY_CHECK' | 'EXPIRY_SETTLEMENT' }
    | { type: 'BUSINESS'; subphase: 'IDLE' | 'GENERATING' | 'SERVING' | 'CLOSED' }
    | { type: 'NEGOTIATION'; mode: 'PAWN' | 'REDEEM' | 'RENEWAL' | 'POST_FORFEIT' }
    | { type: 'DEPARTURE' }
    | { type: 'NIGHT'; subphase: 'ACTIVE' | 'PROCESSING' | 'EVALUATING' }
    | { type: 'GAME_OVER'; reason: string }
    | { type: 'VICTORY' };
```

**主流程:**
```
START_SCREEN → MORNING_BRIEF → DAY_START → BUSINESS → DEPARTURE → NIGHT → (GAME_OVER | VICTORY | MORNING_BRIEF)
```

**状态机文件:**
- `systems/core/phases/types.ts` - 类型定义
- `systems/core/phases/guards.ts` - 类型守卫 (PhaseIs, PhaseMatch)
- `systems/core/phases/machine.ts` - 核心函数
- `systems/core/phases/transitions.ts` - 转换规则表
- `hooks/useGameMachine.ts` - React hook

**使用 useGameMachine:**
```typescript
import { useGameMachine, PhaseIs, PhaseMatch } from '@/hooks/useGameMachine';

const { phase, send, can } = useGameMachine();

// 检查状态
if (PhaseIs.business(phase)) {
    console.log('子状态:', phase.subphase);
}

// 发送事件
if (can({ type: 'CLOSE_SHOP' })) {
    send({ type: 'CLOSE_SHOP' });
}
```

详细文档参见 `docs/STATE_MACHINE.md`。

### Systems Directory (`/systems`)
Domain-driven modules organized by responsibility:

| System | Purpose |
|--------|---------|
| `core/` | Game phases, reputation types, persistence |
| `items/` | Item lifecycle, valuations, traits |
| `economy/` | Transaction types, reputation deltas |
| `narrative/` | Story chains, dialogue, mail, SimRules engine |
| `npc/` | Customer generation (Gemini AI + fallback) |
| `news/` | Daily market info & modifiers |
| `negotiation/` | Deal mechanics, instinct feedback |
| `game/` | Config constants, audio, UI dashboard |
| `upgrades/` | Shop upgrade configs, effects, costs |
| `appointment/` | Customer preview & invitation system |

### Hooks Pattern
Business logic lives in hooks (`/hooks`), not components:
- `useGameEngine.ts` - Core game loop, day/night cycle, narrative simulation
- `useNegotiation.ts` - Deal mechanics, patience/mood tracking
- `usePawnShop.ts` - Item expiration, redemption costs
- `useAppraisal.ts` - Item valuation, trait discovery
- `useFinancialProjection.ts` - Financial forecasting

## Key Domain Concepts

### Three-Value System
Each item has three value dimensions:
- **Pawn Amount (当金):** Cash given to customer (loan principal)
- **Perceived Value (估价):** Negotiation anchor, visible as estimate range
- **Real Value (实际价值):** Hidden truth revealed through appraisal

**Hard Constraint:** Pawn amount must be < perceived value.

### Three Reputation Axes
Reputation is NOT a single score—three competing dimensions that cannot all be maximized:

| Axis | Gains | Losses |
|------|-------|--------|
| **Humanity (人情)** | Charity trades (0%), high offers | Loan sharks (≥20%), forced defaults |
| **Credibility (商誉)** | Fair trades, standard rate (10%) | Stolen goods, counterfeits, breach |
| **Innocence (清白)** | Refusing stolen goods, cooperating with police | High = clean, 0 = arrested |

### Appraisal System
- **Asymmetric Range:** Skewed estimate prevents "average calculation" exploitation
- **Progressive Convergence:** Each appraisal shrinks range by ~15%
- **Trait Discovery:** Hidden traits revealed (Flaws ↓value, Story triggers, Fake collapses estimate)
- **Costs:** Consumes AP and customer patience

### Negotiation Mechanics
Four contract tiers define moral stance:
- **0% Charity:** Help customer → +5 Humanity
- **5% Aid:** Balanced → neutral
- **10% Standard:** Professional → +1 Credibility
- **20% Shark:** Exploit → -3 Humanity, -2 Credibility, -2 Innocence

Insulting offers (<70% of minimum) trigger -2 patience + screen shake.

### SimRules Engine
Event chain simulation in `systems/narrative/` with rule types:
- **DELTA:** Fixed variable changes (e.g., -$150/day costs)
- **CHANCE:** Probability events (e.g., 30% job success)
- **THRESHOLD:** State triggers (e.g., Hope ≤ 0 → suicide event)
- **COMPOUND:** Multi-variable conditions

Player's pawn amount directly affects NPC survival: `Remaining days = Current funds / Daily cost`

### Survival Mechanics
- **Goal:** Accumulate $500,000 for mother's surgery = Victory
- **Weekly Medical Bills:** Day 7, 14, 21... creates recurring pressure
- **Failure:** Miss medical payment = Game Over
- **Daily Expenses:** Ongoing burn rate

## Configuration

All gameplay constants centralized in `systems/game/config.ts`:
- Initial funds, goal amount, medical costs, action points
- Starting story chains initialized from registry

**Path alias:** `@/` maps to project root (configured in `vite.config.ts` and `tsconfig.json`)

**Theme colors:** `pawn-dark: #1a1a1a`, `pawn-accent: #d97706` (amber), `pawn-green: #10b981`

## Design Documents

External design docs at `C:\Users\lzcm7\OneDrive\GameProject\Godot\PawnShop_Claude\Designer` (Chinese).

### Directory Structure

```
Designer/
├── 00_核心愿景.md              # Core vision statement
├── 01_游戏循环.md              # Game loop design
├── design_bible.md             # Design bible (English)
├── GDD_Overview.md             # GDD overview
│
├── 系统设计文档/               # System Design Documents
│   ├── 核心设定 (Core Setting & Motivation).md
│   ├── 昼夜循环与晚间玩法 (DayNight Cycle & Structure).md
│   ├── 典当业务系统 (Business Lifecycle System).md
│   ├── 鉴定系统 (Appraisal System).md
│   ├── 议价谈判系统 (Negotiation System).md
│   ├── 送客环节 (The Departure Interaction).md
│   ├── 动态事件链系统 (Dynamic Event Chain System).md
│   ├── 邮件系统 (Mail System).md
│   ├── 新闻与传闻系统 (News & Rumor System).md
│   ├── 日历与财务预测系统 (Calendar & Financial Projection System).md
│   ├── 库存物品日志系统 (Inventory Item Log System).md
│   ├── 店铺升级系统 (Shop Upgrade System).md
│   └── 归档/                   # Archived design evaluations
│
├── 数值平衡/                   # Balance & Economy
│   └── 经济参数.md             # Economic parameters
│
├── 叙事设计/                   # Narrative Design
│   └── 声誉系统.md             # Reputation system
│
├── 事件链参考/                 # Event Chain References
│   ├── 叙事构建参考（样例：艾玛）.md
│   ├── 叙事构建参考（样例：老兵典当勋章）.md
│   ├── 逻辑映射参考（样例：艾玛）.md
│   └── 逻辑映射参考（样例：老兵典当勋章）.md
│
├── 效果图/                     # UI Mockups (PNG)
│   ├── 典当节点.png, 库存.png, 日历.png
│   ├── 送客.png, 打烊.png, 晚上.png
│   └── 新闻.png, 邮件.png
│
└── 其他/                       # Miscellaneous
    ├── 备忘.md, 工作记录.md, 情感设计.md
```

### Key Documents for Reference

| Topic | Document |
|-------|----------|
| Core vision & tension | `00_核心愿景.md` |
| Game loop & phases | `01_游戏循环.md` |
| Appraisal mechanics | `系统设计文档/鉴定系统 (Appraisal System).md` |
| Negotiation & deals | `系统设计文档/议价谈判系统 (Negotiation System).md` |
| Event chain design | `系统设计文档/动态事件链系统 (Dynamic Event Chain System).md` |
| Shop upgrades & appointments | `系统设计文档/店铺升级系统 (Shop Upgrade System).md` |
| Emma story example | `事件链参考/叙事构建参考（样例：艾玛）.md` |
| Zhao story example | `事件链参考/叙事构建参考（样例：老兵典当勋章）.md` |
| Economic balance | `数值平衡/经济参数.md` |

Internal docs in `/docs` cover implementation gap analysis and improvement plans.

## Agent Workflow Automation

### 触发条件：何时使用 /design-discuss

**收到以下类型的用户请求时，使用 `/design-discuss` skill（在主对话中讨论）：**

| 请求类型 | 示例 |
|----------|------|
| 讨论游戏机制 | "讨论..."、"我想加个..."、"这个系统怎么设计" |
| 设计评审 | "评审..."、"这个设计合理吗"、"帮我看看这个设计" |
| 理论咨询 | "从玩家心理角度..."、"这样好玩吗"、"玩家会怎么想" |
| 新系统构思 | "我有个想法..."、"能不能做一个..." |
| 设计权衡 | "A方案还是B方案"、"这两种方式哪个好" |
| 记录点子 | "记录这个点子"、"把这个想法记下来"、"收录这个设计" |

**重要：/design-discuss 在主对话中执行，保留完整上下文。** 讨论结束后可以直接指导 framework/content/interaction 实现。点子会记录到 `docs/IDEAS.md`。

**例外情况（不使用 /design-discuss）：**
- 需要实现已确定的设计（使用 framework 或 interaction）
- 纯代码问题，不涉及设计决策
- 用户明确说"不用讨论，直接做"

---

### 触发条件：何时启动 game-designer agent

**game-designer agent 仅用于自动化深度评审，不要手动启动。**

| 触发方式 | 说明 |
|----------|------|
| `[DESIGN_CONCERN]` 信号 | framework 快速设计检查发现问题时自动触发 |
| `[DESIGN_CONCERN]` 信号 | qa-tester 测试通过但有设计疑虑时自动触发 |

**与 /design-discuss 的区别：**
- `/design-discuss` (skill) = 讨论，在主对话中进行，保留上下文
- `game-designer` (agent) = 自动评审，由信号触发，独立执行

---

### 进度查询：不使用 skill，直接读文件

**收到以下请求时，直接读取对应文件，无需调用 skill：**

| 请求类型 | 直接读取 |
|----------|---------|
| "接下来实现什么" | `docs/design-reviews/*/采纳索引.md`（最近一轮） |
| "XX 系统做了多少" | `docs/design-reviews/*/implementation-checklist.md` |
| "还有什么没做" | `docs/design-code-mapping.md` + `docs/pending-systems/` |
| "全量差距分析" | 参考 `docs/gap-analysis-template.md` 流程，用 Glob + Read 执行 |

---

### 触发条件：何时启动 framework

**收到以下类型的用户请求时，启动 framework agent：**

| 请求类型 | 示例 |
|----------|------|
| 设计新系统 | "设计一个XX系统"、"添加XX机制" |
| 实现业务逻辑 | "实现XX功能"、"添加XX逻辑" |
| 修复逻辑 bug | "XX计算不对"、"XX逻辑有问题" |
| 修改 hooks/systems | "修改XX hook"、"调整XX系统" |

**代码范围：** `hooks/`, `store/`, `systems/`

**不使用 framework：**
- 纯 UI 修改（使用 interaction）
- 内容填充（使用 content）

---

### 触发条件：何时启动 content

**收到以下类型的用户请求时，启动 content agent：**

| 请求类型 | 示例 |
|----------|------|
| 添加物品/特征 | "添加几个物品"、"新增一个特征" |
| 编写故事 | "写一个NPC故事"、"添加事件链" |
| 调整数值 | "把XX改成XX"、"调整价格" |
| 生成资源 | "生成图标"、"生成头像" |
| 写脚本 | "写个脚本处理数据" |

**代码范围：** `assets/data/*.csv`, `systems/narrative/stories-dsl/*.story`, `scripts/*.py`

**不使用 content：**
- 修改 TypeScript 代码（使用 framework）
- 修改 UI 组件（使用 interaction）

---

### 触发条件：何时启动 interaction

**收到以下类型的用户请求时，启动 interaction agent：**

| 请求类型 | 示例 |
|----------|------|
| 创建 UI | "做一个XX界面"、"添加XX组件" |
| 修改样式 | "颜色改成XX"、"调整布局" |
| 修复显示 | "显示不对"、"位置有问题" |
| UI 图片 | "生成背景图"、"生成UI图标" |

**代码范围：** `components/`

**不使用 interaction：**
- 业务逻辑修改（使用 framework）
- 数据填充（使用 content）

---

### Development Pipeline: framework/interaction → qa-tester → commit

When `framework` or `interaction` agent completes its work, follow this automated workflow:

**Step 1: Agent Completes**
- Agent finishes implementation and runs `npm run build`
- Agent's output includes `[READY_FOR_QA]` signal

**Step 2: Auto-Trigger QA**
- **IMMEDIATELY** spawn `qa-tester` agent to verify changes
- Do NOT wait for user confirmation
- QA tester runs functional tests via Playwright

**Step 3: Process QA Results**
- If qa-tester output includes `[TESTS_PASSED]`:
  - **IMMEDIATELY** invoke `/commit-commands:commit` to commit all changes
  - Do NOT wait for user confirmation
- If qa-tester output includes `[TESTS_FAILED]`:
  - Report the failures to the user
  - Do NOT commit
  - Wait for user decision (fix or skip)
- If qa-tester output includes `[MISSING_COMMANDS]`:
  - **DO NOT commit** - this blocks the workflow
  - **IMMEDIATELY** spawn `framework` to add the missing DevConsole commands
  - After framework completes, **re-run qa-tester** to verify again

### Workflow Diagram

```
┌───────────────────┐     [READY_FOR_QA]     ┌─────────────┐
│ framework /       │ ──────────────────────▶│  qa-tester  │
│ interaction       │                        └─────────────┘
└───────────────────┘                               │
                          ┌─────────────────────────┼─────────────────────────┐
                          │                         │                         │
                    [TESTS_PASSED]           [TESTS_FAILED]                   │
                          │                         │                         │
                          ▼                         ▼                         │
                 ┌───────────────┐         ┌───────────────┐                  │
                 │ /commit       │         │ Report to     │                  │
                 │ (auto-commit) │         │ user & wait   │                  │
                 └───────────────┘         └───────────────┘                  │
```

### Signal Reference

| Signal | Source | Meaning | Action |
|--------|--------|---------|--------|
| `[READY_FOR_QA]` | framework/interaction | Agent completed, code compiles | Spawn qa-tester |
| `[TESTS_PASSED]` | qa-tester | All tests passed, design verified | Run /commit-commands:commit |
| `[TESTS_FAILED]` | qa-tester | Tests failed or design mismatch | Report to user, do not commit |
| `[DESIGN_CONCERN]` | framework | 快速设计检查发现问题 | **BLOCKING**: 立即启动 game-designer 深入评审，通过后继续实现 |
| `[DESIGN_CONCERN]` | qa-tester | Tests pass but design questions exist | 启动 game-designer 评审，通过后 commit |
| `[MISSING_COMMANDS]` | qa-tester | QA cannot test - missing DevConsole commands | **BLOCKING**: Do NOT commit, immediately spawn framework to add commands, then re-run qa-tester |

### Workflow Diagram (Extended)

```
┌───────────────────┐                        ┌───────────────┐
│     framework     │──[DESIGN_CONCERN]─────▶│ game-designer │
│                   │◀──[APPROVED]───────────│  (深入评审)   │
└─────────┬─────────┘                        └───────────────┘
          │
    [READY_FOR_QA]
          │
          ▼
┌─────────────────────────────────────────────────────────────┐
│                        qa-tester                            │
└─────────────────────────────────────────────────────────────┘
          │
    ┌─────┴─────┬─────────────┬─────────────┐
    │           │             │             │
[TESTS_PASSED] [DESIGN_CONCERN] [TESTS_FAILED] [MISSING_COMMANDS]
    │           │             │             │
    ▼           ▼             ▼             │
┌────────┐ ┌────────────┐ ┌──────────┐      │
│/commit │ │game-designer│ │ Report   │      │
└────────┘ │  + commit  │ │ to user  │      │
           └────────────┘ └──────────┘      │
                                            │
                    ┌───────────────────────┘
                    ▼
            ┌───────────────┐
            │   framework   │
            │ (add commands)│
            └───────┬───────┘
                    │
                    ▼
               (re-test)
```

### Dev Server 管理规则

**重要：服务器生命周期由 `dev-server` agent 统一管理**

| Agent | 可以做 | 不可以做 |
|-------|--------|----------|
| dev-server | 启动服务器、检查状态 | - |
| qa-tester | 使用已运行的服务器 | 启动/关闭服务器 |
| visual-debugger | 使用已运行的服务器 | 启动/关闭服务器 |
| e2e-runner | 使用已运行的服务器 | 启动/关闭服务器 |
| framework / interaction | 使用已运行的服务器 | 关闭服务器 |

**工作流程：**
1. 需要浏览器测试时，先 spawn `dev-server` agent 确保服务器运行
2. 测试完成后，**不要关闭服务器**
3. 服务器保持运行，供后续测试使用

### qa-tester 职责边界

**qa-tester 是业务验证者，只读权限：**

| 可以做 | 不可以做 |
|--------|----------|
| 用 Playwright MCP 手动验证（默认方式） | 创建/修改任何文件 |
| 用 DevConsole 设置测试状态 | 修改源代码 |
| 读取设计文档对照验证 | 修复发现的 bug |
| 通过输出信号报告问题 | 直接解决问题 |
| 运行完整测试套件（**需用户许可**） | 未经许可运行完整测试套件 |
| 使用 dev-server 启动的服务器 | 启动/关闭服务器 |

**发现问题时的处理：**
- Bug/设计不符 → 输出 `[TESTS_FAILED]` + 问题描述 + 修复建议
- 缺少命令 → 输出 `[MISSING_COMMANDS]` 块（**阻止 commit，立即返回 framework**）
- 设计疑虑 → 输出 `[DESIGN_CONCERN]` + 具体疑虑

### qa-tester 输出格式

**通过:**
```
## 验证结果

**设计文档:** [相关文档名]

✓ [功能点] - 符合设计
✓ 玩家体验符合预期

[TESTS_PASSED]
```

**通过但有疑虑:**
```
## 验证结果

✓ 测试全部通过

**设计疑虑:**
- [具体疑虑，需要用户确认]

[TESTS_PASSED]
[DESIGN_CONCERN]
```

**失败:**
```
## 验证结果

✗ [功能点] - 不符合设计

**问题:**
- 设计预期: [...]
- 实际行为: [...]
- 建议: [给 framework/interaction 的修复建议]

[TESTS_FAILED]
```

**缺少命令:**
```
[MISSING_COMMANDS]
- `<command>`: <为什么需要这个命令>
[/MISSING_COMMANDS]
```

### Important Notes

- This workflow is **automatic** - do not ask user for confirmation between steps
- If build fails in framework/interaction, do NOT trigger qa-tester
- Always wait for qa-tester to complete before deciding to commit
- The commit uses `/commit-commands:commit` skill, not manual git commands
- qa-tester **NEVER** modifies files - it only reads and reports
- Missing commands are passed to framework **after** commit (if tests pass)

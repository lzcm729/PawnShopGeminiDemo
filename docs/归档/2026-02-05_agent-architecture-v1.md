# Agent 架构备忘录 (v1 - 已废弃)

> **归档日期:** 2026-02-05
> **废弃原因:** 重构为三层架构 (framework / content / interaction)
> **新架构文档:** 参见当前 CLAUDE.md

---

## 概述

本文档记录了 2026-02-05 重构前的 Agent 架构和工作流，供后续反思参考。

---

## 旧架构：Agents 列表

| Agent | 职责 | 颜色 | 状态 |
|-------|------|------|------|
| **programmer** | 代码实现、bug修复、重构、Git提交 | blue | ❌ 已删除 |
| **content-filler** | 数据填充（CSV/DSL）、资源生成 | yellow | ❌ 已删除 |
| **game-designer** | 设计评审、理论咨询 | - | ✓ 保留 |
| **qa-tester** | 功能验证、测试 | - | ✓ 保留 |

---

## 旧 Agent 详情

### 1. programmer (已删除)

**文件:** `.claude/agents/archived/programmer.md`

**职责范围:**
- 实现新功能
- 修复 bug
- 重构代码
- 添加/修改组件
- 编译验证
- Git 提交

**代码域:** 所有 TypeScript/React 代码
- `components/` - UI 组件
- `hooks/` - 业务逻辑
- `systems/` - 领域模块
- `store/` - 状态管理
- `types/` - 类型定义

**触发示例:**
```
user: "实现邮件系统的已读标记功能"
→ 启动 programmer

user: "议价界面的金额显示不对，帮我修一下"
→ 启动 programmer

user: "把这个组件拆分成更小的组件"
→ 启动 programmer

user: "帮我提交这些改动"
→ 启动 programmer
```

**不处理:**
- 游戏设计评审 → game-designer
- 功能测试 → qa-tester
- 代码库探索 → Explore agent

**输出格式:**
```
## 完成

**变更摘要：** [一句话描述]

**修改文件：**
- `path/to/file1.tsx` - [改动说明]

**Build:** ✓ PASS / ✗ FAIL

**建议测试步骤：**
1. [步骤1]
2. [步骤2]

[READY_FOR_QA]
```

---

### 2. content-filler (已删除)

**文件:** `.claude/agents/archived/content-filler.md`

**职责范围:**
- 添加新物品到 Items_Base.csv
- 添加新特征到 Traits.csv
- 编写/扩展 .story DSL 文件
- 批量填充游戏内容
- 扩充物品池
- 生成物品图标/人物头像

**数据域:**
- `data/Items_Base.csv` - 物品定义
- `data/Traits.csv` - 特征定义
- `systems/narrative/stories-dsl/*.story` - NPC 故事

**触发示例:**
```
user: "添加一些乐器类物品"
→ 启动 content-filler

user: "写一个新的NPC故事线，关于一个退休教授"
→ 启动 content-filler

user: "给新添加的物品生成图标"
→ 启动 content-filler

user: "添加一个'水渍痕迹'的隐藏特征"
→ 启动 content-filler
```

**不处理:**
- 代码逻辑修改 → programmer
- 游戏机制设计 → game-designer
- 设计方案评审 → game-designer

**输出格式:**
```
## 内容填充完成

**添加内容：**
[列出添加的内容]

**文件变更：**
- `data/Items_Base.csv` - 添加 X 个物品
- `data/Traits.csv` - 添加 X 个特征

**资源生成：**
- [ ] 需要运行 /generate-assets 生成图片

**CSV 格式验证：** ✓ 正确
```

---

## 旧工作流

### Development Pipeline: programmer → qa-tester → commit

```
┌─────────────┐     [READY_FOR_QA]     ┌─────────────┐
│  programmer │ ────────────────────▶  │  qa-tester  │
└─────────────┘                        └─────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────────────┐
                    │                         │                         │
              [TESTS_PASSED]           [TESTS_FAILED]           [MISSING_COMMANDS]
                    │                         │                         │
                    ▼                         ▼                         │
           ┌───────────────┐         ┌───────────────┐                  │
           │ /commit       │         │ Report to     │                  │
           │ (auto-commit) │         │ user & wait   │                  │
           └───────────────┘         └───────────────┘                  │
                                                                        │
                                                    ┌───────────────────┘
                                                    │
                                                    ▼
                                           ┌───────────────┐
                                           │ programmer    │
                                           │ (add commands)│
                                           └───────┬───────┘
                                                   │
                                                   ▼
                                           ┌───────────────┐
                                           │ re-run        │
                                           │ qa-tester     │
                                           └───────────────┘
```

### Signal Reference (旧版)

| Signal | Meaning | Action |
|--------|---------|--------|
| `[READY_FOR_QA]` | Programmer completed, code compiles | Spawn qa-tester |
| `[TESTS_PASSED]` | All tests passed, design verified | Run /commit-commands:commit |
| `[TESTS_FAILED]` | Tests failed or design mismatch | Report to user, do not commit |
| `[DESIGN_CONCERN]` | Tests pass but design questions exist | Commit, then report concerns |
| `[MISSING_COMMANDS]` | QA cannot test - missing DevConsole commands | Spawn programmer to add commands |

### Dev Server 管理规则 (旧版)

| Agent | 可以做 | 不可以做 |
|-------|--------|----------|
| dev-server | 启动服务器、检查状态 | - |
| qa-tester | 使用已运行的服务器 | 启动/关闭服务器 |
| visual-debugger | 使用已运行的服务器 | 启动/关闭服务器 |
| e2e-runner | 使用已运行的服务器 | 启动/关闭服务器 |
| **programmer** | 使用已运行的服务器 | 关闭服务器 |

### 触发条件 (旧版)

**何时启动 programmer:**

| 请求类型 | 示例 |
|----------|------|
| 实现新功能 | "添加..."、"实现..."、"需要..." |
| 修复 bug | "修复..."、"...不对"、"...有问题" |
| UI 修改 | "改成..."、"显示..."、"隐藏..." |
| 重构代码 | "重构..."、"拆分..."、"合并..." |
| 样式调整 | "颜色改成..."、"位置调整..." |

---

## 旧架构的问题

### 1. programmer 职责过广

programmer 同时负责：
- UI 组件开发 (components/)
- 业务逻辑实现 (hooks/, systems/)
- 状态管理 (store/)
- Git 操作

**问题:** 单一 agent 处理所有代码，缺乏层次分离。

### 2. content-filler 与 programmer 边界模糊

- Python 脚本应该由谁写？
- DSL 语法错误需要代码修复时怎么办？
- 数据文件路径错误？

**问题:** 数据层和代码层的职责边界不清晰。

### 3. 缺乏主动协作

旧架构中 agent 之间没有主动交接机制：
- programmer 完成后只输出信号，不会主动建议下一步
- content-filler 完成后不会主动提示需要生成资源

---

## 新架构对比

| 旧架构 | 新架构 | 改进 |
|--------|--------|------|
| programmer (all code) | **framework** (hooks/store/systems) | 专注业务逻辑 |
| programmer (all code) | **interaction** (components) | 专注 UI 层 |
| content-filler | **content** (CSV/DSL/Python) | 明确数据域 |
| - | 各 agent 有 Edge Cases 处理 | 边界清晰 |
| - | 各 agent 有主动交接示例 | 协作流畅 |

### 新工作流

```
┌───────────────────┐     [READY_FOR_QA]     ┌─────────────┐
│ framework /       │ ──────────────────────▶│  qa-tester  │
│ interaction       │                        └─────────────┘
└───────────────────┘
```

**主要变化:**
1. `programmer` 拆分为 `framework` + `interaction`
2. `content-filler` 更名为 `content`，明确 Python 脚本职责
3. 各 agent 增加 Edge Cases 表格处理边界情况
4. 各 agent 增加主动触发示例（前序 agent 完成后主动接手）

---

## 反思要点

### 什么做得好

1. **信号机制** - `[READY_FOR_QA]`、`[TESTS_PASSED]` 等信号清晰
2. **自动化流程** - programmer → qa-tester → commit 自动化
3. **职责分离基础** - 已有 programmer/content-filler 的初步分离

### 什么需要改进

1. **职责粒度** - 单一 programmer 处理所有代码太粗糙
2. **边界定义** - 缺乏明确的"不处理什么"和"边界情况"文档
3. **协作模式** - agent 之间缺乏主动交接示例
4. **Python 定位** - 未明确 Python 脚本属于哪个 agent

### 下次重构时注意

1. 设计 agent 时先明确：
   - 代码域（哪些目录/文件）
   - 触发条件（用户说什么时启动）
   - 边界情况（模糊地带如何处理）
   - 主动交接（完成后建议什么）

2. 使用 triggering-examples 参考文档确保示例质量

3. 考虑 agent 之间的数据流：
   - 谁生产什么
   - 谁消费什么
   - 交接点在哪里

---

## 备份文件位置

- `docs/archive/programmer.md` - programmer agent 完整定义
- `docs/archive/content-filler.md` - content-filler agent 完整定义

> **注意:** 归档文件必须放在 `.claude/agents/` 目录之外，否则 Claude Code 会递归扫描并加载它们。

---

## 相关文档

- `CLAUDE.md` - 当前项目指南（已更新为新架构）
- `.claude/agents/framework.md` - 新 framework agent
- `.claude/agents/content.md` - 新 content agent
- `.claude/agents/interaction.md` - 新 interaction agent

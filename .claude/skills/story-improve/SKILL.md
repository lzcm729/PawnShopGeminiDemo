---
name: story-improve
description: >
  事件链叙事改进工具 - 从玩家感知角度分析并优化NPC故事线。
  用于分析游戏中的 NPC 事件链，识别玩家感知盲区，生成改进计划。
  使用场景：
  (1) 分析现有故事线的玩家体验问题，
  (2) 优化 NPC 对话、邮件、description 等感知机制，
  (3) 检查事件链的因果关系是否对玩家可见。
  输入：story-causality 生成的因果分析报告（推荐），或直接分析故事源文件。
  配合 game-design-theory skill 使用效果更佳。
---

# Story Chain Improvement

事件链叙事改进工具 - 从玩家感知角度分析并优化NPC故事线

## Usage

```
/story-improve [chain_name] [focus]
```

- 不带参数：列出所有可用事件链供选择
- 带 chain_name：直接分析指定的事件链（如 `/story-improve emma`）
- 带 focus：指定分析重点（如 `/story-improve emma 玩家感知层面的分析`）

## 工具链定位

```
validator → causality → improve
  路径覆盖    因果分析    修复建议
     │           │           │
     └───────────┴───输入────┘
```

- **validator** 负责技术层面：路径是否能走通、内容是否完整
- **causality** 负责体验层面：玩家是否能理解因果关系
- **improve** 负责修复层面：基于前两者的分析，生成具体修复方案

**推荐工作流**：先运行 validator 和 causality，再运行 improve。

## 核心理念

**玩家感知是一切的基础。** 技术上正确的事件链，如果玩家感知不到因果关系，就是失败的叙事。

```
分析优先级：玩家感知 > 叙事连贯性 > 技术修复
```

分析时始终问自己：
1. **"玩家能看到吗？"** — 状态变化只在代码里发生，玩家看不到 = 无效
2. **"玩家能理解吗？"** — 玩家看到了但不知道为什么 = 需要补充解释
3. **"玩家会在乎吗？"** — 信息对玩家决策没帮助 = 可能不需要展示

## 流程概览

```
Phase 0: 加载上游报告与设计理论
    ↓
Phase 1: 事件链选择
    ↓
Phase 2: 玩家感知分析（整合 causality 结果）
    ↓
Phase 3: 叙事与技术分析
    ↓
Phase 4: 生成改进计划
    ↓
Phase 5: 讨论与保存
    ↓ (用户满意后自动触发)
Phase 6: 生成实现文档 [自动]
```

## Phase 0: 加载上游报告与设计理论

### 0.1 检查 causality 报告 [优先]

检查 `docs/story-causality/[chain_name]-causality-*.md` 是否存在：

**如存在**：解析并提取：
- 路径列表及收束评估（✓/△/✗）
- 高优先级路径的感知盲区
- 因果链断裂点
- 修复方向建议

**如不存在**：建议先运行 `/story-causality [chain_name]`，或继续独立分析。

### 0.2 检查 validator 报告 [可选]

检查 `docs/story-validations/[chain_name]-validation-*.md` 是否存在，提取技术层面的问题标记。

### 0.3 加载设计理论框架 [推荐]

调用 `game-design-theory` Skill 加载游戏设计理论框架。

## Phase 1: 事件链选择

如果用户没有指定事件链，读取 `systems/narrative/stories/` 目录，使用 AskUserQuestion 展示选项：
- `emma.ts` - 艾玛（失业女白领）
- `zhao.ts` - 周守义（退伍老兵）
- `susan.ts` - 苏珊（富太太）
- `lin.ts` - 小林（大学生）
- `underworld.ts` - 黑帮（系统威胁）

## Phase 2: 玩家感知分析

**这是最重要的分析阶段。** 详细方法见 [references/perception-mechanisms.md](references/perception-mechanisms.md)

### 2.1 整合 causality 分析 [如有]

如果 Phase 0 加载了 causality 报告，直接使用其分析结果：

| causality 输出 | improve 用途 |
|----------------|--------------|
| 感知盲区列表 | 确定需要填补的信息缺口 |
| 因果链断裂点 | 确定需要添加暴露内容的位置 |
| 收束评估 | 确定改进优先级 |
| 修复方向 | 作为改进方案的起点 |

**重点关注**：
- 收束评估为 ✗ 的路径 → 高优先级修复
- 感知盲区数 ≥3 的路径 → 需要多处补充

### 2.2 感知机制盘点

逐一检查故事线对每个感知机制的利用情况：

| 层次 | 机制 | 时机 | 条件变体支持 |
|------|------|------|--------------|
| 视觉层 | `description` | 客户出现时 | 静态 |
| 视觉层 | `observation` (fateHints) | 客户出现时 | 动态 |
| 对话层 | `greeting`, `pawnReason` | 对话过程中 | DialogueVariant[] |
| 对话层 | `exitDialogues` | 交易结束时 | DialogueVariant[] |
| 延迟层 | 邮件系统 | 交易后 N 天 | - |

**重点检查**：
- [ ] `exitDialogues` 是否使用条件变体？（常被忽略！）
- [ ] 是否有已定义但未调度的邮件？（用 Grep 确认）

### 2.3 绘制玩家视角时间线

```
Day X: NPC出现 → 玩家看到什么？对话说了什么？
       ↓ 玩家做出决策
Day X: [玩家收到什么反馈？邮件？对话？]
Day X+1 到 Day Y: [玩家知道NPC发生了什么吗？]
Day Y: NPC再次出现 → 玩家能理解为什么吗？
```

### 2.4 识别感知盲区

| 检查项 | 问题 | 严重性 |
|--------|------|--------|
| 出现理由 | 玩家知道NPC为什么来吗？ | 高 |
| 消失去向 | 玩家知道NPC离开后去哪了吗？ | 高 |
| 决策反馈 | 玩家的选择有即时反馈吗？ | 高 |
| 状态变化 | 玩家能感知NPC的状态变化吗？ | 中 |
| 结局因果 | 好/坏结局的原因玩家能追溯吗？ | 高 |

### 2.5 场景走查

模拟至少两条路径：
- **路径A：全程善待** — 好结局是"自己努力的结果"还是"运气"？
- **路径B：全程剥削** — 坏结局的心理递进是连贯的，还是"突然就崩溃了"？

## Phase 3: 叙事与技术分析

### 叙事连贯性
- 物品序列心理递进（身外之物 → 生产工具 → 情感寄托）
- 对话情感曲线（是否随变量变化？）
- 邮件系统利用（是否填补"消失期间"的信息空白？）

### 技术层面
- 状态机逻辑（触发条件冲突？死代码？）
- 变量系统（定义但未使用的变量？）
- 引擎限制（需要什么扩展？）

## Phase 4: 生成改进计划

按模板输出改进计划。详见 [references/output-template.md](references/output-template.md)

**如有 causality 报告**，改进计划应：
1. 直接对应 causality 发现的断裂点
2. 引用 causality 的修复方向建议
3. 按收束评估优先级排序

核心结构：
1. 玩家感知分析（时间线 + 盲区诊断 + 走查结论）
2. 改进方案（填补盲区 + 强化反馈 + 技术修复）
3. 新增内容清单（邮件模板 + 事件修改）
4. 验证清单

## Phase 5: 讨论与保存

1. 展示改进计划，等待用户反馈
2. 根据用户反馈迭代修改
3. 当用户表示满意时，保存到 `docs/story-improvements/[chain_name]-improvement.md`
4. **自动进入 Phase 6 生成实现文档**

## Phase 6: 生成实现文档 [自动]

**触发条件**：用户对改进计划表示满意后自动执行

详见 [references/implementation-template.md](references/implementation-template.md)

生成 `docs/story-improvements/[chain_name]-implementation.md`，包含：
- 修改概览表
- 每个修改项的原代码/目标代码
- 验证清单

## 参考材料

- **感知机制详解与检查清单**: [references/perception-mechanisms.md](references/perception-mechanisms.md)
- **改进计划输出模板**: [references/output-template.md](references/output-template.md)
- **实现文档模板**: [references/implementation-template.md](references/implementation-template.md)
- **叙事示例与代码模式**: [references/examples.md](references/examples.md)

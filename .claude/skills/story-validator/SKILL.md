---
name: story-validator
description: >
  故事路径自动化验证工具 - 遍历事件链的所有可能路径。
  自动检查每条路径是否成立，发现缺失内容。
  使用场景：
  (1) 验证所有决策组合是否都有对应的内容，
  (2) 发现死路径、缺失邮件、未处理的边界情况，
  (3) 生成完整的路径覆盖报告，供 story-causality 进行因果分析。
---

# Story Validator

故事路径自动化验证工具 - 遍历所有可能路径，自动检查完整性

## Usage

```
/story-validator [chain_name] [options]
```

- 不带参数：列出所有可用事件链供选择
- 带 chain_name：验证指定事件链（如 `/story-validator emma`）
- options:
  - `--verbose`：显示详细的路径遍历过程
  - `--quick`：只检查关键路径（好结局/坏结局）

## 核心理念

**穷举所有可能性，确保每条路径都有意义。**

玩家可能做出任何选择组合，每一条路径都应该：
1. 能够走通（没有死胡同）
2. 有对应的反馈内容（没有空白）
3. 结局合理（因果可追溯）

## 工具链定位

```
validator → causality → improve
  路径覆盖    因果分析    修复建议
     ↓
  输出路径清单供 causality 分析
```

validator 的输出是 causality 的输入：
- validator 负责**技术层面**：路径是否能走通、内容是否完整
- causality 负责**体验层面**：玩家是否能理解因果关系

## 流程概览

```
Phase 1: 加载故事数据
    ↓
Phase 2: 构建决策树
    ↓
Phase 3: 路径遍历与验证
    ↓
Phase 4: 生成验证报告（供 causality 使用）
```

## Phase 1: 加载故事数据

读取故事文件，提取：

```typescript
interface StoryData {
  chainInit: EventChainState;    // 初始状态
  events: StoryEvent[];          // 事件列表
  mails: Record<string, Mail>;   // 邮件模板
  simulationRules: SimRule[];    // 模拟规则
}
```

关键信息：
- 所有事件及其触发条件
- 所有可能的 outcomes（0%/5%/10%/20% 四档合同 + 拒绝）
- 所有邮件模板
- 到期结算相关的 dynamicFlows

## Phase 2: 构建决策树

### 2.1 识别决策点

```typescript
interface DecisionPoint {
  id: string;
  type: '典当节点' | '结算节点' | '物品衍生节点';
  day: number;
  eventId: string;
  options: DecisionOption[];
}

interface DecisionOption {
  id: string;
  label: string;
  // 典当节点：当金% × 利率%
  pawnAmount?: number;    // 当金百分比
  interestRate?: number;  // 利率：0%/5%/10%/20%
  outcomes: Outcome[];
  nextState: StateSnapshot;
}
```

### 2.2 节点类型定义

#### 典当节点
玩家决定当金和利率：

| 利率 | outcomes 来源 |
|------|---------------|
| 0% | deal_charity |
| 5% | deal_aid |
| 10% | deal_standard |
| 20% | deal_shark |
| 拒绝 | onReject |

行为空间：`当金% × 利率%`（如 85% × 10%）

**注意**：利率是客观的合同参数，玩家意图（怜悯/公办/压榨）是主观动机，两者独立。同样选择 10% 利率，玩家可能出于"维持经营"或"不想太亏"等不同意图。

#### 结算节点
物品到期时的处理，场景由 NPC 状态决定：

| 场景 | 玩家选项 |
|------|----------|
| 赎回场景 | 同意赎回 / 要求赔偿 / 拒绝赎回 |
| 续当场景 | 同意续当 / 拒绝续当 |
| 绝当场景 | 挂牌出售 / 继续保留 |

#### 物品衍生节点
围绕典当物品产生的附加选择：

| 示例 | 玩家选项 |
|------|----------|
| 借用电脑 | 同意 / 不同意 |
| 收购勋章 | 同意 / 不同意 |
| 提供线索 | 告知 / 隐瞒 |

### 2.3 构建树结构

```
Root (Day 1, Stage 0)
├── 典当节点: 职业套装
│   ├── [90% × 0%] → State A
│   │   ├── 结算节点: 续当
│   │   │   ├── [同意] → ...
│   │   │   └── [拒绝] → ...
│   │   └── 典当节点: 面霜 (if triggered)
│   │       └── ...
│   ├── [80% × 10%] → State B
│   │   └── ...
│   ├── [70% × 20%] → State C
│   │   └── ...
│   └── [拒绝] → State D
│       └── ...
```

## Phase 3: 路径遍历与验证

### 3.1 遍历算法

使用深度优先搜索（DFS）遍历所有路径：

```
function traverse(state, path, day):
    if isEndState(state):
        validatePath(path)
        recordPath(path)
        return

    state = runSimulation(state, day)

    // 检查结算节点（到期日）
    for item in state.inventory:
        if item.expiryDay == day:
            for option in getExpiryOptions(state, item):
                newState = applyExpiry(state, option)
                traverse(newState, path + [结算节点(option)], day)

    // 检查典当节点或物品衍生节点
    event = getTriggeredEvent(state)
    if event:
        for option in event.options:
            newState = applyOutcome(state, option)
            nodeType = event.type == 'DERIVATIVE' ? '物品衍生节点' : '典当节点'
            traverse(newState, path + [nodeType(option)], day + 1)
    else:
        traverse(state, path, day + 1)
```

### 3.2 验证检查项

#### A. 内容完整性
```
□ 每个决策点都有对应的场景描述
□ 每个 outcome 都有对应的 exitDialogue
□ 每个 SCHEDULE_MAIL 的 templateId 都存在于 MAILS
□ 所有触发的邮件都有 body 内容
```

#### B. 结算节点处理
```
□ 每件典当物品都有明确的到期日
□ 每个到期日都有对应的处理逻辑
□ 续当/绝当/赎回场景都有定义
```

#### C. 状态连续性
```
□ stage 变化符合预期顺序
□ 变量变化在合理范围内
□ 没有无限循环的可能
```

#### D. 结局可达性
```
□ 好结局可达（至少存在一条路径）
□ 坏结局可达（至少存在一条路径）
□ 所有 dynamicFlows 的分支都可能触发
```

### 3.3 问题分类

| 严重性 | 类型 | 示例 |
|--------|------|------|
| 🔴 Critical | 死路径 | 某个选择后无法继续 |
| 🔴 Critical | 缺失内容 | 引用的邮件不存在 |
| 🟡 Warning | 感知盲区 | 变量变化但无反馈（标记供 causality 分析） |
| 🟡 Warning | 未使用内容 | 定义的邮件从未触发 |
| 🔵 Info | 边界情况 | 极端选择组合的体验 |

## Phase 4: 生成验证报告

### 4.1 报告结构（供 causality 使用）

```markdown
# [Chain Name] 路径验证报告

> 生成时间：[timestamp]
> 总路径数：X
> 通过：Y
> 问题：Z

## 概览

### 路径统计
- 好结局路径：X 条
- 坏结局路径：Y 条
- 中性结局路径：Z 条

### 决策点统计
- 典当节点：X 次
- 结算节点：Y 次
- 物品衍生节点：Z 次

## 问题清单

### 🔴 Critical Issues
...

### 🟡 Warnings（供 causality 深入分析）
...

## 完整路径列表

### 路径 1: 全程低利率 → 好结局
```
Day 1: 典当节点 - 职业套装 [90% × 0%]
  └─ hope: 50→70, funds: +900
Day 5: 典当节点 - 面霜 [85% × 0%]
  └─ hope: 70→75
Day 8: 结算节点 - 套装续当 [同意]
Day 10: 典当节点 - 电脑 [90% × 0%]
  └─ hope: 75→80, job_chance: +20
Day 10: 物品衍生节点 - 借用电脑 [同意]
  └─ job_chance: +10
Day 15: 结算节点 - 面霜续当 [同意]
Day 20: 收到 Offer
Day 21: 结算节点 - 赎回 [同意]
  └─ 结局: 好结局 - 成功入职
```

### 路径 2: 全程高利率 → 坏结局
...

## 覆盖率统计

| 内容类型 | 总数 | 已覆盖 | 覆盖率 |
|----------|------|--------|--------|
| 邮件模板 | 24 | 20 | 83% |
| 对话变体 | 15 | 12 | 80% |
| fateHints | 10 | 8 | 80% |
| dynamicFlows | 3 | 3 | 100% |

### 未覆盖内容
- `mail_emma_xxx`: 未被任何路径触发
```

### 4.2 输出位置

报告保存到：`docs/story-validations/[chain_name]-validation-[timestamp].md`

### 4.3 供 causality 使用的数据

报告中的路径列表采用统一格式，便于 causality 解析：

```
路径格式：[节点类型] - [物品/事件] [决策参数]
  └─ [变量变化]

节点类型：典当节点 | 结算节点 | 物品衍生节点
决策参数：
  - 典当节点：当金% × 利率%（如 90% × 0%）
  - 结算节点：同意/拒绝/赔偿
  - 物品衍生节点：同意/不同意
```

## 特殊处理

### 概率事件 (CHANCE)

对于 `job_chance` 等概率事件，分别验证成功和失败两条分支：

```
CHANCE event (job_chance):
├── [SUCCESS] onSuccess outcomes
└── [FAILURE] onFail outcomes
```

### 多物品结算交错

当多件物品的到期日接近时，考虑所有可能的处理顺序：

```
Day 8: 套装到期
Day 10: 面霜到期

可能的组合：
- 套装[续当] → 面霜[续当]
- 套装[续当] → 面霜[绝当-售]
- 套装[拒绝] → 面霜[续当]
- ...
```

### 状态阈值触发

监控 THRESHOLD 规则的触发：

```
当 hope < 10 时触发崩溃
→ 验证崩溃前的所有状态变化路径
→ 确保崩溃后有对应的内容
```

## 使用示例

```
/story-validator emma

[输出]
正在分析 emma.ts ...
发现 4 个决策点（3 典当 + 1 物品衍生），预计 64 条路径

路径遍历中...
▓▓▓▓▓▓▓▓▓▓ 100%

验证完成！

🔴 Critical: 2
🟡 Warning: 5（建议用 /story-causality 深入分析）
🔵 Info: 3

查看详细报告: docs/story-validations/emma-validation-20260127.md
```

## 与其他工具配合

```
/story-validator emma        # 发现问题路径，生成路径清单
/story-causality emma        # 基于路径清单分析因果断裂点
/story-improve emma          # 基于分析生成修复方案
```

**数据流**：
1. validator 输出完整路径列表 + 问题标记
2. causality 读取路径列表，进行六维度因果分析
3. improve 基于 causality 的分析生成具体修复方案

---
name: story-causality
description: >
  因果可感知性分析工具 - 分析玩家行为与NPC命运之间的因果链。
  用于验证玩家能否在结果呈现时理解自己的行为如何导致了这个结果。
  使用场景：
  (1) 分析具体行为如何影响NPC演化，
  (2) 识别因果链的断裂点和感知盲区，
  (3) 验证玩家能否完成"意图收束"。
  定位于 story-validator 和 story-improve 之间的桥梁工具。
  输入：story-validator 生成的路径验证报告。
---

# Story Causality

因果可感知性分析工具 - 验证玩家能否理解"我的行为如何导致了这个结果"

## Usage

```
/story-causality [chain_name] [--path "路径描述"] [--verbose]
```

## 核心理念

**意图的意义是后验的。**

```
玩家行为（数值）→ NPC演化 → 结果呈现 → 意图收束
                                        ↑
                              "原来我的怜悯没帮到他"
```

收束成功：玩家能追溯自己的哪个决策导致了结果
收束失败：玩家归因于"命运"而非自己的选择

## 工具链定位

```
validator → causality → improve
  路径覆盖    因果分析    修复建议
     │           │           │
     └──输入─────┘           │
                 └──输入─────┘
```

- **validator** 负责技术层面：路径是否能走通、内容是否完整
- **causality** 负责体验层面：玩家是否能理解因果关系
- **improve** 负责修复层面：生成具体的修复方案

## 工作流程

### Phase 1: 加载数据

**优先读取 validator 报告**：
1. 检查 `docs/story-validations/[chain_name]-validation-*.md` 是否存在
2. 如存在，解析路径列表和问题标记
3. 如不存在，建议先运行 `/story-validator [chain_name]`

**补充读取故事源文件**：
- `systems/narrative/stories/[chain_name].ts`
- 提取事件、邮件、simulationRules 用于因果分析

### Phase 2: 路径枚举

从 validator 报告中提取路径，或自行构建决策序列。

**三种节点类型**：

| 节点类型 | 玩家决策 | 行为空间 |
|----------|----------|----------|
| 典当节点 | 当金% × 利率% | 利率：0%/5%/10%/20%，或拒绝 |
| 结算节点 | 赎回：同意/赔偿/拒绝；续当：同意/拒绝 | 二元或三元选择 |
| 物品衍生节点 | 同意/不同意 | 二元选择 |

**利率与意图的关系**：
- 利率是**客观的合同参数**（0%/5%/10%/20%）
- 意图是**玩家的主观动机**（怜悯/公办/压榨）
- 两者独立，因果分析时需要从行为（利率）推断可能的意图

路径示例：`典当(90%×0%) → 衍生(同意) → 结算(赎回) → 典当(80%×10%) → 结算(失败) → 破产`

### Phase 3: 逐路径因果分析

对每条路径执行六个维度分析。详见 [references/analysis-dimensions.md](references/analysis-dimensions.md)

1. **决策序列**：每个节点的行为空间和NPC状态变化
2. **因果链**：行为→演化→结果的连接
3. **分叉点**：改变命运的临界点，玩家是否可感知
4. **暴露点**：叙事内容是否指向玩家行为
5. **感知盲区**：玩家无法追溯的因果关系
6. **收束评估**：玩家能否完成意图收束

**重点关注 validator 标记的 Warning**：
- validator 标记的"感知盲区"需要深入分析断裂原因
- validator 标记的"边界情况"需要评估是否影响因果感知

### Phase 4: 生成报告

输出格式见 [references/output-format.md](references/output-format.md)

**概览层**：路径列表 + 收束评估 + 盲区数 + 优先级
**详情层**：每条路径的六维度分析

报告保存到：`docs/story-causality/[chain_name]-causality-[timestamp].md`

## 与其他工具配合

```
/story-validator emma        # 发现问题路径，生成路径清单
/story-causality emma        # 基于路径清单分析因果断裂点
/story-improve emma          # 基于分析生成修复方案
```

**推荐工作流**：
1. 先运行 validator 生成完整路径列表
2. 运行 causality 对问题路径进行深入因果分析
3. 运行 improve 基于因果分析生成修复方案

**数据依赖**：
- causality 读取 validator 的路径列表和问题标记
- improve 读取 causality 的六维度分析结果

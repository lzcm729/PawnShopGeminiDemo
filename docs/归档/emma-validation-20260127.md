# 艾玛 (Emma) 路径验证报告

> 生成时间：2026-01-27
> 分析文件：`systems/narrative/stories/emma.ts`

---

## 概览

### 事件结构
| 事件ID | 触发条件 | 物品 |
|--------|----------|------|
| emma_01_clothes | stage == 0 | 职业套装 |
| emma_02_skincare | stage == 1 && funds <= 200 | 面霜礼盒 |
| emma_03_laptop | stage == 2 && funds < 100 | 笔记本电脑 |
| emma_04_watch_final | stage == 4 | 男士机械表 |
| emma_05_redemption | stage == 5 | 赎回检查 |

### 结局统计
- **好结局路径**: 可达（Stage 5 → dynamicFlows）
- **坏结局路径**: 可达（Stage 4 → 99 或 hope < 10 崩溃）
- **中性结局**: 可达（Stage 4 → charity → Stage 3 → 再次尝试）

---

## 问题清单

### 🔴 Critical Issues

#### Issue 1: 到期日处理逻辑完全缺失

**问题**: 代码中没有定义任何物品的到期日、续当、赎回、绝当的处理逻辑。

**影响**:
- 玩家无法体验典当核心循环（典当→到期→结算）
- 职业套装作为核心物品，其命运无法被玩家控制
- `dynamicFlows` 中的 `core_lost` 分支无法正常触发（没有机制让玩家"卖掉"衣服）

**缺失内容**:
```typescript
// 需要添加的机制：
- 物品到期日计算（典当日 + 期限）
- 到期时客户行为判定（根据 funds/hope 决定赎回/续当/不出现）
- 玩家响应选项（同意赎回/拒绝赎回/同意续当/拒绝续当）
- 绝当后物品状态变更
```

---

#### Issue 2: 邮件 `mail_emma_redeem_failed` 未被使用

**位置**: EMMA_MAILS 第 91-97 行

**内容**:
```
"老板，我凑不够赎金。说好的 Offer 黄了，HR 说预算调整..."
```

**问题**: 这封邮件定义了但从未被任何 outcome 或 simulationRule 调度。

**建议**: 应在 emma_05_redemption 的 onFailure 中使用，或在续当失败时使用。

---

#### Issue 3: emma_04_watch_final 缺少 deal_aid 和 deal_shark

**位置**: EMMA_EVENTS[3].outcomes

**当前定义**:
```typescript
outcomes: {
    "deal_charity": [...],
    "deal_standard": [...]
}
// 缺少 deal_aid 和 deal_shark
```

**问题**: 玩家只有两个选择（慷慨/正常），与其他事件的四选项不一致。

**建议**: 补充 deal_aid 和 deal_shark 的 outcomes。

---

### 🟡 Warnings

#### Warning 1: Stage 2 → Stage 3 的触发条件可能导致死锁

**路径**: emma_01 [reject] → emma_02 触发条件检查

**分析**:
```
初始 funds = 500
emma_01 [reject]: funds 不变，stage → 1
emma_02 触发条件: stage == 1 && funds <= 200

问题: 如果玩家拒绝 emma_01，funds 保持 500。
即使每天 -50，需要 6+ 天才能触发 emma_02。
但这期间没有任何事件发生，玩家体验空白。
```

**建议**: 添加过渡事件或调整触发条件。

---

#### Warning 2: deal_standard 在 emma_02 和 emma_03 不修改 hope

**位置**:
- emma_02_skincare.outcomes.deal_standard（第553-558行）
- emma_03_laptop.outcomes.deal_standard（第636-643行）

**问题**: 其他选项都会修改 hope，但 standard 不修改。这可能导致玩家感知不到"公平交易"的影响。

**建议**: 考虑是否应该有轻微的 hope 变化（如 -5 或 +5）。

---

#### Warning 3: interview_failures 重置逻辑可能导致邮件重复

**位置**: simulationRules THRESHOLD (interview_failures >= 3)

**逻辑**:
```typescript
onTrigger: [
    { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_interview_failed_3x', delayDays: 0 },
    { type: 'MOD_VAR', target: 'interview_failures', value: 0, op: 'SET' } // 重置为 0
]
```

**问题**: 重置后，如果继续失败，会再次触发 interview_failures == 1 和 == 2 的邮件，形成循环。

**影响**: 玩家可能收到重复的"第一次面试失败"邮件。

---

#### Warning 4: hope <= 15 和 hope < 10 的触发顺序问题

**位置**: simulationRules THRESHOLD

**分析**:
```
hope <= 15: 触发 mail_emma_coming_for_ring（预警）
hope < 10: 触发崩溃，stage → 4

问题: 如果 hope 从 20 直接降到 5（如 CHANCE 失败 -15），
可能同时触发两个 THRESHOLD，顺序不确定。
```

**建议**: 明确触发顺序或添加条件防止重复触发。

---

#### Warning 5: 邮件 `mail_emma_hate` 内容与 `core_lost` 场景不完全匹配

**邮件内容**:
```
"因为没有电脑，我错过了入职提交材料的截止日期..."
```

**触发场景**: dynamicFlows.core_lost（职业套装丢失）

**问题**: 邮件说的是"电脑"，但触发条件是"职业套装"丢失。内容不匹配。

**建议**: 修改邮件内容，或根据实际丢失的物品动态生成内容。

---

### 🔵 Info

#### Info 1: fateHints 中使用了"他"指代艾玛

**位置**: fateHints[0].hints[1]
```
'（看起来即使在阴雨天，他的心情也很不错）'
```

**问题**: 艾玛是女性，应该用"她"。

---

#### Info 2: job_chance 初始值为 0

**影响**: 如果玩家在 emma_01 选择 reject，job_chance 保持 0。
在 Stage 3 的 CHANCE 检测中，0% 概率意味着必然失败。

**这是设计意图还是 bug？** 如果是意图，应该确保有其他途径增加 job_chance。

---

#### Info 3: emma_04 的 deal_charity 会将 stage 从 4 改回 3

**逻辑**: 崩溃后如果玩家慷慨对待，给艾玛第二次机会。

**潜在问题**: Stage 3 会再次触发 CHANCE 检测，但此时的变量状态可能不符合预期。

---

## 邮件覆盖率统计

| 邮件ID | 被调度 | 触发路径 |
|--------|--------|----------|
| mail_emma_success | ✅ | dynamicFlows: all_safe, core_safe |
| mail_emma_hate | ✅ | dynamicFlows: core_lost |
| mail_emma_boyfriend_left | ✅ | THRESHOLD hope < 10 |
| mail_emma_plea | ✅ | emma_05.failureMailId |
| mail_emma_01_charity | ✅ | emma_01: charity, aid |
| mail_emma_01_shark | ✅ | emma_01: shark |
| mail_emma_02_charity | ✅ | emma_02: all deals |
| mail_emma_02_shark | ✅ | emma_02: shark |
| mail_emma_03_charity | ✅ | emma_03: charity, aid, standard |
| mail_emma_03_shark | ✅ | emma_03: shark |
| mail_emma_03b_charity | ✅ | emma_04: charity |
| mail_emma_03b_shark | ✅ | emma_04: standard |
| **mail_emma_redeem_failed** | ❌ | **未被任何路径触发** |
| mail_emma_coming_for_ring | ✅ | THRESHOLD hope <= 15 |
| mail_emma_got_job | ✅ | CHANCE success |
| mail_emma_interview_failed_3x | ✅ | THRESHOLD failures >= 3 |
| mail_emma_stage1_hopeful | ✅ | emma_01: charity, aid |
| mail_emma_stage1_anxious | ✅ | emma_01: standard, shark |
| mail_emma_stage2_struggling | ✅ | emma_02: all deals |
| mail_emma_stage3_desperate | ✅ | emma_03: all deals |
| mail_emma_stage3_waiting | ✅ | emma_03: charity, aid, standard |
| mail_emma_stage3_nervous | ✅ | emma_03: shark |
| mail_emma_interview_failed_once | ✅ | THRESHOLD failures == 1 |
| mail_emma_interview_failed_twice | ✅ | THRESHOLD failures == 2 |

**覆盖率**: 23/24 = **95.8%**

---

## 关键路径示例

### 路径 A: 全程慷慨 → 好结局
```
Day 1: emma_01 [charity]
  └─ hope: 50→70, job_chance: 0→30, stage: 0→1
  └─ 邮件: mail_emma_01_charity, mail_emma_stage1_hopeful(+2d)

Day 5: emma_02 [charity] (假设 funds 触发)
  └─ hope: 70→65, stage: 1→2
  └─ 邮件: mail_emma_02_charity, mail_emma_stage2_struggling(+2d)

Day 9: emma_03 [charity]
  └─ hope: 65→60, has_laptop: 1→0, stage: 2→3
  └─ 邮件: mail_emma_03_charity, mail_emma_stage3_waiting(+3d), mail_emma_stage3_desperate(+5d)

Day 10-20: Stage 3 模拟
  └─ 每天 CHANCE(30%) 检测
  └─ 假设 Day 15 成功: stage: 3→5, funds+3000, hope+50
  └─ 邮件: mail_emma_got_job(+1d)

Day 16: emma_05 [all_safe]
  └─ 结局: 好结局
  └─ 邮件: mail_emma_success(+1d)
```

### 路径 B: 全程苛刻 → 崩溃
```
Day 1: emma_01 [shark]
  └─ hope: 50→40, job_chance: 0→10, stage: 0→1
  └─ 邮件: mail_emma_01_shark, mail_emma_stage1_anxious(+2d)

Day 5: emma_02 [shark]
  └─ hope: 40→30, stage: 1→2
  └─ 邮件: mail_emma_02_shark, mail_emma_stage2_struggling(+1d)

Day 9: emma_03 [shark]
  └─ hope: 30→20, job_chance: 10→0, stage: 2→3
  └─ 邮件: mail_emma_03_shark, mail_emma_stage3_nervous(+2d), mail_emma_stage3_desperate(+4d)

Day 10: Stage 3 模拟
  └─ CHANCE(0%) 必然失败
  └─ hope: 20→5 (< 10 触发崩溃)
  └─ stage: 3→4
  └─ 邮件: mail_emma_coming_for_ring, mail_emma_boyfriend_left

Day 11: emma_04 触发
  └─ 选择 [standard]: stage: 4→99
  └─ 结局: 坏结局（离开城市）
  └─ 邮件: mail_emma_03b_shark
```

---

## 总结

| 类型 | 数量 |
|------|------|
| 🔴 Critical | 3 |
| 🟡 Warning | 5 |
| 🔵 Info | 3 |

**最严重的问题是：到期日处理逻辑完全缺失。** 这使得典当游戏的核心循环无法完整运作，玩家无法通过控制物品的去留来影响故事走向。

---

## 后续建议

1. 使用 `/story-playtest emma` 手动体验问题路径
2. 使用 `/story-improve emma` 生成修复方案
3. 优先修复 Critical Issues，特别是到期日处理逻辑

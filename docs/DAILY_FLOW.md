# 游戏每日流程详解

本文档详细描述了《典当困境》游戏中每一天的完整流程，包括所有阶段、状态转换和关键决策点。

> **状态机详细说明**（类型定义、转换规则、API 使用）参见 [STATE_MACHINE.md](./STATE_MACHINE.md)

---

## 详细阶段说明

### 1. MORNING_BRIEF (晨间简报)

**触发**: 游戏开始 或 前一天 `END_DAY` 之后

**显示内容**:
- 当前日期 (Day N)
- 今日新闻 (市场动态、叙事提示)
- 待处理邮件预览
- 母亲健康状态

**用户操作**:
- 点击 "开门营业" 按钮

**代码位置**: `components/MorningBrief.tsx`

**触发函数**: `startNewDay()` (in `useGameEngine.ts`)

---

### 2. startNewDay() 流程

**执行顺序**:

```
0. DEDUCT_MAINTENANCE_COST
   └─ 扣除已启用设施的每日维护费用

0.5. BLACKMARKET_REFRESH_DAILY
   └─ 刷新黑市每日状态，检查锁定过期

1. PROCESS_DAILY_MAIL
   └─ 将到期邮件从 pendingMails 移到 inbox

2. checkDailyExpirations()
   ├─ 遍历所有 ACTIVE 且今天到期的物品
   ├─ 根据 NPC 状态判断行为:
   │   ├─ REDEEM: funds >= 赎回费 且 hope >= 40
   │   ├─ RENEW:  funds < 赎回费 且 hope > 30
   │   ├─ BREACH_DISCOVERED: 物品已被违规出售
   │   └─ NO_SHOW: 其他情况
   │
   ├─ NO_SHOW 物品 → 自动绝当 (EXPIRE_ITEMS)
   │   └─ 应用 expiryFlows.noShow.keep 效果
   │
   ├─ BREACH_DISCOVERED → 自动解决 (RESOLVE_EXPIRY)
   │   └─ 不创建顾客交互
   │
   └─ REDEEM/RENEW 物品 → 加入 expiryQueue

3. 如果 expiryQueue 不为空 (正常事件):
   ├─ SET_EXPIRY_QUEUE
   ├─ createExpiryCustomer() 创建结算顾客
   └─ SET_CUSTOMER → phase = NEGOTIATION

4. 如果 expiryQueue 为空:
   └─ START_DAY → phase = BUSINESS
```

**代码位置**: `hooks/useGameEngine.ts:297-370`

---

### 3. 到期结算流程 (Expiry Settlement)

**触发条件**: `expiryQueue.length > 0`

**显示界面**: `SettlementInterface` (复用赎回界面)

**NPC 行为决策** (`determineExpiryBehavior`):

| 条件 | 行为 | 说明 |
|------|------|------|
| 物品已被违规出售 | BREACH_DISCOVERED | 自动处理，不创建顾客 |
| `funds >= total` 且 `hope >= 40` | REDEEM | NPC 来赎回 |
| `funds < total` 且 `hope > 30` | RENEW | NPC 来续当 |
| 其他 | NO_SHOW | NPC 不出现，自动绝当 |

**玩家选项**:

对于 REDEEM (赎回请求):
- ✅ 办理赎回 → 收取本金+利息，物品归还
- 🎁 无偿归还 (如果允许) → +Humanity
- ❌ 违约赔偿 → 支付 200% 估值，强行留下物品

对于 RENEW (续当请求):
- ✅ 办理续当 → 收取利息，延期7天
- ❌ 拒绝续当 → 物品绝当，-Humanity

**流程**:
```
玩家决策
    │
    ▼
handleExpiryCompletion()
    │
    ├─ 应用 expiryFlows 效果 (MODIFY_VAR, SCHEDULE_MAIL 等)
    └─ 不自动跳转 (等待 DepartureView)

    ▼
DEPARTURE (送客界面)
    │
    ▼
[点击"送客"]
    │
    ▼
processNextExpiryEvent()
    │
    ├─ queue.length > 1 → 处理下一个到期事件
    └─ queue.length <= 1 → START_DAY
```

**代码位置**:
- `components/RedemptionInterface.tsx`
- `hooks/usePawnShop.ts:143-215`

---

### 4. BUSINESS (营业阶段)

**触发**: `START_DAY` action

**状态重置**:
```javascript
{
  customersServedToday: 0,
  narrativeCustomersServedToday: 0,
  currentCustomer: null,
  dayEvents: [],
  todayTransactions: [],
  phase: BUSINESS,
  actionPoints: maxAP,
  violationFlags: [],
  lastSatisfaction: null
}
```

**自动行为** (App.tsx useEffect):
```javascript
if (isBusiness && !isLoading && !currentCustomer && customersServedToday < max) {
    generateDailyEvent();
}
```

**代码位置**: `App.tsx:68-77`

---

### 5. generateDailyEvent() 流程

**执行顺序**:

```
1. 检查续当请求 (checkRenewalRequests)
   └─ 如果有 → SET_CUSTOMER, return

2. 检查预约顾客 (pendingAppointedCandidates)
   ├─ 如果有 → generateCustomerFromCandidate()
   ├─ POP_APPOINTED_CANDIDATE
   └─ SET_CUSTOMER, return

3. 查找故事事件 (findEligibleEvent)
   ├─ 如果有 → INCREMENT_NARRATIVE_CUSTOMER
   ├─ 检查事件类型:
   │   ├─ POST_FORFEIT_VISIT → 验证物品是否绝当
   │   └─ REDEMPTION_CHECK → 验证资金/计算赎回流程
   │
   └─ instantiateStoryCustomer → SET_CUSTOMER, return

4. 生成填充顾客 (Filler Customers)
   ├─ 计算允许的填充顾客数量:
   │   └─ fillerAllowed = maxCustomersPerDay - narrativeServed
   ├─ 如果 fillerServed < fillerAllowed:
   │   └─ generateFillerCustomer() → SET_CUSTOMER, return
   │
   └─ 填充顾客使用 TRANSIENT 链追踪到期行为

5. 无顾客 → MARK_NO_MORE_CUSTOMERS
   └─ 显示"打烊"按钮
```

**顾客优先级**:
1. 续当请求 (最高 - 即将到期的物品)
2. 预约顾客 (玩家前一晚选择的)
3. 故事顾客 (叙事事件驱动，不受数量限制)
4. 填充顾客 (随机生成，填补剩余名额)

**顾客数量计算**:
- `narrativeCustomersServedToday`: 故事顾客计数
- `customersServedToday`: 总顾客计数
- `fillerServed = customersServedToday - narrativeServed`
- `fillerAllowed = maxCustomersPerDay - narrativeServed`

**代码位置**: `hooks/useGameEngine.ts:392-574`

---

### 6. NEGOTIATION (谈判阶段)

**触发**: `SET_CUSTOMER` action (自动设置 phase = NEGOTIATION)

**交互类型** (`interactionType`):

| 类型 | 界面 | 说明 |
|------|------|------|
| `PAWN` | NegotiationPanel | 典当谈判 |
| `REDEEM` | SettlementInterface | 赎回/结算 |
| `RENEWAL` | RenewalRequestPanel | 续当请求 |
| `POST_FORFEIT` | PostForfeitPanel | 绝当后回访 |

**典当谈判流程** (PAWN):
```
玩家操作:
├─ 鉴定物品 (消耗 AP)
├─ 使用特性 (Leverage)
├─ 提出报价
└─ 选择利率 (0%/5%/10%/20%)

NPC 反应:
├─ 接受 → commitTransaction() → DEPARTURE
├─ 拒绝 → 等待新报价
└─ 离开 → rejectCustomer() → DEPARTURE
```

**填充顾客的 TRANSIENT 链**:
- 非故事顾客交易成功后创建临时链
- 用于追踪到期行为（基于合同类型的概率）
- 不触发叙事事件

**代码位置**:
- `components/NegotiationPanel.tsx`
- `hooks/useNegotiation.ts`

---

### 7. DEPARTURE (送客阶段)

**触发**:
- `RESOLVE_TRANSACTION` (交易成功)
- `REJECT_DEAL` (拒绝交易)
- 其他结算操作

**显示内容**:
- NPC 头像 (根据满意度变化)
- 离别台词 (根据满意度选择)
- 内心独白 (随机触发)

**满意度等级** (`SatisfactionLevel`):
- `GRATEFUL`: 感激
- `NEUTRAL`: 中立
- `RESENTFUL`: 怨恨
- `DESPERATE`: 绝望

**用户操作**:
- 点击 "送客 (DISMISS)" 按钮

**点击后逻辑**:
```javascript
handleNext() {
    CLEAR_CUSTOMER;

    if (hasMoreExpiryEvents) {
        processNextExpiryEvent();  // 继续处理到期事件
    } else {
        SET_PHASE(BUSINESS);  // 回到营业
    }
}
```

**代码位置**: `components/ShopClosedView.tsx`

---

### 8. 打烊逻辑

**显示条件**:
```javascript
isShopClosed = isBusiness && customersServedToday >= maxCustomersPerDay
```

**触发方式**:
1. 服务了足够多的顾客 (`customersServedToday >= max`)
2. 无更多事件 (`MARK_NO_MORE_CUSTOMERS`)

**用户操作**:
- 点击 "打烊 (CLOSE)" 按钮

**执行函数**: `handleStartNight()`
```javascript
handleStartNight() {
    setShowDayToNight(true);  // 显示过渡动画
    setTimeout(() => {
        // 状态机转换: BUSINESS.IDLE → BUSINESS.CLOSED → NIGHT.ACTIVE
        send({ type: 'CUSTOMER_GENERATED', hasCustomer: false });
        send({ type: 'CLOSE_SHOP' });
        dispatch({ type: 'START_NIGHT' });
    }, 1500);
}
```

**状态机流程**:
```
BUSINESS.IDLE → CUSTOMER_GENERATED(false) → BUSINESS.CLOSED → CLOSE_SHOP → NIGHT.ACTIVE
```

**代码位置**: `App.tsx:47-58`

---

### 9. NIGHT (夜间阶段)

**触发**: `START_NIGHT` action

**显示界面**: `NightDashboard`

**可用操作**:

| 操作 | 入口 | 说明 |
|------|------|------|
| 📬 邮件 | 查看邮件 | 处理到达邮件 |
| 📦 库存 | 查看库存 | 管理绝当物品 |
| 📅 日历 | 查看日历 | 财务预测 |
| 🏥 医疗 | 支付医药费 | 医药费管理 |
| 🏠 探望 | 探望母亲 | +2 Humanity, -1% Risk |
| 🔧 工坊 | 进入工坊 | 修复/重铸物品 |
| 🔮 洞察 | 能量洞察 | 精华系统 |
| 🏪 黑市 | 黑市交易 | 出售/购买物品 |
| 📋 预约 | 预约板 | 选择明日顾客 |
| ⚙️ 升级 | 升级商店 | 购买店铺升级 |
| 🎛️ 设施 | 设施控制 | 管理已购设施 |

**夜间能量系统**:
- 基础能量: 3 点
- 部分操作消耗能量
- 能量耗尽后无法进行更多操作

**用户操作**:
- 点击 "结束今天" 按钮

**代码位置**: `components/NightDashboard.tsx`

---

### 10. performNightCycle() 流程

**执行顺序**:

```
1. 叙事模拟 (runDailySimulation)
   ├─ 执行所有活跃链的 SimRules
   └─ 收集副作用 (SCHEDULE_MAIL 等)

2. 新闻生成 (generateDailyNews)
   ├─ 生成市场新闻
   └─ 添加市场修正器

3. 随机夜间事件 (概率受里程碑影响)
   ├─ 基础概率: 30%
   ├─ The Fixer (黑道): 降至 15%
   ├─ Soft Target (黑道): 升至 50%
   │
   ├─ 事件池:
   │   ├─ 设备故障 (-$30)
   │   ├─ 虫害 (-$20)
   │   ├─ 找到零钱 (+$15)
   │   ├─ 小孩归还多找的钱 (+$5, +1 Humanity)
   │   ├─ 窗户被砸 (-$50) [Fixer 排除]
   │   ├─ 睡眠良好 (+1 Health)
   │   └─ 噩梦 (-1 Health)

4. 医药费状态检查
   ├─ 已支付 → ROTATE_MEDICAL_BILL (轮换下一周期)
   └─ 逾期 → MARK_BILL_OVERDUE

5. 母亲健康计算
   ├─ 已支付: +2 Health, -5% Risk, Premium Care
   │   └─ Saint 里程碑: +1 额外健康
   ├─ 逾期: -15 Health, +10% Risk, No Care
   └─ 待支付: -1 Health, Basic Care
       └─ Saint 里程碑: 抵消衰减

   并发症检查: if (random < risk%) → -10 Health

6. 准备明日预约 (PREPARE_DAILY_APPOINTMENTS)
   ├─ 将选中的候选人移至 pendingAppointedCandidates
   └─ 清空当前候选人列表和选择

7. 黑市日结算 (BLACKMARKET_PROCESS_DAY_END)
   ├─ 检查热度风险事件
   └─ 刷新每日状态

8. NIGHT_CYCLE_DONE (状态机事件)
   └─ NIGHT.PROCESSING → NIGHT.EVALUATING

9. EVALUATION_DONE (App.tsx 自动触发)
   ├─ 检查破产 (cash < 0) → GAME_OVER
   ├─ 检查母亲死亡 (health <= 0) → GAME_OVER
   ├─ 检查胜利 (cash >= GOAL_AMOUNT) → VICTORY
   └─ 正常继续 → MORNING_BRIEF (day++)
```

**状态机流程**:
```
用户点击 "结束今天"
    │
    ▼
NIGHT.ACTIVE → END_DAY → NIGHT.PROCESSING
    │
    ▼
performNightCycle() 执行
    │
    ▼
NIGHT.PROCESSING → NIGHT_CYCLE_DONE → NIGHT.EVALUATING
    │
    ▼
NIGHT.EVALUATING → EVALUATION_DONE(outcome) → MORNING_BRIEF / GAME_OVER / VICTORY
```

**代码位置**: `hooks/useGameEngine.ts:37-216`, `App.tsx:84-101`

---

## 关键状态变量

### GameState 核心字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `phase` | GamePhase | 当前游戏阶段 |
| `currentCustomer` | Customer | 当前顾客 |
| `customersServedToday` | number | 今日已服务顾客数 |
| `narrativeCustomersServedToday` | number | 今日已服务故事顾客数 |
| `maxCustomersPerDay` | number | 每日顾客上限 |
| `expiryQueue` | ExpiryEvent[] | 待处理的到期事件队列 |
| `lastSatisfaction` | SatisfactionLevel | 上次交易的满意度 |
| `pendingAppointedCandidates` | AppointmentCandidate[] | 明日预约顾客队列 |

### 夜间状态字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `nightState.energy` | number | 当前夜间能量 |
| `nightState.maxEnergy` | number | 最大夜间能量 |
| `nightState.actionsThisNight` | string[] | 今晚执行的操作 |
| `essenceBalance` | EssenceBalance | 精华余额 |

### 预约系统字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `appointmentBoard.candidates` | AppointmentCandidate[] | 可选候选人列表 |
| `appointmentBoard.selectedIds` | string[] | 已选候选人 ID |
| `appointmentBoard.preference` | string | 顾客偏好设置 |

### 黑市系统字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `blackmarket.heat` | number | 当前热度 (0-100) |
| `blackmarket.isLocked` | boolean | 是否被锁定 |
| `blackmarket.daily` | BlackmarketDailyState | 每日交易状态 |

### EventChainState 变量

| 变量 | 说明 |
|------|------|
| `funds` | NPC 当前资金 |
| `hope` | NPC 希望值 (影响到期行为) |
| `stage` | 故事阶段 |
| `isActive` | 链是否活跃 |

---

## 新系统概述

### 预约系统 (Appointment System)

**流程**:
1. 夜间打开预约板，查看候选顾客
2. 选择想要接待的顾客
3. 夜间结算时，选中的顾客进入 `pendingAppointedCandidates`
4. 第二天 `generateDailyEvent` 优先处理预约顾客

**代码位置**: `store/reducers/appointmentReducer.ts`

### 黑市系统 (Black Market System)

**功能**:
- 出售物品获取现金（价格取决于黑道声望）
- 购买特定标签的物品（每日刷新）
- 热度管理（高热度触发风险事件）

**每日刷新**:
- 购买需求：1-2 个随机标签，价格倍率 1.10-1.40
- 出售倍率：0.60-0.85

**代码位置**: `systems/blackmarket/blackmarketService.ts`

### 填充顾客系统 (Filler Customer System)

**目的**: 当没有故事事件时，生成随机顾客填充每日名额

**特点**:
- 使用通用头像
- 创建 TRANSIENT 链追踪到期行为
- 不触发叙事事件
- 受 `maxCustomersPerDay - narrativeServed` 限制

**代码位置**: `systems/npc/fillerGenerator.ts`

---

## 常见问题排查

### 问题: 界面卡住/一闪而过

**可能原因**:
1. 状态转换时 `currentCustomer` 未清除
2. 自动超时跳过了用户交互
3. useEffect 循环触发

**检查点**:
- `START_DAY` 是否清除 `currentCustomer`
- 是否有未预期的 `setTimeout` 自动跳转
- `generateDailyEvent` 是否正确标记 `MARK_NO_MORE_CUSTOMERS`

### 问题: 到期事件未触发

**检查点**:
1. `pawnInfo.dueDate` 是否等于 `currentDay`
2. NPC 的 `funds` 和 `hope` 值
3. `expiryFlows` 是否正确配置

### 问题: 直接跳到晚上

**检查点**:
1. `generateDailyEvent` 是否在找不到事件时调用了 `START_NIGHT`
2. 应该调用 `MARK_NO_MORE_CUSTOMERS` 让玩家点击"打烊"

### 问题: 预约顾客未出现

**检查点**:
1. 是否在夜间选择了顾客
2. `PREPARE_DAILY_APPOINTMENTS` 是否正确执行
3. `pendingAppointedCandidates` 是否有内容

### 问题: 黑市被锁定

**检查点**:
1. 热度是否过高触发了风险事件
2. 锁定天数是否已过期
3. `BLACKMARKET_REFRESH_DAILY` 是否在 `startNewDay` 中执行

---

## 版本历史

- **2026-02-04**: 更新打烊和夜间循环流程以匹配状态机实现
  - handleStartNight() 现在发送 CUSTOMER_GENERATED(false) + CLOSE_SHOP 事件
  - performNightCycle() 发送 NIGHT_CYCLE_DONE，App.tsx 自动发送 EVALUATION_DONE

- **2026-02-04**: 精简文档，移除与 STATE_MACHINE.md 重复的内容

- **2026-02-03**: 全面更新文档
  - 添加预约系统流程说明
  - 添加黑市系统流程说明
  - 添加填充顾客系统说明
  - 更新 `startNewDay()` 流程（维护费用、黑市刷新、BREACH_DISCOVERED）
  - 更新 `performNightCycle()` 流程（预约准备、黑市日结算）
  - 更新 `generateDailyEvent()` 流程（预约顾客、叙事顾客追踪、填充顾客）
  - 添加新状态变量说明（夜间状态、预约系统、黑市系统）
  - 添加夜间活动列表

- **2026-01-28**: 修复到期结算后游戏卡住的问题
  - 移除 `handleExpiryCompletion` 中的自动超时
  - `DepartureView` 检查并处理剩余到期事件
  - `generateDailyEvent` 不再自动进入夜间，改为标记无更多顾客

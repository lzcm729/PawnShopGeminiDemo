# 艾玛（Emma）故事线改进计划

> 初始版本：2026-01-26
> 最后更新：2026-01-27 (v2 - 增加 Validator 发现的结构性问题)
> 核心问题：(1) 男友作为隐性压力源的碎片分布需优化 (2) 关键路径存在感知黑洞
> 状态：待实施

---

## 设计意图记录（核心）

### 男友角色定位

**设计目标**：男友是一条**隐藏的叙事线索**，不是直接展示的剧情。

**叙事策略**：碎片化叙事（Fragmented Storytelling）
- 玩家需要主动收集、关联信息碎片
- **"认真的玩家"** 能够拼凑出真相："艾玛的困境不仅是失业，还有一段精神控制关系"
- **"匆忙的玩家"** 只会看到表面：一个失业女性的挣扎故事（这也是一个完整的故事）

**参考**：类似《黑暗之魂》的物品描述叙事、《艾迪芬奇的记忆》的多层次解读

### 碎片设计原则

1. **渐进暴露**：早期碎片模糊（可正可负），中期碎片带有轻微不适感，后期碎片明确负面
2. **多渠道分布**：不仅在邮件中，也在对话、description、fateHints 中
3. **保持模糊性**：避免直接说"他在精神控制我"，而是通过艾玛的行为、语言让玩家自己得出结论
4. **内化表现**：后期艾玛开始用男友的语言评价自己，这是PUA最典型的特征

### 叙事层次

```
表层：艾玛在经济困境中挣扎，找工作不顺利
中层：她有一个"他"，这个人的态度似乎在变化
深层：这个人一直在精神施压，艾玛的自我价值感被逐渐摧毁
      （玩家需要拼图才能看到这一层）
```

---

## 一、玩家感知分析

### 1.1 感知机制盘点

| 机制 | 使用情况 | 评价 |
|------|----------|------|
| `description` | 每阶段有变化（精致→疲惫→凌乱→枯槁） | 良好 |
| `fateHints` | 丰富的条件提示（hope/funds/job_chance/interview_failures） | 优秀 |
| `greeting/pawnReason` | 使用 DialogueVariant[] | 良好 |
| `exitDialogues` | 使用条件变体 | 良好 |
| 邮件系统 | 有丰富邮件，碎片分布需优化 | 需改进 |

### 1.2 现有碎片时间线

| 阶段 | 渠道 | 碎片内容 | 信号强度 |
|------|------|----------|----------|
| Stage 0 | pawnReason | "他说让我放轻松" | 正面 |
| Stage 0 | mail_01_charity | "他松了口气说'天无绝人之路'" | 中性 |
| Stage 0 | mail_01_shark | "他叹了口气没说话" | 微弱负面 |
| Stage 0 | mail_stage1_hopeful | "他说让我专心准备，家务他来做" | 正面 |
| Stage 0 | mail_stage1_anxious | "他翻了一下我的手机，说'你是不是偷偷买咖啡了'" | **控制行为** |
| Stage 1 | pawnReason (hope<50) | "他说我得自己想办法" | 推卸责任 |
| Stage 1 | mail_02_charity | "他数了数说'勉强够吧'" | 冷淡 |
| Stage 1 | mail_02_shark | "他说'就这么点？你那破瓶子不是挺贵的吗'" | **指责** |
| Stage 1 | mail_stage2_struggling | "他说'你能不能振作点，我每天回来看你这张脸也很累'" | **情感控制** |
| Stage 2 | pawnReason | "昨晚给他打了几个电话，都没接" | 冷暴力 |
| Stage 2 | exitDialogues (hope<25) | "也许他说得对，我就是个拖累" | **内化贬低** |
| Stage 2 | mail_03_charity | "他只是'哦'了一声就继续玩手机" | 冷漠 |
| Stage 2 | mail_03_shark | "他说'你连台破电脑都卖不出好价钱'" | **直接贬低** |
| Stage 3 | mail_stage3_waiting | "那种沉默比骂我还难受" | 冷暴力 |
| Stage 3 | mail_stage3_nervous | "他在收拾行李...说'出差'。可是他从来没出过差" | **预示离开** |
| Stage 3 | mail_stage3_desperate | "他说'你管那么多干嘛，先把自己的事搞定'" | 转移责任 |
| Stage 4 | mail_coming_for_ring | "他说受够了'和一个只会拖后腿的人在一起'" | **PUA语言爆发** |
| Stage 4 | pawnReason | "他说这不值钱。也许他说得对。我也不值什么钱" | **完全内化** |

### 1.3 分布问题诊断

**优点**：
- 整体递进设计出色：正面→模糊→冷淡→指责→控制→内化
- 后期碎片质量高，PUA特征明显
- 邮件系统利用充分

**问题**：

| 问题 | 描述 | 严重性 |
|------|------|--------|
| **早期信号过于微弱** | Stage 0 只有 mail_stage1_anxious 有明确控制信号，且只在 shark 路径触发 | 中 |
| **对话层碎片不足** | 大部分碎片集中在邮件，对话里的碎片较少 | 中 |
| **关键碎片条件苛刻** | exitDialogues 里的内化表现需要 hope < 25 才触发 | 中 |
| **charity 路径碎片较少** | 善待玩家可能完全错过男友的负面信号 | 低 |

---

## 二、改进方案（2026-01-27 更新）

### 2.1 原则：增加碎片，不增加直白度

改进目标不是让男友形象更直白，而是：
1. **早期增加模糊信号**：让"翻手机"不是唯一的早期控制信号
2. **对话层补充碎片**：让不读邮件的玩家也能捕捉到一些暗示
3. **放宽关键碎片触发条件**：让更多玩家能看到内化表现

### 2.2 具体修改

#### A. Stage 0 增加一个模糊信号（对话层）

**修改 exitDialogues.neutral**：

```typescript
// 原版
neutral: "回见。帮我保管好它。",

// 修改版
neutral: "回见。帮我保管好它。——啊，得赶紧回去了，他不喜欢我在外面待太久。",
```

**设计意图**：
- 表面看是"体贴的男友在等她"
- 细想：为什么"不喜欢她在外面待太久"？这是控制的早期信号
- 模糊度：高（可正可负解读）

#### B. Stage 1 greeting 增加碎片（对话层）

**修改 greeting**：

```typescript
// 原版
greeting: [
    { condition: { variable: "hope", operator: "<", value: 50 }, text: "老板... 没想到这么快又见面了。（声音低沉）" },
    { condition: { variable: "hope", operator: ">=", value: 50 }, text: "老板！又见面了。只是暂时周转一下。" },
    { text: "老板，又见面了。" }
],

// 修改版
greeting: [
    { condition: { variable: "hope", operator: "<", value: 50 }, text: "老板... 没想到这么快又见面了。（声音低沉）" },
    { condition: { variable: "hope", operator: ">=", value: 50 }, text: "老板！又见面了。只是暂时周转一下。" },
    { condition: { variable: "hope", operator: "<", value: 60 }, text: "老板，又见面了。（她下意识看了眼手机）他问我几点回去..." },
    { text: "老板，又见面了。" }
],
```

**设计意图**：
- "他问我几点回去"——控制行为的暗示
- 放在括号动作里，保持模糊

#### C. 放宽内化表现的触发条件

**修改 emma_03_laptop.exitDialogues**：

```typescript
// 原版
resentful: [
    { condition: { variable: "hope", operator: "<", value: 25 }, text: "[眼神空洞] 也许... 他说得对，我就是个拖累。" },
    { text: "..." }
],

// 修改版
resentful: [
    { condition: { variable: "hope", operator: "<", value: 25 }, text: "[眼神空洞] 也许... 他说得对，我就是个拖累。什么都做不好。" },
    { condition: { variable: "hope", operator: "<", value: 40 }, text: "[低声] 他总说我太敏感... 也许真的是我想太多了。" },
    { text: "..." }
],
```

**设计意图**：
- hope < 40 时展示"他总说我太敏感"——典型的 gaslighting 语言
- 玩家更容易触发，但表述仍然模糊

#### D. charity 路径增加一个碎片

**修改 mail_emma_02_charity**：

```typescript
// 原版
body: `老板，\n\n谢谢你又帮了我一把。这周的房租有着落了。\n\n我把钱交给他，他数了数说"勉强够吧"。\n\n面试还在继续，我不会放弃的。\n\n艾玛`,

// 修改版
body: `老板，\n\n谢谢你又帮了我一把。这周的房租有着落了。\n\n我把钱交给他，他数了数说"勉强够吧"。然后问我"你今天出门化妆了？给谁看？"\n\n我说是去当铺... 他就不说话了。\n\n面试还在继续，我不会放弃的。\n\n艾玛`,
```

**设计意图**：
- "给谁看？"——控制欲、嫉妒心的暗示
- 放在善待路径，让善待玩家也能捕捉到信号
- 艾玛没有评价这句话，保持叙述者的"不自知"

---

## 三、更新后的碎片分布图

```
Stage 0 (衣服)
├─ 对话: "他不喜欢我在外面待太久" [新增，模糊]
├─ 邮件(charity): "他松了口气" [正面]
├─ 邮件(shark): "他叹了口气没说话" [微弱负面]
├─ 邮件(hopeful): "他说让我专心准备" [正面]
└─ 邮件(anxious): "他翻了一下我的手机" [控制行为]

Stage 1 (护肤品)
├─ 对话: "他问我几点回去" [新增，模糊]
├─ 邮件(charity): "他说'勉强够吧'...然后问'给谁看？'" [新增，控制]
├─ 邮件(shark): "他说'就这么点？'" [指责]
└─ 邮件(struggling): "他说'你能不能振作点'" [情感控制]

Stage 2 (电脑)
├─ 对话: "昨晚给他打了几个电话，都没接" [冷暴力]
├─ 对话(hope<40): "他总说我太敏感..." [新增，gaslighting]
├─ 对话(hope<25): "他说得对，我就是个拖累" [内化]
├─ 邮件(charity): "他只是'哦'了一声" [冷漠]
└─ 邮件(shark): "他说'你连破电脑都卖不出好价钱'" [贬低]

Stage 3 (等待期)
├─ 邮件(waiting): "那种沉默比骂我还难受" [冷暴力]
├─ 邮件(nervous): "他在收拾行李...从来没出过差" [预示离开]
└─ 邮件(desperate): "他说'你管那么多干嘛'" [转移责任]

Stage 4 (崩溃)
├─ 邮件(coming_for_ring): "他说'只会拖后腿的人'" [PUA爆发]
├─ 邮件(boyfriend_left): "字条说'你好自为之吧'" [离开]
└─ 对话: "他说这不值钱。也许他说得对。我也不值什么钱" [完全内化]
```

---

## 四、新增/修改内容清单

### 4.1 对话修改（2026-01-27 新增）

| 事件ID | 位置 | 原内容 | 新内容 | 目的 |
|--------|------|--------|--------|------|
| emma_01_clothes | exitDialogues.neutral | "回见。帮我保管好它。" | "回见。帮我保管好它。——啊，得赶紧回去了，他不喜欢我在外面待太久。" | 早期模糊控制信号 |
| emma_02_skincare | greeting (新增变体) | - | "老板，又见面了。（她下意识看了眼手机）他问我几点回去..." | 对话层碎片 |
| emma_03_laptop | exitDialogues.resentful (新增变体) | - | { hope < 40 } "他总说我太敏感... 也许真的是我想太多了。" | 放宽内化触发条件 |

### 4.2 邮件模板修改

| 邮件ID | 修改要点 |
|--------|----------|
| `mail_emma_01_charity` | 男友"哦了一声继续玩手机"的冷淡 |
| `mail_emma_01_shark` | "他叹了口气没说话"的失望 |
| `mail_emma_02_charity` | **新增"给谁看？"** — 善待路径增加控制信号 |
| `mail_emma_stage1_anxious` | "他翻了我手机" — 控制行为首次出现 |
| `mail_emma_02_shark` | "就这么点？你那破瓶子不是挺贵的吗" — 否定 |
| `mail_emma_stage2_struggling` | "你能不能振作点"、"让我自己解决午饭" — 情感忽视 |
| `mail_emma_03_charity` | "哦了一声就继续玩手机" — 冷漠 |
| `mail_emma_03_shark` | "你连台破电脑都卖不出好价钱" — 直接贬低 |
| `mail_emma_stage3_desperate` | "他很晚回家不说话"、"你先把自己的事搞定" — 冷暴力 |
| `mail_emma_interview_failed_once` | "意料之中" — 否定期待 |
| `mail_emma_interview_failed_twice` | "你看你现在这样，谁敢要你？" — 核心否定 |
| `mail_emma_interview_failed_3x` | "也许所有人都对，只有我自己是错的" — 完全内化 |
| `mail_emma_coming_for_ring` | 摊牌对话揭示本质 |
| `mail_emma_boyfriend_left` | "我一直都是错的那个人" — 悲剧性的自我认知 |

### 4.3 fateHints 补充

```typescript
// 自我否定的身体语言
{
    condition: { variable: 'hope', operator: '<=', value: 30 },
    priority: 9,
    hints: [
        '（她说话时总是下意识看向地面，好像在躲避什么）',
        '（每说完一句话都要停顿一下，像是在确认自己有没有说错）',
        '（她的肩膀微微向内缩，整个人看起来比上次更小了）'
    ]
},

// 压力的外在表现
{
    condition: { variable: 'hope', operator: '<=', value: 40 },
    priority: 7,
    hints: [
        '（她的指甲缝有咬过的痕迹，边缘参差不齐）',
        '（她不时看一眼手机，又马上把它塞回口袋）',
        '（她的笑容持续不到一秒就消失了）'
    ]
}
```

### 4.4 物品 hiddenTraits 修改

| 物品 | 暗示内容 |
|------|----------|
| 护肤品 historySnippet | "你先垫一下，回头给你"的故事 |
| 手表刻字 | "Forever被刮花了" |

---

## 五、验证清单

### 5.1 隐藏线索可发现性

- [ ] **"认真的玩家"**：能否通过碎片拼凑出"艾玛被精神控制"的隐藏真相？
- [ ] **"匆忙的玩家"**：即使错过部分碎片，表面故事是否仍然完整？
- [ ] **早期信号**：Stage 0-1 是否有足够的模糊信号？
- [ ] **内化表现**：玩家是否能注意到艾玛后期用男友的语言评价自己？
- [ ] **发现满足感**：当玩家拼凑出真相时，是否有"原来如此"的满足感？
- [ ] **模糊度**：碎片是否保持足够模糊，避免直接告诉玩家答案？

### 5.2 首次游玩（表层感知）

- [ ] 玩家知道艾玛有一个同居男友吗？ → 应该知道
- [ ] 玩家觉得这段关系"正常"吗？ → 可能觉得只是经济压力下的普通争吵
- [ ] 玩家能预测男友会离开吗？ → 可能注意到一些信号，但不确定

### 5.3 坏结局后回顾（深层感知）

- [ ] 玩家能列出男友的控制行为吗？
  - 翻手机检查消费
  - 经济控制（"你自己想办法"）
  - 情感否定（"看你这张脸我也累"）
  - 冷暴力（"沉默比骂我还难受"）

- [ ] 玩家能识别艾玛的语言模式吗？
  - "也许他说得对"
  - "我什么都做不好"
  - "也许是我的问题"

- [ ] 玩家会说"原来他一直在伤害她"吗？ → 设计目标

---

## 六、不建议修改的部分

以下部分当前设计已经很好：

- **后期碎片**（Stage 3-4）：PUA特征已经足够明显
- **fateHints**：当前的视觉暗示系统很好地反映 hope 值
- **物品递进**：衣服→护肤品→电脑→手表 的递进设计出色
- **结局邮件**：好/坏结局邮件的情感冲击力已经足够

---

## 七、实施优先级

### 第一阶段：对话层碎片补充（2026-01-27 新增内容）
1. 修改 emma_01_clothes.exitDialogues.neutral
2. 修改 emma_02_skincare.greeting 增加变体
3. 修改 emma_03_laptop.exitDialogues.resentful 增加变体

### 第二阶段：邮件碎片优化
1. 修改 mail_emma_02_charity 增加"给谁看？"
2. 检查其他邮件是否需要调整

### 第三阶段：物品与 fateHints
1. 补充 fateHints（身体语言暗示）
2. 护肤品 historySnippet 修改
3. 手表 hiddenTraits 修改

---

## 八、设计反思

这个暗示系统的核心在于**让玩家自己发现真相**。

不是告诉玩家"艾玛的男友在精神虐待她"，而是让玩家在回顾时意识到：
- 为什么她总说"也许他说得对"？
- 为什么她的自信在一步步消失？
- 为什么她觉得自己"什么都做不好"？

当玩家把所有线索拼在一起，意识到"原来他一直在伤害她"的时候——那个瞬间的冲击，比任何直接的叙述都更有力量。

这也符合 Rouse 提到的"玩家的故事比设计师的故事更重要"——让玩家自己成为真相的发现者，而不是被动的接收者。

---

*此改进计划采用"隐性叙事"策略，通过细节暗示而非直接陈述，让玩家在拼图中发现艾玛崩溃的深层原因。*

---

## 九、Validator 发现的结构性问题 (2026-01-27 新增)

以下问题来自 `/story-validator emma` 的自动化检查，需要补充到改进计划中。

### 9.1 Critical Issues

#### Issue A: 事件2/3触发条件可能永远不满足

**问题**：
- `emma_02_skincare` 触发条件: `funds ≤ 200`
- `emma_03_laptop` 触发条件: `funds < 100`
- 艾玛初始 funds = 500，每日消耗 -50
- 如果玩家 charity (给 ¥1000)：funds = 1500 → 需要 26 天才能触发事件2

**影响**：慷慨路径下故事可能卡在 Stage 1 长达数周

**修复方案**：添加时间备用触发条件

```typescript
// 在 simulationRules 中添加
{
  type: 'THRESHOLD',
  condition: { variable: 'stage', operator: '==', value: 1 },
  targetVar: 'days_in_current_stage', // 需要引擎支持此变量
  operator: '>=',
  value: 5,
  onTrigger: [
    { type: 'MOD_VAR', target: 'funds', value: 150, op: 'SET' } // 强制满足触发条件
  ],
  triggerLog: "艾玛的积蓄耗尽了"
}
```

**备选方案**（如引擎不支持 days_in_current_stage）：
- 修改触发条件为 `funds ≤ 500` 或直接用 `stage == 1 && visited_count >= 5`

---

#### Issue B: emma_02/03 缺少 expiryFlows

**问题**：只有 `emma_01_clothes` 定义了到期处理，面霜和笔记本到期时没有反馈

**影响**：特别是笔记本被卖掉时，艾玛应该有强烈反应

**修复方案**：

**emma_02_skincare.expiryFlows:**
```typescript
expiryFlows: {
  renewal: {
    accept: [
      { type: "MODIFY_VAR", variable: "hope", value: 10 }
    ],
    refuse: [
      { type: "MODIFY_VAR", variable: "hope", value: -15 }
    ]
  },
  noShow: {
    sell: [
      { type: "MODIFY_VAR", variable: "hope", value: -20 }
      // 面霜不是核心物品，影响较小
    ],
    keep: []
  }
}
```

**emma_03_laptop.expiryFlows:**
```typescript
expiryFlows: {
  renewal: {
    accept: [
      { type: "MODIFY_VAR", variable: "hope", value: 15 },
      { type: "SCHEDULE_MAIL", templateId: "mail_emma_laptop_renewal_thanks", delayDays: 0 }
    ],
    refuse: [
      { type: "MODIFY_VAR", variable: "hope", value: -30 },
      { type: "SCHEDULE_MAIL", templateId: "mail_emma_laptop_renewal_refused", delayDays: 0 }
    ]
  },
  noShow: {
    sell: [
      { type: "MODIFY_VAR", variable: "hope", value: -60 }, // 致命打击
      { type: "SET_STAGE", value: 4 }, // 直接进入崩溃路径
      { type: "SCHEDULE_MAIL", templateId: "mail_emma_laptop_sold", delayDays: 0 }
    ],
    keep: [
      { type: "SCHEDULE_MAIL", templateId: "mail_emma_laptop_plea", delayDays: 0 }
    ]
  }
}
```

**新增邮件模板:**

| ID | 发送者 | 主题 | 触发时机 |
|----|--------|------|----------|
| mail_emma_laptop_sold | 艾玛 | 你怎么能...！ | laptop 到期 noShow.sell |
| mail_emma_laptop_plea | 艾玛 | 千万别卖电脑 | laptop 到期 noShow.keep |
| mail_emma_laptop_renewal_thanks | 艾玛 | 谢谢你等我 | laptop 续当 accept |
| mail_emma_laptop_renewal_refused | 艾玛 | 我理解... | laptop 续当 refuse |

---

### 9.2 Warnings

#### Warning A: onReject 路径缺少邮件反馈

**问题**：所有事件的 onReject 只有变量修改，没有邮件

**修复方案**：

**emma_01_clothes.onReject:**
```typescript
onReject: [
  { type: "SET_STAGE", value: 1 },
  { type: "MODIFY_VAR", variable: "hope", value: 40 },
  { type: "SCHEDULE_MAIL", templateId: "mail_emma_01_rejected", delayDays: 0 }
]
```

**emma_03_laptop.onReject (致命):**
```typescript
onReject: [
  { type: "SET_STAGE", value: 4 }, // 直接崩溃，她没有电脑就完了
  { type: "MODIFY_VAR", variable: "hope", value: 10 },
  { type: "MODIFY_VAR", variable: "has_laptop", value: 1 },
  { type: "SCHEDULE_MAIL", templateId: "mail_emma_laptop_rejected", delayDays: 0 }
]
```

**新增邮件模板:**

| ID | 内容要点 |
|----|----------|
| mail_emma_01_rejected | "我去了别家，他们给的更少...也许我不该那么骄傲" |
| mail_emma_laptop_rejected | "没有电脑我做不了面试作业，我完了..." |

---

#### Warning B: 邮件触发可能重叠

**问题**：
- `hope ≤ 15` → mail_emma_coming_for_ring
- `hope < 10` → mail_emma_boyfriend_left

如果 hope 从 16 直接跌到 8，两封邮件同时触发

**修复方案**：添加互斥条件

```typescript
// hope ≤ 15 规则修改
{
  type: 'THRESHOLD',
  condition: { variable: 'hope', operator: '>=', value: 10 }, // 添加：hope 还没到崩溃点
  targetVar: 'hope',
  operator: '<=',
  value: 15,
  onTrigger: [
    { type: 'SCHEDULE_MAIL', templateId: 'mail_emma_coming_for_ring', delayDays: 0 }
  ],
  triggerOnce: true
}
```

---

#### Warning C: mail_emma_redeem_failed 未被使用

**问题**：这封邮件定义了但从未被调度

**修复方案**：用于 REDEMPTION_CHECK 失败场景

```typescript
// emma_05_redemption.onFailure
onFailure: [
  { type: "MODIFY_VAR", variable: "hope", value: -10 },
  { type: "SCHEDULE_MAIL", templateId: "mail_emma_redeem_failed", delayDays: 0 }
]
```

---

### 9.3 新增邮件内容设计

#### mail_emma_01_rejected
```
老板，

我带着衣服去了别家。

那家给的更少。老板娘上下打量我，说"这种衣服现在不好卖"。

我最后还是当了。比你开的价低 30%。

也许... 我不该那么骄傲。

艾玛
```

#### mail_emma_laptop_rejected
```
老板，

你不收我的电脑，我理解。也许它真的不值什么钱。

可是没有它，我做不了面试作业。
下周一就是截止日期了。

我想过去网吧，但网吧的电脑没有我需要的软件。
我想过借，但我不知道还能向谁开口。

也许这就是命吧。

艾玛
```

#### mail_emma_laptop_sold
```
你卖了我的电脑？！

里面有我所有的作品集！有我三年的心血！
我说过千万别动里面的文件！

我求过你的... 我求过你的...

你和其他人没什么两样。这个世界从来就不会帮我。
```

#### mail_emma_laptop_plea
```
老板，

我算了一下，电脑的典当期快到了。

我知道我还没凑够赎金。面试结果还没出来。

但求你千万别把它卖掉。我的作品集还在里面。那是我唯一的机会了。

再等我几天。求你了。

艾玛
```

#### mail_emma_laptop_renewal_thanks
```
老板，

谢谢你同意续当。

我知道按规矩你不该等我，但你还是愿意帮我。

电脑对我真的很重要。我会努力的。

艾玛
```

#### mail_emma_laptop_renewal_refused
```
老板，

我理解你的决定。毕竟这是生意。

只是... 那台电脑里有我所有的东西。

也许这就是我的命。

艾玛
```

---

## 十、完整实施清单（整合版）

### Phase 1: 叙事碎片优化（原计划 Section II-VII）

| 序号 | 修改项 | 优先级 |
|------|--------|--------|
| 1.1 | emma_01 exitDialogues.neutral 添加"他不喜欢我在外面待太久" | P1 |
| 1.2 | emma_02 greeting 添加变体"他问我几点回去" | P1 |
| 1.3 | emma_03 exitDialogues.resentful 添加 hope<40 变体 | P1 |
| 1.4 | mail_emma_02_charity 添加"给谁看？" | P1 |
| 1.5 | fateHints 补充身体语言暗示 | P2 |

### Phase 2: 结构性问题修复（新增 Section IX）

| 序号 | 修改项 | 优先级 |
|------|--------|--------|
| 2.1 | 添加时间备用触发条件 | P0 |
| 2.2 | emma_02 添加 expiryFlows | P1 |
| 2.3 | emma_03 添加 expiryFlows（含致命 noShow.sell） | P0 |
| 2.4 | emma_01/02/03 onReject 添加邮件 | P1 |
| 2.5 | 修复邮件触发互斥条件 | P1 |
| 2.6 | emma_05 onFailure 使用 mail_emma_redeem_failed | P2 |

### Phase 3: 新增邮件模板

| ID | 优先级 |
|----|--------|
| mail_emma_01_rejected | P1 |
| mail_emma_laptop_rejected | P0 |
| mail_emma_laptop_sold | P0 |
| mail_emma_laptop_plea | P1 |
| mail_emma_laptop_renewal_thanks | P2 |
| mail_emma_laptop_renewal_refused | P2 |

---

## 十一、验证清单（整合版）

### 叙事感知验证
- [ ] Stage 0-1 有足够的男友模糊信号
- [ ] 玩家能在回顾时拼凑出"精神控制"真相
- [ ] 内化表现在 hope < 40 时可见

### 结构完整性验证
- [ ] 全程 charity 路径下，事件2 在 Day 7 前触发
- [ ] 笔记本到期被卖 → 收到愤怒邮件 + 进入崩溃路径
- [ ] reject 路径有完整的邮件反馈
- [ ] 邮件不会在同一天重叠触发

### 路径可达性验证
- [ ] 好结局路径可走通
- [ ] 崩溃路径可走通
- [ ] reject 路径有意义的结局
- [ ] 到期 core_lost 路径可走通

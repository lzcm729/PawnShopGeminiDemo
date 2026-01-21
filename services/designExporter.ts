
export const generateDesignBible = (): string => {
    const timestamp = new Date().toISOString().split('T')[0];
    
    return `# The Pawn's Dilemma - Game Design Document (GDD)
**Generated Date:** ${timestamp}
**Version:** 4.0 (Master Design Spec)

---

## 1. 游戏概念概要 (Game Concept)

### 1.1 核心陈述 (High Concept)
《The Pawn's Dilemma》是一款**叙事驱动的典当行经营模拟游戏**。玩家扮演一名处于社会灰色地带的当铺老板，在赛博黑色电影（Cyber-Noir）的氛围中，通过鉴定物品、压价谈判和资金管理来维持店铺生存，同时不得不面对每一个客户背后的道德困境。

### 1.2 类型 (Genre)
- **经营模拟 (Tycoon/Simulation)**: 资金流管理、库存流转、租金压力。
- **叙事角色扮演 (Narrative RPG)**: 基于对话的选择、多结局分支、角色命运干预。
- **解谜 (Puzzle)**: 物品鉴定与信息博弈。

### 1.3 目标受众 (Target Audience)
- 喜欢《Papers, Please》、《This War of Mine》等注重道德抉择的玩家。
- 喜爱复古未来主义、黑色电影美学的视觉小说爱好者。
- 享受低买高卖、市场博弈的模拟经营玩家。

---

## 2. 核心设计理念 (Core Philosophy)

### 2.1 核心冲突：生存 vs 良心 (Survival vs. Conscience)
游戏不设绝对的善恶条，只提供残酷的二选一：
- **生存 (Survival)**: 压榨绝望的客户以获取高额利润，支付租金，升级店铺。
- **良心 (Conscience)**: 提供公平的交易帮助邻里度过难关，但这也意味着你可能无法支付下周的房租。
*设计格言: "Gold has a price. Conscience costs extra."*

### 2.2 价值的三重性 (The Trinity of Value)
在本作中，物品的价值不再是单一数字，而是被拆解为三个维度：
1.  **真实价值 (Real Market Value)**: 物品在客观市场上的绝对价值（玩家不可见，需鉴定逼近）。
2.  **感知价值/估值 (Perceived/Contract Value)**: 双方谈判达成的共识，也是合同上的死当价格。
3.  **情感价值 (Sentimental Value)**: 物品对客户的意义。这往往是压价的杠杆，也是道德折磨的来源。

### 2.3 赛博黑色美学 (Cyber-Noir Aesthetic)
- **视觉**: 高对比度、雨夜、霓虹灯、CRT显示器扫描线、复古终端机界面与现代扁平设计的结合。
- **听觉**: 持续的低频环境音（雨声、风扇声、远处警笛）、合成器爵士乐。

---

## 3. 游戏机制 (Gameplay Mechanics)

### 3.1 核心循环 (Core Loop)
1.  **Morning Brief**: 查看资金、租金倒计时、接收邮件。
2.  **Trading Phase (主要玩法)**:
    - 接待客户 -> 物品鉴定 -> 发现特征 (Traits) -> 谈判/博弈 -> 成交/拒绝。
3.  **Inventory Management**: 处理库存（赎回、续当、绝当变现）。
4.  **End of Day**: 结算收支、支付房租、处理绝当物品、触发夜间事件。

### 3.2 鉴定系统 (Appraisal System)
- **非对称锚点机制 (Asymmetric Anchor Range)**:
    - 玩家初始只能看到一个模糊的估值范围 (Initial Range)。
    - **Action Points (AP)**: 玩家每日拥有有限的 AP。
    - **Appraise**: 消耗 1 AP，根据物品的 \`uncertainty\` 属性，算法性地缩小估值范围，使其逼近 \`Real Value\`。
- **特征发现 (Trait Discovery)**:
    - 每个物品包含隐藏特征 (Hidden Traits)，分为三类：
        - \`FLAW\` (瑕疵): 用于压价 (Leverage)。
        - \`FAKE\` (伪造): 揭露真相，导致估值崩塌。
        - \`STORY\` (故事): 触发特殊对话，可能解锁隐藏剧情或增加情感负担。

### 3.3 谈判与博弈 (Negotiation & Leverage)
- **情绪系统 (Mood & Patience)**:
    - 客户拥有 \`Patience\` (耐心值)。低报价、过多试探会消耗耐心。
    - 耐心耗尽导致客户愤怒离开 (Walk Away) 或拒绝交易。
- **压价杠杆 (Leverage)**:
    - 玩家利用发现的 \`FLAW\` 特征作为筹码，强行降低客户的心理底价 (Ask Price)。
    - 代价：降低客户好感度，可能导致后续赎回率下降。
- **赎回意愿 (Redemption Resolve)**:
    - 并非所有当品都会被赎回。客户有 Strong/Medium/Weak/None 四档意愿，决定了这笔交易是短期贷款还是变相收购。

### 3.4 经济系统 (Economy)
- **典当 (Pawn)**: 短期借贷，周期7天，利息5%-20%。玩家赚取利息。
- **绝当 (Forfeit)**: 客户违约或拒绝续当，物品归店铺所有。玩家通过 \`Liquidate\` 以真实价值的 80% 快速变现。
- **违约 (Breach)**: 玩家在典当期内私自出售客户物品。若客户回来赎当，玩家需支付 **双倍估值** 的赔偿金，否则导致游戏结束（信誉破产）。

---

## 4. 叙事与声誉系统 (Narrative & Reputation)

### 4.1 声誉矩阵 (3-Axis Reputation)
声誉不是单一数值，而是三个相互制约的维度：
1.  **人情 (Humanity)**: 通过慈善交易、帮助弱者获得。影响：解锁情感类剧情，触发“报恩”事件。
2.  **商业信誉 (Credibility)**: 通过公平交易、遵守合同获得。影响：吸引高价值客户，解锁高级鉴定工具。
3.  **地下关系 (Underworld)**: 通过接收赃物、压榨客户、洗钱获得。影响：降低被抢劫概率，解锁非法交易渠道，但引来警方关注。

### 4.2 事件链引擎 (Event Chain Engine)
NPC 的命运不是随机的，而是基于状态机 (State Machine) 驱动的：
- **Chain Structure**: 每个主要 NPC (如 Emma, Zhao) 拥有独立的变量集 (Funds, Hope, Trust)。
- **Dynamic Outcomes**: 玩家的交易结果 (Deal Quality) 直接修改 NPC 变量。
    - *Example*: 给了 Emma "Charity Deal" -> Emma 资金增加 -> 成功入职 -> 发送感谢邮件。
    - *Example*: 给了 Emma "Shark Deal" -> Emma 资金不足 -> 失去电脑 -> 沦为流浪者 -> 触发报复事件。
- **Mail System**: 邮件不仅是文本，是剧情反馈闭环的重要一环，包含金钱奖励或惩罚。

---

## 5. 技术架构 (Technical Architecture)

### 5.1 数据结构
- **Item**: 包含 \`status\` (ACTIVE, SOLD, REDEEMED, FORFEIT) 状态机，控制物品生命周期。
- **Customer**: 包含 \`interactionType\` (PAWN, REDEEM, NEGOTIATION)，复用同一个 UI 框架处理不同交互逻辑。

### 5.2 核心算法逻辑
- **Valuation Generation**:
    \`\`\`typescript
    // 伪代码逻辑
    Anchor = PerceivedValue ?? RealValue;
    Width = Anchor * Uncertainty;
    Range = [Anchor - SkewLeft, Anchor + SkewRight];
    \`\`\`
- **Redemption Logic**:
    - 每日结算时检查 \`inventory\` 中的 \`pawnInfo.dueDate\`。
    - 过期逻辑：\`ItemStatus.ACTIVE\` -> \`ItemStatus.FORFEIT\`。
    - 赎回逻辑：检查 NPC \`Wallet\` vs \`Principal + Interest\`。

---

## 6. 艺术与UI规范 (Art & UI Specification)

### 6.1 界面布局 (Layout Wireframe)

\`\`\`text
+-----------------------------------------------------------------------+
|  [1] DASHBOARD (HUD) - Status, Reputation, Date                       |
+-----------------------------------+-----------------------------------+
|  [2] LEFT PANEL (Object)          |  [3] RIGHT PANEL (Subject)        |
|                                   |                                   |
|  +-----------------------------+  |  +-----------------------------+  |
|  | [2A] Visuals & Appraisal    |  |  | [3A] Customer Profile      |  |
|  |      - Dynamic Range Bar    |  |  |      - Avatar & Mood       |  |
|  +-----------------------------+  |  +-----------------------------+  |
|  | [2B] Traits Dossier         |  |  |      - Hidden/Revealed      |  |
|  |      - Flaws / Story        |  |  |      - Dialogue Log        |  |
|  +-----------------------------+  |  +-----------------------------+  |
|                                   |  | [3C] Control Deck          |  |
|                                   |  |      - Offer / Rate / Act  |  |
|                                   |  +-----------------------------+  |
+-----------------------------------+-----------------------------------+
\`\`\`

### 6.2 视觉反馈 (Visual Feedback)
- **颜色语义**:
    - \`#d97706\` (Amber): 核心交互、强调。
    - \`#10b981\` (Emerald): 利润、新线索、成功。
    - \`#ef4444\` (Red): 亏损、愤怒、危险、伪造品。
- **CRT 特效**: 邮件界面需应用扫描线 (Scanlines) 和 微弱的发光 (Glow) 效果。
- **动态效果**:
    - 鉴定时的模糊 (Blur) 与聚焦。
    - 客户愤怒时的屏幕震动 (Shake)。
    - 估值条收缩时的平滑过渡 (Bezier Curve)。

---
*End of Game Design Document*
`;
};

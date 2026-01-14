
export const generateDesignBible = (): string => {
    const timestamp = new Date().toISOString().split('T')[0];
    
    return `# The Pawn's Dilemma - Design Bible & Technical Specification
**Generated Date:** ${timestamp}
**Version:** 3.1 (Detailed Layout Spec)

## 1. 核心设计理念 (Core Philosophy)
这款游戏探讨的是"生存压力下的道德抉择"。
- **核心冲突**: 资金(生存) vs 声誉(良心/长远发展)。
- **美学风格**: 赛博黑色电影 (Cyber-Noir)。UI以深色为主，融合了复古终端机(CRT)与现代扁平化设计。
- **情感基调**: 压抑、精致、充满博弈感。

---

## 2. 核心系统架构 (System Architecture)

### 2.1 状态管理 (State Management)
- **GameContext**: 全局单一数据源，使用 React Context + Reducer 模式。
- **GamePhase**: 状态机驱动游戏流程 (START -> MORNING -> TRADING -> NEGOTIATION -> NIGHT)。

### 2.2 叙事引擎 (Narrative Engine: Event Chains)
基于 **EventChain (事件链)** 系统驱动 NPC 行为。
- **Chain**: NPC 状态容器 (Stage, Variables)。
- **Events**: 具体的交互节点，由 Chain 状态触发。

### 2.3 估值与鉴定 (Valuation & Appraisal)
- **Asymmetric Range**: 玩家初始只能看到一个宽泛的估值范围 (Initial Range)。
- **Appraisal Action**: 消耗 AP 缩小范围，逼近真实价值 (Real Value)。
- **Traits System**: 物品包含 Hidden Traits (如：赝品、赃物、故事)，发现它们可以作为谈判筹码 (Leverage)。

---

## 3. UI/UX 布局规范 (Layout Guidelines)

本章节旨在为复刻游戏界面提供精确的视觉与布局指引。

### 3.1 全局视觉框架 (Global Visual Framework)

#### A. 屏幕结构 (Screen Structure / Wireframe)

\`\`\`text
+-----------------------------------------------------------------------+
|  [1] DASHBOARD (Sticky Top, z-50) - Height: auto (approx 64px)        |
+-----------------------------------+-----------------------------------+
|  [2] LEFT PANEL (Item & Intel)    |  [3] RIGHT PANEL (Negotiation)    |
|  Width: 50% (Desktop)             |  Width: 50% (Desktop)             |
|  Background: #1c1917 (Stone-900)  |  Background: #1c1917 (Stone-900)  |
|                                   |                                   |
|  +-----------------------------+  |  +-----------------------------+  |
|  | [2A] Visuals (Top 40%)      |  |  | [3A] Customer Header       |  |
|  |      - Icon, Range Bar      |  |  |      - Avatar, Mood, Intel |  |
|  +-----------------------------+  |  +-----------------------------+  |
|  | [2B] Dossier (Bottom 60%)   |  |  | [3B] Chat Feed (Flex Grow) |  |
|  |      - Traits List          |  |  |      - Scrollable History  |  |
|  |      - Paper Texture BG     |  |  +-----------------------------+  |
|  +-----------------------------+  |  | [3C] Controls (Fixed Bot)  |  |
|                                   |  |      - Rates, Offer Input  |  |
|                                   |  +-----------------------------+  |
+-----------------------------------+-----------------------------------+
\`\`\`

#### B. 配色方案 (Color Palette - Tailwind)
*界面应保持"暗色模式"基调，避免纯白背景。*

- **Canvas (背景)**: \`#121212\` / \`bg-pawn-dark\` (接近纯黑的深灰)
- **Surface (面板)**: \`#1c1917\` / \`bg-stone-900\` (暖色调深灰)
- **Border (分割线)**: \`#44403c\` / \`border-stone-700\` (低对比度)
- **Primary Accent**: \`#d97706\` / \`text-pawn-accent\` (琥珀色 - Amber 600)
    - 用于: 关键按钮, 重点数据, 选中状态。
- **Semantic Colors**:
    - **Money/Gain**: \`#10b981\` (Emerald 500)
    - **Danger/Loss**: \`#ef4444\` (Red 500)
    - **Intel/Story**: \`#3b82f6\` (Blue 500)

#### C. 排版 (Typography)
- **Data / Systems**: \`Courier Prime\` (Monospace). 用于金额、日期、代码、属性。
- **UI / Dialogue**: \`Inter\` (Sans-serif). 用于按钮文本、对话内容、通用标签。

---

### 3.2 详细组件规范 (Component Specs)

#### [1] 仪表盘 (Dashboard)
- **布局**: Flexbox, \`justify-between\`, \`items-center\`.
- **左侧数据**:
    - **日期**: 图标 + "DAY X".
    - **现金**: 绿色背景容器 (\`bg-green-950/30\`) + Emerald 文字.
    - **房租倒计时**: 红色脉冲动画 (当 <= 2天时).
- **右侧工具**:
    - **声誉条**: 三个垂直细条 (Humanity/Credibility/Underworld), hover 显示详细数值 tooltip.
    - **Action Icons**: Mail, Inventory, Debug. 必须有 Tooltip.

#### [2A] 物品视觉区 (Item Visuals)
- **背景**: 深色 (\`#0c0a09\`)，区别于下方的档案区。
- **估值条 (Valuation Bar) - 核心交互**:
    - **容器**: \`relative\`, \`h-4\`, \`bg-stone-900\`.
    - **Ghost Bar (幽灵条)**: 代表初始模糊认知 (Initial Range). 半透明灰色 (\`bg-stone-700/30\`).
    - **Real Bar (实心条)**: 代表当前认知 (Current Range). 绿色 (\`bg-green-900/60\`) 带边框.
    - **动画**: 鉴定成功时，实心条从 Ghost Bar 的宽度平滑收缩到新宽度 (CSS Transition).
    - **标签**: 左右两侧显示 Min/Max 数值 (Monospace).

#### [2B] 物品档案区 (Dossier)
- **背景**: 浅灰色纹理 (\`#e7e5e4\`) + 混合模式 (\`mix-blend-multiply\`) 模拟纸张/档案袋质感。
- **列表项 (Traits)**:
    - **样式**: 卡片式布局, 左侧重边框颜色区分类型 (红=瑕疵, 蓝=故事, 紫=伪造).
    - **交互**: Hover 时显示 "点击压价/对话" 提示. 点击后变灰 (\`opacity-50\`) 并打上 "已使用" 戳记.
    - **未发现特征**: 虚线框 + 问号图标 + 模糊占位符.

#### [3A] 客户头部 (Customer Header)
- **头像**: 圆形, 边框颜色随 Mood 变化 (红=Angry, 绿=Happy).
- **情绪指示器**: 5个火焰图标 (Flame). 愤怒时全红且闪烁.

#### [3B] 对话流 (Chat Feed)
- **容器**: \`flex-1\`, \`overflow-y-auto\`, \`flex-col-reverse\` (或自动滚动到底部).
- **气泡**:
    - **玩家 (右)**: \`bg-amber-950/20\`, \`text-amber-100\`, 棱角分明.
    - **客户 (左)**: \`bg-stone-800\`, \`text-stone-200\`, 圆角.
    - **情绪反馈**: 气泡下方小字显示 (e.g., "-1 Patience").

#### [3C] 控制台 (Control Deck)
- **位置**: 固定在右栏底部, \`z-10\`, 带有上方阴影.
- **利率卡片**: 横向排列, 选中态放大 (\`scale-105\`) 且高亮.
- **出价器**:
    - **Adjusters**: -100, -10, +10, +100 按钮.
    - **Display**: 中间大号数字, 带有 "MATCH" 按钮一键匹配要价.
- **提交按钮**: 占据右下角主要区域, 必须显眼.

---

### 3.3 浮层设计 (Overlay Design)

#### 邮件终端 (Mail Modal)
\`\`\`text
+---------------------------------------+
|  MAIL_CLIENT_V1.0.EXE           [X]   |  <- Retro Terminal Header
+-----------+---------------------------+
| Inbox     |  Message Reader           |
| [ ] Mail1 |  From: Emma               |
| [x] Mail2 |  Subject: Hello           |
|           |                           |
|           |  [ Body Text green ]      |
|           |                           |
|           |  [ATTACHMENT: $500]       |
+-----------+---------------------------+
\`\`\`
- **风格**: CRT 效果 (Scanlines, Monospace font).
- **颜色**: 黑底绿字 (\`text-green-500\`).

#### 库存管理 (Inventory Modal)
- **网格布局**: \`grid-cols-3\`.
- **卡片状态指示**:
    - **Active**: 黄色顶条 (\`bg-yellow-600\`).
    - **Sold**: 灰色/红色条.
    - **Forfeit (绝当)**: 红色顶条.
- **操作栏**: 卡片底部必须包含 "赎回/管理" 按钮.

---
*Generated by The Pawn's Dilemma Debug System*
`;
};

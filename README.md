# The Pawn's Dilemma

## 核心体验总结
这款游戏的核心体验是在破败的柜台后，通过每一次对**当金**（当下风险）与**良心**（长期代价）的艰难博弈，体验在生存压力下坚守或放弃底线的道德挣扎。

## 设计约束确认
我已经完全理解 Design Bible 的核心约束：
1.  **价值三分层**：严格区分当金（Cash Out）、估价（Contract Base）、实际价值（Real Market Value）。
2.  **声誉多维轴**：实现了 人情（Heart）、生意（Business）、灰色（Shadow）三个维度的独立计算与影响。
3.  **道德困境**：游戏循环围绕“生存 vs 良心”构建，Gemini AI 将被用于生成具有情感冲突的故事和物品。

## Architecture
- **State Management**: React Context (`GameContext`) managing Day, Cash, Inventory, and Reputation.
- **AI Integration**: Google Gemini API used to act as the "Dungeon Master", generating unique customers, items, and narrative outcomes based on the current game state and reputation.
- **UI/UX**: Tailwind CSS for a dark, atmospheric "noir" aesthetic. Mobile-first responsive design.

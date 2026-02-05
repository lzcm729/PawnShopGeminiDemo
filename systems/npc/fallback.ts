/**
 * Fallback 客户生成器
 *
 * 当 AI 生成失败时使用的预设客户数据。
 * 物品使用 CSV 模板系统创建。
 */

import { Customer } from "../../types";
import { Item, ItemStatus } from "../items/types";
import { createItemFromTemplate } from "../items/csvLoader";
import { initializeKnowledgePool } from "../items/tagUtils";

// ============================================================================
// 客户预设（使用模板 ID 引用物品）
// ============================================================================

interface FallbackCustomerPreset {
  templateId: string;  // 物品模板 ID（来自 Items_Base.csv）
  customer: Omit<Partial<Customer>, 'item'>;
  itemOverrides?: Partial<Item>;  // 覆盖模板的属性
}

const FALLBACK_PRESETS: FallbackCustomerPreset[] = [
  {
    templateId: 'item_watch_gambler',
    itemOverrides: {
      historySnippet: '这是我赢来的... 以前。',
      archiveSummary: '老张为了赌资典当的手表。',
    },
    customer: {
      name: "老张",
      description: "满脸通红，浑身酒气的中年男人。",
      avatarSeed: "drunk_zhang",
      dialogue: {
        greeting: "老板... 嗝！这表... 跟了我十年了。",
        pawnReason: "今晚的手气太差了，就差一把... 就一把我就能翻本！",
        redemptionPlea: "明天... 明天我就来赎！我发誓！",
        negotiationDynamic: "别磨叽了，快点给钱！",
        accepted: { fair: "行！算你爽快！", fleeced: "切... 趁火打劫是吧？拿来！", premium: "老板你真是活菩萨！" },
        rejected: "不识货！我去隔壁！",
        rejectionLines: { standard: "走了。", angry: "晦气！" },
        exitDialogues: {
          grateful: "这就对了！等我发财了请你喝酒！",
          neutral: "走了。回见。",
          resentful: "什么破地方... 也就是老子今天手气背。",
          desperate: "唉... 这一把一定要赢啊..."
        }
      },
      redemptionResolve: "Weak",
      behaviorTags: ["DESPERATE"],
      patience: 2,
      mood: "Annoyed",
      identityTags: ["HighRisk", "Gambler"],
      desiredAmount: 500,
      minimumAmount: 300,
      survivalMinimum: 210,
      maxRepayment: 600,
    }
  },
  {
    templateId: 'item_console_student',
    itemOverrides: {
      historySnippet: '为了买它我吃了两个月泡面。',
      archiveSummary: '学生的生活费周转。',
      sentimentalValue: true,
    },
    customer: {
      name: "陈学生",
      description: "背着书包，眼神躲闪的大学生。",
      avatarSeed: "student_chen",
      dialogue: {
        greeting: "你好... 请问这里收电子产品吗？",
        pawnReason: "生活费花超了... 不想让家里人知道。",
        redemptionPlea: "下个月兼职工资发了我就来赎，千万别卖了。",
        negotiationDynamic: "这可是上个月刚买的最新款...",
        accepted: { fair: "谢谢老板！救急了。", fleeced: "啊... 这么少？好吧...", premium: "太感谢了！" },
        rejected: "打扰了...",
        rejectionLines: { standard: "那我再去想想办法。", angry: "..." },
        exitDialogues: {
          grateful: "谢谢老板！您真是帮了大忙了！",
          neutral: "谢谢老板。再见。",
          resentful: "这也太黑了... 不过没办法...",
          desperate: "这下完了... 真的完了..."
        }
      },
      redemptionResolve: "Strong",
      behaviorTags: ["SAVVY"],
      patience: 4,
      mood: "Neutral",
      identityTags: ["Student"],
      desiredAmount: 1200,
      minimumAmount: 800,
      survivalMinimum: 560,
      maxRepayment: 1500,
    }
  },
  {
    templateId: 'item_diamond_mystery',
    itemOverrides: {
      historySnippet: '路上... 捡的。',
      archiveSummary: '来源不明的钻石。',
      isStolen: true,
    },
    customer: {
      name: "神秘客",
      description: "戴着墨镜和口罩，看不清面容。",
      avatarSeed: "mystery_guy",
      dialogue: {
        greeting: "收东西吗？不问来源那种。",
        pawnReason: "急需现金，懂的都懂。",
        redemptionPlea: "这东西我不赎了，直接死当。",
        negotiationDynamic: "别废话，一口价。",
        accepted: { fair: "成交。", fleeced: "行吧，算我倒霉。", premium: "爽快。" },
        rejected: "你会后悔的。",
        rejectionLines: { standard: "...", angry: "..." },
        exitDialogues: {
          grateful: "合作愉快。嘴巴严实点。",
          neutral: "两清了。",
          resentful: "啧。算你运气好。",
          desperate: "..."
        }
      },
      redemptionResolve: "None",
      behaviorTags: ["STUBBORN"],
      patience: 1,
      mood: "Neutral",
      identityTags: ["Suspicious"],
      desiredAmount: 2000,
      minimumAmount: 1000,
      survivalMinimum: 700,
      maxRepayment: 0,
    }
  }
];

// ============================================================================
// 公开 API
// ============================================================================

/**
 * 获取一个随机的 fallback 客户
 * @param day 当前游戏天数
 * @param excludeTemplateIds 要排除的物品模板 ID（库存中已有的物品）
 *                           如果所有模板都被排除，则允许重复（降级处理）
 * @returns 完整的客户对象
 */
export const getFallbackCustomer = (day: number, excludeTemplateIds?: Set<string>): Customer => {
  // Filter presets to exclude items already in inventory
  let availablePresets = FALLBACK_PRESETS;
  if (excludeTemplateIds && excludeTemplateIds.size > 0) {
    const filtered = FALLBACK_PRESETS.filter(p => !excludeTemplateIds.has(p.templateId));
    // Only use filtered list if there are options left; otherwise fall back to all presets
    if (filtered.length > 0) {
      availablePresets = filtered;
    }
  }
  const preset = availablePresets[Math.floor(Math.random() * availablePresets.length)];
  return createCustomerFromPreset(preset, day);
};

/**
 * 获取指定索引的 fallback 客户（用于测试）
 */
export const getFallbackCustomerByIndex = (index: number, day: number): Customer => {
  const preset = FALLBACK_PRESETS[index % FALLBACK_PRESETS.length];
  return createCustomerFromPreset(preset, day);
};

/**
 * 获取所有 fallback 客户预设的数量
 */
export const getFallbackCustomerCount = (): number => FALLBACK_PRESETS.length;

// ============================================================================
// 内部函数
// ============================================================================

/**
 * 从预设创建完整的客户对象
 */
function createCustomerFromPreset(preset: FallbackCustomerPreset, day: number): Customer {
  // 从模板创建物品
  let item = createItemFromTemplate(preset.templateId, {
    pawnDate: day,
    status: ItemStatus.ACTIVE,
    ...preset.itemOverrides,
  });

  // 如果模板不存在，使用兜底物品
  if (!item) {
    console.warn(`[fallback] Template not found: ${preset.templateId}, using fallback item`);
    item = createFallbackItem(day);
  }

  // 初始化知识池
  item = initializeKnowledgePool(item);

  return {
    id: crypto.randomUUID(),
    interactionType: 'PAWN',
    ...preset.customer,
    avatarSeed: preset.customer.avatarSeed + "_" + day,
    item,
  } as Customer;
}

/**
 * 创建兜底物品（当模板加载失败时使用）
 */
function createFallbackItem(day: number): Item {
  return {
    id: crypto.randomUUID(),
    name: "未知物品",
    nameDefault: "未知物品",
    nameRestored: "修复的物品",
    nameReforged: "重铸的物品",
    category: "其他",
    condition: "未知",
    visualDescription: "一件来历不明的物品。",
    descDefault: "一件来历不明的物品。",
    historySnippet: "",
    appraisalNote: "",
    archiveSummary: "未知物品",
    isStolen: false,
    isFake: false,
    sentimentalValue: false,
    appraised: false,
    pawnDate: day,
    status: ItemStatus.ACTIVE,
    pawnAmount: 0,
    realValue: 100,
    perceivedValue: 100,
    baseValue: 100,
    uncertainty: 0.3,
    currentRange: [70, 130],
    initialRange: [70, 130],
    hiddenTraits: [],
    revealedTraits: [],
    usedTraitIds: [],
    logs: [],
    tags: [],
    workState: 'DEFAULT',
  };
}

// 保留旧的导出以保持向后兼容
export const FALLBACK_CUSTOMERS = FALLBACK_PRESETS.map(p => p.customer);

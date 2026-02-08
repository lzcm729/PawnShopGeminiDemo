
import { InfoDomain, InfoPrecision } from './informationDomain';

/** Post-transaction information visibility configuration */
export interface PostTransactionInfoRule {
    category: string;           // Information category
    domain: InfoDomain;         // Domain classification
    precision: InfoPrecision;   // Precision level
    description: string;        // Human-readable description
}

/**
 * Post-transaction information three-tier rule table
 *
 * EXACT: Fully visible to player
 * FUZZY: Suggestive expression, requires player inference
 * HIDDEN: Internal system data, never displayed
 */
export const POST_TRANSACTION_INFO_RULES: PostTransactionInfoRule[] = [
    // EXACT -- player can directly perceive
    { category: 'DEAL_RESULT', domain: 'AMOUNT', precision: 'EXACT', description: '成交金额' },
    { category: 'ITEM_FATE', domain: 'PERSON', precision: 'EXACT', description: '物品赎回/过期结果' },

    // FUZZY -- requires inference
    { category: 'NPC_OUTCOME', domain: 'PERSON', precision: 'FUZZY', description: 'NPC后续命运（通过邮件/新闻暗示）' },
    { category: 'REPUTATION_SHIFT', domain: 'RELATIONSHIP', precision: 'FUZZY', description: '声誉变化（通过NPC态度变化感知）' },
    { category: 'MARKET_IMPACT', domain: 'MARKET', precision: 'FUZZY', description: '市场影响（通过新闻趋势感知）' },

    // HIDDEN -- internal system only
    { category: 'EXACT_FLOOR', domain: 'AMOUNT', precision: 'HIDDEN', description: '客户真实底线（永不直接展示）' },
    { category: 'EXACT_DISPOSITION', domain: 'PERSON', precision: 'HIDDEN', description: '客户真实心理类型（洞察可揭示部分）' },
    { category: 'SIMRULE_VARIABLES', domain: 'PERSON', precision: 'HIDDEN', description: 'SimRule内部变量（如hope/health）' },
];

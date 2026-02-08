
/** Information domain -- classifies four categories of information expression */
export type InfoDomain = 'PERSON' | 'RELATIONSHIP' | 'MARKET' | 'AMOUNT';

/** Information precision level */
export type InfoPrecision = 'EXACT' | 'FUZZY' | 'HIDDEN';

/** Domain expression rule */
export interface InfoDomainRule {
    domain: InfoDomain;
    exactForm: string;      // Precise form description
    fuzzyForm: string;      // Fuzzy form description
    hiddenForm: string;     // Hidden form description
}

/** Default domain rules */
export const INFO_DOMAIN_RULES: InfoDomainRule[] = [
    { domain: 'PERSON', exactForm: '姓名+背景', fuzzyForm: '模糊特征描述', hiddenForm: '未知人物' },
    { domain: 'RELATIONSHIP', exactForm: '具体关系', fuzzyForm: '暗示性描述', hiddenForm: '关系不明' },
    { domain: 'MARKET', exactForm: '精确数据', fuzzyForm: '趋势描述', hiddenForm: '行情不明' },
    { domain: 'AMOUNT', exactForm: '精确金额', fuzzyForm: '大概范围', hiddenForm: '金额不明' },
];

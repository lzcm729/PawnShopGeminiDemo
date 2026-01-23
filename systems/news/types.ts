
import { TriggerCondition } from '../narrative/types';

export enum NewsCategory {
  NARRATIVE = 'NARRATIVE', 
  MARKET = 'MARKET',       
  FLAVOR = 'FLAVOR'        
}

export interface MarketModifier {
  categoryTarget?: string; 
  priceMultiplier?: number; 
  riskModifier?: number; 
  actionPointsModifier?: number; 
}

export interface NewsItem {
  id: string;
  headline: string; 
  body: string; 
  category: NewsCategory;
  priority: number; 
  triggers: TriggerCondition[]; 
  effect?: MarketModifier; 
  duration: number; 
  triggerMailId?: string; 
}

export interface ActiveNewsInstance extends NewsItem {
  daysRemaining: number;
}

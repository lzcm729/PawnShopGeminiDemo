import React from 'react';
import { Gift } from 'lucide-react';
import { LowHeatRewardType } from '../../../systems/blackmarket/types';

const LOW_HEAT_REWARD_LABELS: Record<LowHeatRewardType, { label: string; description: string }> = {
  PRICE_BONUS: { label: '收购溢价', description: '联系人很满意，今日收购价 +5%' },
  EXTRA_INTEL: { label: '额外情报', description: '联系人透露了明日的一个收购方向' },
  CONTACT_FAVOR: { label: '人情帐', description: '联系人欠你一个人情' },
};

export interface LowHeatRewardBannerProps {
  rewardType: LowHeatRewardType;
  consecutiveDays: number;
}

export const LowHeatRewardBanner: React.FC<LowHeatRewardBannerProps> = ({ rewardType, consecutiveDays }) => {
  const info = LOW_HEAT_REWARD_LABELS[rewardType];

  return (
    <div className="bg-green-950/30 border border-green-700 p-3 rounded flex items-center gap-3">
      <Gift className="w-5 h-5 text-green-400 shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-green-400">{info.label}</span>
          <span className="text-[10px] text-stone-500">连续安全 {consecutiveDays} 天</span>
        </div>
        <div className="text-xs text-green-300/70 mt-0.5">{info.description}</div>
      </div>
    </div>
  );
};

import React from 'react';
import { Shield, Banknote, Minus as MinusIcon } from 'lucide-react';
import { Button } from '../../ui/Button';

export interface ProtectionFeePanelProps {
  currentAmount: number;
  timesPaid: number;
  inCooldown: boolean;
  onPay: () => void;
  onRefuse: () => void;
  canAfford: boolean;
}

export const ProtectionFeePanel: React.FC<ProtectionFeePanelProps> = ({
  currentAmount,
  timesPaid,
  inCooldown,
  onPay,
  onRefuse,
  canAfford,
}) => {
  if (inCooldown) {
    return (
      <div className="bg-stone-900/50 border border-stone-700 p-4 rounded flex items-center gap-3">
        <Shield className="w-5 h-5 text-stone-500" />
        <div className="flex-1">
          <div className="text-sm text-stone-400">联系人暂时不会来找你</div>
          <div className="text-xs text-stone-500 mt-0.5">冷却中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-950/30 border border-amber-800 p-4 rounded">
      <div className="flex items-start gap-3">
        <Shield className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="font-bold text-amber-400 text-sm">保护费</div>
          <div className="text-xs text-amber-300/70 mt-1">
            有人来收保护费了。
          </div>
          <div className="mt-2 flex items-center gap-4">
            <span className="text-lg font-mono font-bold text-amber-400">${currentAmount}</span>
            {timesPaid > 0 && (
              <span className="text-xs text-stone-500">
                已连续支付 {timesPaid} 次
              </span>
            )}
          </div>
          <div className="flex gap-3 mt-3">
            <Button
              onClick={onPay}
              disabled={!canAfford}
              className="bg-amber-900 hover:bg-amber-800 border-amber-700 text-sm"
            >
              <Banknote className="w-4 h-4 mr-1" />
              支付
            </Button>
            <Button
              onClick={onRefuse}
              className="bg-stone-800 hover:bg-stone-700 border-stone-600 text-sm"
            >
              <MinusIcon className="w-4 h-4 mr-1" />
              拒绝
            </Button>
          </div>
          {!canAfford && (
            <div className="text-xs text-red-400 mt-1">现金不足</div>
          )}
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { AlertTriangle, Lock, Banknote } from 'lucide-react';
import { Button } from '../../ui/Button';

export interface RiskEventBannerProps {
  event: {
    type: string;
    message: string;
    penalty?: number;
    lockDays?: number;
  };
  onPayFine: () => void;
  onAcceptLockdown: () => void;
}

export const RiskEventBanner: React.FC<RiskEventBannerProps> = ({
  event,
  onPayFine,
  onAcceptLockdown,
}) => {
  const hasPenalty = event.penalty !== undefined;
  const hasLockdown = event.lockDays !== undefined;

  return (
    <div className="bg-red-950/50 border-2 border-red-700 p-6 rounded animate-pulse">
      <div className="flex items-start gap-4">
        <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
        <div className="flex-1">
          <div className="font-bold text-red-400 text-lg mb-2">警方行动！</div>
          <div className="text-stone-300 mb-4">{event.message}</div>

          {hasPenalty && hasLockdown && (
            <div className="flex gap-3">
              <Button
                onClick={onPayFine}
                className="bg-green-900 hover:bg-green-800 border-green-700"
              >
                <Banknote className="w-4 h-4 mr-2" />
                支付 ${event.penalty}
              </Button>
              <Button
                onClick={onAcceptLockdown}
                className="bg-red-900 hover:bg-red-800 border-red-700"
              >
                <Lock className="w-4 h-4 mr-2" />
                接受关闭 {event.lockDays} 天
              </Button>
            </div>
          )}

          {!hasPenalty && hasLockdown && (
            <Button
              onClick={onAcceptLockdown}
              className="bg-red-900 hover:bg-red-800 border-red-700"
            >
              <Lock className="w-4 h-4 mr-2" />
              接受 ({event.lockDays} 天关闭)
            </Button>
          )}

          {hasPenalty && !hasLockdown && (
            <Button
              onClick={onPayFine}
              className="bg-amber-900 hover:bg-amber-800 border-amber-700"
            >
              <Banknote className="w-4 h-4 mr-2" />
              支付 ${event.penalty}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

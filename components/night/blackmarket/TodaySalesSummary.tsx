import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface TodaySalesSummaryProps {
  sales: { itemName: string; amount: number; type: 'PURCHASE' | 'SALE' }[];
}

export const TodaySalesSummary: React.FC<TodaySalesSummaryProps> = ({ sales }) => {
  const total = sales.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="border-t border-noir-400 pt-4">
      <div className="text-xs uppercase text-stone-500 tracking-wider mb-2">今日交易</div>
      <div className="space-y-1">
        {sales.map((sale, index) => (
          <div key={index} className="flex justify-between text-sm">
            <span className="text-stone-400">
              {sale.type === 'PURCHASE' ? (
                <TrendingUp className="w-3 h-3 inline mr-1 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 inline mr-1 text-amber-500" />
              )}
              {sale.itemName}
            </span>
            <span className={cn(
              'font-mono',
              sale.type === 'PURCHASE' ? 'text-green-400' : 'text-amber-400'
            )}>
              +${sale.amount}
            </span>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 pt-2 border-t border-noir-400 font-bold">
        <span>总计</span>
        <span className="text-green-400 font-mono">+${total}</span>
      </div>
    </div>
  );
};

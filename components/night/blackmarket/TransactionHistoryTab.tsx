import React from 'react';
import { History, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface TransactionRecord {
  itemName: string;
  amount: number;
  type: 'PURCHASE' | 'SALE';
}

export interface TransactionHistoryTabProps {
  /** Current day's transactions */
  todaySales: TransactionRecord[];
  /** Current game day */
  currentDay: number;
}

/**
 * #61: Transaction history tab for BlackmarketPanel.
 * Currently displays today's transactions with a note that 7-day history
 * will expand when historical data storage is implemented.
 */
export const TransactionHistoryTab: React.FC<TransactionHistoryTabProps> = ({
  todaySales,
  currentDay,
}) => {
  const todayTotal = todaySales.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="bg-[#050a05] border border-[#00ff41]/20 rounded p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-[#00ff41]/80 font-bold tracking-wider">
          <History className="w-4 h-4" />
          <span>{'>'} TRANSACTION_LOG</span>
        </div>
        <span className="text-[10px] text-[#00ff41]/40 font-mono">
          DAY_{currentDay}
        </span>
      </div>

      {todaySales.length === 0 ? (
        <div className="text-center py-6 text-[#00ff41]/30 text-xs font-mono">
          NO_TRANSACTIONS_TODAY
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {todaySales.map((sale, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-xs font-mono py-1 border-b border-[#00ff41]/10 last:border-0"
              >
                <div className="flex items-center gap-2">
                  {sale.type === 'PURCHASE' ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-amber-500" />
                  )}
                  <span className="text-[#00ff41]/70 truncate max-w-[160px]">
                    {sale.itemName}
                  </span>
                </div>
                <span
                  className={cn(
                    'font-bold',
                    sale.type === 'PURCHASE'
                      ? 'text-green-400'
                      : 'text-amber-400'
                  )}
                >
                  +${sale.amount}
                </span>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-2 border-t border-[#00ff41]/20 text-xs font-mono">
            <span className="text-[#00ff41]/60">TOTAL</span>
            <span className="text-[#00ff41] font-bold">+${todayTotal}</span>
          </div>
        </>
      )}

      {/* Note: 7-day history expansion placeholder */}
      <div className="text-[9px] text-[#00ff41]/20 font-mono text-center pt-1">
        [ 7-DAY_HISTORY: PENDING_DATA_EXPANSION ]
      </div>
    </div>
  );
};

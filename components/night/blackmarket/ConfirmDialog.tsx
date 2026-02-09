import React from 'react';
import {
  AlertTriangle,
  Skull,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Item } from '../../../systems/items/types';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';

export interface ConfirmDialogProps {
  action: {
    type: 'sell_purchase' | 'sell_direct' | 'pay_fine' | 'accept_lockdown';
    item?: Item;
    price?: number;
  };
  checkBreach: (item: Item) => boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ action, checkBreach, onConfirm, onCancel }) => {
  let title = '';
  let message = '';
  let confirmText = '';
  let isDanger = false;
  let isBreach = false;

  if (action.item && (action.type === 'sell_purchase' || action.type === 'sell_direct')) {
    isBreach = checkBreach(action.item);
    if (isBreach) {
      isDanger = true;
    }
  }

  switch (action.type) {
    case 'sell_purchase':
      title = isBreach ? '违约警告' : '确认出售';
      message = `以 $${action.price} 出售 "${action.item?.name}"？\n(热度 +1)`;
      confirmText = isBreach ? '确认违约出售' : '确认出售';
      break;
    case 'sell_direct':
      title = isBreach ? '违约警告' : '确认出售';
      message = `以约 $${action.price} 出售 "${action.item?.name}"？\n(热度 +2)`;
      confirmText = isBreach ? '确认违约出售' : '确认出售';
      break;
    case 'pay_fine':
      title = '支付罚款';
      message = `支付 $${action.price} 以避免黑市关闭？`;
      confirmText = '支付';
      break;
    case 'accept_lockdown':
      title = '接受关闭';
      message = '黑市将关闭，期间无法进行任何交易。';
      confirmText = '接受';
      isDanger = true;
      break;
  }

  return (
    <Modal
      isOpen={true}
      onClose={onCancel}
      title={title}
      size="sm"
    >
      <div className="space-y-4">
        {isBreach && (
          <div className="bg-amber-950/50 border border-amber-700 p-3 rounded flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-400 text-sm">典当期内出售</div>
              <div className="text-xs text-amber-300/80 mt-1">
                此物品仍在典当期内。若客户来赎回时发现物品已售出，将扣减声誉。
              </div>
              <div className="text-xs text-amber-400 mt-1 font-mono">
                出售即获得：黑道 +2 | 客户赎回时：人情 -3, 商誉 -1
              </div>
            </div>
          </div>
        )}
        {!isBreach && (action.type === 'sell_purchase' || action.type === 'sell_direct') && (
          <div className="bg-purple-950/50 border border-purple-700 p-3 rounded flex items-start gap-2">
            <Skull className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-purple-400 text-sm">声誉变化</div>
              <div className="text-xs text-purple-300/80 mt-1 font-mono">
                出售获得：黑道 +2
              </div>
            </div>
          </div>
        )}
        <p className="text-stone-300 whitespace-pre-line">{message}</p>
        <div className="flex justify-end gap-3">
          <Button onClick={onCancel} variant="secondary">
            <XCircle className="w-4 h-4 mr-2" />
            取消
          </Button>
          <Button
            onClick={onConfirm}
            className={cn(
              isDanger
                ? 'bg-red-900 hover:bg-red-800 border-red-700'
                : 'bg-green-900 hover:bg-green-800 border-green-700'
            )}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

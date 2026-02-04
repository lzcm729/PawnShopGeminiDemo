/**
 * Appointment Board Panel
 *
 * Night-phase UI component for previewing and selecting potential customers.
 * Shows candidates based on appointment board upgrade level.
 */

import React, { useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { HelpTooltip } from '../ui/Tooltip';
import { Button } from '../ui/Button';
import { useGame } from '../../store/GameContext';
import { cn } from '../../lib/utils';
import {
  ClipboardList,
  User,
  Package,
  Heart,
  Briefcase,
  AlertCircle,
  Check,
  X,
  Filter,
  Newspaper,
} from 'lucide-react';
import {
  getActiveAppointmentBoardConfig,
  hasAppointmentBoard,
} from '../../systems/upgrades';
import {
  generateAppointmentCandidates,
  AppointmentCandidate,
  AppointmentPreference,
} from '../../systems/appointment';

interface AppointmentBoardPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppointmentBoardPanel: React.FC<AppointmentBoardPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const { state, dispatch } = useGame();
  const { appointmentBoard, shopUpgrades, dailyNews } = state;

  const boardConfig = getActiveAppointmentBoardConfig(shopUpgrades);
  const hasBoardUnlocked = hasAppointmentBoard(shopUpgrades);

  // Generate candidates when panel opens and no candidates exist
  useEffect(() => {
    if (isOpen && hasBoardUnlocked && boardConfig && appointmentBoard.candidates.length === 0) {
      const candidates = generateAppointmentCandidates(
        boardConfig,
        appointmentBoard.preference,
        dailyNews
      );
      dispatch({ type: 'SET_APPOINTMENT_CANDIDATES', payload: candidates });
    }
  }, [isOpen, hasBoardUnlocked, boardConfig]);

  const handleRegenerateCandidates = () => {
    if (boardConfig) {
      const candidates = generateAppointmentCandidates(
        boardConfig,
        appointmentBoard.preference,
        dailyNews
      );
      dispatch({ type: 'SET_APPOINTMENT_CANDIDATES', payload: candidates });
    }
  };

  const handleToggleSelect = (candidateId: string) => {
    if (appointmentBoard.selectedIds.includes(candidateId)) {
      dispatch({ type: 'DESELECT_APPOINTMENT_CANDIDATE', payload: { candidateId } });
    } else {
      // Check if we can select more
      if (boardConfig && appointmentBoard.selectedIds.length < boardConfig.maxInvites) {
        dispatch({ type: 'SELECT_APPOINTMENT_CANDIDATE', payload: { candidateId } });
      }
    }
  };

  const handleSetPreference = (preference: AppointmentPreference) => {
    dispatch({ type: 'SET_APPOINTMENT_PREFERENCE', payload: preference });
    // Regenerate candidates with new preference
    if (boardConfig) {
      const candidates = generateAppointmentCandidates(
        boardConfig,
        preference,
        dailyNews
      );
      dispatch({ type: 'SET_APPOINTMENT_CANDIDATES', payload: candidates });
    }
  };

  // Level names in Chinese
  const levelNames: Record<number, string> = {
    1: '简易预约本',
    2: '客户档案柜',
    3: '社区情报网',
    4: '预约热线',
    5: 'VIP名册'
  };

  if (!hasBoardUnlocked || !boardConfig) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <span className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            预约板 (Appointment Board)
            <HelpTooltip text="预览明日可能来访的客户，选择邀请。可筛选客户类型，升级后预览更多客户、邀请更多人。" />
          </span>
        }
        size="md"
      >
        <div className="text-center py-12 text-stone-500">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>尚未购买预约板</p>
          <p className="text-xs mt-2">前往店铺升级解锁此功能</p>
        </div>
      </Modal>
    );
  }

  const selectedCount = appointmentBoard.selectedIds.length;
  const maxInvites = boardConfig.maxInvites;
  const levelName = levelNames[boardConfig.level] || '预约板';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-teal-400" />
          {levelName} (Lv{boardConfig.level})
          <HelpTooltip text="预览明日可能来访的客户，选择邀请。可筛选客户类型，升级后预览更多客户、邀请更多人。" />
        </span>
      }
      size="lg"
    >
      <div className="flex flex-col gap-6">
        {/* Status Bar */}
        <div className="flex items-center justify-between bg-noir-300/50 p-4 rounded border border-noir-400">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-teal-500" />
            <div>
              <div className="text-xs uppercase text-stone-500 tracking-wider">
                已选择 (Selected)
              </div>
              <div className="text-2xl font-mono text-teal-400">
                {selectedCount} / {maxInvites}
              </div>
            </div>
          </div>
          <div className="text-xs text-stone-500 max-w-xs text-right">
            选中的客户将于明日<span className="text-teal-400">额外</span>来访
          </div>
        </div>

        {/* Preference Filter (Lv5 only) */}
        {boardConfig.hasPreference && (
          <div className="flex items-center gap-4 p-3 bg-noir-200 rounded border border-noir-400">
            <div className="flex items-center gap-2 text-stone-400">
              <Filter className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">筛选偏好:</span>
            </div>
            <div className="flex gap-2">
              <PreferenceButton
                active={appointmentBoard.preference === 'balanced'}
                onClick={() => handleSetPreference('balanced')}
                label="均衡"
              />
              <PreferenceButton
                active={appointmentBoard.preference === 'needy'}
                onClick={() => handleSetPreference('needy')}
                label="急需用钱"
                icon={<Heart className="w-3 h-3" />}
              />
              <PreferenceButton
                active={appointmentBoard.preference === 'casual'}
                onClick={() => handleSetPreference('casual')}
                label="出手闲置"
                icon={<Briefcase className="w-3 h-3" />}
              />
            </div>
          </div>
        )}

        {/* Candidate List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs uppercase text-stone-500 tracking-wider">
              明日候选 ({appointmentBoard.candidates.length})
            </h4>
            <button
              onClick={handleRegenerateCandidates}
              className="text-xs text-stone-500 hover:text-stone-300 underline"
            >
              刷新列表
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {appointmentBoard.candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                config={boardConfig}
                isSelected={appointmentBoard.selectedIds.includes(candidate.id)}
                canSelect={selectedCount < maxInvites || appointmentBoard.selectedIds.includes(candidate.id)}
                onToggle={() => handleToggleSelect(candidate.id)}
              />
            ))}
          </div>

          {appointmentBoard.candidates.length === 0 && (
            <div className="text-center py-8 text-stone-500">
              <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">暂无候选客户</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-noir-400">
          <Button
            onClick={() => {
              dispatch({ type: 'CLEAR_APPOINTMENT_SELECTIONS' });
            }}
            variant="ghost"
            className="text-stone-400"
            disabled={selectedCount === 0}
          >
            清空选择
          </Button>
          <Button onClick={onClose}>
            确认 ({selectedCount} 人已邀请)
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

interface PreferenceButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}

const PreferenceButton: React.FC<PreferenceButtonProps> = ({
  active,
  onClick,
  label,
  icon,
}) => (
  <button
    onClick={onClick}
    className={cn(
      'px-3 py-1.5 text-xs rounded border transition-all flex items-center gap-1.5',
      active
        ? 'bg-teal-900/50 border-teal-700 text-teal-400'
        : 'bg-noir-300 border-noir-400 text-stone-500 hover:text-stone-300'
    )}
  >
    {icon}
    {label}
  </button>
);

interface CandidateCardProps {
  candidate: AppointmentCandidate;
  config: { showEmotion: boolean; showBackground: boolean; showNewsLink: boolean };
  isSelected: boolean;
  canSelect: boolean;
  onToggle: () => void;
}

const CandidateCard: React.FC<CandidateCardProps> = ({
  candidate,
  config,
  isSelected,
  canSelect,
  onToggle,
}) => {
  const urgencyColors: Record<string, string> = {
    high: 'border-l-red-500',
    medium: 'border-l-amber-500',
    low: 'border-l-green-500',
  };

  return (
    <div
      className={cn(
        'bg-noir-200 border-l-4 p-4 rounded-r transition-all cursor-pointer',
        urgencyColors[candidate.urgency],
        isSelected && 'ring-2 ring-teal-500 bg-teal-950/20',
        !canSelect && !isSelected && 'opacity-50 cursor-not-allowed'
      )}
      onClick={canSelect || isSelected ? onToggle : undefined}
    >
      <div className="flex gap-4">
        {/* Avatar Placeholder */}
        <div className="w-12 h-12 bg-noir-300 border border-noir-400 rounded-full flex items-center justify-center shrink-0">
          <User className="w-6 h-6 text-stone-500" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Basic Description (Lv1) */}
          <p className="text-sm text-stone-300">
            "{candidate.appearanceDesc}"
          </p>

          {/* Item Hint (Lv1) */}
          <div className="flex items-center gap-2 mt-1 text-xs text-stone-500">
            <Package className="w-3 h-3" />
            {candidate.itemSizeHint}
          </div>

          {/* Emotion (Lv2+) */}
          {config.showEmotion && candidate.emotionDesc && (
            <div className="flex items-center gap-2 mt-1 text-xs text-amber-400/80">
              <AlertCircle className="w-3 h-3" />
              {candidate.emotionDesc}
            </div>
          )}

          {/* Background Hint (Lv3+) */}
          {config.showBackground && candidate.backgroundHint && (
            <div className="flex items-center gap-2 mt-1 text-xs text-purple-400/80">
              <Briefcase className="w-3 h-3" />
              {candidate.backgroundHint}
            </div>
          )}

          {/* News Link (Lv3+) */}
          {config.showNewsLink && candidate.newsLink && (
            <div className="flex items-center gap-2 mt-2 text-[10px] text-stone-600 italic">
              <Newspaper className="w-3 h-3" />
              [{candidate.newsLink}]
            </div>
          )}
        </div>

        {/* Selection Indicator */}
        <div className="flex items-center">
          <div
            className={cn(
              'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all',
              isSelected
                ? 'bg-teal-600 border-teal-400'
                : 'bg-noir-300 border-noir-400'
            )}
          >
            {isSelected ? (
              <Check className="w-4 h-4 text-white" />
            ) : (
              <span className="text-stone-500 text-xs">+</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

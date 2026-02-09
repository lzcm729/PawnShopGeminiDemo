import React from 'react';
import {
  Lock,
  CheckCircle2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { Button } from '../../ui/Button';
import { AbilityPanelData } from '../../../systems/characterAbility/types';
import { SKILL_DEFINITIONS } from '../../../systems/characterAbility/skillDefinitions';
import { ESSENCE_DISPLAY_NAMES } from '../../../systems/economy/essence';
import { PATH_COLORS, PathKey } from './constants';

interface SkillDetailCardProps {
  skill: AbilityPanelData['skills'][number];
  essenceBalance: { craft: number; time: number; vibe: number };
  currentEnergy: number;
  onUnlock: () => void;
}

export const SkillDetailCard: React.FC<SkillDetailCardProps> = ({
  skill,
  essenceBalance,
  currentEnergy,
  onUnlock,
}) => {
  const { def, state, canUnlock, meetsPrerequisites, hasEnoughEssence, hasEnoughEnergy } = skill;
  const isUnlocked = state.unlocked;
  const pathKey = def.path as PathKey;
  const colors = PATH_COLORS[pathKey];

  return (
    <div className={cn('border rounded-lg overflow-hidden', colors.border)}>
      {/* Header */}
      <div className={cn('p-4', colors.bg)}>
        <div className="flex items-center gap-2 mb-1">
          {isUnlocked ? (
            <CheckCircle2 className={cn('w-5 h-5', colors.text)} />
          ) : canUnlock ? (
            <Sparkles className={cn('w-5 h-5', colors.text)} />
          ) : (
            <Lock className="w-5 h-5 text-stone-500" />
          )}
          <h3 className={cn('text-lg font-bold', isUnlocked ? colors.text : 'text-stone-200')}>
            {def.name}
          </h3>
          <span className="text-xs text-stone-500 font-mono">{def.englishName}</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn('text-[10px] font-mono', colors.text)}>
            {PATH_COLORS[pathKey].label} {def.tier}
          </span>
          <span className="text-[10px] text-stone-500">|</span>
          <span className="text-[10px] text-stone-500">
            {def.activation === 'PASSIVE' ? '被动' : `主动 (${def.apCost ?? 0} AP)`}
          </span>
          {def.phase && (
            <>
              <span className="text-[10px] text-stone-500">|</span>
              <span className="text-[10px] text-stone-500">
                {def.phase === 'APPRAISAL' ? '鉴定' :
                 def.phase === 'NEGOTIATION' ? '议价' :
                 def.phase === 'DEPARTURE' ? '送客' : '夜间'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="bg-noir-200 p-4 space-y-4">
        {/* Flavor text */}
        <p className="text-sm text-stone-400 italic leading-relaxed">
          "{def.description}"
        </p>

        {/* Already unlocked notice */}
        {isUnlocked && (
          <div className="flex items-center gap-2 p-3 bg-green-950/30 border border-green-800 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-400" />
            <div>
              <span className="text-sm text-green-400 font-bold">已习得</span>
              {state.useCount > 0 && (
                <span className="text-[10px] text-stone-500 ml-2">
                  已使用 {state.useCount} 次
                </span>
              )}
            </div>
          </div>
        )}

        {/* Unlock Requirements (only for locked skills) */}
        {!isUnlocked && (
          <div className="space-y-3">
            <div className="text-[10px] uppercase text-stone-500 tracking-wider">
              解锁条件
            </div>

            {/* Prerequisites */}
            {def.prerequisites.length > 0 && (
              <div className="space-y-1">
                {def.prerequisites.map(preId => {
                  const preDef = SKILL_DEFINITIONS[preId];
                  const preMet = meetsPrerequisites;
                  return (
                    <div key={preId} className="flex items-center gap-2 text-sm">
                      {preMet ? (
                        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                      ) : (
                        <Lock className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <span className={preMet ? 'text-stone-400' : 'text-red-400'}>
                        前置: {preDef.name} ({preDef.englishName})
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Essence Cost */}
            <div className="space-y-1">
              {def.essenceCost.craft !== undefined && def.essenceCost.craft > 0 && (
                <EssenceCostRow
                  type="CRAFT"
                  needed={def.essenceCost.craft}
                  available={essenceBalance.craft}
                />
              )}
              {def.essenceCost.time !== undefined && def.essenceCost.time > 0 && (
                <EssenceCostRow
                  type="TIME"
                  needed={def.essenceCost.time}
                  available={essenceBalance.time}
                />
              )}
              {def.essenceCost.vibe !== undefined && def.essenceCost.vibe > 0 && (
                <EssenceCostRow
                  type="VIBE"
                  needed={def.essenceCost.vibe}
                  available={essenceBalance.vibe}
                />
              )}
            </div>

            {/* Energy Cost */}
            <div className="flex items-center gap-2 text-sm">
              {hasEnoughEnergy ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              ) : (
                <Zap className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span className={hasEnoughEnergy ? 'text-stone-400' : 'text-red-400'}>
                精力: {def.energyCost} (当前: {currentEnergy})
              </span>
            </div>

            {/* Unlock Button */}
            <Button
              onClick={onUnlock}
              disabled={!canUnlock}
              className={cn(
                'w-full mt-2',
                canUnlock
                  ? cn('bg-gradient-to-r from-amber-900 to-purple-900 hover:from-amber-800 hover:to-purple-800 border-amber-700')
                  : ''
              )}
            >
              {canUnlock ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  修行 - 习得此技能
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  条件不足
                </span>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Essence Cost Row
// ============================================================================

interface EssenceCostRowProps {
  type: 'CRAFT' | 'TIME' | 'VIBE';
  needed: number;
  available: number;
}

const EssenceCostRow: React.FC<EssenceCostRowProps> = ({ type, needed, available }) => {
  const enough = available >= needed;
  const colors = PATH_COLORS[type];

  return (
    <div className="flex items-center gap-2 text-sm">
      {enough ? (
        <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
      ) : (
        <span className={cn('w-4 h-4 text-lg leading-none shrink-0', colors.text)}>
          {colors.icon}
        </span>
      )}
      <span className={enough ? 'text-stone-400' : 'text-red-400'}>
        {ESSENCE_DISPLAY_NAMES[type]}: {needed}
      </span>
      <span className={cn('text-xs font-mono', enough ? 'text-stone-500' : 'text-red-400')}>
        ({available}/{needed})
      </span>
    </div>
  );
};

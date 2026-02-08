/**
 * Ability Panel (修行面板)
 *
 * Night phase panel for the character ability system.
 * Displays the 12-skill tree across 3 pure paths and 3 fusion paths.
 * Players spend essence + energy to unlock skills.
 *
 * Design doc: v1.4 section 10
 */

import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { HelpTooltip } from '../ui/Tooltip';
import { Button } from '../ui/Button';
import { useCharacterAbility } from '../../hooks/useCharacterAbility';
import { cn } from '../../lib/utils';
import {
  Sparkles,
  Zap,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import {
  SkillId,
  AbilityPanelData,
} from '../../systems/characterAbility/types';
import {
  SKILL_DEFINITIONS,
  PURE_CRAFT_SKILLS,
  PURE_TIME_SKILLS,
  PURE_VIBE_SKILLS,
  DARK_PATH_SKILLS,
  BRIGHT_PATH_SKILLS,
  WISDOM_PATH_SKILLS,
} from '../../systems/characterAbility/skillDefinitions';
import { ESSENCE_DISPLAY_NAMES } from '../../systems/economy/essence';

// ============================================================================
// Path color system
// ============================================================================

const PATH_COLORS = {
  CRAFT: {
    bg: 'bg-blue-950/50',
    border: 'border-blue-700',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/30',
    line: 'border-blue-700/60',
    label: '匠心',
    icon: '🛠️',
  },
  TIME: {
    bg: 'bg-amber-950/50',
    border: 'border-amber-700',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/30',
    line: 'border-amber-700/60',
    label: '旧影',
    icon: '📜',
  },
  VIBE: {
    bg: 'bg-purple-950/50',
    border: 'border-purple-700',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/30',
    line: 'border-purple-700/60',
    label: '灵韵',
    icon: '🎨',
  },
  TIME_CRAFT: {
    bg: 'bg-red-950/40',
    border: 'border-red-800',
    text: 'text-red-400',
    glow: 'shadow-red-500/30',
    line: 'border-red-800/60',
    label: '暗路',
    icon: '🗡️',
  },
  CRAFT_VIBE: {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-700',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/30',
    line: 'border-emerald-700/60',
    label: '明路',
    icon: '🌟',
  },
  TIME_VIBE: {
    bg: 'bg-cyan-950/40',
    border: 'border-cyan-700',
    text: 'text-cyan-400',
    glow: 'shadow-cyan-500/30',
    line: 'border-cyan-700/60',
    label: '慧路',
    icon: '👁️',
  },
} as const;

type PathKey = keyof typeof PATH_COLORS;

// ============================================================================
// Main Panel
// ============================================================================

interface AbilityPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AbilityPanel: React.FC<AbilityPanelProps> = ({ isOpen, onClose }) => {
  const {
    getPanelData,
    unlockSkill,
    canUnlock,
    isUnlocked,
  } = useCharacterAbility();

  const [selectedSkillId, setSelectedSkillId] = useState<SkillId | null>(null);
  const [showMonologue, setShowMonologue] = useState<string | null>(null);

  const panelData = useMemo(() => getPanelData(), [getPanelData]);

  const skillMap = useMemo(() => {
    const map = new Map<SkillId, AbilityPanelData['skills'][number]>();
    for (const s of panelData.skills) {
      map.set(s.def.id, s);
    }
    return map;
  }, [panelData]);

  const selectedSkill = selectedSkillId ? skillMap.get(selectedSkillId) : null;

  const handleUnlock = (skillId: SkillId) => {
    const def = SKILL_DEFINITIONS[skillId];
    unlockSkill(skillId);
    setShowMonologue(def.learnMonologue);
    setSelectedSkillId(null);
  };

  const dismissMonologue = () => {
    setShowMonologue(null);
  };

  // Check if player is in early game (no skills, no essence)
  const totalEssence = panelData.essenceBalance.craft + panelData.essenceBalance.time + panelData.essenceBalance.vibe;
  const unlockedCount = panelData.skills.filter(s => s.state.unlocked).length;
  const isNewPlayer = unlockedCount === 0 && totalEssence < 50;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          修行 (Cultivation)
          <HelpTooltip text="消耗精魄和精力来学习技能。技能分为三条纯系路径和三条融合路径，每条路径有不同的策略方向。所有信息完全透明，帮助你做出有意义的路线规划。" />
        </span>
      }
      size="xl"
    >
      <div className="flex flex-col gap-6">
        {/* Essence Balance Bar */}
        <EssenceBar
          balance={panelData.essenceBalance}
          energy={panelData.currentEnergy}
        />

        {/* Monologue Overlay */}
        {showMonologue && (
          <MonologueOverlay text={showMonologue} onDismiss={dismissMonologue} />
        )}

        {/* Newbie Guide */}
        {isNewPlayer && <NewbieGuide balance={panelData.essenceBalance} />}

        {/* Main Content: Skill Tree + Detail */}
        <div className="flex gap-4">
          {/* Left: Skill Tree */}
          <div className="flex-1 min-w-0 overflow-y-auto max-h-[60vh] pr-2 pb-4">
            <SkillTree
              skillMap={skillMap}
              selectedSkillId={selectedSkillId}
              onSelectSkill={setSelectedSkillId}
              essenceBalance={panelData.essenceBalance}
            />
          </div>

          {/* Right: Detail Panel */}
          <div className="w-80 shrink-0">
            {selectedSkill ? (
              <SkillDetail
                skill={selectedSkill}
                essenceBalance={panelData.essenceBalance}
                currentEnergy={panelData.currentEnergy}
                onUnlock={() => handleUnlock(selectedSkill.def.id)}
              />
            ) : (
              <div className="bg-noir-200 border border-noir-400 rounded-lg p-6 h-full flex flex-col items-center justify-center text-center min-h-[300px]">
                <Sparkles className="w-12 h-12 text-stone-600 mb-4" />
                <p className="text-stone-500 mb-2">选择技能查看详情</p>
                <p className="text-xs text-stone-600">
                  点击左侧技能节点，<br />查看效果和解锁条件
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// Essence Bar
// ============================================================================

interface EssenceBarProps {
  balance: { craft: number; time: number; vibe: number };
  energy: number;
}

const EssenceBar: React.FC<EssenceBarProps> = ({ balance, energy }) => (
  <div className="flex items-center justify-between bg-noir-300/50 p-4 rounded border border-noir-400">
    <div className="flex items-center gap-6">
      <EssenceDisplay type="CRAFT" amount={balance.craft} />
      <EssenceDisplay type="TIME" amount={balance.time} />
      <EssenceDisplay type="VIBE" amount={balance.vibe} />
    </div>
    <div className="flex items-center gap-3">
      <Zap className="w-5 h-5 text-amber-500" />
      <div>
        <div className="text-[10px] uppercase text-stone-500 tracking-wider">精力</div>
        <div className="text-lg font-mono text-amber-400">{energy}</div>
      </div>
    </div>
  </div>
);

interface EssenceDisplayProps {
  type: 'CRAFT' | 'TIME' | 'VIBE';
  amount: number;
}

const EssenceDisplay: React.FC<EssenceDisplayProps> = ({ type, amount }) => {
  const colors = PATH_COLORS[type];
  return (
    <div className="flex items-center gap-2">
      <span className="text-lg">{colors.icon}</span>
      <div>
        <div className="text-[10px] text-stone-500">{colors.label}</div>
        <div className={cn('text-lg font-mono font-bold', colors.text)}>{amount}</div>
      </div>
    </div>
  );
};

// ============================================================================
// Newbie Guide
// ============================================================================

interface NewbieGuideProps {
  balance: { craft: number; time: number; vibe: number };
}

const NewbieGuide: React.FC<NewbieGuideProps> = ({ balance }) => {
  const maxProgress = Math.max(balance.craft, balance.time, balance.vibe);
  const progressPercent = Math.min(100, Math.round((maxProgress / 50) * 100));

  return (
    <div className="bg-gradient-to-r from-amber-950/30 to-purple-950/30 border border-amber-800/40 rounded-lg p-4">
      <p className="text-sm text-stone-300 italic mb-3">
        "每笔交易都在积累修行......"
      </p>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-noir-400 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs text-stone-500 font-mono shrink-0">
          {maxProgress} / 50
        </span>
      </div>
      <p className="text-[10px] text-stone-500 mt-2">
        首个技能解锁还需 {Math.max(0, 50 - maxProgress)} 精魄
      </p>
    </div>
  );
};

// ============================================================================
// Skill Tree
// ============================================================================

interface SkillTreeProps {
  skillMap: Map<SkillId, AbilityPanelData['skills'][number]>;
  selectedSkillId: SkillId | null;
  onSelectSkill: (id: SkillId) => void;
  essenceBalance: { craft: number; time: number; vibe: number };
}

const SkillTree: React.FC<SkillTreeProps> = ({
  skillMap,
  selectedSkillId,
  onSelectSkill,
  essenceBalance,
}) => {
  return (
    <div className="space-y-6">
      {/* Pure Paths */}
      <div className="grid grid-cols-3 gap-4">
        <PathColumn
          title="匠心 (Craft)"
          pathKey="CRAFT"
          skillIds={PURE_CRAFT_SKILLS as SkillId[]}
          skillMap={skillMap}
          selectedSkillId={selectedSkillId}
          onSelectSkill={onSelectSkill}
          essenceBalance={essenceBalance}
        />
        <PathColumn
          title="旧影 (Time)"
          pathKey="TIME"
          skillIds={PURE_TIME_SKILLS as SkillId[]}
          skillMap={skillMap}
          selectedSkillId={selectedSkillId}
          onSelectSkill={onSelectSkill}
          essenceBalance={essenceBalance}
        />
        <PathColumn
          title="灵韵 (Vibe)"
          pathKey="VIBE"
          skillIds={PURE_VIBE_SKILLS as SkillId[]}
          skillMap={skillMap}
          selectedSkillId={selectedSkillId}
          onSelectSkill={onSelectSkill}
          essenceBalance={essenceBalance}
        />
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 border-t border-stone-700/50" />
        <span className="text-[10px] uppercase text-stone-500 tracking-widest">融合路径</span>
        <div className="flex-1 border-t border-stone-700/50" />
      </div>

      {/* Fusion Paths */}
      <div className="grid grid-cols-3 gap-4">
        <PathColumn
          title="暗路 (旧影+匠心)"
          subtitle="弱点即筹码"
          pathKey="TIME_CRAFT"
          skillIds={DARK_PATH_SKILLS as SkillId[]}
          skillMap={skillMap}
          selectedSkillId={selectedSkillId}
          onSelectSkill={onSelectSkill}
          essenceBalance={essenceBalance}
        />
        <PathColumn
          title="明路 (匠心+灵韵)"
          subtitle="善行有回响"
          pathKey="CRAFT_VIBE"
          skillIds={BRIGHT_PATH_SKILLS as SkillId[]}
          skillMap={skillMap}
          selectedSkillId={selectedSkillId}
          onSelectSkill={onSelectSkill}
          essenceBalance={essenceBalance}
        />
        <PathColumn
          title="慧路 (旧影+灵韵)"
          subtitle="命运可见"
          pathKey="TIME_VIBE"
          skillIds={WISDOM_PATH_SKILLS as SkillId[]}
          skillMap={skillMap}
          selectedSkillId={selectedSkillId}
          onSelectSkill={onSelectSkill}
          essenceBalance={essenceBalance}
        />
      </div>
    </div>
  );
};

// ============================================================================
// Path Column
// ============================================================================

interface PathColumnProps {
  title: string;
  subtitle?: string;
  pathKey: PathKey;
  skillIds: SkillId[];
  skillMap: Map<SkillId, AbilityPanelData['skills'][number]>;
  selectedSkillId: SkillId | null;
  onSelectSkill: (id: SkillId) => void;
  essenceBalance: { craft: number; time: number; vibe: number };
}

const PathColumn: React.FC<PathColumnProps> = ({
  title,
  subtitle,
  pathKey,
  skillIds,
  skillMap,
  selectedSkillId,
  onSelectSkill,
  essenceBalance,
}) => {
  const colors = PATH_COLORS[pathKey];

  return (
    <div className={cn('rounded border p-3', colors.bg, colors.border)}>
      {/* Path Header */}
      <div className="mb-3 text-center">
        <div className={cn('text-xs font-bold uppercase tracking-wider', colors.text)}>
          {title}
        </div>
        {subtitle && (
          <div className="text-[10px] text-stone-500 mt-0.5 italic">
            {subtitle}
          </div>
        )}
      </div>

      {/* Skill Nodes (T1 at bottom, T2 at top) */}
      <div className="flex flex-col gap-2">
        {/* T2 skill (higher tier at top) */}
        {skillIds.length > 1 && (
          <>
            <SkillNode
              skill={skillMap.get(skillIds[1])!}
              pathKey={pathKey}
              isSelected={selectedSkillId === skillIds[1]}
              onSelect={() => onSelectSkill(skillIds[1])}
              essenceBalance={essenceBalance}
            />
            {/* Connection line */}
            <div className="flex justify-center">
              <div className={cn('w-px h-4 border-l-2 border-dashed', colors.line)} />
            </div>
          </>
        )}
        {/* T1 skill (base tier at bottom) */}
        <SkillNode
          skill={skillMap.get(skillIds[0])!}
          pathKey={pathKey}
          isSelected={selectedSkillId === skillIds[0]}
          onSelect={() => onSelectSkill(skillIds[0])}
          essenceBalance={essenceBalance}
        />
      </div>
    </div>
  );
};

// ============================================================================
// Skill Node
// ============================================================================

interface SkillNodeProps {
  skill: AbilityPanelData['skills'][number];
  pathKey: PathKey;
  isSelected: boolean;
  onSelect: () => void;
  essenceBalance: { craft: number; time: number; vibe: number };
}

const SkillNode: React.FC<SkillNodeProps> = ({
  skill,
  pathKey,
  isSelected,
  onSelect,
  essenceBalance,
}) => {
  const { def, state, canUnlock, meetsPrerequisites } = skill;
  const colors = PATH_COLORS[pathKey];
  const isUnlocked = state.unlocked;

  // Compute essence progress for locked skills
  const essenceProgress = useMemo(() => {
    if (isUnlocked) return 1;
    const cost = def.essenceCost;
    let totalNeeded = 0;
    let totalHave = 0;
    if (cost.craft) {
      totalNeeded += cost.craft;
      totalHave += Math.min(cost.craft, essenceBalance.craft);
    }
    if (cost.time) {
      totalNeeded += cost.time;
      totalHave += Math.min(cost.time, essenceBalance.time);
    }
    if (cost.vibe) {
      totalNeeded += cost.vibe;
      totalHave += Math.min(cost.vibe, essenceBalance.vibe);
    }
    return totalNeeded > 0 ? totalHave / totalNeeded : 0;
  }, [isUnlocked, def.essenceCost, essenceBalance]);

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full p-2.5 rounded border transition-all duration-200 text-left',
        'hover:scale-[1.02] cursor-pointer',
        isUnlocked
          ? cn('border-2', colors.border, colors.bg, `shadow-md ${colors.glow}`)
          : canUnlock
          ? cn('border-2 border-dashed', colors.border, 'bg-noir-200 animate-pulse')
          : !meetsPrerequisites
          ? 'border border-stone-700/50 bg-noir-300/50 opacity-50'
          : 'border border-stone-700 bg-noir-200',
        isSelected && 'ring-2 ring-white/30'
      )}
    >
      <div className="flex items-center gap-2">
        {/* Status icon */}
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center shrink-0 border',
          isUnlocked
            ? cn(colors.border, colors.bg)
            : canUnlock
            ? cn('border-dashed', colors.border, 'bg-noir-300')
            : 'border-stone-700 bg-noir-400'
        )}>
          {isUnlocked ? (
            <CheckCircle2 className={cn('w-4 h-4', colors.text)} />
          ) : !meetsPrerequisites ? (
            <Lock className="w-3.5 h-3.5 text-stone-600" />
          ) : (
            <Sparkles className={cn('w-3.5 h-3.5', canUnlock ? colors.text : 'text-stone-500')} />
          )}
        </div>

        {/* Skill info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              'text-sm font-bold truncate',
              isUnlocked ? colors.text : canUnlock ? 'text-stone-200' : 'text-stone-500'
            )}>
              {def.name}
            </span>
            <span className={cn(
              'text-[9px] font-mono shrink-0',
              isUnlocked ? 'text-stone-400' : 'text-stone-600'
            )}>
              {def.tier}
            </span>
            {def.activation === 'ACTIVE' && (
              <span className="text-[9px] px-1 py-0.5 bg-amber-900/40 text-amber-400 rounded shrink-0">
                主动
              </span>
            )}
          </div>

          {/* Progress bar for locked skills */}
          {!isUnlocked && meetsPrerequisites && (
            <div className="mt-1 flex items-center gap-1.5">
              <div className="flex-1 h-1 bg-noir-400 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full transition-all duration-300',
                    essenceProgress >= 1 ? 'bg-green-500' : colors.text.replace('text-', 'bg-')
                  )}
                  style={{ width: `${Math.round(essenceProgress * 100)}%` }}
                />
              </div>
              <span className="text-[9px] font-mono text-stone-600">
                {Math.round(essenceProgress * 100)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

// ============================================================================
// Skill Detail Panel
// ============================================================================

interface SkillDetailProps {
  skill: AbilityPanelData['skills'][number];
  essenceBalance: { craft: number; time: number; vibe: number };
  currentEnergy: number;
  onUnlock: () => void;
}

const SkillDetail: React.FC<SkillDetailProps> = ({
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

// ============================================================================
// Monologue Overlay
// ============================================================================

interface MonologueOverlayProps {
  text: string;
  onDismiss: () => void;
}

const MonologueOverlay: React.FC<MonologueOverlayProps> = ({ text, onDismiss }) => (
  <div
    onClick={onDismiss}
    className="bg-gradient-to-r from-amber-950/50 to-purple-950/50 border border-amber-700/40 rounded-lg p-6 cursor-pointer hover:bg-amber-950/60 transition-colors"
  >
    <div className="flex items-start gap-4">
      <Sparkles className="w-6 h-6 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
      <div>
        <div className="text-[10px] uppercase text-amber-400/70 tracking-wider mb-2">领悟</div>
        <p className="text-stone-200 italic leading-relaxed">{text}</p>
        <p className="text-[10px] text-stone-500 mt-3">点击关闭</p>
      </div>
    </div>
  </div>
);

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
import { Sparkles } from 'lucide-react';
import { useCharacterAbility } from '../../hooks/useCharacterAbility';
import {
  SkillId,
  AbilityPanelData,
} from '../../systems/characterAbility/types';
import { SKILL_DEFINITIONS } from '../../systems/characterAbility/skillDefinitions';

import { EssenceBar } from './ability/EssenceBar';
import { NewbieGuide } from './ability/NewbieGuide';
import { MonologueOverlay } from './ability/MonologueOverlay';
import { SkillTree } from './ability/SkillTree';
import { SkillDetailCard } from './ability/SkillDetailCard';

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
    essenceDiscount,
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
            />
          </div>

          {/* Right: Detail Panel */}
          <div className="w-80 shrink-0">
            {selectedSkill ? (
              <SkillDetailCard
                skill={selectedSkill}
                essenceBalance={panelData.essenceBalance}
                currentEnergy={panelData.currentEnergy}
                onUnlock={() => handleUnlock(selectedSkill.def.id)}
                essenceDiscount={essenceDiscount}
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

/**
 * Shared constants for AbilityPanel sub-components.
 */

export const PATH_COLORS = {
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

export type PathKey = keyof typeof PATH_COLORS;

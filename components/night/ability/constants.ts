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
    hex: '#3b82f6',
    hexDim: '#1e3a5f',
  },
  TIME: {
    bg: 'bg-amber-950/50',
    border: 'border-amber-700',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/30',
    line: 'border-amber-700/60',
    label: '旧影',
    icon: '📜',
    hex: '#f59e0b',
    hexDim: '#78450a',
  },
  VIBE: {
    bg: 'bg-purple-950/50',
    border: 'border-purple-700',
    text: 'text-purple-400',
    glow: 'shadow-purple-500/30',
    line: 'border-purple-700/60',
    label: '灵韵',
    icon: '🎨',
    hex: '#a855f7',
    hexDim: '#4c1d95',
  },
  TIME_CRAFT: {
    bg: 'bg-red-950/40',
    border: 'border-red-800',
    text: 'text-red-400',
    glow: 'shadow-red-500/30',
    line: 'border-red-800/60',
    label: '暗路',
    icon: '🗡️',
    hex: '#ef4444',
    hexDim: '#7f1d1d',
  },
  CRAFT_VIBE: {
    bg: 'bg-emerald-950/40',
    border: 'border-emerald-700',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/30',
    line: 'border-emerald-700/60',
    label: '明路',
    icon: '🌟',
    hex: '#10b981',
    hexDim: '#064e3b',
  },
  TIME_VIBE: {
    bg: 'bg-cyan-950/40',
    border: 'border-cyan-700',
    text: 'text-cyan-400',
    glow: 'shadow-cyan-500/30',
    line: 'border-cyan-700/60',
    label: '慧路',
    icon: '👁️',
    hex: '#06b6d4',
    hexDim: '#164e63',
  },
} as const;

export type PathKey = keyof typeof PATH_COLORS;

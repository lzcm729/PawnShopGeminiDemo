/**
 * S3-I2: Essence color system
 * CRAFT = cold blue, TIME = warm yellow, VIBE = light purple
 */
export const ESSENCE_COLORS: Record<string, {
  bg: string;
  border: string;
  text: string;
  bar: string;
  glow: string;
}> = {
  CRAFT: {
    bg: 'bg-blue-950/50',
    border: 'border-blue-700',
    text: 'text-blue-400',
    bar: 'bg-blue-500',
    glow: 'shadow-blue-500/20',
  },
  TIME: {
    bg: 'bg-amber-950/50',
    border: 'border-amber-700',
    text: 'text-amber-400',
    bar: 'bg-amber-500',
    glow: 'shadow-amber-500/20',
  },
  VIBE: {
    bg: 'bg-purple-950/50',
    border: 'border-purple-700',
    text: 'text-purple-400',
    bar: 'bg-purple-500',
    glow: 'shadow-purple-500/20',
  },
  BALANCED: {
    bg: 'bg-stone-800/50',
    border: 'border-stone-600',
    text: 'text-stone-400',
    bar: 'bg-stone-500',
    glow: '',
  },
};

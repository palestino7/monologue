const LEGACY_ICON_EMOJIS: Record<string, string> = {
  BookOpen: '📚',
  Heart: '❤️',
  Wallet: '👛',
  Target: '🎯',
  Sparkles: '✨',
  Code: '💻',
  Lightbulb: '💡',
};

export const THREAD_COLORS = [
  '#3FAE68',
  '#2EAAA4',
  '#3F83D1',
  '#8067D4',
  '#C25391',
  '#D45858',
  '#DE783B',
  '#C99A32',
] as const satisfies readonly PaletteColor[];

export const DEFAULT_THREAD_ICON = 'MessageSquare';
export const DEFAULT_THREAD_COLOR: ThreadColor = 'neutral';
export const DEFAULT_CATEGORY_COLOR: PaletteColor = THREAD_COLORS[1];

export const THREAD_COLOR_NAMES: Record<PaletteColor, string> = {
  '#3FAE68': 'Verde',
  '#2EAAA4': 'Teal',
  '#3F83D1': 'Azul',
  '#8067D4': 'Violeta',
  '#C25391': 'Magenta',
  '#D45858': 'Vermelho',
  '#DE783B': 'Laranja',
  '#C99A32': 'Ocre',
};

export function getThreadColorName(color: PaletteColor) {
  return THREAD_COLOR_NAMES[color];
}

export function getThreadEmoji(value: string): string {
  return LEGACY_ICON_EMOJIS[value] ?? value ?? DEFAULT_THREAD_ICON;
}
import type { PaletteColor, ThreadColor } from '../types';

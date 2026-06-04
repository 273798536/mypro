import type { PaletteColor } from '@/types/staining'

export const PALETTE_COLORS: PaletteColor[] = [
  { index: 0, name: '未染色', hex: '#F3F4F6' },
  { index: 1, name: '苏木精紫', hex: '#7C3AED' },
  { index: 2, name: '伊红红', hex: '#EF4444' },
  { index: 3, name: '特殊绿', hex: '#10B981' },
]

export const COLOR_NAMES: Record<number, string> = {
  0: '未染色',
  1: '苏木精紫',
  2: '伊红红',
  3: '特殊绿',
}

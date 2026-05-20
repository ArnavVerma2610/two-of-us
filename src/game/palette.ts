// Central color tokens. Mirrors the CSS variables defined in styles/pixel.css.
// Keep these two sources in sync.

export const palette = {
  ink: '#15131C',
  bone: '#F4ECDC',
  cyanPop: '#2EC4D6',
  orangePop: '#FF7A2A',
  redAccent: '#E63946',
  gold: '#F2B33D',
  mint: '#7FD6A8',
  violet: '#6B5BD2',
  grayGrid: '#2A2735',
  bgDeep: '#0B0A12',
} as const

export type PaletteKey = keyof typeof palette

// The 24-swatch curated picker used in Level 1 (Q3 — "Top 5 colours").
// A mix of brights, pastels, darks and neons.
export const swatch24: string[] = [
  '#E63946', // red
  '#FF7A2A', // orange
  '#F2B33D', // gold
  '#FCEE74', // bright yellow
  '#7FD6A8', // mint
  '#2EC4D6', // cyan
  '#3A86FF', // blue
  '#6B5BD2', // violet
  '#B14AED', // purple
  '#FF5DA2', // hot pink
  '#FFB3C6', // pastel pink
  '#FFD6A5', // pastel peach
  '#CAFFBF', // pastel green
  '#9BF6FF', // pastel cyan
  '#BDB2FF', // pastel violet
  '#FDFFB6', // pastel lemon
  '#06D6A0', // neon green
  '#00F5D4', // neon teal
  '#F15BB5', // neon magenta
  '#FEE440', // neon yellow
  '#8D5524', // brown
  '#4A4E69', // slate
  '#F4ECDC', // bone
  '#15131C', // ink
]

// Extra tones layered on top of the core palette for the Level 2 canvas grid (4x6 = 24).
export const canvasColors: string[] = [
  '#15131C',
  '#3A3550',
  '#6B5BD2',
  '#3A86FF',
  '#2EC4D6',
  '#00F5D4',
  '#06D6A0',
  '#7FD6A8',
  '#CAFFBF',
  '#FDFFB6',
  '#FEE440',
  '#F2B33D',
  '#FF7A2A',
  '#E63946',
  '#F15BB5',
  '#FF5DA2',
  '#FFB3C6',
  '#FFD6A5',
  '#B14AED',
  '#9BF6FF',
  '#8D5524',
  '#4A4E69',
  '#A8A29A',
  '#F4ECDC',
]

// Stage palettes, enemy tuning, and layouts for Level 5 — "Bits of New Sense".

export type StagePalette = { sky1: string; sky2: string; ground: string; accent: string; name: string }

export const STAGE_PALETTES: StagePalette[] = [
  { name: 'THE WAKE UP', sky1: '#FFB199', sky2: '#FFD9A8', ground: '#A67C52', accent: '#FF7A2A' },
  { name: 'THE CROWD', sky1: '#7FD6A8', sky2: '#F2B33D', ground: '#3D6B4A', accent: '#E63946' },
  { name: 'THE STATIC', sky1: '#2A1F4D', sky2: '#6B5BD2', ground: '#1A1530', accent: '#F2B33D' },
]

export type EnemyType = 'eyebot' | 'speakerbot' | 'tonguebot' | 'pricklebot' | 'voidbot'
export type ProjType = 'sight' | 'sound' | 'taste' | 'touch' | 'blindness'

export const ENEMY_CONFIG: Record<EnemyType, { proj: ProjType; cadence: number; speed: number; color: string }> = {
  eyebot: { proj: 'sight', cadence: 2000, speed: 4, color: '#2EC4D6' },
  speakerbot: { proj: 'sound', cadence: 2500, speed: 2, color: '#ED3E8E' },
  tonguebot: { proj: 'taste', cadence: 1800, speed: 3, color: '#9ACD32' },
  pricklebot: { proj: 'touch', cadence: 2200, speed: 3, color: '#F47B2A' },
  voidbot: { proj: 'blindness', cadence: 6000, speed: 1.5, color: '#3A2A60' },
}

export type Platform = { x: number; y: number; w: number; h: number; type: 'ground' | 'platform' }
export type EnemySpawn = { type: EnemyType; x: number; y: number; facing: 'left' | 'right' }
export type PowerVariant = 'leaf' | 'droplet' | 'wind' | 'plant'
export type PowerSpawn = { x: number; y: number; variant: PowerVariant }
export type Vec = { x: number; y: number }
export type StageLayout = {
  worldWidth: number
  worldHeight: number
  spawn: Vec
  platforms: Platform[]
  enemies: EnemySpawn[]
  powerups: PowerSpawn[]
  checkpoints: Vec[]
}

const GY = 480 // ground top

// --- Stage 1 — THE WAKE UP (sight + sound, gentle) -------------------------
const stage1: StageLayout = {
  worldWidth: 3600,
  worldHeight: 540,
  spawn: { x: 60, y: GY - 40 },
  platforms: [
    { x: 0, y: GY, w: 1140, h: 60, type: 'ground' },
    { x: 1280, y: GY, w: 880, h: 60, type: 'ground' },
    { x: 2300, y: GY, w: 1300, h: 60, type: 'ground' },
    { x: 760, y: 400, w: 150, h: 20, type: 'platform' },
    { x: 1500, y: 400, w: 150, h: 20, type: 'platform' },
    { x: 1840, y: 350, w: 130, h: 20, type: 'platform' },
    { x: 2600, y: 400, w: 150, h: 20, type: 'platform' },
    { x: 2980, y: 360, w: 150, h: 20, type: 'platform' },
  ],
  enemies: [
    { type: 'eyebot', x: 560, y: 320, facing: 'left' },
    { type: 'speakerbot', x: 900, y: 430, facing: 'left' },
    { type: 'eyebot', x: 1380, y: 300, facing: 'left' },
    { type: 'eyebot', x: 1700, y: 320, facing: 'left' },
    { type: 'speakerbot', x: 1980, y: 430, facing: 'left' },
    { type: 'eyebot', x: 2420, y: 300, facing: 'left' },
    { type: 'speakerbot', x: 2720, y: 430, facing: 'left' },
    { type: 'eyebot', x: 3050, y: 300, facing: 'left' },
    { type: 'eyebot', x: 3300, y: 320, facing: 'left' },
    { type: 'speakerbot', x: 3450, y: 430, facing: 'left' },
  ],
  powerups: [
    { x: 800, y: 360, variant: 'leaf' },
    { x: 1540, y: 360, variant: 'droplet' },
    { x: 2640, y: 360, variant: 'wind' },
    { x: 3200, y: 430, variant: 'plant' },
  ],
  checkpoints: [
    { x: 60, y: GY - 40 },
    { x: 1320, y: GY - 40 },
    { x: 2340, y: GY - 40 },
  ],
}

// --- Stage 2 — THE CROWD (adds taste + touch, busier) ----------------------
const stage2: StageLayout = {
  worldWidth: 3600,
  worldHeight: 540,
  spawn: { x: 60, y: GY - 40 },
  platforms: [
    { x: 0, y: GY, w: 1000, h: 60, type: 'ground' },
    { x: 1140, y: GY, w: 760, h: 60, type: 'ground' },
    { x: 2040, y: GY, w: 700, h: 60, type: 'ground' },
    { x: 2880, y: GY, w: 720, h: 60, type: 'ground' },
    { x: 700, y: 400, w: 130, h: 20, type: 'platform' },
    { x: 1280, y: 380, w: 130, h: 20, type: 'platform' },
    { x: 1600, y: 340, w: 120, h: 20, type: 'platform' },
    { x: 2200, y: 390, w: 130, h: 20, type: 'platform' },
    { x: 2520, y: 350, w: 120, h: 20, type: 'platform' },
    { x: 3050, y: 380, w: 140, h: 20, type: 'platform' },
  ],
  enemies: [
    { type: 'eyebot', x: 520, y: 320, facing: 'left' },
    { type: 'tonguebot', x: 760, y: 360, facing: 'left' },
    { type: 'speakerbot', x: 1180, y: 430, facing: 'left' },
    { type: 'pricklebot', x: 1340, y: 340, facing: 'left' },
    { type: 'eyebot', x: 1640, y: 300, facing: 'left' },
    { type: 'tonguebot', x: 1880, y: 360, facing: 'left' },
    { type: 'speakerbot', x: 2160, y: 430, facing: 'left' },
    { type: 'pricklebot', x: 2380, y: 360, facing: 'left' },
    { type: 'eyebot', x: 2620, y: 300, facing: 'left' },
    { type: 'tonguebot', x: 2820, y: 360, facing: 'left' },
    { type: 'speakerbot', x: 3020, y: 430, facing: 'left' },
    { type: 'pricklebot', x: 3220, y: 360, facing: 'left' },
    { type: 'eyebot', x: 3380, y: 300, facing: 'left' },
    { type: 'tonguebot', x: 3120, y: 340, facing: 'left' },
    { type: 'voidbot', x: 3460, y: 320, facing: 'left' }, // preview
  ],
  powerups: [
    { x: 720, y: 360, variant: 'leaf' },
    { x: 1620, y: 300, variant: 'droplet' },
    { x: 2540, y: 310, variant: 'wind' },
    { x: 3260, y: 430, variant: 'plant' },
  ],
  checkpoints: [
    { x: 60, y: GY - 40 },
    { x: 1180, y: GY - 40 },
    { x: 2080, y: GY - 40 },
  ],
}

// --- Stage 3 — THE STATIC (blindness gauntlet) -----------------------------
const stage3: StageLayout = {
  worldWidth: 3600,
  worldHeight: 540,
  spawn: { x: 60, y: GY - 40 },
  platforms: [
    { x: 0, y: GY, w: 1200, h: 60, type: 'ground' },
    { x: 1340, y: GY, w: 900, h: 60, type: 'ground' },
    { x: 2380, y: GY, w: 1220, h: 60, type: 'ground' },
    { x: 760, y: 400, w: 160, h: 20, type: 'platform' },
    { x: 1500, y: 400, w: 200, h: 20, type: 'platform' },
    { x: 2500, y: 400, w: 200, h: 20, type: 'platform' },
    { x: 2900, y: 380, w: 160, h: 20, type: 'platform' },
  ],
  enemies: [
    { type: 'eyebot', x: 520, y: 320, facing: 'left' },
    { type: 'voidbot', x: 820, y: 320, facing: 'left' },
    { type: 'speakerbot', x: 1080, y: 430, facing: 'left' },
    { type: 'voidbot', x: 1420, y: 320, facing: 'left' },
    { type: 'tonguebot', x: 1640, y: 360, facing: 'left' },
    { type: 'voidbot', x: 1900, y: 320, facing: 'left' },
    { type: 'pricklebot', x: 2120, y: 360, facing: 'left' },
    { type: 'eyebot', x: 2300, y: 300, facing: 'left' },
    { type: 'voidbot', x: 2520, y: 320, facing: 'left' },
    { type: 'speakerbot', x: 2760, y: 430, facing: 'left' },
    { type: 'voidbot', x: 2980, y: 320, facing: 'left' },
    { type: 'tonguebot', x: 3160, y: 360, facing: 'left' },
    { type: 'pricklebot', x: 3320, y: 360, facing: 'left' },
    { type: 'eyebot', x: 3460, y: 300, facing: 'left' },
    { type: 'voidbot', x: 3380, y: 320, facing: 'left' },
    { type: 'speakerbot', x: 1760, y: 430, facing: 'left' },
  ],
  powerups: [
    { x: 780, y: 360, variant: 'leaf' },
    { x: 1560, y: 360, variant: 'droplet' },
    { x: 2560, y: 360, variant: 'wind' },
    { x: 3050, y: 340, variant: 'plant' },
  ],
  checkpoints: [
    { x: 60, y: GY - 40 },
    { x: 1360, y: GY - 40 },
    { x: 2400, y: GY - 40 },
  ],
}

export const STAGE_LAYOUTS: StageLayout[] = [stage1, stage2, stage3]

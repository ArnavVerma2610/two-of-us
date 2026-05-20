import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PlayerAnswers = {
  name: string
  food: string
  hobbies: string[]
  colors: string[]
  movie: string
  genre: string
}

export const emptyAnswers = (): PlayerAnswers => ({
  name: '',
  food: '',
  hobbies: [],
  colors: [],
  movie: '',
  genre: '',
})

export type Settings = {
  musicVolume: number // 0-100
  sfxVolume: number // 0-100
  musicMuted: boolean
  sfxMuted: boolean
}

export type Level1State = {
  p1: PlayerAnswers | null
  p2: PlayerAnswers | null
  currentPlayer: 1 | 2
  currentQuestion: number
}

export const TOTAL_LEVELS = 12

interface GameStore {
  // Progress
  completedLevels: number[]
  levelScores: Record<number, number>
  currentLevel: number | null
  hasSave: boolean

  // Level 1
  level1: Level1State

  // Level 2
  level2: { artwork: string | null }

  // Settings
  settings: Settings

  // Actions
  startNewGame: () => void
  continueGame: () => void
  setCurrentLevel: (n: number | null) => void
  completeLevel: (n: number, score?: number) => void
  isUnlocked: (n: number) => boolean

  // Level 1 actions
  setLevel1Answer: (player: 1 | 2, field: keyof PlayerAnswers, value: PlayerAnswers[keyof PlayerAnswers]) => void
  setLevel1Cursor: (player: 1 | 2, question: number) => void
  resetLevel1: () => void

  // Level 2 actions
  saveLevel2Artwork: (dataURL: string) => void

  // Settings + reset
  resetProgress: () => void
  updateSettings: (partial: Partial<Settings>) => void
}

const freshLevel1 = (): Level1State => ({
  p1: null,
  p2: null,
  currentPlayer: 1,
  currentQuestion: 0,
})

export const useGame = create<GameStore>()(
  persist(
    (set, get) => ({
      completedLevels: [],
      levelScores: {},
      currentLevel: null,
      hasSave: false,

      level1: freshLevel1(),
      level2: { artwork: null },

      settings: {
        musicVolume: 70,
        sfxVolume: 80,
        musicMuted: false,
        sfxMuted: false,
      },

      startNewGame: () =>
        set({
          completedLevels: [],
          levelScores: {},
          currentLevel: null,
          hasSave: true,
          level1: freshLevel1(),
          level2: { artwork: null },
        }),

      continueGame: () => set({ hasSave: true }),

      setCurrentLevel: (n) => set({ currentLevel: n }),

      completeLevel: (n, score) =>
        set((state) => {
          const completed = state.completedLevels.includes(n)
            ? state.completedLevels
            : [...state.completedLevels, n].sort((a, b) => a - b)
          const scores = { ...state.levelScores }
          if (typeof score === 'number') scores[n] = score
          return { completedLevels: completed, levelScores: scores, hasSave: true }
        }),

      isUnlocked: (n) => {
        if (n <= 1) return true
        return get().completedLevels.includes(n - 1)
      },

      setLevel1Answer: (player, field, value) =>
        set((state) => {
          const key = player === 1 ? 'p1' : 'p2'
          const current = state.level1[key] ?? emptyAnswers()
          return {
            level1: {
              ...state.level1,
              [key]: { ...current, [field]: value },
            },
          }
        }),

      setLevel1Cursor: (player, question) =>
        set((state) => ({
          level1: { ...state.level1, currentPlayer: player, currentQuestion: question },
        })),

      resetLevel1: () => set({ level1: freshLevel1() }),

      saveLevel2Artwork: (dataURL) => set({ level2: { artwork: dataURL }, hasSave: true }),

      resetProgress: () =>
        set((state) => ({
          completedLevels: [],
          levelScores: {},
          currentLevel: null,
          hasSave: false,
          level1: freshLevel1(),
          level2: { artwork: null },
          // settings are intentionally preserved across a progress reset
          settings: state.settings,
        })),

      updateSettings: (partial) =>
        set((state) => ({ settings: { ...state.settings, ...partial } })),
    }),
    {
      name: 'two-of-us-save',
      version: 1,
    },
  ),
)

import type { PlayerAnswers } from './store'

export type Breakdown = {
  food: number
  hobbies: number
  colors: number
  movie: number
  music: number
}

export type CompatibilityResult = {
  total: number
  breakdown: Breakdown
}

// --- Levenshtein distance ---------------------------------------------------
export function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  if (m === 0) return n
  if (n === 0) return m

  const prev = new Array<number>(n + 1)
  const curr = new Array<number>(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j

  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }
  return prev[n]
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

// Normalized similarity in [0,1]; 1 means identical.
function similarity(a: string, b: string): number {
  const x = norm(a)
  const y = norm(b)
  if (!x && !y) return 0
  if (x === y) return 1
  const dist = levenshtein(x, y)
  const maxLen = Math.max(x.length, y.length)
  if (maxLen === 0) return 0
  return 1 - dist / maxLen
}

// Free-text score out of 20 with a bonus when the two strings share a whole word.
function textScore(a: string, b: string): number {
  if (!a.trim() || !b.trim()) return 0
  const sim = similarity(a, b)
  let score = sim * 16

  const wordsA = new Set(norm(a).split(' ').filter((w) => w.length > 2))
  const wordsB = new Set(norm(b).split(' ').filter((w) => w.length > 2))
  let sharedWord = false
  for (const w of wordsA) {
    if (wordsB.has(w)) {
      sharedWord = true
      break
    }
  }
  if (sharedWord) score += 4

  return Math.round(Math.min(20, score))
}

// --- Genre adjacency --------------------------------------------------------
export const adjacentGenres: Record<string, string[]> = {
  Pop: ['R&B', 'Electronic', 'Indie'],
  Rock: ['Metal', 'Indie'],
  'Hip-Hop': ['R&B', 'Electronic'],
  'R&B': ['Pop', 'Hip-Hop', 'Jazz'],
  Electronic: ['Pop', 'Hip-Hop'],
  Indie: ['Rock', 'Pop'],
  Jazz: ['Classical', 'R&B'],
  Classical: ['Jazz'],
  Metal: ['Rock'],
}

function musicScore(a: string, b: string): number {
  const x = a.trim()
  const y = b.trim()
  if (!x || !y) return 0
  if (norm(x) === norm(y)) return 20
  // adjacency check (case-sensitive against the canonical labels)
  if (adjacentGenres[x]?.includes(y) || adjacentGenres[y]?.includes(x)) return 12
  // "OTHER" free-text genres: fall back to fuzzy text matching
  return Math.max(4, textScore(x, y) - 4)
}

function overlapScore(a: string[], b: string[], per: number, cap = 20): number {
  const setB = new Set(b.map((v) => norm(v)))
  let count = 0
  const seen = new Set<string>()
  for (const v of a) {
    const key = norm(v)
    if (!key || seen.has(key)) continue
    seen.add(key)
    if (setB.has(key)) count++
  }
  return Math.min(cap, count * per)
}

function colorOverlap(a: string[], b: string[], per = 4, cap = 20): number {
  const setB = new Set(b.map((c) => c.toLowerCase()))
  let count = 0
  const seen = new Set<string>()
  for (const c of a) {
    const key = c.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    if (setB.has(key)) count++
  }
  return Math.min(cap, count * per)
}

export function computeCompatibility(p1: PlayerAnswers, p2: PlayerAnswers): CompatibilityResult {
  const breakdown: Breakdown = {
    food: textScore(p1.food, p2.food),
    hobbies: overlapScore(p1.hobbies, p2.hobbies, 4),
    colors: colorOverlap(p1.colors, p2.colors, 4),
    movie: textScore(p1.movie, p2.movie),
    music: musicScore(p1.genre, p2.genre),
  }
  const total = Math.min(
    100,
    breakdown.food + breakdown.hobbies + breakdown.colors + breakdown.movie + breakdown.music,
  )
  return { total, breakdown }
}

export function verdictFor(total: number): string {
  if (total <= 25) return 'OPPOSITES ATTRACT?'
  if (total <= 50) return 'ROOM TO GROW'
  if (total <= 75) return 'PRETTY IN SYNC'
  if (total <= 90) return 'KINDRED SPIRITS'
  return 'ONE SOUL, TWO BODIES'
}

export const categoryLabels: Record<keyof Breakdown, string> = {
  food: 'FOOD',
  hobbies: 'HOBBIES',
  colors: 'COLOURS',
  movie: 'MOVIE',
  music: 'MUSIC',
}

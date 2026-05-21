export type LevelMeta = {
  id: number
  name: string
  playable: boolean
}

export const LEVELS: LevelMeta[] = [
  { id: 1, name: 'First Impressions', playable: true },
  { id: 2, name: 'Memory Canvas', playable: true },
  { id: 3, name: 'Frame It', playable: true },
  { id: 4, name: 'Sense Sketch', playable: true },
  { id: 5, name: 'Side Quest', playable: true },
  { id: 6, name: 'Time Capsule', playable: true },
  { id: 7, name: 'Recipe for Us', playable: false },
  { id: 8, name: 'Constellation', playable: false },
  { id: 9, name: 'Mixtape', playable: false },
  { id: 10, name: 'Photo Booth', playable: false },
  { id: 11, name: 'Future Forecast', playable: false },
  { id: 12, name: 'Final Verdict', playable: false },
]

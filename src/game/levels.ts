export type LevelMeta = {
  id: number
  name: string
  playable: boolean
}

export const LEVELS: LevelMeta[] = [
  { id: 1, name: 'First Impressions', playable: true },
  { id: 2, name: 'Memory Canvas', playable: true },
  { id: 3, name: 'Sound Check', playable: false },
  { id: 4, name: 'Map of Us', playable: false },
  { id: 5, name: 'Time Capsule', playable: false },
  { id: 6, name: 'Fortune Teller', playable: false },
  { id: 7, name: 'Recipe for Us', playable: false },
  { id: 8, name: 'Constellation', playable: false },
  { id: 9, name: 'Mixtape', playable: false },
  { id: 10, name: 'Photo Booth', playable: false },
  { id: 11, name: 'Future Forecast', playable: false },
  { id: 12, name: 'Final Verdict', playable: false },
]

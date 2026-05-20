import { useMemo } from 'react'
import { allSprites, type Sprite, type SpriteName } from '../game/sprites'

type Props = {
  sprite: SpriteName | Sprite
  /** size of each logical pixel cell, in screen px */
  scale?: number
  className?: string
  title?: string
  /** optional flat tint override applied to every non-transparent cell */
  tint?: string
}

export default function PixelSprite({ sprite, scale = 6, className, title, tint }: Props) {
  const def: Sprite = typeof sprite === 'string' ? allSprites[sprite] : sprite
  const cols = useMemo(() => Math.max(...def.grid.map((r) => r.length)), [def])
  const rows = def.grid.length

  return (
    <div
      className={className}
      title={title}
      role="img"
      aria-label={title}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, ${scale}px)`,
        gridTemplateRows: `repeat(${rows}, ${scale}px)`,
        width: cols * scale,
        height: rows * scale,
        imageRendering: 'pixelated',
      }}
    >
      {def.grid.flatMap((row, y) => {
        const cells = []
        for (let x = 0; x < cols; x++) {
          const ch = row[x] ?? ' '
          const transparent = ch === ' ' || ch === '.' || ch === undefined
          const color = transparent ? 'transparent' : tint ?? def.legend[ch] ?? 'transparent'
          cells.push(
            <div
              key={`${x}-${y}`}
              style={{ width: scale, height: scale, backgroundColor: color }}
            />,
          )
        }
        return cells
      })}
    </div>
  )
}

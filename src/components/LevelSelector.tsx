import { useEffect, useState } from 'react'
import { useNav } from '../nav'
import { useGame, TOTAL_LEVELS } from '../game/store'
import { LEVELS } from '../game/levels'
import { audio } from '../game/audio'
import PixelButton from './PixelButton'
import PixelSprite from './PixelSprite'
import SoundToggle from './SoundToggle'

const COLS = 4

export default function LevelSelector() {
  const nav = useNav()
  const { completedLevels, levelScores, isUnlocked, level2, level3 } = useGame()
  const [focus, setFocus] = useState(0)

  const open = (id: number) => {
    if (!isUnlocked(id)) {
      audio.sfx('back')
      return
    }
    audio.sfx('submit')
    nav({ name: 'level', level: id })
  }

  // arrow-key navigation across the grid
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        audio.sfx('back')
        nav({ name: 'home' })
        return
      }
      let next = focus
      if (e.key === 'ArrowRight') next = Math.min(TOTAL_LEVELS - 1, focus + 1)
      else if (e.key === 'ArrowLeft') next = Math.max(0, focus - 1)
      else if (e.key === 'ArrowDown') next = Math.min(TOTAL_LEVELS - 1, focus + COLS)
      else if (e.key === 'ArrowUp') next = Math.max(0, focus - COLS)
      else if (e.key === 'Enter') {
        open(LEVELS[focus].id)
        return
      } else return
      e.preventDefault()
      if (next !== focus) {
        setFocus(next)
        audio.sfx('select')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focus])

  return (
    <main className="px-4 py-6" style={{ minHeight: '100vh' }}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <PixelButton variant="bone" sfx="back" onClick={() => nav({ name: 'home' })}>
          ← BACK
        </PixelButton>
        <p className="font-press" style={{ fontSize: 12, color: 'var(--gold)' }}>
          {completedLevels.length} / {TOTAL_LEVELS} COMPLETE
        </p>
        <SoundToggle />
      </div>

      <h2
        className="font-press text-center mb-8"
        style={{ fontSize: 'clamp(14px, 4vw, 22px)', color: 'var(--bone)' }}
      >
        CHARACTER... er, LEVEL SELECT
      </h2>

      <div
        className="mx-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, minmax(80px, 120px))`,
          gap: 16,
          justifyContent: 'center',
          maxWidth: 640,
        }}
      >
        {LEVELS.map((lvl, i) => {
          const unlocked = isUnlocked(lvl.id)
          const completed = completedLevels.includes(lvl.id)
          const score = levelScores[lvl.id]
          const isFocused = focus === i
          const bg = !unlocked ? 'var(--gray-grid)' : completed ? 'var(--mint)' : 'var(--cyan-pop)'
          const thumb =
            lvl.id === 2 ? level2.artwork : lvl.id === 3 ? level3.framed : null

          return (
            <div key={lvl.id} className="flex flex-col items-center" style={{ gap: 6 }}>
              <button
                onClick={() => open(lvl.id)}
                onMouseEnter={() => {
                  setFocus(i)
                  if (unlocked) audio.sfx('select')
                }}
                disabled={!unlocked}
                aria-label={`Level ${lvl.id}: ${lvl.name}${unlocked ? '' : ' (locked)'}`}
                className={`pixel-btn no-select ${unlocked && !completed ? 'tile-pulse' : ''}`}
                style={{
                  backgroundColor: bg,
                  width: '100%',
                  aspectRatio: '1 / 1',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: unlocked ? 'pointer' : 'not-allowed',
                  opacity: unlocked ? 1 : 0.65,
                  filter: unlocked ? 'none' : 'grayscale(0.6)',
                  transform: isFocused && unlocked ? 'translateY(-2px)' : 'none',
                  boxShadow: isFocused && unlocked ? '5px 7px 0 0 var(--ink)' : '3px 3px 0 0 var(--ink)',
                }}
              >
                {/* Levels 2 & 3 show a thumbnail of the player's creation when complete */}
                {completed && thumb ? (
                  <img
                    src={thumb}
                    alt={`Your ${lvl.name}`}
                    style={{ width: '78%', height: '78%', objectFit: 'cover', border: '2px solid var(--ink)' }}
                  />
                ) : (
                  <span className="font-press" style={{ fontSize: 20, color: 'var(--ink)' }}>
                    {lvl.id}
                  </span>
                )}

                {!unlocked && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PixelSprite sprite="lock" scale={4} />
                  </div>
                )}

                {completed && (
                  <div style={{ position: 'absolute', top: 2, right: 2 }}>
                    <PixelSprite sprite="check" scale={3} />
                  </div>
                )}

                {completed && typeof score === 'number' && (
                  <div
                    className="font-press"
                    style={{
                      position: 'absolute',
                      bottom: 2,
                      left: 2,
                      fontSize: 8,
                      background: 'var(--ink)',
                      color: 'var(--gold)',
                      padding: '2px 3px',
                    }}
                  >
                    {score}
                  </div>
                )}
              </button>
              <span
                className="font-vt"
                style={{ fontSize: 16, color: unlocked ? 'var(--bone)' : 'var(--gray-grid)', textAlign: 'center', lineHeight: 1.1 }}
              >
                {lvl.name}
              </span>
            </div>
          )
        })}
      </div>
    </main>
  )
}

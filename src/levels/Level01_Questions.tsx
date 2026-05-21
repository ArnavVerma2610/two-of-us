import { useEffect, useMemo, useState } from 'react'
import { useNav, nextAfterLevel } from '../nav'
import { useGame, emptyAnswers, type PlayerAnswers } from '../game/store'
import { audio } from '../game/audio'
import { swatch24 } from '../game/palette'
import {
  computeCompatibility,
  verdictFor,
  categoryLabels,
  type Breakdown,
} from '../game/compatibility'
import PixelButton from '../components/PixelButton'
import PixelFrame from '../components/PixelFrame'
import PixelSprite from '../components/PixelSprite'

const GENRES = ['Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Indie', 'Jazz', 'Classical', 'Metal']
const GENRE_ICON: Record<string, string> = {
  Pop: '★',
  Rock: '🎸',
  'Hip-Hop': '🎤',
  'R&B': '♪',
  Electronic: '🎛',
  Indie: '🎧',
  Jazz: '🎺',
  Classical: '🎻',
  Metal: '🤘',
}

function isComplete(a: PlayerAnswers): boolean {
  return (
    a.name.trim().length > 0 &&
    a.food.trim().length > 0 &&
    a.hobbies.length > 0 &&
    a.colors.length > 0 &&
    a.movie.trim().length > 0 &&
    a.genre.trim().length > 0
  )
}

export default function Level01_Questions() {
  const nav = useNav()
  const { level1, setLevel1Answer, completeLevel, resetLevel1 } = useGame()

  const [p1, setP1] = useState<PlayerAnswers>(level1.p1 ?? emptyAnswers())
  const [p2, setP2] = useState<PlayerAnswers>(level1.p2 ?? emptyAnswers())
  const [phase, setPhase] = useState<'play' | 'reveal'>('play')

  // persist live so CONTINUE works
  useEffect(() => {
    ;(Object.keys(p1) as (keyof PlayerAnswers)[]).forEach((k) => setLevel1Answer(1, k, p1[k]))
  }, [p1, setLevel1Answer])
  useEffect(() => {
    ;(Object.keys(p2) as (keyof PlayerAnswers)[]).forEach((k) => setLevel1Answer(2, k, p2[k]))
  }, [p2, setLevel1Answer])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase === 'play') {
        audio.sfx('back')
        nav({ name: 'selector' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav, phase])

  const bothReady = isComplete(p1) && isComplete(p2)

  const update1 = <K extends keyof PlayerAnswers>(f: K, v: PlayerAnswers[K]) =>
    setP1((d) => ({ ...d, [f]: v }))
  const update2 = <K extends keyof PlayerAnswers>(f: K, v: PlayerAnswers[K]) =>
    setP2((d) => ({ ...d, [f]: v }))

  if (phase === 'reveal') {
    return (
      <RevealScreen
        p1={p1}
        p2={p2}
        onContinue={(total) => {
          completeLevel(1, total)
          audio.sfx('unlock')
          nav(nextAfterLevel())
        }}
        onPlayAgain={() => {
          const blank = emptyAnswers()
          setP1(blank)
          setP2({ ...blank })
          resetLevel1()
          setPhase('play')
          window.scrollTo(0, 0)
        }}
      />
    )
  }

  return (
    <main className="px-3 py-5" style={{ minHeight: '100vh' }}>
      {/* top bar */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <PixelButton variant="bone" size="sm" sfx="back" onClick={() => nav({ name: 'selector' })}>
          ← BACK
        </PixelButton>
        <h2 className="font-press" style={{ fontSize: 'clamp(11px,3vw,16px)', color: 'var(--gold)' }}>
          FIRST IMPRESSIONS
        </h2>
        <span style={{ width: 50 }} />
      </div>

      <p className="font-vt text-center mb-4" style={{ fontSize: 20, color: 'var(--bone)' }}>
        Both of you, fill in your side. Then reveal how in sync you are.
      </p>

      {/* VS split — two columns side by side */}
      <div
        className="mx-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
          maxWidth: 980,
          alignItems: 'start',
        }}
      >
        <PlayerColumn player={1} value={p1} update={update1} />
        <PlayerColumn player={2} value={p2} update={update2} />
      </div>

      {/* VS badge + reveal */}
      <div className="flex flex-col items-center gap-3 mt-7">
        <div className="flex items-center gap-3">
          <PixelSprite sprite="heart" scale={4} />
          <span className="font-press" style={{ fontSize: 18, color: 'var(--red-accent)', textShadow: '2px 2px 0 var(--ink)' }}>
            VS
          </span>
          <PixelSprite sprite="heart" scale={4} />
        </div>
        <PixelButton
          variant="mint"
          size="lg"
          sfx={null}
          disabled={!bothReady}
          onClick={() => {
            audio.sfx('submit')
            setPhase('reveal')
            window.scrollTo(0, 0)
          }}
        >
          {bothReady ? 'CALCULATE COMPATIBILITY →' : 'BOTH PLAYERS: FILL EVERY FIELD'}
        </PixelButton>
        {!bothReady && (
          <p className="font-vt" style={{ fontSize: 16, color: 'var(--bone)', opacity: 0.7 }}>
            {isComplete(p1) ? '✓ P1 ready' : '… P1 in progress'} &nbsp;|&nbsp;{' '}
            {isComplete(p2) ? '✓ P2 ready' : '… P2 in progress'}
          </p>
        )}
      </div>
    </main>
  )
}

// ----------------------------------------------------------------------------
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-press" style={{ fontSize: 10, margin: '14px 0 6px', color: 'var(--ink)' }}>
      {children}
    </p>
  )
}

function PlayerColumn({
  player,
  value,
  update,
}: {
  player: 1 | 2
  value: PlayerAnswers
  update: <K extends keyof PlayerAnswers>(f: K, v: PlayerAnswers[K]) => void
}) {
  const accent = player === 1 ? 'var(--cyan-pop)' : 'var(--orange-pop)'
  const tint = player === 1 ? 'rgba(46,196,214,0.16)' : 'rgba(255,122,42,0.16)'
  const [tagInput, setTagInput] = useState('')
  const otherSelected = value.genre !== '' && !GENRES.includes(value.genre)

  return (
    <PixelFrame>
      <div style={{ background: tint, padding: 16, color: 'var(--ink)' }}>
        {/* header */}
        <div className="flex items-center gap-3" style={{ borderBottom: '3px solid var(--ink)', paddingBottom: 10 }}>
          <PixelSprite sprite={player === 1 ? 'p1' : 'p2'} scale={4} />
          <div style={{ flex: 1 }}>
            <p className="font-press" style={{ fontSize: 11, color: accent === 'var(--cyan-pop)' ? '#1C8C99' : '#C2531A' }}>
              PLAYER {player}
            </p>
            <input
              className="pixel-input w-full mt-1"
              style={{ fontSize: 20 }}
              maxLength={20}
              placeholder="your name"
              aria-label={`Player ${player} name`}
              value={value.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </div>
        </div>

        {/* food */}
        <Label>FAVOURITE FOOD ON CAMPUS?</Label>
        <input
          className="pixel-input w-full"
          style={{ fontSize: 20 }}
          maxLength={40}
          placeholder="e.g. dining hall ramen"
          value={value.food}
          onChange={(e) => update('food', e.target.value)}
        />

        {/* hobbies */}
        <Label>HOBBIES? ({value.hobbies.length}/5)</Label>
        <div className="flex gap-2">
          <input
            className="pixel-input flex-1"
            style={{ fontSize: 18 }}
            placeholder="type, press Enter"
            value={tagInput}
            disabled={value.hobbies.length >= 5}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                const v = tagInput.trim()
                if (v && value.hobbies.length < 5 && !value.hobbies.includes(v)) {
                  update('hobbies', [...value.hobbies, v])
                  audio.sfx('click')
                }
                setTagInput('')
              }
            }}
          />
          <PixelButton
            variant={player === 1 ? 'cyan' : 'orange'}
            sfx="click"
            size="sm"
            disabled={!tagInput.trim() || value.hobbies.length >= 5}
            onClick={() => {
              const v = tagInput.trim()
              if (v && !value.hobbies.includes(v)) update('hobbies', [...value.hobbies, v])
              setTagInput('')
            }}
          >
            ADD
          </PixelButton>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {value.hobbies.map((h) => (
            <span key={h} className="pixel-pill" style={{ background: accent, color: 'var(--ink)' }}>
              {h}
              <button
                aria-label={`Remove ${h}`}
                onClick={() => {
                  update('hobbies', value.hobbies.filter((x) => x !== h))
                  audio.sfx('back')
                }}
                style={{ background: 'var(--ink)', color: 'var(--bone)', border: 'none', width: 18, height: 18, cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {/* colors */}
        <Label>TOP 5 COLOURS? ({value.colors.length}/5)</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 5 }}>
          {swatch24.map((c) => {
            const sel = value.colors.includes(c)
            return (
              <button
                key={c}
                aria-label={`Colour ${c}${sel ? ' selected' : ''}`}
                onClick={() => {
                  if (sel) {
                    update('colors', value.colors.filter((x) => x !== c))
                    audio.sfx('back')
                  } else if (value.colors.length < 5) {
                    update('colors', [...value.colors, c])
                    audio.sfx('select')
                  } else {
                    audio.sfx('back')
                  }
                }}
                style={{
                  background: c,
                  aspectRatio: '1/1',
                  border: sel ? '3px solid var(--ink)' : '2px solid var(--ink)',
                  boxShadow: sel ? `0 0 0 2px ${accent}` : 'none',
                  cursor: 'pointer',
                }}
              />
            )
          })}
        </div>
        <div className="flex gap-1 mt-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              style={{ width: 28, height: 28, border: '3px solid var(--ink)', background: value.colors[i] ?? 'var(--bone)' }}
            />
          ))}
        </div>

        {/* movie */}
        <Label>FAVOURITE MOVIE?</Label>
        <input
          className="pixel-input w-full"
          style={{ fontSize: 20 }}
          maxLength={60}
          placeholder="e.g. Spirited Away"
          value={value.movie}
          onChange={(e) => update('movie', e.target.value)}
        />

        {/* genre */}
        <Label>FAVOURITE MUSIC GENRE?</Label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
          {GENRES.map((g) => {
            const sel = value.genre === g
            return (
              <button
                key={g}
                onClick={() => {
                  update('genre', g)
                  audio.sfx('select')
                }}
                className="pixel-btn"
                style={{
                  background: sel ? accent : 'var(--bone)',
                  color: 'var(--ink)',
                  padding: '8px 2px',
                  fontFamily: 'VT323, monospace',
                  fontSize: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 18 }}>{GENRE_ICON[g]}</span>
                {g}
              </button>
            )
          })}
          <button
            onClick={() => {
              update('genre', otherSelected ? value.genre : ' ')
              audio.sfx('select')
            }}
            className="pixel-btn"
            style={{
              background: otherSelected ? accent : 'var(--bone)',
              color: 'var(--ink)',
              padding: '8px 2px',
              fontFamily: 'VT323, monospace',
              fontSize: 16,
              gridColumn: 'span 3',
            }}
          >
            OTHER…
          </button>
        </div>
        {otherSelected && (
          <input
            className="pixel-input w-full mt-2"
            style={{ fontSize: 18 }}
            placeholder="name your genre"
            maxLength={30}
            autoFocus
            value={value.genre.trim()}
            onChange={(e) => update('genre', e.target.value || ' ')}
          />
        )}
      </div>
    </PixelFrame>
  )
}

// ----------------------------------------------------------------------------
function RevealScreen({
  p1,
  p2,
  onContinue,
  onPlayAgain,
}: {
  p1: PlayerAnswers
  p2: PlayerAnswers
  onContinue: (total: number) => void
  onPlayAgain: () => void
}) {
  const result = useMemo(() => computeCompatibility(p1, p2), [p1, p2])
  const [stage, setStage] = useState<'calc' | 'reveal'>('calc')
  const [count, setCount] = useState(0)
  const [barsShown, setBarsShown] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => {
      setStage('reveal')
      audio.sfx('success')
    }, 2000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (stage !== 'reveal') return
    const duration = 1200
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setCount(Math.round(eased * result.total))
      if (t < 1) raf = requestAnimationFrame(tick)
      else {
        const order: (keyof Breakdown)[] = ['food', 'hobbies', 'colors', 'movie', 'music']
        order.forEach((_, i) => setTimeout(() => setBarsShown(i + 1), i * 250))
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [stage, result.total])

  if (stage === 'calc') {
    return (
      <main className="flex flex-col items-center justify-center px-4" style={{ minHeight: '100vh', background: 'var(--bg-deep)', textAlign: 'center' }}>
        <p className="font-press" style={{ fontSize: 'clamp(12px, 3.5vw, 18px)', color: 'var(--gold)', marginBottom: 24 }}>
          CALCULATING
          <br />
          COMPATIBILITY
        </p>
        <div>
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </div>
      </main>
    )
  }

  const order: (keyof Breakdown)[] = ['food', 'hobbies', 'colors', 'movie', 'music']

  return (
    <main className="flex flex-col items-center px-4 py-8" style={{ minHeight: '100vh', background: 'var(--bg-deep)', textAlign: 'center' }}>
      <p className="font-vt" style={{ fontSize: 24, color: 'var(--bone)', marginBottom: 6 }}>
        {p1.name || 'P1'} <span style={{ color: 'var(--red-accent)' }}>♥</span> {p2.name || 'P2'}
      </p>
      <div className="big-number" style={{ fontSize: 'clamp(56px, 18vw, 120px)', lineHeight: 1 }}>
        {count}
      </div>
      <p className="font-press" style={{ fontSize: 'clamp(14px, 4.5vw, 26px)', color: 'var(--red-accent)', margin: '14px 0 28px', textShadow: '2px 2px 0 var(--ink)' }}>
        {verdictFor(result.total)}
      </p>

      <div style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {order.map((cat, i) => {
          const val = result.breakdown[cat]
          const shown = barsShown > i
          return (
            <div key={cat}>
              <div className="flex justify-between font-vt" style={{ fontSize: 18, color: 'var(--bone)', marginBottom: 2 }}>
                <span>{categoryLabels[cat]}</span>
                <span style={{ color: 'var(--gold)' }}>{shown ? val : 0}/20</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${shown ? (val / 20) * 100 : 0}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-3 mt-10 flex-wrap justify-center">
        <PixelButton variant="bone" sfx="back" onClick={onPlayAgain}>
          PLAY AGAIN
        </PixelButton>
        <PixelButton variant="mint" sfx="submit" onClick={() => onContinue(result.total)}>
          CONTINUE →
        </PixelButton>
      </div>
    </main>
  )
}

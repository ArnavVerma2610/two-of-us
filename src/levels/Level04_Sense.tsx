import { useEffect, useRef, useState } from 'react'
import { useNav, nextAfterLevel } from '../nav'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import { palette } from '../game/palette'
import PixelButton from '../components/PixelButton'
import PixelFrame from '../components/PixelFrame'

const W = 180
const H = 135
const DURATION = 60

type Item = { name: string; emoji: string; note: string; clues: string[] }

const ITEMS: Item[] = [
  {
    name: 'A pinecone',
    emoji: '🌲',
    note: 'Stiff overlapping scales, dry and prickly.',
    clues: ['Rough, woody scales', 'Stiff but light as a feather', 'Prickly tips — sharp but won’t cut', 'Dry and papery in the gaps', 'Tapers to a rounded point'],
  },
  {
    name: 'A jellyfish',
    emoji: '🪼',
    note: 'A see-through dome trailing soft tendrils.',
    clues: ['Wet and slippery', 'Wobbles like loose jelly', 'Almost weightless', 'Translucent — light passes through', 'Long threads drifting beneath'],
  },
  {
    name: 'A worn leather wallet',
    emoji: '👛',
    note: 'Flexible, folded, and well-loved.',
    clues: ['Soft but deeply creased', 'Folds without ever snapping', 'Smooth one side, suede-rough the other', 'Warm to the touch', 'A faint sweet, smoky smell'],
  },
  {
    name: 'A cactus',
    emoji: '🌵',
    note: 'A plump, rigid body bristling with spines.',
    clues: ['Firm and swollen', 'Cool, waxy skin', 'Spines that bite if you grip', 'Heavier than it looks', 'Rigid — it never bends'],
  },
  {
    name: 'A wet sponge',
    emoji: '🧽',
    note: 'Soft, porous, and dripping.',
    clues: ['Squishy and yielding', 'Riddled with tiny holes', 'Springs back when squeezed', 'Cool and damp', 'Light, but it drips'],
  },
  {
    name: 'A conch shell',
    emoji: '🐚',
    note: 'A heavy spiral — rough outside, glassy within.',
    clues: ['Glass-smooth on the inside', 'Ridged and rough outside', 'Cool, and heavy for its size', 'Curls into a tight spiral', 'A hollow echo held to your ear'],
  },
]

const COLORS = ['#15131C', '#6B5BD2', '#2EC4D6', '#06D6A0', '#F2B33D', '#FF7A2A', '#E63946', '#F15BB5']

type Phase = 'ready' | 'drawing' | 'reveal'

export default function Level04_Sense() {
  const nav = useNav()
  const { saveLevel4Drawing, completeLevel } = useGame()

  const [item] = useState<Item>(() => ITEMS[Math.floor(Math.random() * ITEMS.length)])
  const [phase, setPhase] = useState<Phase>('ready')
  const [timeLeft, setTimeLeft] = useState(DURATION)
  const [drawingURL, setDrawingURL] = useState<string | null>(null)

  const [color, setColor] = useState<string>(palette.ink)
  const [erasing, setErasing] = useState(false)
  const [size, setSize] = useState(2)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)

  // init canvas when drawing begins
  useEffect(() => {
    if (phase !== 'drawing') return
    const cv = canvasRef.current!
    const ctx = cv.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = palette.bone
    ctx.fillRect(0, 0, W, H)
    ctxRef.current = ctx
  }, [phase])

  // countdown
  useEffect(() => {
    if (phase !== 'drawing') return
    if (timeLeft <= 0) {
      endDrawing()
      return
    }
    if (timeLeft <= 5) audio.sfx('click')
    const id = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, timeLeft])

  // escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        audio.sfx('back')
        nav({ name: 'selector' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav])

  const coords = (e: React.PointerEvent) => {
    const cv = canvasRef.current!
    const rect = cv.getBoundingClientRect()
    return {
      x: Math.floor(((e.clientX - rect.left) / rect.width) * W),
      y: Math.floor(((e.clientY - rect.top) / rect.height) * H),
    }
  }
  const dab = (x: number, y: number) => {
    const ctx = ctxRef.current!
    ctx.fillStyle = erasing ? palette.bone : color
    const s = erasing ? size + 2 : size
    ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s)
  }
  const line = (x0: number, y0: number, x1: number, y1: number) => {
    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx - dy
    let x = x0
    let y = y0
    for (;;) {
      dab(x, y)
      if (x === x1 && y === y1) break
      const e2 = 2 * err
      if (e2 > -dy) {
        err -= dy
        x += sx
      }
      if (e2 < dx) {
        err += dx
        y += sy
      }
    }
  }
  const onDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    const { x, y } = coords(e)
    drawing.current = true
    last.current = { x, y }
    dab(x, y)
    audio.sfx('paint')
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return
    const { x, y } = coords(e)
    line(last.current.x, last.current.y, x, y)
    last.current = { x, y }
  }
  const onUp = () => {
    drawing.current = false
    last.current = null
  }
  const clearAll = () => {
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.fillStyle = palette.bone
    ctx.fillRect(0, 0, W, H)
    audio.sfx('back')
  }

  const start = () => {
    setTimeLeft(DURATION)
    setPhase('drawing')
    audio.sfx('submit')
  }
  const endDrawing = () => {
    const cv = canvasRef.current
    const url = cv ? cv.toDataURL('image/png') : null
    if (url) {
      setDrawingURL(url)
      saveLevel4Drawing(url)
    }
    setPhase('reveal')
    audio.sfx('success')
  }
  const finish = () => {
    completeLevel(4)
    audio.sfx('unlock')
    nav(nextAfterLevel())
  }

  const timerColor = timeLeft > 20 ? palette.mint : timeLeft > 10 ? palette.gold : palette.redAccent

  return (
    <main className="px-3 py-4" style={{ minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <PixelButton variant="bone" size="sm" sfx="back" onClick={() => nav({ name: 'selector' })}>
          ← BACK
        </PixelButton>
        <h2 className="font-press" style={{ fontSize: 'clamp(11px,3vw,16px)', color: 'var(--gold)' }}>
          SENSE SKETCH
        </h2>
        <span style={{ width: 60 }} />
      </div>

      {phase === 'ready' && (
        <div className="flex justify-center mt-4">
          <PixelFrame style={{ maxWidth: 460, width: '100%' }}>
            <div style={{ padding: 24, color: 'var(--ink)' }}>
              <p className="font-press" style={{ fontSize: 12, color: 'var(--orange-pop)', marginBottom: 12 }}>
                THE GOAL
              </p>
              <p className="font-vt" style={{ fontSize: 20, lineHeight: 1.25, marginBottom: 18 }}>
                You can’t see the object — only how it <em>feels</em>. Draw the <strong>sensations</strong>:
                its textures, weight and form. Don’t try to guess and label what it is — chase the feeling.
              </p>
              <p className="font-press" style={{ fontSize: 11, marginBottom: 8 }}>
                IT FEELS LIKE…
              </p>
              <ul className="font-vt" style={{ fontSize: 20, lineHeight: 1.4, margin: '0 0 20px 0', paddingLeft: 18 }}>
                {item.clues.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="font-vt" style={{ fontSize: 18, opacity: 0.7, marginBottom: 18 }}>
                You’ll have 60 seconds once you start.
              </p>
              <div className="flex justify-end">
                <PixelButton variant="orange" size="lg" sfx="submit" onClick={start}>
                  START — 60s
                </PixelButton>
              </div>
            </div>
          </PixelFrame>
        </div>
      )}

      {phase === 'drawing' && (
        <div className="flex justify-center items-start gap-4 flex-wrap">
          {/* clues + timer */}
          <div className="flex flex-col gap-2" style={{ width: 200 }}>
            <div
              className="font-press"
              style={{
                fontSize: 30,
                textAlign: 'center',
                color: timerColor,
                background: 'var(--ink)',
                border: '3px solid var(--ink)',
                padding: '8px 0',
              }}
            >
              0:{String(timeLeft).padStart(2, '0')}
            </div>
            <PixelFrame>
              <div style={{ padding: 12, color: 'var(--ink)' }}>
                <p className="font-press" style={{ fontSize: 9, marginBottom: 6, color: 'var(--orange-pop)' }}>
                  IT FEELS LIKE…
                </p>
                <ul className="font-vt" style={{ fontSize: 17, lineHeight: 1.3, margin: 0, paddingLeft: 16 }}>
                  {item.clues.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            </PixelFrame>
            <p className="font-vt" style={{ fontSize: 15, color: 'var(--bone)', opacity: 0.7 }}>
              Draw the feeling, not the name.
            </p>
          </div>

          {/* canvas */}
          <div className="flex flex-col items-center gap-2">
            <PixelFrame>
              <div style={{ lineHeight: 0, touchAction: 'none' }}>
                <canvas
                  ref={canvasRef}
                  width={W}
                  height={H}
                  onPointerDown={onDown}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerLeave={onUp}
                  style={{
                    width: 'min(80vw, 520px)',
                    height: 'auto',
                    imageRendering: 'pixelated',
                    cursor: 'crosshair',
                    display: 'block',
                    background: palette.bone,
                  }}
                />
              </div>
            </PixelFrame>

            <div className="flex gap-2 items-center flex-wrap justify-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c)
                    setErasing(false)
                    audio.sfx('select')
                  }}
                  aria-label={`Color ${c}`}
                  style={{
                    width: 26,
                    height: 26,
                    background: c,
                    border: !erasing && color === c ? '3px solid var(--cyan-pop)' : '2px solid var(--ink)',
                    boxShadow: '2px 2px 0 var(--ink)',
                    cursor: 'pointer',
                  }}
                />
              ))}
              <button
                onClick={() => {
                  setErasing((v) => !v)
                  audio.sfx('click')
                }}
                className="pixel-btn"
                style={{ background: erasing ? 'var(--violet)' : 'var(--bone)', color: erasing ? 'var(--bone)' : 'var(--ink)', width: 44, height: 30, fontSize: 16 }}
              >
                ⬜
              </button>
              {[
                { label: 'S', v: 1 },
                { label: 'M', v: 3 },
                { label: 'L', v: 6 },
              ].map((s) => (
                <button
                  key={s.v}
                  onClick={() => {
                    setSize(s.v)
                    audio.sfx('click')
                  }}
                  className="pixel-btn"
                  style={{ background: size === s.v ? 'var(--cyan-pop)' : 'var(--bone)', color: 'var(--ink)', width: 30, height: 30, fontSize: 14 }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-1">
              <PixelButton variant="bone" sfx="back" onClick={clearAll}>
                CLEAR
              </PixelButton>
              <PixelButton variant="mint" sfx="submit" onClick={endDrawing}>
                REVEAL EARLY
              </PixelButton>
            </div>
          </div>
        </div>
      )}

      {phase === 'reveal' && (
        <div className="flex flex-col items-center gap-5 mt-3">
          <p className="font-vt text-center" style={{ fontSize: 22, color: 'var(--bone)' }}>
            Time’s up — here’s what it actually was. How close did the feeling get?
          </p>
          <div className="flex justify-center items-stretch gap-5 flex-wrap">
            <div className="flex flex-col items-center gap-2">
              <p className="font-press" style={{ fontSize: 10, color: 'var(--gold)' }}>
                YOUR SKETCH
              </p>
              <PixelFrame>
                {drawingURL ? (
                  <img src={drawingURL} alt="Your sketch" style={{ width: 'min(70vw, 360px)', display: 'block', imageRendering: 'pixelated' }} />
                ) : (
                  <div style={{ width: 280, height: 210, background: 'var(--bone)' }} />
                )}
              </PixelFrame>
            </div>
            <div className="flex flex-col items-center gap-2">
              <p className="font-press" style={{ fontSize: 10, color: 'var(--gold)' }}>
                THE OBJECT
              </p>
              <PixelFrame style={{ minWidth: 220 }}>
                <div style={{ padding: 20, color: 'var(--ink)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, height: '100%', justifyContent: 'center' }}>
                  <div style={{ fontSize: 72, lineHeight: 1 }}>{item.emoji}</div>
                  <p className="font-press" style={{ fontSize: 13 }}>
                    {item.name}
                  </p>
                  <p className="font-vt" style={{ fontSize: 19, lineHeight: 1.25 }}>
                    {item.note}
                  </p>
                </div>
              </PixelFrame>
            </div>
          </div>
          <PixelButton variant="orange" size="lg" sfx="unlock" onClick={finish}>
            DONE
          </PixelButton>
        </div>
      )}
    </main>
  )
}

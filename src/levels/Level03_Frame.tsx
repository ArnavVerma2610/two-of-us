import { useEffect, useId, useRef, useState } from 'react'
import { useNav } from '../nav'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import { palette } from '../game/palette'
import PixelButton from '../components/PixelButton'
import PixelFrame from '../components/PixelFrame'

// --- Frame shapes, all authored in a 0..100 viewBox -------------------------
function starPath(points = 5, outer = 48, inner = 19, cx = 50, cy = 50): string {
  let d = ''
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner
    const a = (Math.PI / points) * i - Math.PI / 2
    d += (i === 0 ? 'M' : 'L') + (cx + Math.cos(a) * r).toFixed(2) + ',' + (cy + Math.sin(a) * r).toFixed(2) + ' '
  }
  return d + 'Z'
}

function flowerPath(petals = 6, outer = 48, inner = 30, steps = 120, cx = 50, cy = 50): string {
  const mid = (outer + inner) / 2
  const amp = (outer - inner) / 2
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const a = (Math.PI * 2 * i) / steps - Math.PI / 2
    const rr = mid + amp * Math.cos(petals * a)
    d += (i === 0 ? 'M' : 'L') + (cx + Math.cos(a) * rr).toFixed(2) + ',' + (cy + Math.sin(a) * rr).toFixed(2) + ' '
  }
  return d + 'Z'
}

type Frame = { key: string; label: string; d: string }

const FRAMES: Frame[] = [
  { key: 'circle', label: 'Circle', d: 'M50,3 A47,47 0 1,0 50,97 A47,47 0 1,0 50,3 Z' },
  { key: 'star', label: 'Star', d: starPath() },
  { key: 'heart', label: 'Heart', d: 'M50,90 C10,60 6,34 25,21 C38,12 49,21 50,31 C51,21 62,12 75,21 C94,34 90,60 50,90 Z' },
  { key: 'diamond', label: 'Diamond', d: 'M50,3 L97,50 L50,97 L3,50 Z' },
  { key: 'blob', label: 'Blob', d: 'M50,4 L71,11 L92,29 L87,54 L97,73 L72,90 L46,97 L21,84 L6,59 L15,33 L31,15 Z' },
  { key: 'flower', label: 'Flower', d: flowerPath() },
]

export default function Level03_Frame() {
  const nav = useNav()
  const { level2, saveLevel3Framed, completeLevel } = useGame()
  const clipId = useId().replace(/:/g, '')

  const [source, setSource] = useState<string | null>(null)
  const [frame, setFrame] = useState<Frame>(FRAMES[0])
  const fileRef = useRef<HTMLInputElement>(null)

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

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setSource(reader.result as string)
      audio.sfx('select')
    }
    reader.readAsDataURL(file)
  }

  const composite = (): Promise<string> =>
    new Promise((resolve) => {
      const SIZE = 480
      const cv = document.createElement('canvas')
      cv.width = SIZE
      cv.height = SIZE
      const ctx = cv.getContext('2d')!
      const img = new Image()
      img.onload = () => {
        const s = SIZE / 100
        // clip to the frame shape, then draw the image to cover the box
        ctx.save()
        ctx.scale(s, s)
        const p = new Path2D(frame.d)
        ctx.clip(p)
        const ar = img.width / img.height
        let dw = 100
        let dh = 100
        let dx = 0
        let dy = 0
        if (ar > 1) {
          dw = 100 * ar
          dx = (100 - dw) / 2
        } else {
          dh = 100 / ar
          dy = (100 - dh) / 2
        }
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(img, dx, dy, dw, dh)
        ctx.restore()
        // chunky frame border: ink outline + bone inner line
        ctx.save()
        ctx.scale(s, s)
        ctx.lineJoin = 'round'
        ctx.strokeStyle = palette.ink
        ctx.lineWidth = 6
        ctx.stroke(p)
        ctx.strokeStyle = palette.bone
        ctx.lineWidth = 2.5
        ctx.stroke(p)
        ctx.restore()
        resolve(cv.toDataURL('image/png'))
      }
      img.src = source!
    })

  const onSave = async () => {
    if (!source) return
    const dataURL = await composite()
    saveLevel3Framed(dataURL)
    completeLevel(3)
    audio.sfx('unlock')
    nav({ name: 'selector' })
  }

  return (
    <main className="px-3 py-4" style={{ minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <PixelButton variant="bone" size="sm" sfx="back" onClick={() => nav({ name: 'selector' })}>
          ← BACK
        </PixelButton>
        <h2 className="font-press" style={{ fontSize: 'clamp(11px,3vw,16px)', color: 'var(--gold)' }}>
          FRAME IT
        </h2>
        <span style={{ width: 60 }} />
      </div>

      <div className="flex justify-center items-start gap-5 flex-wrap mt-3">
        {/* Goal / instructions */}
        <PixelFrame style={{ maxWidth: 240, width: '100%' }}>
          <div style={{ padding: 16, color: 'var(--ink)' }}>
            <p className="font-press" style={{ fontSize: 11, marginBottom: 10, color: 'var(--orange-pop)' }}>
              THE GOAL
            </p>
            <p className="font-vt" style={{ fontSize: 19, lineHeight: 1.25 }}>
              Give a picture a frame worthy of the memory. Pick a shape, then frame the canvas you
              painted in Level 2 — or upload a photo of your own.
            </p>
          </div>
        </PixelFrame>

        {/* Preview */}
        <div className="flex flex-col items-center gap-3">
          <PixelFrame>
            <div style={{ width: 'min(72vw, 320px)', aspectRatio: '1 / 1', background: 'var(--bone)', position: 'relative' }}>
              {source ? (
                <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }}>
                  <defs>
                    <clipPath id={clipId}>
                      <path d={frame.d} />
                    </clipPath>
                  </defs>
                  <image
                    href={source}
                    x="0"
                    y="0"
                    width="100"
                    height="100"
                    preserveAspectRatio="xMidYMid slice"
                    clipPath={`url(#${clipId})`}
                  />
                  <path d={frame.d} fill="none" stroke={palette.ink} strokeWidth={6} strokeLinejoin="round" />
                  <path d={frame.d} fill="none" stroke={palette.bone} strokeWidth={2.5} strokeLinejoin="round" />
                </svg>
              ) : (
                <div
                  className="font-vt"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ink)',
                    fontSize: 20,
                    textAlign: 'center',
                    padding: 20,
                  }}
                >
                  Pick a picture to frame →
                </div>
              )}
            </div>
          </PixelFrame>

          {/* Frame picker */}
          <div className="flex gap-2 flex-wrap justify-center" style={{ maxWidth: 340 }}>
            {FRAMES.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setFrame(f)
                  audio.sfx('select')
                }}
                title={f.label}
                aria-label={f.label}
                aria-pressed={frame.key === f.key}
                className="pixel-btn"
                style={{
                  background: frame.key === f.key ? 'var(--cyan-pop)' : 'var(--bone)',
                  width: 44,
                  height: 44,
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg viewBox="0 0 100 100" width="28" height="28">
                  <path d={f.d} fill="none" stroke={palette.ink} strokeWidth={8} strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* Source + actions */}
        <div className="flex flex-col gap-3" style={{ width: 200 }}>
          <p className="font-vt" style={{ fontSize: 18, color: 'var(--bone)' }}>
            CHOOSE A PICTURE
          </p>
          <PixelButton
            variant={level2.artwork ? 'mint' : 'bone'}
            sfx="select"
            disabled={!level2.artwork}
            onClick={() => {
              if (level2.artwork) {
                setSource(level2.artwork)
                audio.sfx('select')
              }
            }}
          >
            {level2.artwork ? 'USE LEVEL 2 ART' : 'NO LEVEL 2 ART'}
          </PixelButton>
          <PixelButton variant="cyan" sfx="click" onClick={() => fileRef.current?.click()}>
            UPLOAD IMAGE
          </PixelButton>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onUpload}
            style={{ display: 'none' }}
          />
          <div style={{ height: 6 }} />
          <PixelButton variant="orange" size="lg" sfx="submit" disabled={!source} onClick={onSave}>
            FRAME IT!
          </PixelButton>
        </div>
      </div>
    </main>
  )
}

import { useEffect, useId, useRef, useState } from 'react'
import { useNav, nextAfterLevel } from '../nav'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import { palette } from '../game/palette'
import PixelButton from '../components/PixelButton'
import PixelFrame from '../components/PixelFrame'

// A4 portrait box, authored in a 0..100 (x) by 0..141 (y) viewBox.
const BW = 100
const BH = 141
const CX = 50
const CY = 70.5

function starPath(points = 5, rxO = 44, ryO = 62, rxI = 18, ryI = 25): string {
  let d = ''
  for (let i = 0; i < points * 2; i++) {
    const rx = i % 2 === 0 ? rxO : rxI
    const ry = i % 2 === 0 ? ryO : ryI
    const a = (Math.PI / points) * i - Math.PI / 2
    d += (i === 0 ? 'M' : 'L') + (CX + Math.cos(a) * rx).toFixed(2) + ',' + (CY + Math.sin(a) * ry).toFixed(2) + ' '
  }
  return d + 'Z'
}

function flowerPath(petals = 6, rxO = 44, ryO = 62, rxI = 28, ryI = 40, steps = 140): string {
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const a = (Math.PI * 2 * i) / steps - Math.PI / 2
    const t = (Math.cos(petals * a) + 1) / 2
    const rx = rxI + (rxO - rxI) * t
    const ry = ryI + (ryO - ryI) * t
    d += (i === 0 ? 'M' : 'L') + (CX + Math.cos(a) * rx).toFixed(2) + ',' + (CY + Math.sin(a) * ry).toFixed(2) + ' '
  }
  return d + 'Z'
}

type Frame = { key: string; label: string; d: string }

const SHAPES: Frame[] = [
  { key: 'circle', label: 'Oval', d: 'M50,8 a44,62 0 1,0 0,124 a44,62 0 1,0 0,-124 Z' },
  { key: 'star', label: 'Star', d: starPath() },
  { key: 'heart', label: 'Heart', d: 'M50,128 C6,92 4,48 28,32 C42,22 50,34 50,46 C50,34 58,22 72,32 C96,48 94,92 50,128 Z' },
  { key: 'diamond', label: 'Diamond', d: 'M50,6 L94,70.5 L50,135 L6,70.5 Z' },
  { key: 'blob', label: 'Blob', d: 'M50,7 L74,16 L92,42 L86,74 L96,104 L70,130 L44,136 L20,120 L8,86 L14,46 L28,18 Z' },
  { key: 'flower', label: 'Flower', d: flowerPath() },
]

const DRAW_COLORS = ['#20202a', '#7a33b5', '#2bb0e6', '#84c441', '#f5b51c', '#f47b2a', '#ec3f6e', '#ed3e8e']

// Pixel resolution of the saved A4 page.
const OUT_W = 480
const OUT_H = 679

export default function Level03_Frame() {
  const nav = useNav()
  const { level2, saveLevel3Framed, completeLevel } = useGame()
  const clipId = useId().replace(/:/g, '')

  const [source, setSource] = useState<string | null>(null)
  const [frame, setFrame] = useState<string>('circle') // shape key or 'draw'
  const [color, setColor] = useState(DRAW_COLORS[0])
  const [brush, setBrush] = useState(6)
  const [camOpen, setCamOpen] = useState(false)
  const [camError, setCamError] = useState<string | null>(null)

  const fileRef = useRef<HTMLInputElement>(null)
  const drawRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const isDraw = frame === 'draw'
  const shape = SHAPES.find((s) => s.key === frame) ?? SHAPES[0]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (camOpen) closeCamera()
        else {
          audio.sfx('back')
          nav({ name: 'selector' })
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav, camOpen])

  // init the draw layer when entering draw mode
  useEffect(() => {
    if (!isDraw) return
    const cv = drawRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')!
    ctx.clearRect(0, 0, cv.width, cv.height)
  }, [isDraw])

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

  // ---- camera ----
  const openCamera = async () => {
    setCamError(null)
    setCamOpen(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch {
      setCamError('Could not open the camera. Check permissions and try uploading instead.')
    }
  }
  const closeCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCamOpen(false)
  }
  const capture = () => {
    const v = videoRef.current
    if (!v) return
    const cv = document.createElement('canvas')
    cv.width = v.videoWidth || 640
    cv.height = v.videoHeight || 480
    cv.getContext('2d')!.drawImage(v, 0, 0, cv.width, cv.height)
    setSource(cv.toDataURL('image/png'))
    audio.sfx('select')
    closeCamera()
  }

  // ---- drawing on the custom-frame layer ----
  const dcoords = (e: React.PointerEvent) => {
    const cv = drawRef.current!
    const rect = cv.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * cv.width,
      y: ((e.clientY - rect.top) / rect.height) * cv.height,
    }
  }
  const onDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    const ctx = drawRef.current!.getContext('2d')!
    const { x, y } = dcoords(e)
    drawing.current = true
    last.current = { x, y }
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, brush / 2, 0, Math.PI * 2)
    ctx.fill()
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return
    const ctx = drawRef.current!.getContext('2d')!
    const { x, y } = dcoords(e)
    ctx.strokeStyle = color
    ctx.lineWidth = brush
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(last.current.x, last.current.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    last.current = { x, y }
  }
  const onUp = () => {
    drawing.current = false
    last.current = null
  }
  const clearDraw = () => {
    const cv = drawRef.current
    if (cv) cv.getContext('2d')!.clearRect(0, 0, cv.width, cv.height)
    audio.sfx('back')
  }

  const drawCover = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) => {
    const ar = img.width / img.height
    let dw = w
    let dh = h
    let dx = 0
    let dy = 0
    if (ar > w / h) {
      dh = h
      dw = h * ar
      dx = (w - dw) / 2
    } else {
      dw = w
      dh = w / ar
      dy = (h - dh) / 2
    }
    ctx.drawImage(img, dx, dy, dw, dh)
  }

  const composite = (): Promise<string> =>
    new Promise((resolve) => {
      const cv = document.createElement('canvas')
      cv.width = OUT_W
      cv.height = OUT_H
      const ctx = cv.getContext('2d')!
      ctx.imageSmoothingEnabled = false
      // A4 mat
      ctx.fillStyle = palette.bone
      ctx.fillRect(0, 0, OUT_W, OUT_H)

      const finishBorder = () => {
        // chunky ink page border
        ctx.strokeStyle = palette.ink
        ctx.lineWidth = 14
        ctx.strokeRect(7, 7, OUT_W - 14, OUT_H - 14)
      }

      const img = new Image()
      img.onload = () => {
        if (isDraw) {
          drawCover(ctx, img, OUT_W, OUT_H)
          const dl = drawRef.current
          if (dl) ctx.drawImage(dl, 0, 0, OUT_W, OUT_H)
          finishBorder()
        } else {
          const sx = OUT_W / BW
          const sy = OUT_H / BH
          ctx.save()
          ctx.scale(sx, sy)
          const p = new Path2D(shape.d)
          ctx.clip(p)
          ctx.scale(1 / sx, 1 / sy)
          drawCover(ctx, img, OUT_W, OUT_H)
          ctx.restore()
          // shape outline
          ctx.save()
          ctx.scale(sx, sy)
          ctx.lineJoin = 'round'
          ctx.strokeStyle = palette.ink
          ctx.lineWidth = 3
          ctx.stroke(new Path2D(shape.d))
          ctx.restore()
          finishBorder()
        }
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
    nav(nextAfterLevel())
  }

  // preview box sizing (A4 portrait)
  const boxW = 'min(62vw, 300px)'

  return (
    <main className="px-3 py-4" style={{ minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <PixelButton variant="bone" size="sm" sfx="back" onClick={() => nav({ name: 'selector' })}>
          ← BACK
        </PixelButton>
        <h2 className="font-press" style={{ fontSize: 'clamp(11px,3vw,16px)', color: 'var(--violet)' }}>
          FRAME IT
        </h2>
        <span style={{ width: 60 }} />
      </div>

      <div className="flex justify-center items-start gap-5 flex-wrap mt-3">
        {/* Goal */}
        <PixelFrame style={{ maxWidth: 220, width: '100%' }}>
          <div style={{ padding: 16, color: 'var(--ink)' }}>
            <p className="font-press" style={{ fontSize: 11, marginBottom: 10, color: 'var(--orange-pop)' }}>
              THE GOAL
            </p>
            <p className="font-vt" style={{ fontSize: 20, lineHeight: 1.25 }}>
              Make an A4 print worth hanging. Pick a picture (your Level 2 art, an upload, or a quick
              camera snap), then choose a cut-out shape — or draw your own frame freehand.
            </p>
          </div>
        </PixelFrame>

        {/* A4 preview */}
        <div className="flex flex-col items-center gap-3">
          <PixelFrame>
            <div style={{ width: boxW, aspectRatio: `${BW} / ${BH}`, background: 'var(--bone)', position: 'relative' }}>
              {source ? (
                isDraw ? (
                  <>
                    <img
                      src={source}
                      alt="frame source"
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated' }}
                    />
                    <canvas
                      ref={drawRef}
                      width={OUT_W}
                      height={OUT_H}
                      onPointerDown={onDown}
                      onPointerMove={onMove}
                      onPointerUp={onUp}
                      onPointerLeave={onUp}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none', cursor: 'crosshair' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, border: '7px solid var(--ink)', pointerEvents: 'none' }} />
                  </>
                ) : (
                  <svg viewBox={`0 0 ${BW} ${BH}`} width="100%" height="100%" style={{ display: 'block' }}>
                    <defs>
                      <clipPath id={clipId}>
                        <path d={shape.d} />
                      </clipPath>
                    </defs>
                    <image href={source} x="0" y="0" width={BW} height={BH} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} />
                    <path d={shape.d} fill="none" stroke={palette.ink} strokeWidth={3} strokeLinejoin="round" />
                    <rect x="1.5" y="1.5" width={BW - 3} height={BH - 3} fill="none" stroke={palette.ink} strokeWidth={3} />
                  </svg>
                )
              ) : (
                <div className="font-vt" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)', fontSize: 20, textAlign: 'center', padding: 20 }}>
                  Pick a picture →
                </div>
              )}
            </div>
          </PixelFrame>

          {/* Frame picker: shapes + DRAW */}
          <div className="flex gap-2 flex-wrap justify-center" style={{ maxWidth: 340 }}>
            {SHAPES.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  setFrame(f.key)
                  audio.sfx('select')
                }}
                title={f.label}
                aria-label={f.label}
                aria-pressed={frame === f.key}
                className="pixel-btn"
                style={{ background: frame === f.key ? 'var(--cyan-pop)' : 'var(--bone)', width: 42, height: 42, padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg viewBox={`0 0 ${BW} ${BH}`} width="20" height="28">
                  <path d={f.d} fill="none" stroke={palette.ink} strokeWidth={9} strokeLinejoin="round" />
                </svg>
              </button>
            ))}
            <button
              onClick={() => {
                setFrame('draw')
                audio.sfx('select')
              }}
              title="Draw your own"
              aria-pressed={isDraw}
              className="pixel-btn font-press"
              style={{ background: isDraw ? 'var(--cyan-pop)' : 'var(--bone)', height: 42, padding: '0 10px', fontSize: 10, color: 'var(--ink)' }}
            >
              DRAW
            </button>
          </div>

          {/* draw tools */}
          {isDraw && (
            <div className="flex gap-2 items-center flex-wrap justify-center" style={{ maxWidth: 340 }}>
              {DRAW_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setColor(c)
                    audio.sfx('click')
                  }}
                  aria-label={`Color ${c}`}
                  style={{ width: 24, height: 24, background: c, border: color === c ? '3px solid var(--cyan-pop)' : '2px solid var(--ink)', boxShadow: '2px 2px 0 var(--ink)', cursor: 'pointer' }}
                />
              ))}
              {[4, 8, 16].map((b) => (
                <button
                  key={b}
                  onClick={() => {
                    setBrush(b)
                    audio.sfx('click')
                  }}
                  className="pixel-btn"
                  style={{ background: brush === b ? 'var(--violet)' : 'var(--bone)', color: brush === b ? 'var(--bone)' : 'var(--ink)', width: 30, height: 28, fontSize: 12 }}
                >
                  {b === 4 ? 'S' : b === 8 ? 'M' : 'L'}
                </button>
              ))}
              <PixelButton variant="bone" size="sm" sfx="back" onClick={clearDraw}>
                CLEAR
              </PixelButton>
            </div>
          )}
        </div>

        {/* Source + actions */}
        <div className="flex flex-col gap-3" style={{ width: 200 }}>
          <p className="font-vt" style={{ fontSize: 18, color: 'var(--ink)' }}>
            CHOOSE A PICTURE
          </p>
          <PixelButton variant={level2.artwork ? 'mint' : 'bone'} sfx="select" disabled={!level2.artwork} onClick={() => level2.artwork && (setSource(level2.artwork), audio.sfx('select'))}>
            {level2.artwork ? 'USE LEVEL 2 ART' : 'NO LEVEL 2 ART'}
          </PixelButton>
          <PixelButton variant="cyan" sfx="click" onClick={() => fileRef.current?.click()}>
            UPLOAD IMAGE
          </PixelButton>
          <PixelButton variant="violet" sfx="click" onClick={openCamera}>
            USE CAMERA
          </PixelButton>
          <input ref={fileRef} type="file" accept="image/*" onChange={onUpload} style={{ display: 'none' }} />
          <div style={{ height: 6 }} />
          <PixelButton variant="orange" size="lg" sfx="submit" disabled={!source} onClick={onSave}>
            FRAME IT!
          </PixelButton>
        </div>
      </div>

      {/* camera modal */}
      {camOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(20,20,30,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <PixelFrame style={{ maxWidth: 420, width: '100%' }}>
            <div style={{ padding: 18, color: 'var(--ink)', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
              <p className="font-press" style={{ fontSize: 12 }}>TAKE A PHOTO</p>
              {camError ? (
                <p className="font-vt" style={{ fontSize: 18, color: 'var(--red-accent)', textAlign: 'center' }}>{camError}</p>
              ) : (
                <video ref={videoRef} playsInline muted style={{ width: '100%', border: '3px solid var(--ink)', background: '#000' }} />
              )}
              <div className="flex gap-3">
                <PixelButton variant="bone" sfx="back" onClick={closeCamera}>
                  CANCEL
                </PixelButton>
                {!camError && (
                  <PixelButton variant="mint" sfx="submit" onClick={capture}>
                    CAPTURE
                  </PixelButton>
                )}
              </div>
            </div>
          </PixelFrame>
        </div>
      )}
    </main>
  )
}

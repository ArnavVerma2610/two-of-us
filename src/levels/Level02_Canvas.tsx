import { useEffect, useRef, useState } from 'react'
import { useNav, nextAfterLevel } from '../nav'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import { canvasColors, palette } from '../game/palette'
import PixelButton from '../components/PixelButton'
import PixelFrame from '../components/PixelFrame'

const W = 200
const H = 125

type Tool = 'brush' | 'pencil' | 'fill' | 'eraser' | 'spray' | 'circle' | 'square' | 'triangle' | 'star' | 'heart'

const SHAPE_TOOLS: Tool[] = ['circle', 'square', 'triangle', 'star', 'heart']

const TOOL_LABEL: Record<Tool, string> = {
  brush: 'Brush',
  pencil: 'Pencil',
  fill: 'Fill',
  eraser: 'Eraser',
  spray: 'Spray',
  circle: 'Circle',
  square: 'Square',
  triangle: 'Triangle',
  star: 'Star',
  heart: 'Heart',
}
const TOOL_ICON: Record<Tool, string> = {
  brush: '🖌',
  pencil: '✏',
  fill: '🪣',
  eraser: '⬜',
  spray: '✷',
  circle: '◯',
  square: '▢',
  triangle: '△',
  star: '★',
  heart: '♥',
}

export default function Level02_Canvas() {
  const nav = useNav()
  const { saveLevel2Artwork, completeLevel } = useGame()

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)

  const [tool, setTool] = useState<Tool>('brush')
  const [color, setColor] = useState<string>(palette.ink)
  const [brushSize, setBrushSize] = useState(2)
  const [confirm, setConfirm] = useState(false)

  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const shapeStart = useRef<{ x: number; y: number } | null>(null)
  const undoStack = useRef<ImageData[]>([])

  // setup
  useEffect(() => {
    const cv = canvasRef.current!
    const ctx = cv.getContext('2d')!
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = palette.bone
    ctx.fillRect(0, 0, W, H)
    ctxRef.current = ctx
  }, [])

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        audio.sfx('back')
        nav({ name: 'selector' })
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav])

  const pushUndo = () => {
    const ctx = ctxRef.current!
    undoStack.current.push(ctx.getImageData(0, 0, W, H))
    if (undoStack.current.length > 20) undoStack.current.shift()
  }
  const undo = () => {
    const ctx = ctxRef.current!
    const prev = undoStack.current.pop()
    if (prev) {
      ctx.putImageData(prev, 0, 0)
      audio.sfx('back')
    }
  }
  const clearAll = () => {
    const ctx = ctxRef.current!
    pushUndo()
    ctx.fillStyle = palette.bone
    ctx.fillRect(0, 0, W, H)
    audio.sfx('back')
  }

  const toCanvasCoords = (e: React.PointerEvent) => {
    const cv = canvasRef.current!
    const rect = cv.getBoundingClientRect()
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * W)
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * H)
    return { x, y }
  }

  const dab = (x: number, y: number) => {
    const ctx = ctxRef.current!
    if (tool === 'pencil') {
      ctx.fillStyle = color
      ctx.fillRect(x, y, 1, 1)
    } else if (tool === 'eraser') {
      ctx.fillStyle = palette.bone
      const s = brushSize + 1
      ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s)
    } else if (tool === 'spray') {
      ctx.fillStyle = color
      const r = 6
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2
        const rr = Math.random() * r
        ctx.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr), 1, 1)
      }
    } else {
      // brush
      ctx.fillStyle = color
      const s = brushSize
      ctx.fillRect(x - (s >> 1), y - (s >> 1), s, s)
    }
    audio.sfx('paint')
  }

  const line = (x0: number, y0: number, x1: number, y1: number) => {
    // Bresenham to fill gaps
    const dx = Math.abs(x1 - x0)
    const dy = Math.abs(y1 - y0)
    const sx = x0 < x1 ? 1 : -1
    const sy = y0 < y1 ? 1 : -1
    let err = dx - dy
    let x = x0
    let y = y0
    // eslint-disable-next-line no-constant-condition
    while (true) {
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

  const floodFill = (sx: number, sy: number) => {
    const ctx = ctxRef.current!
    const img = ctx.getImageData(0, 0, W, H)
    const data = img.data
    const idx = (x: number, y: number) => (y * W + x) * 4
    const start = idx(sx, sy)
    const target = [data[start], data[start + 1], data[start + 2], data[start + 3]]
    // parse fill color
    const tmp = document.createElement('canvas').getContext('2d')!
    tmp.fillStyle = color
    tmp.fillRect(0, 0, 1, 1)
    const fc = tmp.getImageData(0, 0, 1, 1).data
    if (target[0] === fc[0] && target[1] === fc[1] && target[2] === fc[2] && target[3] === fc[3]) return
    const match = (i: number) =>
      data[i] === target[0] && data[i + 1] === target[1] && data[i + 2] === target[2] && data[i + 3] === target[3]
    const stack = [[sx, sy]]
    while (stack.length) {
      const [x, y] = stack.pop()!
      if (x < 0 || y < 0 || x >= W || y >= H) continue
      const i = idx(x, y)
      if (!match(i)) continue
      data[i] = fc[0]
      data[i + 1] = fc[1]
      data[i + 2] = fc[2]
      data[i + 3] = fc[3]
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
    }
    ctx.putImageData(img, 0, 0)
  }

  const drawShape = (ctx: CanvasRenderingContext2D, t: Tool, cx: number, cy: number, r: number) => {
    ctx.fillStyle = color
    ctx.strokeStyle = color
    if (t === 'square') {
      ctx.fillRect(Math.round(cx - r), Math.round(cy - r), Math.round(r * 2), Math.round(r * 2))
      return
    }
    ctx.beginPath()
    if (t === 'circle') {
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
    } else if (t === 'triangle') {
      ctx.moveTo(cx, cy - r)
      ctx.lineTo(cx + r, cy + r)
      ctx.lineTo(cx - r, cy + r)
      ctx.closePath()
    } else if (t === 'star') {
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? r : r / 2.4
        const a = (Math.PI / 5) * i - Math.PI / 2
        const px = cx + Math.cos(a) * rad
        const py = cy + Math.sin(a) * rad
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
    } else if (t === 'heart') {
      const s = r
      ctx.moveTo(cx, cy + s * 0.6)
      ctx.bezierCurveTo(cx + s, cy - s * 0.4, cx + s * 0.5, cy - s, cx, cy - s * 0.35)
      ctx.bezierCurveTo(cx - s * 0.5, cy - s, cx - s, cy - s * 0.4, cx, cy + s * 0.6)
      ctx.closePath()
    }
    ctx.fill()
  }

  // pointer handlers
  const onDown = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    const { x, y } = toCanvasCoords(e)
    pushUndo()
    if (tool === 'fill') {
      floodFill(x, y)
      audio.sfx('paint')
      return
    }
    if (SHAPE_TOOLS.includes(tool)) {
      shapeStart.current = { x, y }
      return
    }
    drawing.current = true
    last.current = { x, y }
    dab(x, y)
  }

  const onMove = (e: React.PointerEvent) => {
    const { x, y } = toCanvasCoords(e)
    if (SHAPE_TOOLS.includes(tool) && shapeStart.current) {
      // live preview
      const ov = overlayRef.current!
      const octx = ov.getContext('2d')!
      octx.clearRect(0, 0, W, H)
      const sx = shapeStart.current.x
      const sy = shapeStart.current.y
      const r = Math.max(1, Math.hypot(x - sx, y - sy))
      drawShape(octx, tool, sx, sy, r)
      return
    }
    if (!drawing.current || !last.current) return
    line(last.current.x, last.current.y, x, y)
    last.current = { x, y }
  }

  const onUp = (e: React.PointerEvent) => {
    if (SHAPE_TOOLS.includes(tool) && shapeStart.current) {
      const { x, y } = toCanvasCoords(e)
      const sx = shapeStart.current.x
      const sy = shapeStart.current.y
      const r = Math.max(2, Math.hypot(x - sx, y - sy))
      drawShape(ctxRef.current!, tool, sx, sy, r)
      const ov = overlayRef.current!
      ov.getContext('2d')!.clearRect(0, 0, W, H)
      shapeStart.current = null
      audio.sfx('paint')
    }
    drawing.current = false
    last.current = null
  }

  const onDone = () => {
    const dataURL = canvasRef.current!.toDataURL('image/png')
    saveLevel2Artwork(dataURL)
    completeLevel(2)
    audio.sfx('unlock')
    setConfirm(false)
    nav(nextAfterLevel())
  }

  const ToolBtn = ({ t }: { t: Tool }) => (
    <button
      onClick={() => {
        setTool(t)
        audio.sfx('click')
      }}
      title={TOOL_LABEL[t]}
      aria-label={TOOL_LABEL[t]}
      aria-pressed={tool === t}
      className="pixel-btn"
      style={{
        background: tool === t ? 'var(--cyan-pop)' : 'var(--bone)',
        color: 'var(--ink)',
        width: 44,
        height: 44,
        fontSize: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {TOOL_ICON[t]}
    </button>
  )

  return (
    <main className="px-3 py-4" style={{ minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <PixelButton variant="bone" size="sm" sfx="back" onClick={() => nav({ name: 'selector' })}>
          ← BACK
        </PixelButton>
        <h2 className="font-press" style={{ fontSize: 'clamp(11px,3vw,16px)', color: 'var(--gold)' }}>
          MEMORY CANVAS
        </h2>
        <span style={{ width: 60 }} />
      </div>
      <p className="font-vt text-center mb-3" style={{ fontSize: 20, color: 'var(--bone)' }}>
        Together, paint a memory — abstract, no rules.{' '}
        <span style={{ opacity: 0.6 }}>Paint something only the two of you would recognize.</span>
      </p>

      <div className="flex justify-center items-start gap-3 flex-wrap">
        {/* Tools */}
        <div className="flex flex-col gap-2" style={{ flexShrink: 0 }}>
          <ToolBtn t="brush" />
          <ToolBtn t="pencil" />
          <ToolBtn t="fill" />
          <ToolBtn t="eraser" />
          <ToolBtn t="spray" />
          <div style={{ height: 6 }} />
          {SHAPE_TOOLS.map((t) => (
            <ToolBtn key={t} t={t} />
          ))}
        </div>

        {/* Canvas */}
        <div className="flex flex-col items-center gap-2">
          {(tool === 'brush' || tool === 'eraser') && (
            <div className="flex gap-2 items-center">
              <span className="font-vt" style={{ fontSize: 16, color: 'var(--bone)' }}>
                SIZE
              </span>
              {[
                { label: 'S', v: 1 },
                { label: 'M', v: 2 },
                { label: 'L', v: 4 },
              ].map((s) => (
                <button
                  key={s.v}
                  onClick={() => {
                    setBrushSize(s.v)
                    audio.sfx('click')
                  }}
                  className="pixel-btn"
                  style={{
                    background: brushSize === s.v ? 'var(--violet)' : 'var(--bone)',
                    color: brushSize === s.v ? 'var(--bone)' : 'var(--ink)',
                    width: 32,
                    height: 28,
                    fontFamily: 'VT323,monospace',
                    fontSize: 16,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <PixelFrame>
            <div style={{ position: 'relative', lineHeight: 0, touchAction: 'none' }}>
              <canvas
                ref={canvasRef}
                width={W}
                height={H}
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerLeave={onUp}
                style={{
                  width: 'min(80vw, 600px)',
                  height: 'auto',
                  imageRendering: 'pixelated',
                  cursor: 'crosshair',
                  display: 'block',
                  background: palette.bone,
                }}
              />
              <canvas
                ref={overlayRef}
                width={W}
                height={H}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  imageRendering: 'pixelated',
                  pointerEvents: 'none',
                  opacity: 0.7,
                }}
              />
            </div>
          </PixelFrame>

          {/* action bar */}
          <div className="flex gap-3 mt-1 flex-wrap justify-center">
            <PixelButton variant="bone" sfx="back" onClick={undo}>
              UNDO
            </PixelButton>
            <PixelButton variant="bone" sfx="back" onClick={clearAll}>
              CLEAR
            </PixelButton>
            <PixelButton variant="mint" sfx="submit" onClick={() => setConfirm(true)}>
              DONE
            </PixelButton>
          </div>
        </div>

        {/* Colors */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 28px)',
            gridAutoRows: '28px',
            gap: 6,
            flexShrink: 0,
          }}
        >
          {canvasColors.map((c) => (
            <button
              key={c}
              onClick={() => {
                setColor(c)
                audio.sfx('select')
              }}
              aria-label={`Color ${c}`}
              style={{
                background: c,
                border: color === c ? '3px solid var(--cyan-pop)' : '2px solid var(--ink)',
                boxShadow: '2px 2px 0 var(--ink)',
                cursor: 'pointer',
              }}
            />
          ))}
          <label
            title="Custom color"
            style={{
              gridColumn: 'span 4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--ink)',
              boxShadow: '2px 2px 0 var(--ink)',
              background: 'var(--bone)',
              height: 28,
              cursor: 'pointer',
              fontFamily: 'VT323,monospace',
              color: 'var(--ink)',
              fontSize: 15,
            }}
          >
            CUSTOM
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
            />
          </label>
          <div
            style={{
              gridColumn: 'span 4',
              height: 28,
              background: color,
              border: '3px solid var(--ink)',
            }}
            title="Current color"
          />
        </div>
      </div>

      {confirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70,
            background: 'rgba(11,10,18,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <PixelFrame style={{ maxWidth: 400, width: '100%' }}>
            <div style={{ padding: 24, color: 'var(--ink)' }}>
              <p className="font-press" style={{ fontSize: 13, marginBottom: 16 }}>
                SAVE THIS MEMORY?
              </p>
              <p className="font-vt" style={{ fontSize: 20, marginBottom: 22 }}>
                It'll become the cover of Level 2 and unlock the next level.
              </p>
              <div className="flex gap-3 justify-end">
                <PixelButton variant="bone" sfx="back" onClick={() => setConfirm(false)}>
                  KEEP PAINTING
                </PixelButton>
                <PixelButton variant="mint" sfx="submit" onClick={onDone}>
                  SAVE
                </PixelButton>
              </div>
            </div>
          </PixelFrame>
        </div>
      )}
    </main>
  )
}

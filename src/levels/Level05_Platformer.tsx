import { useEffect, useRef, useState } from 'react'
import { useNav } from '../nav'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import { spriteMain, type Sprite } from '../game/sprites'
import PixelButton from '../components/PixelButton'

const VW = 800 // logical canvas width
const VH = 400 // logical canvas height
const GRAV = 0.7
const SPEED = 3.4
const JUMP = -13
const MAXFALL = 14
const ENEMY_SPEED = 1.1
const CELL = 2 // sprite pixel size for the player

type Rect = { x: number; y: number; w: number; h: number }
type Solid = Rect & { block?: boolean; used?: boolean }
type Coin = { x: number; y: number; taken: boolean }
type Enemy = { x: number; y: number; w: number; h: number; dir: number; minX: number; maxX: number; alive: boolean }
type Pop = { x: number; y: number; life: number } // placeholder item that pops from a block

const PLAYER_W = 16 * CELL
const PLAYER_H = 19 * CELL
const SPAWN = { x: 40, y: 320 - PLAYER_H }
const WORLD_W = 2720

function makeLevel() {
  // Ground segments leave two pits to jump over
  const platforms: Solid[] = [
    { x: 0, y: 320, w: 720, h: 90 },
    { x: 800, y: 320, w: 700, h: 90 },
    { x: 1580, y: 320, w: WORLD_W - 1580, h: 90 },
    // floating platforms
    { x: 300, y: 240, w: 110, h: 20 },
    { x: 560, y: 190, w: 90, h: 20 },
    { x: 980, y: 230, w: 120, h: 20 },
    { x: 1700, y: 240, w: 120, h: 20 },
    { x: 1980, y: 200, w: 120, h: 20 },
    { x: 2260, y: 250, w: 120, h: 20 },
  ]
  const blocks: Solid[] = [
    { x: 360, y: 150, w: 28, h: 28, block: true, used: false },
    { x: 1020, y: 150, w: 28, h: 28, block: true, used: false },
    { x: 2020, y: 120, w: 28, h: 28, block: true, used: false },
  ]
  const coins: Coin[] = [
    { x: 320, y: 200, taken: false },
    { x: 360, y: 200, taken: false },
    { x: 590, y: 150, taken: false },
    { x: 760, y: 280, taken: false },
    { x: 1010, y: 190, taken: false },
    { x: 1050, y: 190, taken: false },
    { x: 1540, y: 280, taken: false },
    { x: 1740, y: 200, taken: false },
    { x: 2020, y: 160, taken: false },
    { x: 2300, y: 210, taken: false },
  ]
  const enemies: Enemy[] = [
    { x: 480, y: 320 - 26, w: 26, h: 26, dir: 1, minX: 420, maxX: 700, alive: true },
    { x: 1100, y: 320 - 26, w: 26, h: 26, dir: -1, minX: 820, maxX: 1300, alive: true },
    { x: 1800, y: 320 - 26, w: 26, h: 26, dir: 1, minX: 1620, maxX: 2000, alive: true },
    { x: 2300, y: 320 - 26, w: 26, h: 26, dir: 1, minX: 2120, maxX: 2480, alive: true },
  ]
  const flag = { x: 2600, y: 200, w: 10, h: 120 }
  return { platforms, blocks, coins, enemies, flag, pops: [] as Pop[] }
}

function overlap(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function blit(ctx: CanvasRenderingContext2D, sprite: Sprite, dx: number, dy: number, cell: number, flip: boolean) {
  const cols = Math.max(...sprite.grid.map((r) => r.length))
  for (let y = 0; y < sprite.grid.length; y++) {
    const row = sprite.grid[y]
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]
      if (ch === ' ' || ch === '.' || ch === undefined) continue
      const col = sprite.legend[ch]
      if (!col) continue
      ctx.fillStyle = col
      const cx = flip ? dx + (cols - 1 - x) * cell : dx + x * cell
      ctx.fillRect(Math.floor(cx), Math.floor(dy + y * cell), Math.ceil(cell), Math.ceil(cell))
    }
  }
}

type Status = 'playing' | 'won' | 'dead'

export default function Level05_Platformer() {
  const nav = useNav()
  const { completeLevel } = useGame()

  const [status, setStatus] = useState<Status>('playing')
  const [lives, setLives] = useState(3)
  const [coins, setCoins] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const keys = useRef({ left: false, right: false, jumpQueued: false })
  const facing = useRef(1)
  const wonRef = useRef(false)

  // mutable game state
  const game = useRef(makeLevel())
  const player = useRef({ ...SPAWN, vx: 0, vy: 0, onGround: false, invuln: 0 })
  const cam = useRef(0)
  const statusRef = useRef<Status>('playing')
  const livesRef = useRef(3)
  const coinsRef = useRef(0)
  const rafRef = useRef<number>(0)

  const resetEntities = () => {
    game.current = makeLevel()
    player.current = { ...SPAWN, vx: 0, vy: 0, onGround: false, invuln: 0 }
    cam.current = 0
  }

  const restart = () => {
    wonRef.current = false
    resetEntities()
    livesRef.current = 3
    coinsRef.current = 0
    setLives(3)
    setCoins(0)
    statusRef.current = 'playing'
    setStatus('playing')
  }

  // input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        audio.sfx('back')
        nav({ name: 'selector' })
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.current.left = true
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.current.right = true
      else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keys.current.jumpQueued = true
      else return
      e.preventDefault()
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.current.left = false
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.current.right = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [nav])

  // main loop
  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.imageSmoothingEnabled = false

    const loseLife = () => {
      livesRef.current -= 1
      setLives(livesRef.current)
      audio.sfx('hurt')
      if (livesRef.current <= 0) {
        statusRef.current = 'dead'
        setStatus('dead')
      } else {
        player.current = { ...SPAWN, vx: 0, vy: 0, onGround: false, invuln: 90 }
        cam.current = 0
      }
    }

    const step = () => {
      const g = game.current
      const p = player.current
      const solids: Solid[] = [...g.platforms, ...g.blocks]

      if (statusRef.current === 'playing') {
        // horizontal intent
        p.vx = (keys.current.right ? SPEED : 0) - (keys.current.left ? SPEED : 0)
        if (p.vx > 0) facing.current = 1
        else if (p.vx < 0) facing.current = -1

        // jump (edge-triggered)
        if (keys.current.jumpQueued && p.onGround) {
          p.vy = JUMP
          p.onGround = false
          audio.sfx('jump')
        }
        keys.current.jumpQueued = false

        // gravity
        p.vy = Math.min(p.vy + GRAV, MAXFALL)

        // X move + collide
        p.x += p.vx
        for (const s of solids) {
          if (overlap({ x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H }, s)) {
            if (p.vx > 0) p.x = s.x - PLAYER_W
            else if (p.vx < 0) p.x = s.x + s.w
            p.vx = 0
          }
        }
        if (p.x < 0) p.x = 0

        // Y move + collide
        p.onGround = false
        p.y += p.vy
        for (const s of solids) {
          if (overlap({ x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H }, s)) {
            if (p.vy > 0) {
              p.y = s.y - PLAYER_H
              p.vy = 0
              p.onGround = true
            } else if (p.vy < 0) {
              p.y = s.y + s.h
              p.vy = 0
              if (s.block && !s.used) {
                s.used = true
                g.pops.push({ x: s.x + s.w / 2, y: s.y - 10, life: 70 })
                coinsRef.current += 1
                setCoins(coinsRef.current)
                audio.sfx('coin')
              }
            }
          }
        }

        if (p.invuln > 0) p.invuln -= 1

        // fall in a pit
        if (p.y > VH + 60) loseLife()

        // coins
        for (const c of g.coins) {
          if (!c.taken && overlap({ x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H }, { x: c.x, y: c.y, w: 16, h: 16 })) {
            c.taken = true
            coinsRef.current += 1
            setCoins(coinsRef.current)
            audio.sfx('coin')
          }
        }

        // enemies
        for (const e of g.enemies) {
          if (!e.alive) continue
          e.x += e.dir * ENEMY_SPEED
          if (e.x < e.minX || e.x + e.w > e.maxX) e.dir *= -1
          if (overlap({ x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H }, e)) {
            const stomping = p.vy > 0 && p.y + PLAYER_H - e.y < 18
            if (stomping) {
              e.alive = false
              p.vy = JUMP * 0.6
              coinsRef.current += 2
              setCoins(coinsRef.current)
              audio.sfx('stomp')
            } else if (p.invuln <= 0) {
              loseLife()
            }
          }
        }

        // pops fade
        g.pops.forEach((pop) => (pop.life -= 1))
        g.pops = g.pops.filter((pop) => pop.life > 0)

        // goal
        if (!wonRef.current && overlap({ x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H }, g.flag)) {
          wonRef.current = true
          statusRef.current = 'won'
          setStatus('won')
          completeLevel(5, coinsRef.current)
          audio.sfx('success')
        }

        // camera
        cam.current = Math.max(0, Math.min(p.x + PLAYER_W / 2 - VW / 2, WORLD_W - VW))
      }

      // ---- render ----
      const camX = cam.current
      // sky
      ctx.fillStyle = '#6FD3E8'
      ctx.fillRect(0, 0, VW, VH)
      // distant hills
      ctx.fillStyle = '#7FD6A8'
      for (let i = 0; i < 6; i++) {
        const hx = i * 520 - (camX * 0.4) % 520
        ctx.beginPath()
        ctx.arc(hx + 200, 320, 150, Math.PI, 0)
        ctx.fill()
      }
      // clouds
      ctx.fillStyle = '#F4ECDC'
      for (let i = 0; i < 5; i++) {
        const cxp = (i * 360 - (camX * 0.5) % 360 + 360) % (VW + 120) - 60
        ctx.fillRect(cxp, 60 + (i % 2) * 30, 50, 16)
        ctx.fillRect(cxp + 14, 50 + (i % 2) * 30, 30, 30)
      }

      // ground / platforms
      for (const s of g.platforms) {
        const sx = s.x - camX
        if (sx + s.w < 0 || sx > VW) continue
        ctx.fillStyle = '#8D5524'
        ctx.fillRect(sx, s.y, s.w, s.h)
        ctx.fillStyle = '#7DC832'
        ctx.fillRect(sx, s.y, s.w, 8)
        ctx.fillStyle = '#15131C'
        ctx.fillRect(sx, s.y, s.w, 2)
      }
      // blocks
      for (const s of g.blocks) {
        const sx = s.x - camX
        ctx.fillStyle = s.used ? '#6E6A7C' : '#F2B33D'
        ctx.fillRect(sx, s.y, s.w, s.h)
        ctx.fillStyle = '#15131C'
        ctx.lineWidth = 2
        ctx.strokeRect(sx + 1, s.y + 1, s.w - 2, s.h - 2)
        if (!s.used) {
          ctx.fillStyle = '#15131C'
          ctx.font = 'bold 20px monospace'
          ctx.textAlign = 'center'
          ctx.fillText('?', sx + s.w / 2, s.y + s.h - 7)
        }
      }
      // coins
      for (const c of g.coins) {
        if (c.taken) continue
        const sx = c.x - camX
        ctx.fillStyle = '#F2B33D'
        ctx.beginPath()
        ctx.arc(sx + 8, c.y + 8, 7, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = '#15131C'
        ctx.fillRect(sx + 6, c.y + 4, 3, 9)
      }
      // pops (placeholder items from blocks)
      for (const pop of g.pops) {
        const sx = pop.x - camX
        const yy = pop.y - (70 - pop.life) * 0.4
        ctx.fillStyle = '#F15BB5'
        ctx.font = 'bold 18px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('★', sx, yy)
      }
      // flag
      {
        const fx = g.flag.x - camX
        ctx.fillStyle = '#B9C0CC'
        ctx.fillRect(fx, g.flag.y, 4, g.flag.h)
        ctx.fillStyle = '#6B5BD2'
        ctx.beginPath()
        ctx.moveTo(fx + 4, g.flag.y)
        ctx.lineTo(fx + 44, g.flag.y + 14)
        ctx.lineTo(fx + 4, g.flag.y + 28)
        ctx.fill()
      }
      // enemies
      for (const e of g.enemies) {
        if (!e.alive) continue
        const sx = e.x - camX
        ctx.fillStyle = '#E63946'
        ctx.fillRect(sx, e.y, e.w, e.h)
        ctx.fillStyle = '#15131C'
        ctx.strokeRect(sx + 1, e.y + 1, e.w - 2, e.h - 2)
        ctx.fillStyle = '#F4ECDC'
        ctx.fillRect(sx + 5, e.y + 7, 5, 5)
        ctx.fillRect(sx + e.w - 10, e.y + 7, 5, 5)
        ctx.fillStyle = '#15131C'
        ctx.fillRect(sx + 6, e.y + 9, 2, 2)
        ctx.fillRect(sx + e.w - 9, e.y + 9, 2, 2)
      }
      // player
      if (!(p.invuln > 0 && Math.floor(p.invuln / 5) % 2 === 0)) {
        blit(ctx, spriteMain, p.x - camX, p.y, CELL, facing.current === -1)
      }

      rafRef.current = requestAnimationFrame(step)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const press = (k: 'left' | 'right') => (v: boolean) => () => {
    keys.current[k] = v
  }

  return (
    <main className="px-3 py-4" style={{ minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <PixelButton variant="bone" size="sm" sfx="back" onClick={() => nav({ name: 'selector' })}>
          ← BACK
        </PixelButton>
        <h2 className="font-press" style={{ fontSize: 'clamp(11px,3vw,16px)', color: 'var(--gold)' }}>
          SIDE QUEST
        </h2>
        <div className="font-press" style={{ fontSize: 12, color: 'var(--gold)' }}>
          ★ {coins}
        </div>
      </div>

      <p className="font-vt text-center mb-2" style={{ fontSize: 18, color: 'var(--bone)' }}>
        Reach the flag! &nbsp;
        <span style={{ opacity: 0.7 }}>Arrows / A-D to move, Space to jump. Stomp the red guys.</span>
        &nbsp;{'♥'.repeat(Math.max(0, lives))}
      </p>

      <div className="flex justify-center">
        <div style={{ position: 'relative', width: 'min(96vw, 800px)' }}>
          <canvas
            ref={canvasRef}
            width={VW}
            height={VH}
            style={{
              width: '100%',
              height: 'auto',
              imageRendering: 'pixelated',
              border: '3px solid var(--ink)',
              boxShadow: '4px 4px 0 var(--ink)',
              display: 'block',
              touchAction: 'none',
            }}
          />

          {status === 'won' && (
            <Overlay>
              <p className="font-press" style={{ fontSize: 18, color: 'var(--mint)', marginBottom: 14 }}>
                YOU MADE IT!
              </p>
              <p className="font-vt" style={{ fontSize: 22, color: 'var(--bone)', marginBottom: 20 }}>
                Stars collected: {coins}
              </p>
              <PixelButton variant="orange" size="lg" sfx="unlock" onClick={() => nav({ name: 'selector' })}>
                CONTINUE
              </PixelButton>
            </Overlay>
          )}
          {status === 'dead' && (
            <Overlay>
              <p className="font-press" style={{ fontSize: 18, color: 'var(--red-accent)', marginBottom: 14 }}>
                GAME OVER
              </p>
              <PixelButton variant="cyan" size="lg" sfx="submit" onClick={restart}>
                TRY AGAIN
              </PixelButton>
            </Overlay>
          )}
        </div>
      </div>

      {/* touch controls */}
      {status === 'playing' && (
        <div className="flex justify-between mt-3" style={{ maxWidth: 'min(96vw, 800px)', margin: '12px auto 0' }}>
          <div className="flex gap-2">
            <TouchBtn label="◀" onDown={press('left')(true)} onUp={press('left')(false)} />
            <TouchBtn label="▶" onDown={press('right')(true)} onUp={press('right')(false)} />
          </div>
          <TouchBtn
            label="JUMP"
            wide
            onDown={() => {
              keys.current.jumpQueued = true
            }}
            onUp={() => {}}
          />
        </div>
      )}
    </main>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(11,10,18,0.82)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 16,
      }}
    >
      {children}
    </div>
  )
}

function TouchBtn({ label, wide, onDown, onUp }: { label: string; wide?: boolean; onDown: () => void; onUp: () => void }) {
  return (
    <button
      className="pixel-btn no-select"
      onPointerDown={(e) => {
        e.preventDefault()
        onDown()
      }}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        background: 'var(--bone)',
        color: 'var(--ink)',
        fontFamily: "'Press Start 2P', monospace",
        fontSize: wide ? 12 : 18,
        width: wide ? 120 : 56,
        height: 56,
        touchAction: 'none',
      }}
    >
      {label}
    </button>
  )
}

import { useEffect, useRef, useState } from 'react'
import { useNav, nextAfterLevel } from '../nav'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import { spriteMain, type Sprite } from '../game/sprites'
import PixelButton from '../components/PixelButton'

// ---- viewport + tuning -----------------------------------------------------
const VW = 820
const VH = 440
const GROUNDY = 360
const STEP_MS = 1000 / 50 // fixed simulation tick (slower, consistent everywhere)
const GRAV = 0.45
const SPEED = 2.8
const JUMP = -10.5
const MAXFALL = 11
const ENEMY_SPEED = 1.0
const STAR_TICKS = 50 * 7 // ~7 seconds of invincibility
const CELL = 2
const PLAYER_W = 16 * CELL
const PLAYER_H = 19 * CELL
const WORLD_W = 4000
const SPAWN = { x: 30, y: GROUNDY - PLAYER_H }

// Reachability budget (for reference while authoring the level):
//   max jump height  = JUMP^2 / (2*GRAV) ≈ 122px
//   air time         = 2*|JUMP| / GRAV   ≈ 47 ticks
//   max jump distance= SPEED * airtime   ≈ 130px
// All gaps below are <= ~95px and all step-ups <= ~115px, so every jump is doable.

type Rect = { x: number; y: number; w: number; h: number }
type Solid = Rect & { block?: boolean; used?: boolean }
type Coin = { x: number; y: number; taken: boolean }
type Enemy = { x: number; y: number; w: number; h: number; dir: number; minX: number; maxX: number; alive: boolean; spiky?: boolean }
type Power = { x: number; y: number; kind: 'heart' | 'star' | 'feather'; taken: boolean }
type Pop = { x: number; y: number; life: number }
type Moving = { x: number; y: number; w: number; h: number; dir: number; minX: number; maxX: number; speed: number; prevX: number }

function makeLevel() {
  const platforms: Solid[] = [
    // ground segments with jumpable gaps
    { x: 0, y: GROUNDY, w: 600, h: 90 },
    { x: 690, y: GROUNDY, w: 490, h: 90 },
    { x: 1270, y: GROUNDY, w: 550, h: 90 },
    { x: 1910, y: GROUNDY, w: 690, h: 90 },
    { x: 2820, y: GROUNDY, w: WORLD_W - 2820, h: 90 },
    // floating platforms
    { x: 300, y: 290, w: 90, h: 18 },
    { x: 450, y: 240, w: 80, h: 18 },
    { x: 770, y: 295, w: 90, h: 18 },
    { x: 910, y: 245, w: 90, h: 18 },
    { x: 1380, y: 295, w: 90, h: 18 },
    { x: 1540, y: 235, w: 90, h: 18 },
    { x: 2010, y: 290, w: 90, h: 18 },
    { x: 2190, y: 235, w: 90, h: 18 },
    { x: 2380, y: 290, w: 90, h: 18 },
    { x: 2900, y: 295, w: 90, h: 18 },
    { x: 3090, y: 240, w: 90, h: 18 },
    { x: 3300, y: 290, w: 90, h: 18 },
  ]
  const mp: Moving = { x: 2610, y: 320, w: 84, h: 16, dir: 1, minX: 2605, maxX: 2745, speed: 0.9, prevX: 2610 }
  const blocks: Solid[] = [
    { x: 320, y: 205, w: 26, h: 26, block: true, used: false },
    { x: 1380, y: 210, w: 26, h: 26, block: true, used: false },
    { x: 2900, y: 210, w: 26, h: 26, block: true, used: false },
  ]
  const coins: Coin[] = [
    { x: 320, y: 262, taken: false },
    { x: 460, y: 212, taken: false },
    { x: 610, y: 300, taken: false },
    { x: 645, y: 272, taken: false },
    { x: 680, y: 300, taken: false },
    { x: 920, y: 218, taken: false },
    { x: 1190, y: 300, taken: false },
    { x: 1225, y: 272, taken: false },
    { x: 1260, y: 300, taken: false },
    { x: 1390, y: 270, taken: false },
    { x: 1545, y: 208, taken: false },
    { x: 1830, y: 300, taken: false },
    { x: 1865, y: 272, taken: false },
    { x: 1900, y: 300, taken: false },
    { x: 2200, y: 208, taken: false },
    { x: 2500, y: 320, taken: false },
    { x: 2680, y: 285, taken: false },
    { x: 3100, y: 212, taken: false },
    { x: 3450, y: 320, taken: false },
    { x: 3650, y: 320, taken: false },
  ]
  const powers: Power[] = [
    { x: 520, y: 195, kind: 'feather', taken: false },
    { x: 1600, y: 180, kind: 'star', taken: false },
    { x: 2300, y: 180, kind: 'heart', taken: false },
    { x: 2860, y: 250, kind: 'feather', taken: false },
  ]
  const enemies: Enemy[] = [
    { x: 420, y: GROUNDY - 26, w: 26, h: 26, dir: 1, minX: 320, maxX: 580, alive: true },
    { x: 980, y: GROUNDY - 26, w: 26, h: 26, dir: 1, minX: 700, maxX: 1160, alive: true },
    { x: 1450, y: GROUNDY - 28, w: 26, h: 28, dir: 1, minX: 1290, maxX: 1800, alive: true, spiky: true },
    { x: 1700, y: GROUNDY - 26, w: 26, h: 26, dir: -1, minX: 1290, maxX: 1800, alive: true },
    { x: 2120, y: GROUNDY - 28, w: 26, h: 28, dir: 1, minX: 1930, maxX: 2580, alive: true, spiky: true },
    { x: 2450, y: GROUNDY - 26, w: 26, h: 26, dir: -1, minX: 1930, maxX: 2580, alive: true },
    { x: 3050, y: GROUNDY - 26, w: 26, h: 26, dir: 1, minX: 2850, maxX: 3700, alive: true },
    { x: 3450, y: GROUNDY - 26, w: 26, h: 26, dir: -1, minX: 2850, maxX: 3700, alive: true },
  ]
  const flag = { x: 3820, y: 230, w: 10, h: 130 }
  return { platforms, mp, blocks, coins, powers, enemies, flag, pops: [] as Pop[], checkpoint: { reached: false, x: SPAWN.x, y: SPAWN.y } }
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

function starPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r / 2.4
    const a = (Math.PI / 5) * i - Math.PI / 2
    const px = cx + Math.cos(a) * rad
    const py = cy + Math.sin(a) * rad
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
}

type Status = 'playing' | 'won' | 'dead'

export default function Level05_Platformer() {
  const nav = useNav()
  const { completeLevel } = useGame()

  const [status, setStatus] = useState<Status>('playing')
  const [lives, setLives] = useState(3)
  const [coins, setCoins] = useState(0)
  const [hasFeather, setHasFeather] = useState(false)
  const [starOn, setStarOn] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const keys = useRef({ left: false, right: false, jumpQueued: false })
  const facing = useRef(1)
  const wonRef = useRef(false)

  const game = useRef(makeLevel())
  const player = useRef({ ...SPAWN, vx: 0, vy: 0, onGround: false, invuln: 0, jumps: 0, star: 0, hasDouble: false })
  const cam = useRef(0)
  const statusRef = useRef<Status>('playing')
  const livesRef = useRef(3)
  const coinsRef = useRef(0)
  const rafRef = useRef(0)

  const restart = () => {
    wonRef.current = false
    game.current = makeLevel()
    player.current = { ...SPAWN, vx: 0, vy: 0, onGround: false, invuln: 0, jumps: 0, star: 0, hasDouble: false }
    cam.current = 0
    livesRef.current = 3
    coinsRef.current = 0
    setLives(3)
    setCoins(0)
    setHasFeather(false)
    setStarOn(false)
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

  // fixed-timestep loop (sim) + render
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
        return
      }
      const cp = game.current.checkpoint
      player.current = { ...player.current, x: cp.x, y: cp.y, vx: 0, vy: 0, onGround: false, invuln: 90, jumps: 0, star: 0 }
      setStarOn(false)
      cam.current = Math.max(0, Math.min(cp.x + PLAYER_W / 2 - VW / 2, WORLD_W - VW))
    }

    const step = () => {
      const p = player.current
      const g = game.current

      // moving platform
      const mp = g.mp
      mp.prevX = mp.x
      mp.x += mp.dir * mp.speed
      if (mp.x < mp.minX || mp.x + mp.w > mp.maxX) mp.dir *= -1
      const mpDelta = mp.x - mp.prevX
      const mpRect = { x: mp.x, y: mp.y, w: mp.w, h: mp.h }
      const solids: Solid[] = [...g.platforms, mpRect, ...g.blocks]

      // horizontal intent
      p.vx = (keys.current.right ? SPEED : 0) - (keys.current.left ? SPEED : 0)
      if (p.vx > 0) facing.current = 1
      else if (p.vx < 0) facing.current = -1

      // jump (ground or double)
      if (keys.current.jumpQueued) {
        if (p.onGround) {
          p.vy = JUMP
          p.onGround = false
          p.jumps = 1
          audio.sfx('jump')
        } else if (p.hasDouble && p.jumps < 2) {
          p.vy = JUMP * 0.92
          p.jumps = 2
          audio.sfx('jump')
        }
      }
      keys.current.jumpQueued = false

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
      let riding = false
      p.onGround = false
      p.y += p.vy
      for (const s of solids) {
        if (overlap({ x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H }, s)) {
          if (p.vy > 0) {
            p.y = s.y - PLAYER_H
            p.vy = 0
            p.onGround = true
            p.jumps = 0
            if (s === mpRect) riding = true
          } else if (p.vy < 0) {
            p.y = s.y + s.h
            p.vy = 0
            if (s.block && !s.used) {
              s.used = true
              g.pops.push({ x: s.x + s.w / 2, y: s.y - 8, life: 60 })
              coinsRef.current += 1
              setCoins(coinsRef.current)
              audio.sfx('coin')
            }
          }
        }
      }
      if (riding) p.x += mpDelta

      // timers
      if (p.invuln > 0) p.invuln -= 1
      if (p.star > 0) {
        p.star -= 1
        if (p.star === 0) setStarOn(false)
      }

      // checkpoint at the half-way mark
      if (!g.checkpoint.reached && p.x > 1950 && p.onGround) {
        g.checkpoint = { reached: true, x: 1960, y: GROUNDY - PLAYER_H }
      }

      // pit
      if (p.y > VH + 80) {
        loseLife()
        return
      }

      // coins
      for (const c of g.coins) {
        if (!c.taken && overlap({ x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H }, { x: c.x, y: c.y, w: 16, h: 16 })) {
          c.taken = true
          coinsRef.current += 1
          setCoins(coinsRef.current)
          audio.sfx('coin')
        }
      }

      // power-ups
      for (const pu of g.powers) {
        if (pu.taken || !overlap({ x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H }, { x: pu.x, y: pu.y, w: 22, h: 22 })) continue
        pu.taken = true
        if (pu.kind === 'heart') {
          livesRef.current = Math.min(5, livesRef.current + 1)
          setLives(livesRef.current)
        } else if (pu.kind === 'star') {
          p.star = STAR_TICKS
          setStarOn(true)
        } else {
          p.hasDouble = true
          setHasFeather(true)
        }
        audio.sfx('unlock')
      }

      // pops
      g.pops.forEach((pp) => (pp.life -= 1))
      g.pops = g.pops.filter((pp) => pp.life > 0)

      // enemies
      for (const e of g.enemies) {
        if (!e.alive) continue
        e.x += e.dir * ENEMY_SPEED
        if (e.x < e.minX || e.x + e.w > e.maxX) e.dir *= -1
        if (!overlap({ x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H }, e)) continue
        if (p.star > 0) {
          e.alive = false
          p.vy = JUMP * 0.5
          coinsRef.current += 2
          setCoins(coinsRef.current)
          audio.sfx('stomp')
        } else if (e.spiky) {
          if (p.invuln <= 0) {
            loseLife()
            return
          }
        } else {
          const stomp = p.vy > 0 && p.y + PLAYER_H - e.y < 20
          if (stomp) {
            e.alive = false
            p.vy = JUMP * 0.55
            coinsRef.current += 2
            setCoins(coinsRef.current)
            audio.sfx('stomp')
          } else if (p.invuln <= 0) {
            loseLife()
            return
          }
        }
      }

      // goal
      if (!wonRef.current && overlap({ x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H }, g.flag)) {
        wonRef.current = true
        statusRef.current = 'won'
        setStatus('won')
        completeLevel(5, coinsRef.current)
        audio.sfx('success')
      }

      cam.current = Math.max(0, Math.min(p.x + PLAYER_W / 2 - VW / 2, WORLD_W - VW))
    }

    const render = (t: number) => {
      const camX = cam.current
      const g = game.current
      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, VH)
      sky.addColorStop(0, '#8FE3F2')
      sky.addColorStop(1, '#CFF3FA')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, VW, VH)
      // sun
      ctx.fillStyle = '#FFE08A'
      ctx.beginPath()
      ctx.arc(VW - 90, 80, 34, 0, Math.PI * 2)
      ctx.fill()
      // far hills (parallax)
      ctx.fillStyle = '#9BD9B0'
      for (let i = 0; i < 8; i++) {
        const hx = i * 460 - ((camX * 0.3) % 460)
        ctx.beginPath()
        ctx.arc(hx + 180, GROUNDY, 180, Math.PI, 0)
        ctx.fill()
      }
      ctx.fillStyle = '#7FD0A0'
      for (let i = 0; i < 9; i++) {
        const hx = i * 360 - ((camX * 0.5) % 360)
        ctx.beginPath()
        ctx.arc(hx + 120, GROUNDY, 120, Math.PI, 0)
        ctx.fill()
      }
      // clouds
      ctx.fillStyle = '#FFFFFF'
      for (let i = 0; i < 6; i++) {
        const cxp = ((i * 300 - (camX * 0.6) % 300) % (VW + 140) + VW + 140) % (VW + 140) - 70
        const cy = 50 + (i % 3) * 26
        ctx.fillRect(cxp, cy, 54, 16)
        ctx.fillRect(cxp + 14, cy - 10, 30, 30)
      }

      // ground + platforms
      for (const s of g.platforms) {
        const sx = s.x - camX
        if (sx + s.w < -4 || sx > VW + 4) continue
        ctx.fillStyle = '#8D5524'
        ctx.fillRect(sx, s.y, s.w, s.h)
        ctx.fillStyle = '#7DC832'
        ctx.fillRect(sx, s.y, s.w, 8)
        ctx.fillStyle = '#57A11C'
        ctx.fillRect(sx, s.y + 8, s.w, 3)
        ctx.fillStyle = '#15131C'
        ctx.fillRect(sx, s.y, s.w, 2)
        // dirt speckles
        ctx.fillStyle = 'rgba(0,0,0,0.18)'
        for (let dx = 10; dx < s.w; dx += 26) ctx.fillRect(sx + dx, s.y + 22, 4, 4)
      }

      // moving platform
      {
        const mp = g.mp
        const sx = mp.x - camX
        ctx.fillStyle = '#B9C0CC'
        ctx.fillRect(sx, mp.y, mp.w, mp.h)
        ctx.fillStyle = '#15131C'
        ctx.strokeRect(sx + 1, mp.y + 1, mp.w - 2, mp.h - 2)
        ctx.fillStyle = '#6B5BD2'
        for (let dx = 6; dx < mp.w - 4; dx += 12) ctx.fillRect(sx + dx, mp.y + 5, 6, mp.h - 9)
      }

      // ? blocks
      for (const s of g.blocks) {
        const sx = s.x - camX
        ctx.fillStyle = s.used ? '#6E6A7C' : '#F2B33D'
        ctx.fillRect(sx, s.y, s.w, s.h)
        ctx.fillStyle = '#15131C'
        ctx.strokeRect(sx + 1, s.y + 1, s.w - 2, s.h - 2)
        if (!s.used) {
          ctx.fillStyle = '#15131C'
          ctx.font = 'bold 18px monospace'
          ctx.textAlign = 'center'
          ctx.fillText('?', sx + s.w / 2, s.y + s.h - 7)
        }
      }

      // coins (spin)
      for (const c of g.coins) {
        if (c.taken) continue
        const sx = c.x - camX
        const w = Math.abs(Math.cos(t / 220 + c.x * 0.05)) * 6 + 1
        ctx.fillStyle = '#15131C'
        ctx.fillRect(sx + 8 - w - 1, c.y, w * 2 + 2, 16)
        ctx.fillStyle = '#F2B33D'
        ctx.fillRect(sx + 8 - w, c.y + 1, w * 2, 14)
        ctx.fillStyle = '#FFE08A'
        ctx.fillRect(sx + 8 - w + 1, c.y + 3, 2, 8)
      }

      // power-ups (bob)
      for (const pu of g.powers) {
        if (pu.taken) continue
        const sx = pu.x - camX
        const by = pu.y + Math.sin(t / 260 + pu.x) * 3
        ctx.fillStyle = 'rgba(255,255,255,0.5)'
        ctx.beginPath()
        ctx.arc(sx + 11, by + 11, 14, 0, Math.PI * 2)
        ctx.fill()
        if (pu.kind === 'heart') {
          ctx.fillStyle = '#E63946'
          ctx.fillRect(sx + 2, by + 4, 7, 7)
          ctx.fillRect(sx + 13, by + 4, 7, 7)
          ctx.beginPath()
          ctx.moveTo(sx + 1, by + 8)
          ctx.lineTo(sx + 11, by + 21)
          ctx.lineTo(sx + 21, by + 8)
          ctx.fill()
        } else if (pu.kind === 'star') {
          ctx.fillStyle = '#FEE440'
          starPath(ctx, sx + 11, by + 11, 11)
          ctx.fill()
          ctx.strokeStyle = '#15131C'
          ctx.lineWidth = 1
          ctx.stroke()
        } else {
          // feather (double jump)
          ctx.fillStyle = '#2EC4D6'
          ctx.beginPath()
          ctx.ellipse(sx + 11, by + 10, 6, 11, Math.PI / 5, 0, Math.PI * 2)
          ctx.fill()
          ctx.strokeStyle = '#15131C'
          ctx.beginPath()
          ctx.moveTo(sx + 14, by + 2)
          ctx.lineTo(sx + 7, by + 20)
          ctx.stroke()
        }
      }

      // pops
      for (const pp of g.pops) {
        const sx = pp.x - camX
        const yy = pp.y - (60 - pp.life) * 0.5
        ctx.fillStyle = '#FEE440'
        ctx.font = 'bold 16px monospace'
        ctx.textAlign = 'center'
        ctx.fillText('★', sx, yy)
      }

      // flag
      {
        const fx = g.flag.x - camX
        ctx.fillStyle = '#15131C'
        ctx.fillRect(fx - 12, GROUNDY - 14, 30, 14)
        ctx.fillStyle = '#B9C0CC'
        ctx.fillRect(fx, g.flag.y, 4, g.flag.h)
        ctx.fillStyle = '#E63946'
        ctx.beginPath()
        ctx.moveTo(fx + 4, g.flag.y)
        ctx.lineTo(fx + 46, g.flag.y + 15)
        ctx.lineTo(fx + 4, g.flag.y + 30)
        ctx.fill()
        ctx.fillStyle = '#FEE440'
        ctx.fillRect(fx + 12, g.flag.y + 12, 6, 6)
      }

      // enemies
      for (const e of g.enemies) {
        if (!e.alive) continue
        const sx = e.x - camX
        const foot = Math.sin(t / 120 + e.x) > 0 ? 1 : -1
        if (e.spiky) {
          ctx.fillStyle = '#8A3FE0'
          ctx.fillRect(sx, e.y + 6, e.w, e.h - 6)
          ctx.fillStyle = '#5E1FA8'
          for (let i = 0; i < 4; i++) {
            ctx.beginPath()
            ctx.moveTo(sx + 2 + i * 7, e.y + 6)
            ctx.lineTo(sx + 5.5 + i * 7, e.y - 3)
            ctx.lineTo(sx + 9 + i * 7, e.y + 6)
            ctx.fill()
          }
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(sx + 5, e.y + 12, 5, 5)
          ctx.fillRect(sx + e.w - 10, e.y + 12, 5, 5)
          ctx.fillStyle = '#15131C'
          ctx.fillRect(sx + 6, e.y + 14, 2, 2)
          ctx.fillRect(sx + e.w - 9, e.y + 14, 2, 2)
        } else {
          ctx.fillStyle = '#E63946'
          ctx.fillRect(sx, e.y, e.w, e.h - 4)
          ctx.fillStyle = '#15131C'
          ctx.fillRect(sx + 3, e.y + e.h - 4, 6, 4 + foot)
          ctx.fillRect(sx + e.w - 9, e.y + e.h - 4, 6, 4 - foot)
          ctx.strokeStyle = '#15131C'
          ctx.lineWidth = 1
          ctx.strokeRect(sx + 1, e.y + 1, e.w - 2, e.h - 5)
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(sx + 5, e.y + 7, 5, 5)
          ctx.fillRect(sx + e.w - 10, e.y + 7, 5, 5)
          ctx.fillStyle = '#15131C'
          ctx.fillRect(sx + 6, e.y + 9, 2, 2)
          ctx.fillRect(sx + e.w - 9, e.y + 9, 2, 2)
          // angry brows
          ctx.fillRect(sx + 4, e.y + 5, 6, 2)
          ctx.fillRect(sx + e.w - 10, e.y + 5, 6, 2)
        }
      }

      // player
      const p = player.current
      const hidden = p.invuln > 0 && Math.floor(t / 80) % 2 === 0
      if (!hidden) {
        if (p.star > 0) {
          ctx.save()
          ctx.globalAlpha = 0.45
          ctx.fillStyle = `hsl(${Math.floor(t / 4) % 360},90%,60%)`
          ctx.fillRect(p.x - camX - 2, p.y - 2, PLAYER_W + 4, PLAYER_H + 4)
          ctx.restore()
        }
        blit(ctx, spriteMain, p.x - camX, p.y, CELL, facing.current === -1)
      }
    }

    let last = performance.now()
    let acc = 0
    let tAnim = 0
    const frame = (now: number) => {
      let dt = now - last
      last = now
      if (dt > 250) dt = 250
      acc += dt
      while (acc >= STEP_MS) {
        if (statusRef.current === 'playing') step()
        acc -= STEP_MS
      }
      tAnim += dt
      render(tAnim)
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setKey = (k: 'left' | 'right', v: boolean) => () => {
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
        <div className="font-press flex gap-2" style={{ fontSize: 12, color: 'var(--gold)' }}>
          {hasFeather && <span title="Double jump">🪶</span>}
          {starOn && <span title="Invincible">⭐</span>}
          <span>★ {coins}</span>
        </div>
      </div>

      <p className="font-vt text-center mb-2" style={{ fontSize: 18, color: 'var(--bone)' }}>
        Reach the flag! <span style={{ opacity: 0.7 }}>Arrows / A-D move, Space jumps (grab a 🪶 to double-jump). Stomp red foes — dodge the purple spikes.</span> {'♥'.repeat(Math.max(0, lives))}
      </p>

      <div className="flex justify-center">
        <div style={{ position: 'relative', width: 'min(96vw, 820px)' }}>
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
              <PixelButton variant="orange" size="lg" sfx="unlock" onClick={() => nav(nextAfterLevel())}>
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

      {status === 'playing' && (
        <div className="flex justify-between mt-3" style={{ maxWidth: 'min(96vw, 820px)', margin: '12px auto 0' }}>
          <div className="flex gap-2">
            <TouchBtn label="◀" onDown={setKey('left', true)} onUp={setKey('left', false)} />
            <TouchBtn label="▶" onDown={setKey('right', true)} onUp={setKey('right', false)} />
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

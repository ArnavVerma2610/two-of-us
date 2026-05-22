import { useEffect, useRef, useState } from 'react'
import { useNav, nextAfterLevel } from '../nav'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import { spriteChibi, spriteChibiAlt, type Sprite } from '../game/sprites'
import {
  STAGE_LAYOUTS,
  STAGE_PALETTES,
  ENEMY_CONFIG,
  type EnemyType,
  type ProjType,
  type Platform,
} from './level5_data'
import PixelButton from '../components/PixelButton'
import SoundToggle from '../components/SoundToggle'

// ---- viewport + physics ----------------------------------------------------
const VW = 860
const VH = 480
const CAM_Y = 60 // world y shown at the top of the canvas
const STEP_MS = 1000 / 60
const GRAV = 0.6
const JUMP = -11
const ACCEL = 0.8
const MAXH = 4.5
const FRICTION = 0.85
const MAXFALL = 14
const COYOTE = 6
const BUFFER = 6
const PROJ_LIFE = 600 // px travelled before despawn
const TELL_MS = 400
const BLIND_MS = 15000
const PLAYER_ROWS = spriteChibi.grid.length
const PLAYER_COLS = Math.max(...spriteChibi.grid.map((r) => r.length))
const CELL = 44 / PLAYER_ROWS
const PLAYER_W = Math.round(PLAYER_COLS * CELL)
const PLAYER_H = Math.round(PLAYER_ROWS * CELL)

type Rect = { x: number; y: number; w: number; h: number }
type Enemy = {
  type: EnemyType
  x: number
  y: number
  dir: number
  fireTimer: number
  telling: number // ms remaining of the 0.4s tell, else 0
}
type Projectile = {
  type: ProjType
  x: number
  y: number
  vx: number
  vy: number
  age: number
  baseY: number
  t: number
}
type Power = { x: number; y: number; variant: string; taken: boolean }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string }

const ENEMY_SIZE = 42 // visual ~14px * 3
const HITBOX_INSET = 5

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

type Phase = 'handoff' | 'playing' | 'paused' | 'gameover'

function controllerFor(stage: number) {
  if (stage === 1) return 'PLAYER 1 — YOUR TURN'
  if (stage === 2) return 'PLAYER 2 — YOUR TURN'
  return 'BOTH PLAYERS — TOGETHER'
}

export default function Level05_Stimulated() {
  const nav = useNav()
  const { completeLevel, saveLevel5, clearLevel5 } = useGame()

  const [stage, setStage] = useState(1) // 1..3
  const [phase, setPhase] = useState<Phase>('handoff')
  const [lives, setLives] = useState(3)
  const [meter, setMeter] = useState(0)
  const [blindLeft, setBlindLeft] = useState(0) // seconds, 0 = not blinded
  const [echo, setEcho] = useState(5)
  const [heartFx, setHeartFx] = useState(-1) // index of the heart currently shattering

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const keys = useRef({ left: false, right: false, jumpQueued: false, orbL: false, orbR: false, orbPulse: false })
  const facing = useRef(1)
  const rafRef = useRef(0)

  const stageRef = useRef(1)
  const phaseRef = useRef<Phase>('handoff')
  const livesRef = useRef(3)
  const meterRef = useRef(0)

  // runtime world
  const game = useRef<{
    enemies: Enemy[]
    projectiles: Projectile[]
    powers: Power[]
    particles: Particle[]
    platforms: Platform[]
    worldWidth: number
    worldHeight: number
    checkpoints: { x: number; y: number }[]
    cpIndex: number
  } | null>(null)

  const player = useRef({ x: 60, y: 400, vx: 0, vy: 0, onGround: false, coyote: 0, buffer: 0, iframes: 0, flash: 0 })
  const orb = useRef({ x: 120, y: 380, ox: 60, oy: -40 })
  const cam = useRef(0)
  const shake = useRef(0)
  const blind = useRef({ on: false, left: 0, lastTick: 0 })
  const reveal = useRef(0) // ms remaining of echo reveal
  const cueClock = useRef(0)
  const echoRef = useRef(5)
  const slowmo = useRef(0) // ms of real time the world runs at 0.6x
  const pendingDeath = useRef(false) // meter hit 100%, death deferred until slow-mo ends
  const resumeData = useRef<{ meter: number; cpIndex: number } | null>(null)

  const persistLevel5 = () => {
    saveLevel5({
      currentStage: stageRef.current,
      lives: livesRef.current,
      stimulationMeter: meterRef.current,
      lastCheckpointId: game.current ? game.current.cpIndex : 0,
    })
  }

  const loadStage = (s: number, resume?: { meter: number; cpIndex: number }) => {
    const layout = STAGE_LAYOUTS[s - 1]
    const cpIndex = resume ? Math.max(0, Math.min(resume.cpIndex, layout.checkpoints.length - 1)) : 0
    game.current = {
      enemies: layout.enemies.map((e) => ({
        type: e.type,
        x: e.x,
        y: e.y,
        dir: e.facing === 'left' ? -1 : 1,
        fireTimer: 600 + Math.random() * ENEMY_CONFIG[e.type].cadence,
        telling: 0,
      })),
      projectiles: [],
      powers: layout.powerups.map((p) => ({ x: p.x, y: p.y, variant: p.variant, taken: false })),
      particles: [],
      platforms: layout.platforms,
      worldWidth: layout.worldWidth,
      worldHeight: layout.worldHeight,
      checkpoints: layout.checkpoints,
      cpIndex,
    }
    const cp = layout.checkpoints[cpIndex]
    player.current = { x: cp.x, y: cp.y, vx: 0, vy: 0, onGround: false, coyote: 0, buffer: 0, iframes: 60, flash: 0 }
    orb.current = { x: cp.x + 60, y: cp.y - 40, ox: 60, oy: -40 }
    cam.current = Math.max(0, Math.min(cp.x - VW / 2, layout.worldWidth - VW))
    blind.current = { on: false, left: 0, lastTick: 0 }
    reveal.current = 0
    slowmo.current = 0
    pendingDeath.current = false
    const m = resume ? resume.meter : 0
    meterRef.current = m
    setMeter(m)
    setBlindLeft(0)
    echoRef.current = 5
    setEcho(5)
    audio.setBlindDuck(false)
  }

  const startStage = (s: number) => {
    setStage(s)
    stageRef.current = s
    loadStage(s, resumeData.current ?? undefined)
    resumeData.current = null
    setPhase('playing')
    phaseRef.current = 'playing'
    audio.playMusic(s === 1 ? 'level5_stage1' : s === 2 ? 'level5_stage2' : 'level5_stage3')
    persistLevel5()
  }

  const retryStage = () => {
    livesRef.current = 3
    setLives(3)
    setHeartFx(-1)
    resumeData.current = null
    startStage(stageRef.current)
  }

  // input
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key
      if (k === 'Escape') {
        if (phaseRef.current === 'playing') {
          setPhase('paused')
          phaseRef.current = 'paused'
        }
        return
      }
      const s = stageRef.current
      if (s < 3) {
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.current.left = true
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.current.right = true
        else if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') keys.current.jumpQueued = true
        else return
      } else {
        if (k === 'a' || k === 'A') keys.current.left = true
        else if (k === 'd' || k === 'D') keys.current.right = true
        else if (k === ' ' || k === 'w' || k === 'W') keys.current.jumpQueued = true
        else if (k === 'ArrowLeft') keys.current.orbL = true
        else if (k === 'ArrowRight') keys.current.orbR = true
        else if (k === 'ArrowUp') keys.current.orbPulse = true
        else return
      }
      e.preventDefault()
    }
    const up = (e: KeyboardEvent) => {
      const k = e.key
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
        keys.current.left = false
        keys.current.orbL = false
      } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
        keys.current.right = false
        keys.current.orbR = false
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  // resume a saved mid-stage session if one exists, else start fresh
  useEffect(() => {
    const saved = useGame.getState().level5
    if (saved && saved.currentStage >= 1 && saved.currentStage <= 3 && saved.lives > 0) {
      stageRef.current = saved.currentStage
      setStage(saved.currentStage)
      livesRef.current = saved.lives
      setLives(saved.lives)
      resumeData.current = { meter: saved.stimulationMeter, cpIndex: saved.lastCheckpointId }
      loadStage(saved.currentStage, resumeData.current)
    } else {
      loadStage(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // main loop
  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.imageSmoothingEnabled = false

    const loseLife = () => {
      pendingDeath.current = false
      slowmo.current = 0
      livesRef.current -= 1
      setLives(livesRef.current)
      setHeartFx(livesRef.current) // the heart that just emptied
      window.setTimeout(() => setHeartFx(-1), 480)
      audio.sfx('heart_break')
      meterRef.current = 0
      setMeter(0)
      if (blind.current.on) {
        blind.current.on = false
        blind.current.left = 0
        setBlindLeft(0)
        audio.setBlindDuck(false)
      }
      if (livesRef.current <= 0) {
        clearLevel5()
        phaseRef.current = 'gameover'
        setPhase('gameover')
        return
      }
      const g = game.current!
      const cp = g.checkpoints[g.cpIndex]
      player.current = { x: cp.x, y: cp.y, vx: 0, vy: 0, onGround: false, coyote: 0, buffer: 0, iframes: 90, flash: 0 }
      cam.current = Math.max(0, Math.min(cp.x - VW / 2, g.worldWidth - VW))
      persistLevel5()
    }

    const hitByProjectile = (p: Projectile) => {
      if (p.type === 'blindness') {
        if (!blind.current.on) {
          blind.current = { on: true, left: BLIND_MS, lastTick: BLIND_MS }
          setBlindLeft(15)
          audio.setBlindDuck(true)
          audio.blindOnset()
          shake.current = 6
        }
        return
      }
      meterRef.current = Math.min(100, meterRef.current + 25)
      setMeter(meterRef.current)
      player.current.iframes = 30
      player.current.flash = 6
      shake.current = 3
      audio.sfx(('hit_' + p.type) as 'hit_sight' | 'hit_sound' | 'hit_taste' | 'hit_touch')
      if (meterRef.current >= 100) {
        audio.sfx('meter_full')
        // brief slow-motion so the loss registers before the respawn
        slowmo.current = 250
        pendingDeath.current = true
      } else {
        persistLevel5()
      }
    }

    const fire = (e: Enemy) => {
      const g = game.current!
      const cfg = ENEMY_CONFIG[e.type]
      const sp = cfg.speed * e.dir
      const ox = e.x + ENEMY_SIZE / 2
      const oy = e.y + ENEMY_SIZE / 2
      const mk = (vy: number): Projectile => ({ type: cfg.proj, x: ox, y: oy, vx: sp, vy, age: 0, baseY: oy, t: 0 })
      if (cfg.proj === 'touch') {
        g.projectiles.push(mk(-1.6), mk(0), mk(1.6))
      } else if (cfg.proj === 'blindness') {
        g.projectiles.push(mk(0.3))
      } else {
        g.projectiles.push(mk(0))
      }
    }

    const burst = (x: number, y: number, color: string, n = 8) => {
      const g = game.current!
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        g.particles.push({ x, y, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2 - 1, life: 24, color })
      }
    }

    const step = () => {
      const g = game.current
      if (!g || phaseRef.current !== 'playing') return
      const p = player.current
      const s = stageRef.current
      const solids = g.platforms

      // ---- blindness timer ----
      if (blind.current.on) {
        blind.current.left -= STEP_MS
        const secLeft = Math.ceil(blind.current.left / 1000)
        if (blind.current.left <= blind.current.lastTick - 1000) {
          blind.current.lastTick -= 1000
          audio.blindTick()
        }
        setBlindLeft(Math.max(0, secLeft))
        if (blind.current.left <= 0) {
          blind.current.on = false
          setBlindLeft(0)
          audio.setBlindDuck(false)
          audio.blindRelease()
        }
      }
      if (reveal.current > 0) reveal.current -= STEP_MS

      // deferred death — fires once the slow-motion beat finishes
      if (pendingDeath.current && slowmo.current <= 0) {
        loseLife()
        return
      }

      // ---- input → horizontal ----
      if (keys.current.left) p.vx -= ACCEL
      if (keys.current.right) p.vx += ACCEL
      if (!keys.current.left && !keys.current.right) p.vx *= FRICTION
      p.vx = Math.max(-MAXH, Math.min(MAXH, p.vx))
      if (Math.abs(p.vx) < 0.05) p.vx = 0
      if (p.vx > 0.1) facing.current = 1
      else if (p.vx < -0.1) facing.current = -1

      // jump buffer + coyote
      if (keys.current.jumpQueued) {
        p.buffer = BUFFER
        keys.current.jumpQueued = false
      }
      if (p.buffer > 0) p.buffer--
      if (p.coyote > 0) p.coyote--
      if (p.buffer > 0 && p.coyote > 0) {
        p.vy = JUMP
        p.onGround = false
        p.coyote = 0
        p.buffer = 0
        audio.sfx('jump')
      }

      p.vy = Math.min(p.vy + GRAV, MAXFALL)

      // x move + collide
      p.x += p.vx
      for (const sp of solids) {
        if (overlap({ x: p.x + HITBOX_INSET, y: p.y, w: PLAYER_W - HITBOX_INSET * 2, h: PLAYER_H }, sp)) {
          if (p.vx > 0) p.x = sp.x - (PLAYER_W - HITBOX_INSET)
          else if (p.vx < 0) p.x = sp.x + sp.w - HITBOX_INSET
          p.vx = 0
        }
      }
      if (p.x < 0) p.x = 0

      // y move + collide
      const wasGround = p.onGround
      p.onGround = false
      let groundPlat: Platform | null = null
      p.y += p.vy
      for (const sp of solids) {
        if (overlap({ x: p.x + HITBOX_INSET, y: p.y, w: PLAYER_W - HITBOX_INSET * 2, h: PLAYER_H }, sp)) {
          if (p.vy > 0) {
            p.y = sp.y - PLAYER_H
            p.vy = 0
            p.onGround = true
            groundPlat = sp
          } else if (p.vy < 0) {
            p.y = sp.y + sp.h
            p.vy = 0
          }
        }
      }
      if (p.onGround) p.coyote = COYOTE
      else if (wasGround) p.coyote = COYOTE
      if (p.iframes > 0) p.iframes--
      if (p.flash > 0) p.flash--

      // footstep cue (audible always, important in blindness)
      cueClock.current += STEP_MS
      if (p.onGround && Math.abs(p.vx) > 1 && cueClock.current % 200 < STEP_MS) {
        audio.cue(180, '64n', Math.max(-1, Math.min(1, (p.x - cam.current - VW / 2) / (VW / 2))), -20)
      }

      // edge-proximity warning — periodic panned tone that pitches up as the
      // platform edge nears. Critical audio aid while blinded.
      if (groundPlat && p.onGround) {
        const gp: Platform = groundPlat
        const leftGap = p.x + HITBOX_INSET - gp.x
        const rightGap = gp.x + gp.w - (p.x + PLAYER_W - HITBOX_INSET)
        const near = Math.min(leftGap, rightGap)
        if (near < 46 && near > -24 && cueClock.current % 240 < STEP_MS) {
          const side = leftGap < rightGap ? -1 : 1
          audio.cue(300 + (46 - near) * 11, '32n', side, blind.current.on ? -15 : -27)
        }
      }

      // fall death
      if (p.y > g.worldHeight + 60) {
        loseLife()
        return
      }

      // ---- enemies ----
      for (const e of g.enemies) {
        if (e.telling > 0) {
          e.telling -= STEP_MS
          if (e.telling <= 0) fire(e)
          continue
        }
        e.fireTimer -= STEP_MS
        if (e.fireTimer <= 0) {
          e.telling = TELL_MS
          e.fireTimer = ENEMY_CONFIG[e.type].cadence
          audio.sfx('fire_tell')
        }
        // enemy ambience during blindness (throttled, panned by direction)
        if (blind.current.on && cueClock.current % 600 < STEP_MS) {
          const dx = e.x - (p.x + PLAYER_W / 2)
          const dist = Math.abs(dx)
          if (dist < 420) {
            const pan = Math.max(-1, Math.min(1, dx / 300))
            const freq = e.type === 'eyebot' ? 1400 : e.type === 'speakerbot' ? 160 : e.type === 'tonguebot' ? 500 : e.type === 'pricklebot' ? 700 : 90
            audio.cue(freq, '32n', pan, -24 - dist / 30)
          }
        }
      }

      // ---- projectiles ----
      const phb = { x: p.x + HITBOX_INSET, y: p.y + HITBOX_INSET, w: PLAYER_W - HITBOX_INSET * 2, h: PLAYER_H - HITBOX_INSET * 2 }
      g.projectiles = g.projectiles.filter((pr) => {
        pr.t += 1
        pr.age += Math.abs(pr.vx) + Math.abs(pr.vy)
        pr.x += pr.vx
        if (pr.type === 'taste') {
          pr.y = pr.baseY + Math.sin(pr.t / 6) * 26
        } else if (pr.type === 'blindness') {
          pr.vy += 0.015
          pr.y += pr.vy
        } else {
          pr.y += pr.vy
        }
        // collision
        const sz = pr.type === 'sound' ? 26 : 16
        if (p.iframes <= 0 && overlap({ x: pr.x - sz / 2, y: pr.y - sz / 2, w: sz, h: sz }, phb)) {
          hitByProjectile(pr)
          return false
        }
        if (pr.age > PROJ_LIFE) return false
        // platform collision
        for (const sp of solids) {
          if (overlap({ x: pr.x - 4, y: pr.y - 4, w: 8, h: 8 }, sp)) return false
        }
        return true
      })

      // ---- powerups ----
      for (const pw of g.powers) {
        if (pw.taken) continue
        if (overlap({ x: pw.x - 14, y: pw.y - 14, w: 28, h: 28 }, phb)) {
          pw.taken = true
          meterRef.current = Math.max(0, meterRef.current - 25)
          setMeter(meterRef.current)
          audio.sfx('powerup')
          burst(pw.x, pw.y, '#84c441', 10)
          shake.current = Math.max(shake.current, 1)
          persistLevel5()
        } else if (blind.current.on && cueClock.current % 1500 < STEP_MS) {
          const dx = pw.x - (p.x + PLAYER_W / 2)
          if (Math.abs(dx) < 360) {
            const pan = Math.max(-1, Math.min(1, dx / 300))
            audio.cue(1046, '32n', pan, -16)
            audio.cue(1318, '32n', pan, -16)
          }
        }
      }

      // ---- echo orb (stage 3) ----
      if (s === 3) {
        const o = orb.current
        if (keys.current.orbL) o.ox -= 2.4
        if (keys.current.orbR) o.ox += 2.4
        o.ox = Math.max(-120, Math.min(120, o.ox))
        o.x += (p.x + o.ox - o.x) * 0.2
        o.y += (p.y - 40 - o.y) * 0.2
        if (keys.current.orbPulse) {
          keys.current.orbPulse = false
          if (echoRef.current > 0) {
            echoRef.current--
            setEcho(echoRef.current)
            reveal.current = 320
            audio.sfx('echo_pulse')
          }
        }
      }

      // particles
      g.particles.forEach((pt) => {
        pt.x += pt.vx
        pt.y += pt.vy
        pt.vy += 0.15
        pt.life--
      })
      g.particles = g.particles.filter((pt) => pt.life > 0)

      if (shake.current > 0) shake.current -= 1

      // camera (lookahead toward facing)
      const target = p.x + PLAYER_W / 2 - VW / 2 + facing.current * 80
      cam.current += (Math.max(0, Math.min(target, g.worldWidth - VW)) - cam.current) * 0.12

      // checkpoint progression — advance respawn point as the player passes
      for (let i = g.cpIndex + 1; i < g.checkpoints.length; i++) {
        if (p.x + PLAYER_W / 2 >= g.checkpoints[i].x) {
          g.cpIndex = i
          persistLevel5()
        }
      }

      // stage clear
      if (p.x > g.worldWidth - 70) {
        if (s >= 3) {
          completeLevel(5)
          clearLevel5()
          audio.sfx('success')
          nav(nextAfterLevel())
        } else {
          audio.sfx('success')
          setStage(s + 1)
          setPhase('handoff')
          phaseRef.current = 'handoff'
          resumeData.current = null
          saveLevel5({ currentStage: s + 1, lives: livesRef.current, stimulationMeter: 0, lastCheckpointId: 0 })
        }
      }
    }

    const render = () => {
      const g = game.current
      if (!g) return
      const pal = STAGE_PALETTES[stageRef.current - 1]
      const camX = cam.current
      const sx = shake.current > 0 ? (Math.random() - 0.5) * shake.current * 2 : 0
      const sy = shake.current > 0 ? (Math.random() - 0.5) * shake.current : 0
      // overstimulation jitter — mild horizontal wobble + periodic vertical hop
      let jx = 0
      let jy = 0
      if (meterRef.current > 75 && !blind.current.on) {
        jx = (Math.random() - 0.5) * 2
        jy = Math.floor(performance.now() / 130) % 2 === 0 ? 1 : 0
      }
      ctx.save()
      ctx.translate(sx + jx, sy + jy)

      const blinded = blind.current.on
      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, VH)
      sky.addColorStop(0, blinded ? '#05050a' : pal.sky1)
      sky.addColorStop(1, blinded ? '#0b0a12' : pal.sky2)
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, VW, VH)

      if (!blinded) {
        // parallax hills
        ctx.globalAlpha = 0.5
        ctx.fillStyle = pal.ground
        for (let i = 0; i < 8; i++) {
          const hx = i * 380 - ((camX * 0.4) % 380)
          ctx.beginPath()
          ctx.arc(hx + 160, 480 - CAM_Y, 150, Math.PI, 0)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      const drawWorld = (alpha: number) => {
        ctx.globalAlpha = alpha
        // platforms
        for (const sp of g.platforms) {
          const x = sp.x - camX
          const y = sp.y - CAM_Y
          if (x + sp.w < -8 || x > VW + 8) continue
          ctx.fillStyle = pal.ground
          ctx.fillRect(x, y, sp.w, sp.h)
          ctx.fillStyle = pal.accent
          ctx.fillRect(x, y, sp.w, 5)
          ctx.fillStyle = '#15131c'
          ctx.fillRect(x, y, sp.w, 2)
        }
        // powerups
        for (const pw of g.powers) {
          if (pw.taken) continue
          const x = pw.x - camX
          const y = pw.y - CAM_Y + Math.sin(performance.now() / 300 + pw.x) * 3
          ctx.fillStyle = 'rgba(255,255,255,0.35)'
          ctx.beginPath()
          ctx.arc(x, y, 15, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#84c441'
          ctx.beginPath()
          ctx.arc(x, y, 9, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#fffdf6'
          ctx.fillRect(x - 2, y - 6, 4, 12)
          ctx.fillRect(x - 6, y - 2, 12, 4)
        }
        // enemies
        for (const e of g.enemies) {
          const x = e.x - camX
          const y = e.y - CAM_Y
          if (x + ENEMY_SIZE < -8 || x > VW + 8) continue
          const cfg = ENEMY_CONFIG[e.type]
          const telling = e.telling > 0
          ctx.fillStyle = cfg.color
          const grow = telling ? 3 : 0
          ctx.fillRect(x - grow, y - grow, ENEMY_SIZE + grow * 2, ENEMY_SIZE + grow * 2)
          ctx.strokeStyle = '#15131c'
          ctx.lineWidth = 2
          ctx.strokeRect(x - grow, y - grow, ENEMY_SIZE + grow * 2, ENEMY_SIZE + grow * 2)
          // eye/iris
          ctx.fillStyle = telling ? '#fff' : '#fffdf6'
          ctx.beginPath()
          ctx.arc(x + ENEMY_SIZE / 2, y + ENEMY_SIZE / 2, 8, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#15131c'
          ctx.beginPath()
          ctx.arc(x + ENEMY_SIZE / 2 + e.dir * 3, y + ENEMY_SIZE / 2, 4, 0, Math.PI * 2)
          ctx.fill()
        }
        // projectiles
        for (const pr of g.projectiles) {
          const x = pr.x - camX
          const y = pr.y - CAM_Y
          if (pr.type === 'sight') {
            ctx.fillStyle = '#2EC4D6'
            ctx.save()
            ctx.translate(x, y)
            ctx.rotate(Math.PI / 4)
            ctx.fillRect(-6, -6, 12, 12)
            ctx.restore()
          } else if (pr.type === 'sound') {
            ctx.strokeStyle = '#ED3E8E'
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.arc(x, y, 8 + (pr.t % 20), 0, Math.PI * 2)
            ctx.stroke()
          } else if (pr.type === 'taste') {
            ctx.fillStyle = '#9ACD32'
            ctx.beginPath()
            ctx.arc(x, y, 8, 0, Math.PI * 2)
            ctx.fill()
          } else if (pr.type === 'touch') {
            ctx.fillStyle = '#F47B2A'
            ctx.beginPath()
            ctx.moveTo(x, y - 8)
            ctx.lineTo(x + 8, y + 6)
            ctx.lineTo(x - 8, y + 6)
            ctx.fill()
          } else {
            ctx.fillStyle = '#3A2A60'
            ctx.beginPath()
            ctx.arc(x, y, 10, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = '#fff'
            ctx.beginPath()
            ctx.arc(x, y, 3, 0, Math.PI * 2)
            ctx.fill()
          }
        }
        // particles
        for (const pt of g.particles) {
          ctx.fillStyle = pt.color
          ctx.fillRect(pt.x - camX, pt.y - CAM_Y, 3, 3)
        }
        ctx.globalAlpha = 1
      }

      const p = player.current
      const px = p.x - camX
      const py = p.y - CAM_Y

      if (!blinded) {
        drawWorld(1)
      } else {
        // near-black; echo reveal flashes outlines
        if (reveal.current > 0) drawWorld(0.22)
        // faint player outline
        ctx.strokeStyle = 'rgba(244,236,218,0.5)'
        ctx.lineWidth = 1
        ctx.strokeRect(px, py, PLAYER_W, PLAYER_H)
        // echo orb glow
        if (stageRef.current === 3) {
          const o = orb.current
          ctx.fillStyle = `rgba(43,176,230,${0.3 + (reveal.current > 0 ? 0.4 : 0)})`
          ctx.beginPath()
          ctx.arc(o.x - camX, o.y - CAM_Y, reveal.current > 0 ? 14 : 8, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // player (skip when flashing odd frame or invuln blink)
      if (!blinded) {
        const blink = p.iframes > 0 && Math.floor(p.iframes / 4) % 2 === 0
        if (!blink) {
          if (p.flash > 0) {
            ctx.save()
            ctx.globalAlpha = 0.8
            ctx.fillStyle = '#fff'
            ctx.fillRect(px, py, PLAYER_W, PLAYER_H)
            ctx.restore()
          } else {
            const spr = stageRef.current === 2 ? spriteChibiAlt : spriteChibi
            blit(ctx, spr, px, py, CELL, facing.current === -1)
          }
        }
        // echo orb visible normally in stage 3
        if (stageRef.current === 3) {
          const o = orb.current
          ctx.fillStyle = 'rgba(43,176,230,0.85)'
          ctx.beginPath()
          ctx.arc(o.x - camX, o.y - CAM_Y, 7 + Math.sin(performance.now() / 200) * 1.5, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // overstimulation vignette
      if (meterRef.current >= 75 && !blinded) {
        const a = 0.12 + 0.12 * Math.sin(performance.now() / 200)
        const vg = ctx.createRadialGradient(VW / 2, VH / 2, VH / 3, VW / 2, VH / 2, VH / 1.1)
        vg.addColorStop(0, 'rgba(236,63,110,0)')
        vg.addColorStop(1, `rgba(236,63,110,${a})`)
        ctx.fillStyle = vg
        ctx.fillRect(0, 0, VW, VH)
      }

      ctx.restore()
    }

    let last = performance.now()
    let acc = 0
    const frame = (now: number) => {
      let dt = now - last
      last = now
      if (dt > 200) dt = 200
      if (slowmo.current > 0) slowmo.current -= dt
      acc += dt * (slowmo.current > 0 ? 0.6 : 1)
      while (acc >= STEP_MS) {
        step()
        acc -= STEP_MS
      }
      render()
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const meterColor = meter >= 75 ? 'var(--red-accent)' : meter >= 50 ? 'var(--gold)' : 'var(--mint)'
  const pal = STAGE_PALETTES[stage - 1]

  return (
    <main className="px-3 py-3" style={{ minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <PixelButton variant="bone" size="sm" sfx="back" onClick={() => nav({ name: 'selector' })}>
          ← BACK
        </PixelButton>
        <h2 className="font-press" style={{ fontSize: 'clamp(11px,3vw,16px)', color: 'var(--violet)' }}>
          BITS OF NEW SENSE
        </h2>
        <span style={{ width: 56 }} />
      </div>

      <div className="flex justify-center">
        <div style={{ position: 'relative', width: 'min(96vw, 860px)' }}>
          <canvas
            ref={canvasRef}
            width={VW}
            height={VH}
            style={{ width: '100%', height: 'auto', imageRendering: 'pixelated', border: '3px solid var(--ink)', boxShadow: '4px 4px 0 var(--ink)', display: 'block', touchAction: 'none' }}
          />

          {/* HUD: stage label */}
          <div className="font-vt" style={{ position: 'absolute', top: 8, left: 10, fontSize: 16, color: '#fffdf6', textShadow: '1px 1px 0 #000' }}>
            STAGE {stage} / 3 — {pal.name}
          </div>

          {/* HUD: lives */}
          <div className="font-press" style={{ position: 'absolute', top: 8, right: 10, fontSize: 11, color: '#fffdf6', textShadow: '1px 1px 0 #000', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 9 }}>LIVES</span>
            {[0, 1, 2].map((i) => {
              const filled = i < lives
              const shattering = i === heartFx
              return (
                <span
                  key={i}
                  className={shattering ? 'heart-shatter' : ''}
                  style={{
                    color: filled || shattering ? 'var(--red-accent)' : 'transparent',
                    WebkitTextStroke: filled || shattering ? '0' : '1px #fffdf6',
                  }}
                >
                  ♥
                </span>
              )
            })}
          </div>

          {/* HUD: stimulation meter */}
          <div style={{ position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%)', width: 240, textAlign: 'center' }}>
            <div className="font-press" style={{ fontSize: 8, color: '#fffdf6', textShadow: '1px 1px 0 #000', marginBottom: 3 }}>
              STIMULATION
            </div>
            <div style={{ display: 'flex', gap: 2, border: '3px solid var(--ink)', background: 'var(--bone)', padding: 2 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ flex: 1, height: 14, background: meter > i * 25 ? meterColor : 'transparent' }} />
              ))}
            </div>
          </div>

          {/* P2 watching indicator */}
          {(stage === 1 || stage === 2) && phase === 'playing' && (
            <div className="font-press" style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 9, color: '#fffdf6', textShadow: '1px 1px 0 #000', opacity: 0.8 }}>
              {stage === 1 ? 'P2 — WATCHING' : 'P1 — WATCHING'}
            </div>
          )}

          {/* echo pulses (stage 3) */}
          {stage === 3 && phase === 'playing' && (
            <div className="font-press" style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 9, color: '#2bb0e6', textShadow: '1px 1px 0 #000' }}>
              ECHO ↑ ×{echo}
            </div>
          )}

          {/* blindness countdown */}
          {blindLeft > 0 && (
            <div className="font-press" style={{ position: 'absolute', top: 70, left: '50%', transform: 'translateX(-50%)', fontSize: 40, color: '#fffdf6', textShadow: '2px 2px 0 #000' }}>
              {blindLeft}
            </div>
          )}

          {/* handoff screen */}
          {phase === 'handoff' && (
            <Overlay>
              <p className="font-press" style={{ fontSize: 13, color: 'var(--gold)', marginBottom: 10 }}>
                STAGE {stage} / 3
              </p>
              <p className="font-press" style={{ fontSize: 20, color: '#fffdf6', marginBottom: 8 }}>
                {pal.name}
              </p>
              <p className="font-vt" style={{ fontSize: 22, color: '#fffdf6', marginBottom: 6 }}>
                {controllerFor(stage)}
              </p>
              <p className="font-vt" style={{ fontSize: 17, color: '#fffdf6', opacity: 0.75, marginBottom: 20, maxWidth: 460, textAlign: 'center' }}>
                {stage < 3
                  ? 'Move with A/D or ←/→, jump with W / ↑ / Space. Dodge the sensory shots, grab grounding pickups, reach the right edge.'
                  : 'P1: A/D + W to move & jump. P2: ←/→ to steer the Echo Orb, ↑ to pulse it (reveals the world during blindness).'}
              </p>
              <PixelButton variant="orange" size="lg" sfx="submit" onClick={() => startStage(stage)}>
                START
              </PixelButton>
            </Overlay>
          )}

          {/* paused */}
          {phase === 'paused' && (
            <Overlay>
              <p className="font-press" style={{ fontSize: 18, color: '#fffdf6', marginBottom: 18 }}>
                PAUSED
              </p>
              <div className="flex flex-col items-center gap-3">
                <PixelButton
                  variant="mint"
                  size="lg"
                  sfx="submit"
                  onClick={() => {
                    setPhase('playing')
                    phaseRef.current = 'playing'
                  }}
                >
                  RESUME
                </PixelButton>
                <SoundToggle />
                <PixelButton variant="bone" sfx="back" onClick={() => nav({ name: 'selector' })}>
                  EXIT TO MENU
                </PixelButton>
              </div>
            </Overlay>
          )}

          {/* game over */}
          {phase === 'gameover' && (
            <Overlay>
              <p className="font-press" style={{ fontSize: 22, color: 'var(--red-accent)', textShadow: '2px 2px 0 #000', marginBottom: 12 }}>
                OVERSTIMULATED
              </p>
              <p className="font-vt" style={{ fontSize: 20, color: '#fffdf6', marginBottom: 22 }}>
                the world was too much. try again.
              </p>
              <div className="flex gap-3">
                <PixelButton variant="cyan" size="lg" sfx="submit" onClick={retryStage}>
                  RETRY STAGE
                </PixelButton>
                <PixelButton variant="bone" sfx="back" onClick={() => nav({ name: 'selector' })}>
                  EXIT TO MENU
                </PixelButton>
              </div>
            </Overlay>
          )}
        </div>
      </div>

      {/* mobile touch controls */}
      {phase === 'playing' && (
        <div className="flex justify-between mt-3" style={{ maxWidth: 'min(96vw, 860px)', margin: '10px auto 0' }}>
          <div className="flex gap-2">
            <TouchBtn label="◀" onDown={() => (keys.current.left = true)} onUp={() => (keys.current.left = false)} />
            <TouchBtn label="▶" onDown={() => (keys.current.right = true)} onUp={() => (keys.current.right = false)} />
          </div>
          <div className="flex gap-2">
            {stage === 3 && <TouchBtn label="ECHO" onDown={() => (keys.current.orbPulse = true)} onUp={() => {}} />}
            <TouchBtn label="JUMP" wide onDown={() => (keys.current.jumpQueued = true)} onUp={() => {}} />
          </div>
        </div>
      )}
    </main>
  )
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(11,10,18,0.86)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 16 }}>
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
      style={{ background: 'var(--bone)', color: 'var(--ink)', fontFamily: "'Press Start 2P', monospace", fontSize: wide ? 10 : 9, width: wide ? 110 : 52, height: 52, touchAction: 'none' }}
    >
      {label}
    </button>
  )
}

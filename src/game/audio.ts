import * as Tone from 'tone'

export type MusicTrack = 'home' | 'select' | 'level1' | 'level2' | 'level5'
export type SfxName =
  | 'click'
  | 'select'
  | 'back'
  | 'submit'
  | 'success'
  | 'turn'
  | 'paint'
  | 'unlock'
  | 'jump'
  | 'coin'
  | 'stomp'
  | 'hurt'

// ---------------------------------------------------------------------------
// A small warm-chiptune engine built on Tone.js. Music is procedural: chord
// progressions defined in code, looped indefinitely via Tone.Transport.
// ---------------------------------------------------------------------------

type TrackDef = {
  bpm: number
  // chord progression — arrays of note names played as a pad/arp each bar
  progression: string[][]
  // melody notes (one per bar quarter); null = rest
  melody: (string | null)[]
}

const TRACKS: Record<MusicTrack, TrackDef> = {
  home: {
    bpm: 90,
    // I - V - vi - IV in C major
    progression: [
      ['C3', 'E3', 'G3'],
      ['G2', 'B2', 'D3'],
      ['A2', 'C3', 'E3'],
      ['F2', 'A2', 'C3'],
    ],
    melody: ['E4', 'G4', 'C5', 'B4', 'D4', 'G4', 'C4', 'E4', 'A4', 'C5', 'F4', 'A4'],
  },
  select: {
    bpm: 100,
    // I - vi - IV - V in G major
    progression: [
      ['G2', 'B2', 'D3'],
      ['E2', 'G2', 'B2'],
      ['C3', 'E3', 'G3'],
      ['D3', 'F#3', 'A3'],
    ],
    melody: ['D4', 'G4', 'B4', 'A4', 'E4', 'B4', 'C5', 'G4', 'D5', 'B4', 'A4', 'D4'],
  },
  level1: {
    bpm: 80,
    // vi - IV - I - V, sparse, contemplative (C major)
    progression: [
      ['A2', 'C3', 'E3'],
      ['F2', 'A2', 'C3'],
      ['C3', 'E3', 'G3'],
      ['G2', 'B2', 'D3'],
    ],
    melody: ['E4', null, 'A4', null, 'C4', null, 'F4', null, 'G4', null, 'D4', null],
  },
  level2: {
    bpm: 70,
    // ambient I - IV pad drift (C major)
    progression: [
      ['C3', 'E3', 'G3', 'B3'],
      ['F2', 'A2', 'C3', 'E3'],
      ['C3', 'E3', 'G3', 'B3'],
      ['G2', 'B2', 'D3', 'F#3'],
    ],
    melody: [null, null, null, null, null, null, null, null, null, null, null, null],
  },
  level5: {
    bpm: 142,
    // bouncy platformer romp — I - vi - IV - V in C, fast
    progression: [
      ['C3', 'E3', 'G3'],
      ['A2', 'C3', 'E3'],
      ['F2', 'A2', 'C3'],
      ['G2', 'B2', 'D3'],
    ],
    melody: ['C5', 'E5', 'G5', 'A5', 'G5', 'E5', 'F5', 'A5', 'C5', 'D5', 'G4', 'B4'],
  },
}

class AudioEngine {
  private started = false
  private padSynth: Tone.PolySynth | null = null
  private leadSynth: Tone.PolySynth | null = null
  private bassSynth: Tone.Synth | null = null
  private sfxSynth: Tone.PolySynth | null = null
  private sparkleSynth: Tone.Synth | null = null
  private kick: Tone.MembraneSynth | null = null
  private noise: Tone.NoiseSynth | null = null

  private musicBus: Tone.Channel | null = null
  private sfxBus: Tone.Channel | null = null

  private loop: Tone.Loop | null = null
  private currentTrack: MusicTrack | null = null
  private bar = 0

  private musicMuted = false
  private sfxMuted = false
  private musicVolume = 70
  private sfxVolume = 80

  async ensureStarted(): Promise<void> {
    if (this.started) return
    await Tone.start()

    const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.2 }).toDestination()
    const crush = new Tone.BitCrusher(8)
    crush.wet.value = 0.12
    crush.connect(reverb)

    this.musicBus = new Tone.Channel({ volume: 0 }).connect(crush)
    this.sfxBus = new Tone.Channel({ volume: 0 }).connect(reverb)

    this.padSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.05, decay: 0.3, sustain: 0.5, release: 1.2 },
      volume: -16,
    }).connect(this.musicBus)

    this.leadSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.6 },
      volume: -12,
    }).connect(this.musicBus)

    this.bassSynth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.6, release: 0.4 },
      volume: -14,
    }).connect(this.musicBus)

    this.sfxSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.2 },
      volume: -8,
    }).connect(this.sfxBus)

    this.sparkleSynth = new Tone.Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.15, sustain: 0, release: 0.2 },
      volume: -14,
    }).connect(this.sfxBus)

    this.kick = new Tone.MembraneSynth({ volume: -6 }).connect(this.sfxBus)
    this.noise = new Tone.NoiseSynth({
      noise: { type: 'white' },
      envelope: { attack: 0.005, decay: 0.05, sustain: 0 },
      volume: -28,
    }).connect(this.sfxBus)

    Tone.Transport.start()
    this.started = true
    this.applyVolumes()
  }

  private dbFromPercent(pct: number): number {
    if (pct <= 0) return -Infinity
    // map 0..100 -> -40dB..0dB, roughly perceptual
    return (1 - pct / 100) * -40
  }

  private applyVolumes(): void {
    if (this.musicBus) {
      this.musicBus.mute = this.musicMuted
      this.musicBus.volume.value = this.dbFromPercent(this.musicVolume)
    }
    if (this.sfxBus) {
      this.sfxBus.mute = this.sfxMuted
      this.sfxBus.volume.value = this.dbFromPercent(this.sfxVolume)
    }
  }

  setMusicMuted(m: boolean): void {
    this.musicMuted = m
    this.applyVolumes()
  }
  setSfxMuted(m: boolean): void {
    this.sfxMuted = m
    this.applyVolumes()
  }
  setMusicVolume(v: number): void {
    this.musicVolume = v
    this.applyVolumes()
  }
  setSfxVolume(v: number): void {
    this.sfxVolume = v
    this.applyVolumes()
  }

  playMusic(track: MusicTrack): void {
    if (!this.started) return
    if (this.currentTrack === track && this.loop) return
    this.stopMusic()
    this.currentTrack = track
    this.bar = 0

    const def = TRACKS[track]
    Tone.Transport.bpm.value = def.bpm

    this.loop = new Tone.Loop((time) => {
      const def2 = TRACKS[track]
      const chord = def2.progression[this.bar % def2.progression.length]
      // pad chord on the downbeat
      this.padSynth?.triggerAttackRelease(chord, '2n', time)
      // bass = root, an octave down feel
      this.bassSynth?.triggerAttackRelease(chord[0], '4n', time)

      // melody: 3 notes per bar (on beats) when present
      const beat = '8n'
      for (let i = 0; i < 3; i++) {
        const idx = (this.bar * 3 + i) % def2.melody.length
        const note = def2.melody[idx]
        if (note) {
          this.leadSynth?.triggerAttackRelease(note, beat, time + i * Tone.Time('4n').toSeconds())
        }
      }
      this.bar++
    }, '1m').start(0)
  }

  stopMusic(): void {
    if (this.loop) {
      this.loop.stop()
      this.loop.dispose()
      this.loop = null
    }
    this.currentTrack = null
  }

  private lastPaint = 0

  sfx(name: SfxName): void {
    if (!this.started || !this.sfxSynth) return
    try {
    const now = Tone.now()
    switch (name) {
      case 'click':
        this.sfxSynth.triggerAttackRelease('C5', '32n', now)
        break
      case 'select':
        this.sfxSynth.triggerAttackRelease('E5', '32n', now)
        this.sfxSynth.triggerAttackRelease('G5', '32n', now + 0.07)
        break
      case 'back':
        this.sfxSynth.triggerAttackRelease('G4', '32n', now)
        this.sfxSynth.triggerAttackRelease('E4', '32n', now + 0.07)
        break
      case 'submit': {
        const arp = ['C5', 'E5', 'G5', 'C6']
        arp.forEach((n, i) => this.sfxSynth?.triggerAttackRelease(n, '16n', now + i * 0.06))
        break
      }
      case 'success': {
        const asc = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6']
        asc.forEach((n, i) => this.sfxSynth?.triggerAttackRelease(n, '16n', now + i * 0.09))
        this.sparkleSynth?.triggerAttackRelease('C7', '8n', now + 0.55)
        this.sparkleSynth?.triggerAttackRelease('E7', '8n', now + 0.68)
        break
      }
      case 'turn':
        this.kick?.triggerAttackRelease('C2', '8n', now)
        this.sfxSynth.triggerAttackRelease(['C4', 'G4'], '4n', now + 0.02)
        this.sfxSynth.triggerAttackRelease(['E4', 'B4'], '4n', now + 0.25)
        break
      case 'paint': {
        const t = performance.now()
        if (t - this.lastPaint < 80) return
        this.lastPaint = t
        this.noise?.triggerAttackRelease('16n', now)
        break
      }
      case 'unlock': {
        this.sfxSynth.triggerAttackRelease(['C4', 'E4', 'G4'], '8n', now)
        this.sfxSynth.triggerAttackRelease(['D4', 'F#4', 'A4'], '8n', now + 0.16)
        this.sfxSynth.triggerAttackRelease(['G4', 'B4', 'D5'], '4n', now + 0.32)
        this.sparkleSynth?.triggerAttackRelease('G6', '8n', now + 0.5)
        break
      }
      case 'jump':
        this.sfxSynth.triggerAttackRelease('C5', '32n', now)
        this.sfxSynth.triggerAttackRelease('G5', '32n', now + 0.05)
        this.sfxSynth.triggerAttackRelease('C6', '16n', now + 0.1)
        break
      case 'coin':
        this.sparkleSynth?.triggerAttackRelease('B5', '32n', now)
        this.sparkleSynth?.triggerAttackRelease('E6', '16n', now + 0.06)
        break
      case 'stomp':
        this.kick?.triggerAttackRelease('G1', '8n', now)
        this.sfxSynth.triggerAttackRelease('C4', '16n', now)
        break
      case 'hurt':
        this.sfxSynth.triggerAttackRelease('A3', '16n', now)
        this.sfxSynth.triggerAttackRelease('E3', '8n', now + 0.1)
        this.noise?.triggerAttackRelease('16n', now)
        break
    }
    } catch {
      // Ignore audio scheduling hiccups (e.g. rapid SFX colliding on the
      // Tone.js timeline). A dropped sound must never crash the game.
    }
  }
}

export const audio = new AudioEngine()

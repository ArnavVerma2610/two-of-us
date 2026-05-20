import { useState } from 'react'
import { audio } from '../game/audio'
import { useGame } from '../game/store'
import PixelSprite from './PixelSprite'

export default function TapToBegin({ onBegin }: { onBegin: () => void }) {
  const [leaving, setLeaving] = useState(false)
  const { settings } = useGame()

  const begin = async () => {
    await audio.ensureStarted()
    audio.setMusicMuted(settings.musicMuted)
    audio.setSfxMuted(settings.sfxMuted)
    audio.setMusicVolume(settings.musicVolume)
    audio.setSfxVolume(settings.sfxVolume)
    audio.sfx('select')
    setLeaving(true)
    setTimeout(onBegin, 350)
  }

  return (
    <div
      onClick={begin}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') begin()
      }}
      role="button"
      tabIndex={0}
      aria-label="Tap to begin"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        background: 'var(--bg-deep)',
        cursor: 'pointer',
        transition: 'opacity 0.35s ease',
        opacity: leaving ? 0 : 1,
      }}
    >
      <div className="flex gap-6">
        <PixelSprite sprite="hero" scale={7} tint="var(--cyan-pop)" className="bob" />
        <PixelSprite sprite="heart" scale={7} className="bob bob-delay" />
        <PixelSprite sprite="hero" scale={7} tint="var(--orange-pop)" className="bob bob-delay" />
      </div>
      <h1 className="wordmark" style={{ fontSize: 'clamp(20px, 7vw, 44px)', textAlign: 'center' }}>
        TWO OF US
      </h1>
      <p className="font-press" style={{ fontSize: 12, color: 'var(--gold)' }}>
        TAP TO BEGIN
      </p>
      <p className="font-vt" style={{ fontSize: 20, color: 'var(--bone)', opacity: 0.7 }}>
        (sound on for the full arcade feel)
      </p>
    </div>
  )
}

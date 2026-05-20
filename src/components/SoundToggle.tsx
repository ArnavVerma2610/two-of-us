import { useGame } from '../game/store'
import { audio } from '../game/audio'
import PixelSprite from './PixelSprite'

function IconButton({
  active,
  muted,
  onToggle,
  sprite,
  label,
}: {
  active: boolean
  muted: boolean
  onToggle: () => void
  sprite: 'note' | 'speaker'
  label: string
}) {
  void active
  return (
    <button
      onClick={onToggle}
      aria-label={label}
      aria-pressed={muted}
      title={label}
      className="pixel-btn no-select"
      style={{
        backgroundColor: muted ? 'var(--gray-grid)' : 'var(--bone)',
        padding: 8,
        position: 'relative',
        width: 48,
        height: 48,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <PixelSprite sprite={sprite} scale={4} />
      {muted && (
        <svg className="diag-slash" viewBox="0 0 48 48" aria-hidden>
          <line x1="6" y1="42" x2="42" y2="6" stroke="var(--red-accent)" strokeWidth="5" />
        </svg>
      )}
    </button>
  )
}

export default function SoundToggle({ className = '' }: { className?: string }) {
  const { settings, updateSettings } = useGame()

  const toggleMusic = () => {
    const next = !settings.musicMuted
    updateSettings({ musicMuted: next })
    audio.setMusicMuted(next)
    audio.sfx('click')
  }
  const toggleSfx = () => {
    const next = !settings.sfxMuted
    // un-muting: play a click so the user hears the change
    updateSettings({ sfxMuted: next })
    audio.setSfxMuted(next)
    if (!next) audio.sfx('click')
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      <IconButton
        active={!settings.musicMuted}
        muted={settings.musicMuted}
        onToggle={toggleMusic}
        sprite="note"
        label={settings.musicMuted ? 'Unmute music' : 'Mute music'}
      />
      <IconButton
        active={!settings.sfxMuted}
        muted={settings.sfxMuted}
        onToggle={toggleSfx}
        sprite="speaker"
        label={settings.sfxMuted ? 'Unmute sound effects' : 'Mute sound effects'}
      />
    </div>
  )
}

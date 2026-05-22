import { useEffect, useState } from 'react'
import { useNav } from '../nav'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import PixelButton from './PixelButton'
import PixelFrame from './PixelFrame'
import PixelSprite from './PixelSprite'

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer" style={{ color: 'var(--ink)' }}>
      <span
        className="pixel-checkbox"
        role="checkbox"
        aria-checked={checked}
        tabIndex={0}
        onClick={() => onChange(!checked)}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            onChange(!checked)
          }
        }}
      >
        {checked && <PixelSprite sprite="check" scale={2} />}
      </span>
      <span className="font-vt" style={{ fontSize: 22 }}>
        {label}
      </span>
    </label>
  )
}

export default function Settings() {
  const nav = useNav()
  const { settings, updateSettings, resetProgress } = useGame()
  const [confirm1, setConfirm1] = useState(false)
  const [confirm2, setConfirm2] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        audio.sfx('back')
        nav({ name: 'home' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav])

  const doReset = () => {
    resetProgress()
    audio.sfx('back')
    setConfirm1(false)
    setConfirm2(false)
    nav({ name: 'home' })
  }

  return (
    <main className="px-4 py-6 flex flex-col items-center" style={{ minHeight: '100vh' }}>
      <div className="w-full flex items-center justify-between mb-8" style={{ maxWidth: 520 }}>
        <PixelButton variant="bone" sfx="back" onClick={() => nav({ name: 'home' })}>
          ← BACK
        </PixelButton>
        <h2 className="font-press" style={{ fontSize: 16, color: 'var(--violet)' }}>
          SETTINGS
        </h2>
        <span style={{ width: 80 }} />
      </div>

      <PixelFrame style={{ maxWidth: 520, width: '100%' }}>
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label className="font-press" style={{ fontSize: 11, color: 'var(--ink)' }}>
              MUSIC VOLUME — {settings.musicVolume}
            </label>
            <input
              type="range"
              className="pixel-slider mt-3"
              min={0}
              max={100}
              value={settings.musicVolume}
              onChange={(e) => {
                const v = Number(e.target.value)
                updateSettings({ musicVolume: v })
                audio.setMusicVolume(v)
              }}
            />
          </div>

          <div>
            <label className="font-press" style={{ fontSize: 11, color: 'var(--ink)' }}>
              SFX VOLUME — {settings.sfxVolume}
            </label>
            <input
              type="range"
              className="pixel-slider mt-3"
              min={0}
              max={100}
              value={settings.sfxVolume}
              onChange={(e) => {
                const v = Number(e.target.value)
                updateSettings({ sfxVolume: v })
                audio.setSfxVolume(v)
              }}
              onMouseUp={() => audio.sfx('click')}
            />
          </div>

          <Checkbox
            checked={settings.musicMuted}
            onChange={(v) => {
              updateSettings({ musicMuted: v })
              audio.setMusicMuted(v)
            }}
            label="Mute music"
          />
          <Checkbox
            checked={settings.sfxMuted}
            onChange={(v) => {
              updateSettings({ sfxMuted: v })
              audio.setSfxMuted(v)
              if (!v) audio.sfx('click')
            }}
            label="Mute sound effects"
          />

          <hr style={{ border: 'none', borderTop: '3px solid var(--ink)', margin: '4px 0' }} />

          <PixelButton variant="red" sfx="back" onClick={() => setConfirm1(true)}>
            RESET ALL PROGRESS
          </PixelButton>
        </div>
      </PixelFrame>

      {confirm1 && (
        <Modal>
          <p className="font-press" style={{ fontSize: 13, marginBottom: 16 }}>
            RESET PROGRESS?
          </p>
          <p className="font-vt" style={{ fontSize: 20, marginBottom: 22 }}>
            This wipes all completed levels and saved answers. Settings are kept.
          </p>
          <div className="flex gap-3 justify-end">
            <PixelButton variant="bone" sfx="back" onClick={() => setConfirm1(false)}>
              CANCEL
            </PixelButton>
            <PixelButton variant="red" sfx="click" onClick={() => { setConfirm1(false); setConfirm2(true) }}>
              CONTINUE
            </PixelButton>
          </div>
        </Modal>
      )}

      {confirm2 && (
        <Modal>
          <p className="font-press" style={{ fontSize: 13, marginBottom: 16, color: 'var(--red-accent)' }}>
            ARE YOU SURE?
          </p>
          <p className="font-vt" style={{ fontSize: 20, marginBottom: 22 }}>
            Last chance. There's no undo.
          </p>
          <div className="flex gap-3 justify-end">
            <PixelButton variant="bone" sfx="back" onClick={() => setConfirm2(false)}>
              KEEP IT
            </PixelButton>
            <PixelButton variant="red" sfx="back" onClick={doReset}>
              ERASE EVERYTHING
            </PixelButton>
          </div>
        </Modal>
      )}
    </main>
  )
}

function Modal({ children }: { children: React.ReactNode }) {
  return (
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
      <PixelFrame style={{ maxWidth: 420, width: '100%' }}>
        <div style={{ padding: 24, color: 'var(--ink)' }}>{children}</div>
      </PixelFrame>
    </div>
  )
}

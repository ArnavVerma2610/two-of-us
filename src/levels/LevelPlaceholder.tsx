import { useEffect } from 'react'
import { useNav } from '../nav'
import { LEVELS } from '../game/levels'
import { audio } from '../game/audio'
import PixelButton from '../components/PixelButton'
import PixelFrame from '../components/PixelFrame'
import PixelSprite from '../components/PixelSprite'

export default function LevelPlaceholder({ level }: { level: number }) {
  const nav = useNav()
  const meta = LEVELS.find((l) => l.id === level)

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

  return (
    <main className="px-4 py-6 flex flex-col items-center justify-center" style={{ minHeight: '100vh', textAlign: 'center' }}>
      <PixelFrame style={{ maxWidth: 460, width: '100%' }}>
        <div style={{ padding: 28, color: 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <p className="font-press" style={{ fontSize: 26, color: 'var(--orange-pop)', textShadow: '2px 2px 0 var(--ink)' }}>
            {String(level).padStart(2, '0')}
          </p>
          <p className="font-press" style={{ fontSize: 14 }}>
            {meta?.name ?? 'Unknown'}
          </p>
          <PixelSprite sprite="hardhat" scale={7} />
          <p className="font-press" style={{ fontSize: 11, color: 'var(--red-accent)' }}>
            COMING SOON
          </p>
          <p className="font-vt" style={{ fontSize: 20 }}>
            Check back here when more levels unlock.
          </p>
        </div>
      </PixelFrame>
      <div className="mt-8">
        <PixelButton variant="bone" sfx="back" onClick={() => nav({ name: 'selector' })}>
          ← BACK
        </PixelButton>
      </div>
    </main>
  )
}

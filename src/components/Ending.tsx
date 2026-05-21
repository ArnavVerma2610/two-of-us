import { useEffect } from 'react'
import { useNav } from '../nav'
import { useGame, TOTAL_LEVELS } from '../game/store'
import { audio } from '../game/audio'
import PixelButton from './PixelButton'
import PixelFrame from './PixelFrame'
import PixelSprite from './PixelSprite'

export default function Ending() {
  const nav = useNav()
  const { completedLevels } = useGame()

  useEffect(() => {
    audio.sfx('success')
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') nav({ name: 'home' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nav])

  return (
    <main
      className="relative flex flex-col items-center justify-center px-4"
      style={{ minHeight: '100vh', textAlign: 'center', gap: 22 }}
    >
      {/* floating accents */}
      <div style={{ position: 'absolute', top: '14%', left: '18%' }}>
        <PixelSprite sprite="heart" scale={4} className="bob" />
      </div>
      <div style={{ position: 'absolute', top: '22%', right: '16%' }}>
        <PixelSprite sprite="heart" scale={3} className="bob bob-delay" />
      </div>

      <div className="relative flex flex-col items-center" style={{ flexShrink: 0 }}>
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '2%',
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(127,214,168,0.32) 0%, rgba(127,214,168,0) 68%)',
            zIndex: -1,
          }}
        />
        <PixelSprite sprite="main" scale={11} className="bob" title="The mascot" />
      </div>

      <h1 className="wordmark" style={{ fontSize: 'clamp(24px, 7vw, 48px)', lineHeight: 1.05 }}>
        THE END
      </h1>

      <PixelFrame style={{ maxWidth: 540, width: '100%' }}>
        <div style={{ padding: 26, color: 'var(--ink)' }}>
          <p className="font-vt" style={{ fontSize: 26, lineHeight: 1.3 }}>
            Thank you for playing <strong>Two of Us</strong>, we hope you enjoyed experiencing this
            module!
          </p>
          <p className="font-press" style={{ fontSize: 11, color: 'var(--orange-pop)', marginTop: 18 }}>
            {completedLevels.length} / {TOTAL_LEVELS} LEVELS COMPLETE
          </p>
        </div>
      </PixelFrame>

      <PixelButton variant="orange" size="lg" sfx="submit" onClick={() => nav({ name: 'home' })}>
        BACK TO TITLE
      </PixelButton>

      <footer className="font-vt" style={{ position: 'fixed', bottom: 10, left: 12, fontSize: 18, opacity: 0.6 }}>
        made with pixels
      </footer>
    </main>
  )
}

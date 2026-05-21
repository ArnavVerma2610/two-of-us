import { useEffect, useRef, useState } from 'react'
import { useNav } from '../nav'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import PixelButton from './PixelButton'
import PixelFrame from './PixelFrame'
import PixelSprite from './PixelSprite'
import SoundToggle from './SoundToggle'

export default function HomeScreen() {
  const nav = useNav()
  const { hasSave, startNewGame, continueGame } = useGame()
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const titleRef = useRef<HTMLDivElement>(null)

  // subtle parallax on the title
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const dx = (e.clientX / window.innerWidth - 0.5) * 6
      const dy = (e.clientY / window.innerHeight - 0.5) * 6
      setTilt({ x: dx, y: dy })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const onContinue = () => {
    continueGame()
    nav({ name: 'selector' })
  }
  const onNewGame = () => {
    if (hasSave) {
      setConfirmOverwrite(true)
    } else {
      startNewGame()
      audio.sfx('unlock')
      nav({ name: 'selector' })
    }
  }
  const confirmNew = () => {
    startNewGame()
    audio.sfx('unlock')
    setConfirmOverwrite(false)
    nav({ name: 'selector' })
  }

  return (
    <main
      className="relative flex flex-col items-center justify-center px-4"
      style={{ minHeight: '100vh', textAlign: 'center' }}
    >
      <div
        className="flex items-center justify-center gap-4 sm:gap-8 mb-6 flex-wrap"
        ref={titleRef}
        style={{ transform: `translate(${tilt.x}px, ${tilt.y}px)`, transition: 'transform 0.1s linear' }}
      >
        <PixelSprite sprite="p1" scale={5} className="bob" title="Player 1" />
        <PixelSprite sprite="main" scale={8} className="bob bob-delay" title="You" />
        <div className="flex flex-col items-center">
          <h1 className="wordmark" style={{ fontSize: 'clamp(24px, 9vw, 64px)', lineHeight: 1.1 }}>
            TWO
            <br />
            OF US
          </h1>
        </div>
        <PixelSprite sprite="p2" scale={5} className="bob" title="Player 2" />
      </div>

      <p className="font-vt mb-10" style={{ fontSize: 26, color: 'var(--gold)' }}>
        a compatibility arcade
      </p>

      <div className="flex flex-col gap-4 w-full" style={{ maxWidth: 320 }}>
        {hasSave && (
          <PixelButton variant="cyan" size="lg" sfx="submit" onClick={onContinue}>
            CONTINUE
          </PixelButton>
        )}
        <PixelButton variant="orange" size="lg" sfx="select" onClick={onNewGame}>
          NEW GAME
        </PixelButton>
        <PixelButton variant="bone" size="lg" sfx="click" onClick={() => nav({ name: 'settings' })}>
          SETTINGS
        </PixelButton>
      </div>

      <footer className="font-vt" style={{ position: 'fixed', bottom: 10, left: 12, fontSize: 18, opacity: 0.6 }}>
        v0.1 — made with pixels
      </footer>

      <div style={{ position: 'fixed', bottom: 12, right: 12 }}>
        <SoundToggle />
      </div>

      {confirmOverwrite && (
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
            <div style={{ padding: 24, color: 'var(--ink)' }}>
              <p className="font-press" style={{ fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
                OVERWRITE SAVE?
              </p>
              <p className="font-vt" style={{ fontSize: 20, marginBottom: 22 }}>
                Starting a new game erases your current progress. This can't be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <PixelButton variant="bone" sfx="back" onClick={() => setConfirmOverwrite(false)}>
                  CANCEL
                </PixelButton>
                <PixelButton variant="red" sfx="select" onClick={confirmNew}>
                  OVERWRITE
                </PixelButton>
              </div>
            </div>
          </PixelFrame>
        </div>
      )}
    </main>
  )
}

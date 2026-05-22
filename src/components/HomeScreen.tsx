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
        className="flex items-center justify-center gap-10 sm:gap-16 flex-wrap"
        ref={titleRef}
        style={{
          transform: `translate(${tilt.x}px, ${tilt.y}px)`,
          transition: 'transform 0.1s linear',
          width: '100%',
          maxWidth: 980,
        }}
      >
        {/* Mascot — the star of the show */}
        <div className="relative flex flex-col items-center" style={{ flexShrink: 0 }}>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              top: '6%',
              width: 280,
              height: 280,
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(242,179,61,0.30) 0%, rgba(242,179,61,0) 68%)',
              zIndex: -1,
            }}
          />
          <PixelSprite sprite="main" scale={11} className="bob" title="The mascot" />
          {/* pixel pedestal + cast shadow */}
          <div
            style={{
              width: 156,
              height: 14,
              background: 'var(--violet)',
              border: '3px solid var(--ink)',
              boxShadow: '4px 4px 0 var(--ink)',
              marginTop: 6,
            }}
          />
          <div style={{ width: 116, height: 10, background: 'rgba(0,0,0,0.35)', marginTop: 5 }} />
        </div>

        {/* Title + menu */}
        <div className="flex flex-col items-start" style={{ gap: 18, textAlign: 'left' }}>
          <h1 className="wordmark" style={{ fontSize: 'clamp(28px, 8vw, 60px)', lineHeight: 1.05 }}>
            TWO
            <br />
            OF US
          </h1>
          <p className="font-vt" style={{ fontSize: 24, color: 'var(--violet)' }}>
            a compatibility arcade
          </p>
          <div className="flex flex-col gap-4" style={{ width: 300, maxWidth: '80vw' }}>
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
        </div>
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

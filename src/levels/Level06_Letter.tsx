import { useEffect, useState } from 'react'
import { useNav } from '../nav'
import { useGame } from '../game/store'
import { audio } from '../game/audio'
import PixelButton from '../components/PixelButton'
import PixelFrame from '../components/PixelFrame'
import PixelSprite from '../components/PixelSprite'

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
}

export default function Level06_Letter() {
  const nav = useNav()
  const { level6, sealLetter, completeLevel } = useGame()

  const [sealed, setSealed] = useState(level6)
  const [name, setName] = useState(level6?.name ?? '')
  const [email, setEmail] = useState(level6?.email ?? '')
  const [message, setMessage] = useState(level6?.message ?? '')
  const [touched, setTouched] = useState(false)

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

  const valid = name.trim().length > 0 && isEmail(email) && message.trim().length > 0

  const onSeal = () => {
    setTouched(true)
    if (!valid) {
      audio.sfx('back')
      return
    }
    const now = new Date()
    const deliver = new Date(now)
    deliver.setFullYear(deliver.getFullYear() + 1)
    const letter = {
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      sealedAt: now.toISOString(),
      deliverAt: deliver.toISOString(),
    }
    sealLetter(letter)
    setSealed(letter)
    completeLevel(6)
    audio.sfx('unlock')
  }

  return (
    <main className="px-3 py-6 flex flex-col items-center" style={{ minHeight: '100vh' }}>
      <div className="flex items-center justify-between mb-4 w-full" style={{ maxWidth: 560 }}>
        <PixelButton variant="bone" size="sm" sfx="back" onClick={() => nav({ name: 'selector' })}>
          ← BACK
        </PixelButton>
        <h2 className="font-press" style={{ fontSize: 'clamp(11px,3vw,16px)', color: 'var(--gold)' }}>
          TIME CAPSULE
        </h2>
        <span style={{ width: 60 }} />
      </div>

      {sealed ? (
        <PixelFrame style={{ maxWidth: 480, width: '100%' }}>
          <div style={{ padding: 28, color: 'var(--ink)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <PixelSprite sprite="letter" scale={7} />
            <p className="font-press" style={{ fontSize: 14, color: 'var(--violet)' }}>
              SEALED!
            </p>
            <p className="font-vt" style={{ fontSize: 21, lineHeight: 1.3 }}>
              Your letter is locked away, {sealed.name}. We’ll send it to{' '}
              <strong>{sealed.email}</strong> on
            </p>
            <p className="font-press" style={{ fontSize: 13, color: 'var(--orange-pop)' }}>
              {formatDate(sealed.deliverAt)}
            </p>
            <p className="font-vt" style={{ fontSize: 16, opacity: 0.6 }}>
              (A year from today. No peeking until then.)
            </p>
            <div className="mt-2">
              <PixelButton variant="orange" size="lg" sfx="submit" onClick={() => nav({ name: 'selector' })}>
                DONE
              </PixelButton>
            </div>
          </div>
        </PixelFrame>
      ) : (
        <PixelFrame style={{ maxWidth: 560, width: '100%' }}>
          <div style={{ padding: 24, color: 'var(--ink)' }}>
            <p className="font-vt" style={{ fontSize: 21, lineHeight: 1.3, marginBottom: 18 }}>
              Write a letter to your future self. We’ll seal it and email it back to you{' '}
              <strong>one year from today</strong> — a snapshot of who you are right now.
            </p>

            <label className="font-press" style={{ fontSize: 10, display: 'block', marginBottom: 6 }}>
              YOUR NAME
            </label>
            <input
              className="pixel-input"
              style={{ width: '100%', marginBottom: 4, fontSize: 20 }}
              value={name}
              maxLength={40}
              placeholder="Alex"
              onChange={(e) => setName(e.target.value)}
            />
            {touched && name.trim().length === 0 && (
              <p className="font-vt" style={{ fontSize: 15, color: 'var(--red-accent)', marginBottom: 6 }}>
                Add your name.
              </p>
            )}

            <label className="font-press" style={{ fontSize: 10, display: 'block', margin: '14px 0 6px' }}>
              YOUR EMAIL
            </label>
            <input
              className="pixel-input"
              type="email"
              style={{ width: '100%', marginBottom: 4, fontSize: 20 }}
              value={email}
              placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
            {touched && !isEmail(email) && (
              <p className="font-vt" style={{ fontSize: 15, color: 'var(--red-accent)', marginBottom: 6 }}>
                Enter a valid email.
              </p>
            )}

            <label className="font-press" style={{ fontSize: 10, display: 'block', margin: '14px 0 6px' }}>
              DEAR FUTURE ME…
            </label>
            <textarea
              className="pixel-input"
              style={{ width: '100%', minHeight: 140, fontSize: 20, resize: 'vertical' }}
              value={message}
              placeholder="What are you hoping for? What do you want to remember?"
              onChange={(e) => setMessage(e.target.value)}
            />
            {touched && message.trim().length === 0 && (
              <p className="font-vt" style={{ fontSize: 15, color: 'var(--red-accent)', marginBottom: 6 }}>
                Write something to your future self.
              </p>
            )}

            <div className="flex justify-end mt-5">
              <PixelButton variant="orange" size="lg" sfx="submit" onClick={onSeal}>
                SEAL IT
              </PixelButton>
            </div>
          </div>
        </PixelFrame>
      )}
    </main>
  )
}

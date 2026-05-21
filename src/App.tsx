import { useCallback, useEffect, useRef, useState } from 'react'
import { NavContext, type Screen } from './nav'
import { audio, type MusicTrack } from './game/audio'
import { useGame } from './game/store'
import HomeScreen from './components/HomeScreen'
import LevelSelector from './components/LevelSelector'
import Settings from './components/Settings'
import Ending from './components/Ending'
import Level01_Questions from './levels/Level01_Questions'
import Level02_Canvas from './levels/Level02_Canvas'
import Level03_Frame from './levels/Level03_Frame'
import Level04_Sense from './levels/Level04_Sense'
import Level05_Platformer from './levels/Level05_Platformer'
import Level06_Letter from './levels/Level06_Letter'

function musicForScreen(s: Screen): MusicTrack {
  if (s.name === 'home' || s.name === 'ending') return 'home'
  if (s.name === 'selector' || s.name === 'settings') return 'select'
  if (s.name === 'level' && s.level === 1) return 'level1'
  if (s.name === 'level' && (s.level === 2 || s.level === 4 || s.level === 6)) return 'level2'
  if (s.name === 'level' && s.level === 5) return 'level5'
  return 'select'
}

export default function App() {
  const [audioReady, setAudioReady] = useState(false)
  const [screen, setScreen] = useState<Screen>({ name: 'home' })
  const [wiping, setWiping] = useState<'idle' | 'cover' | 'reveal'>('idle')
  const pendingScreen = useRef<Screen | null>(null)
  const { settings } = useGame()

  // Pixel-wipe navigation
  const navigate = useCallback<(to: Screen) => void>((to) => {
    pendingScreen.current = to
    setWiping('cover')
    // cover finishes -> swap screen -> reveal
    window.setTimeout(() => {
      if (pendingScreen.current) setScreen(pendingScreen.current)
      window.scrollTo(0, 0)
      setWiping('reveal')
      window.setTimeout(() => setWiping('idle'), 300)
    }, 300)
  }, [])

  // Browsers require a user gesture before an AudioContext can start, so we
  // boot the audio engine on the first interaction instead of a start screen.
  useEffect(() => {
    if (audioReady) return
    const onFirst = async () => {
      await audio.ensureStarted()
      audio.setMusicMuted(settings.musicMuted)
      audio.setSfxMuted(settings.sfxMuted)
      audio.setMusicVolume(settings.musicVolume)
      audio.setSfxVolume(settings.sfxVolume)
      setAudioReady(true)
    }
    window.addEventListener('pointerdown', onFirst, { once: true })
    window.addEventListener('keydown', onFirst, { once: true })
    return () => {
      window.removeEventListener('pointerdown', onFirst)
      window.removeEventListener('keydown', onFirst)
    }
  }, [audioReady, settings])

  // Music follows screen
  useEffect(() => {
    if (!audioReady) return
    audio.playMusic(musicForScreen(screen))
  }, [audioReady, screen])

  // Keep engine settings synced
  useEffect(() => {
    audio.setMusicMuted(settings.musicMuted)
    audio.setSfxMuted(settings.sfxMuted)
    audio.setMusicVolume(settings.musicVolume)
    audio.setSfxVolume(settings.sfxVolume)
  }, [settings])

  const wipeStyle =
    wiping === 'cover'
      ? { transform: 'scaleX(1)', transition: 'transform 0.3s steps(8)' }
      : wiping === 'reveal'
        ? { transform: 'scaleX(0)', transformOrigin: 'right center', transition: 'transform 0.3s steps(8)' }
        : { transform: 'scaleX(0)', transition: 'none' }

  let body: React.ReactNode = null
  if (screen.name === 'home') body = <HomeScreen />
  else if (screen.name === 'selector') body = <LevelSelector />
  else if (screen.name === 'settings') body = <Settings />
  else if (screen.name === 'ending') body = <Ending />
  else if (screen.name === 'level') {
    if (screen.level === 1) body = <Level01_Questions />
    else if (screen.level === 2) body = <Level02_Canvas />
    else if (screen.level === 3) body = <Level03_Frame />
    else if (screen.level === 4) body = <Level04_Sense />
    else if (screen.level === 5) body = <Level05_Platformer />
    else if (screen.level === 6) body = <Level06_Letter />
  }

  return (
    <NavContext.Provider value={navigate}>
      <div className="bg-grid" />
      <div className="scanlines" style={{ minHeight: '100%' }}>
        {body}
        <div className="pixel-wipe" style={wipeStyle} aria-hidden />
      </div>
    </NavContext.Provider>
  )
}

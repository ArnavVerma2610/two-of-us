import { useCallback, useEffect, useRef, useState } from 'react'
import { NavContext, type Screen } from './nav'
import { audio, type MusicTrack } from './game/audio'
import { useGame } from './game/store'
import TapToBegin from './components/TapToBegin'
import HomeScreen from './components/HomeScreen'
import LevelSelector from './components/LevelSelector'
import Settings from './components/Settings'
import Level01_Questions from './levels/Level01_Questions'
import Level02_Canvas from './levels/Level02_Canvas'
import LevelPlaceholder from './levels/LevelPlaceholder'

function musicForScreen(s: Screen): MusicTrack {
  if (s.name === 'home') return 'home'
  if (s.name === 'selector' || s.name === 'settings') return 'select'
  if (s.name === 'level' && s.level === 1) return 'level1'
  if (s.name === 'level' && s.level === 2) return 'level2'
  return 'select'
}

export default function App() {
  const [begun, setBegun] = useState(false)
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

  // Music follows screen
  useEffect(() => {
    if (!begun) return
    audio.playMusic(musicForScreen(screen))
  }, [begun, screen])

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
  else if (screen.name === 'level') {
    if (screen.level === 1) body = <Level01_Questions />
    else if (screen.level === 2) body = <Level02_Canvas />
    else body = <LevelPlaceholder level={screen.level} />
  }

  return (
    <NavContext.Provider value={navigate}>
      <div className="bg-grid" />
      <div className="scanlines" style={{ minHeight: '100%' }}>
        {!begun && <TapToBegin onBegin={() => setBegun(true)} />}
        {begun && body}
        <div className="pixel-wipe" style={wipeStyle} aria-hidden />
      </div>
    </NavContext.Provider>
  )
}

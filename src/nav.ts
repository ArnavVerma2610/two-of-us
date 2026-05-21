import { createContext, useContext } from 'react'
import { useGame, TOTAL_LEVELS } from './game/store'

export type Screen =
  | { name: 'home' }
  | { name: 'selector' }
  | { name: 'settings' }
  | { name: 'level'; level: number }
  | { name: 'ending' }

export type NavFn = (to: Screen) => void

export const NavContext = createContext<NavFn>(() => {})

export function useNav(): NavFn {
  return useContext(NavContext)
}

// Where to go after finishing a level: the Thank-You ending once every
// level is complete, otherwise back to the level select.
export function nextAfterLevel(): Screen {
  const done = useGame.getState().completedLevels
  return done.length >= TOTAL_LEVELS ? { name: 'ending' } : { name: 'selector' }
}

import { createContext, useContext } from 'react'

export type Screen =
  | { name: 'home' }
  | { name: 'selector' }
  | { name: 'settings' }
  | { name: 'level'; level: number }

export type NavFn = (to: Screen) => void

export const NavContext = createContext<NavFn>(() => {})

export function useNav(): NavFn {
  return useContext(NavContext)
}

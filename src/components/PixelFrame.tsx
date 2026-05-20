import type { CSSProperties, ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  style?: CSSProperties
  innerStyle?: CSSProperties
  /** background color of the content area (defaults to bone) */
  fill?: string
}

export default function PixelFrame({ children, className = '', style, innerStyle, fill }: Props) {
  return (
    <div className={`pixel-frame ${className}`} style={style}>
      <div
        className="pixel-frame-inner"
        style={{ backgroundColor: fill ?? 'var(--bone)', ...innerStyle }}
      >
        {children}
      </div>
    </div>
  )
}

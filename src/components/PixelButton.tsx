import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { audio, type SfxName } from '../game/audio'

type Variant = 'cyan' | 'orange' | 'bone' | 'red' | 'mint' | 'violet'

const variantStyle: Record<Variant, { bg: string; color: string }> = {
  cyan: { bg: 'var(--cyan-pop)', color: 'var(--ink)' },
  orange: { bg: 'var(--orange-pop)', color: 'var(--ink)' },
  bone: { bg: 'var(--bone)', color: 'var(--ink)' },
  red: { bg: 'var(--red-accent)', color: 'var(--bone)' },
  mint: { bg: 'var(--mint)', color: 'var(--ink)' },
  violet: { bg: 'var(--violet)', color: 'var(--bone)' },
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  sfx?: SfxName | null
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export default function PixelButton({
  variant = 'cyan',
  sfx = 'click',
  size = 'md',
  children,
  onClick,
  className = '',
  style,
  ...rest
}: Props) {
  const v = variantStyle[variant]
  const fontSize = size === 'lg' ? 16 : size === 'sm' ? 9 : 12
  const pad = size === 'lg' ? '16px 24px' : size === 'sm' ? '8px 10px' : '12px 18px'

  return (
    <button
      {...rest}
      onClick={(e) => {
        if (sfx) audio.sfx(sfx)
        onClick?.(e)
      }}
      className={`pixel-btn ${className}`}
      style={{
        backgroundColor: v.bg,
        color: v.color,
        fontSize,
        padding: pad,
        ...style,
      }}
    >
      {children}
    </button>
  )
}

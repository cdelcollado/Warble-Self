import { forwardRef, type ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

const base =
  'inline-flex items-center justify-center gap-2.5 font-semibold select-none ' +
  'transition-all duration-150 ' +
  'disabled:opacity-40 disabled:cursor-not-allowed ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'

const variants: Record<Variant, string> = {
  primary:
    'bg-w-accent hover:brightness-110 active:brightness-90 text-white ' +
    'shadow-sm hover:shadow-md active:scale-[0.98]',
  secondary:
    'bg-w-bg-elev border border-w-border ' +
    'text-w-fg-soft hover:bg-w-bg-hover ' +
    'shadow-sm active:scale-[0.98]',
  outline:
    'bg-transparent border-2 border-w-border-strong ' +
    'text-w-fg hover:bg-w-bg-hover ' +
    'active:scale-[0.98]',
  ghost:
    'text-w-fg-soft ' +
    'hover:bg-w-bg-hover hover:text-w-fg',
  destructive:
    'bg-sig-red hover:brightness-110 active:brightness-90 text-white ' +
    'shadow-sm hover:shadow-md active:scale-[0.98]',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-2 text-xs rounded-theme-md',
  md: 'px-4 py-2.5 text-sm rounded-theme-lg',
  lg: 'px-5 py-3.5 text-sm rounded-theme-lg',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}, ref) => (
  <button
    ref={ref}
    className={[base, variants[variant], sizes[size], fullWidth ? 'w-full' : '', className].filter(Boolean).join(' ')}
    {...props}
  >
    {children}
  </button>
))

Button.displayName = 'Button'

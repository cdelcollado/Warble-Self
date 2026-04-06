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
    'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white ' +
    'shadow-sm hover:shadow-md active:scale-[0.98]',
  secondary:
    'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ' +
    'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 ' +
    'shadow-sm active:scale-[0.98]',
  outline:
    'bg-transparent border-2 border-slate-800 dark:border-slate-500 ' +
    'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 ' +
    'active:scale-[0.98]',
  ghost:
    'text-slate-600 dark:text-slate-400 ' +
    'hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200',
  destructive:
    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white ' +
    'shadow-sm hover:shadow-md active:scale-[0.98]',
}

const sizes: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-5 py-3.5 text-sm rounded-xl',
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

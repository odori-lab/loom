interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const dotSizes = {
  sm: 'w-1 h-1',
  md: 'w-1.5 h-1.5',
  lg: 'w-2 h-2',
} as const

const gapSizes = {
  sm: 'gap-1',
  md: 'gap-1.5',
  lg: 'gap-2',
} as const

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div className={`flex items-center ${gapSizes[size]} ${className}`}>
      <div
        className={`${dotSizes[size]} rounded-full bg-current animate-pulse-soft`}
        style={{ animationDelay: '0ms' }}
      />
      <div
        className={`${dotSizes[size]} rounded-full bg-current animate-pulse-soft`}
        style={{ animationDelay: '200ms' }}
      />
      <div
        className={`${dotSizes[size]} rounded-full bg-current animate-pulse-soft`}
        style={{ animationDelay: '400ms' }}
      />
    </div>
  )
}

export function SpinnerSvg({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

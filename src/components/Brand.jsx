import { Link } from 'react-router-dom'

export function BrandMark({ size = 34, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="WeSolve mark">
      <defs>
        <linearGradient id={`brand-gradient-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3155ff" />
          <stop offset="1" stopColor="#773af3" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#brand-gradient-${size})`} />
      <path d="M11.8 14.5 18 33.2 24 21.4 30 33.2 36.2 14.5" fill="none" stroke="white" strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Brand({ compact = false, light = false, to = '/' }) {
  return (
    <Link className={`brand ${light ? 'brand-light' : ''}`} to={to} aria-label="WeSolve home">
      <BrandMark />
      {!compact && <span className="brand-name">wesolve<span>.ai</span></span>}
    </Link>
  )
}

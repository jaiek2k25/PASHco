import { Link } from 'react-router-dom'

export function BrandMark({ size = 34, className = '' }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Solvely mark">
      <defs>
        <linearGradient id={`brand-gradient-${size}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3155ff" />
          <stop offset="1" stopColor="#773af3" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="13" fill={`url(#brand-gradient-${size})`} />
      <path d="M14 13h5.7l4.3 6.7L28.3 13H34L26.6 24 34.4 35h-6l-4.5-7.3L19.4 35H14l7.6-11L14 13Z" fill="white" />
    </svg>
  )
}

export function Brand({ compact = false, light = false, to = '/' }) {
  return (
    <Link className={`brand ${light ? 'brand-light' : ''}`} to={to} aria-label="Solvely home">
      <BrandMark />
      {!compact && <span className="brand-name">solvely<span>.ai</span></span>}
    </Link>
  )
}

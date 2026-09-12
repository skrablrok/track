export default function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="currentColor" className={className} aria-hidden="true">
      <rect x="4" y="5" width="9" height="38" />
      <rect x="16" y="7" width="18" height="8" />
      <path d="M16 20 H32 V16 L44 24 L32 32 V28 H16 Z" />
      <rect x="16" y="33" width="18" height="8" />
    </svg>
  )
}

// BuildFlow ikone · smer B "Tehnična risba"
// 24×24 mreža, črta 1,5, ostri vogali, šrafura 45°.
// Barva črte = CSS `color` (currentColor). `accent` = poudarek, `bg` = barva podlage za izreze.
import { useId, type SVGProps } from 'react'

const ACCENT = '#EA580C'
const BG = 'var(--bf-icon-bg, #ffffff)'

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number
  accent?: string
  bg?: string
  strokeWidth?: number
  title?: string
}

function useHatchId() {
  return 'bfh' + useId().replace(/[^a-zA-Z0-9_-]/g, '')
}

function Hatch({ id }: { id: string }) {
  return (
    <defs>
      <pattern id={id} width="2.2" height="2.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="2.2" stroke="currentColor" strokeWidth=".7" />
      </pattern>
    </defs>
  )
}

function Svg({ size, title, children, ...props }: { size?: number; title?: string; children: React.ReactNode } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  )
}

const line = (w: number) => ({ fill: 'none', stroke: 'currentColor', strokeWidth: w, strokeLinejoin: 'miter' as const, strokeLinecap: 'square' as const })

/** Pregled */
export function IconPregled({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M3 3 H10.5 V12 H3 Z M3 15 H10.5 V21 H3 Z M13.5 3 H21 V8 H13.5 Z" {...line(strokeWidth)} />
      <path d="M13.5 11 H21 V21 H13.5 Z" fill={`url(#${hatch})`} />
      <path d="M13.5 11 H21 V21 H13.5 Z" {...line(strokeWidth)} />
    </Svg>
  )
}

/** Skladišče */
export function IconSkladisce({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M3 10 L12 4 L21 10 V20.5 H3 Z" {...line(strokeWidth)} />
      <path d="M7 13 H17 V20.5 H7 Z" fill={`url(#${hatch})`} />
      <path d="M7 13 H17 V20.5 H7 Z" {...line(strokeWidth)} />
      <path d="M7 15.8 H17 M7 18.2 H17" {...line(strokeWidth)} />
    </Svg>
  )
}

/** Material */
export function IconMaterial({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M3 15.5 H21 V20 H3 Z M9 15.5 V20 M15 15.5 V20" {...line(strokeWidth)} />
      <path d="M6 11 H18 V15.5 H6 Z M12 11 V15.5" {...line(strokeWidth)} />
      <path d="M9 6.5 H15 V11 H9 Z" fill={`url(#${hatch})`} />
      <path d="M9 6.5 H15 V11 H9 Z" {...line(strokeWidth)} />
    </Svg>
  )
}

/** Naročilo */
export function IconNarocilo({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M4 7.5 L12 12 V21 L4 16.5 Z" fill={`url(#${hatch})`} />
      <path d="M4 7.5 L12 12 V21 L4 16.5 Z" {...line(strokeWidth)} />
      <path d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z" {...line(strokeWidth)} />
      <path d="M4 7.5 L12 12 L20 7.5 M12 12 V21" {...line(strokeWidth)} />
      <circle cx="18" cy="18" r="5" style={{ fill: bg }} />
      <circle cx="18" cy="18" r="3.9" {...line(strokeWidth)} style={{ stroke: accent }} />
      <path d="M18 16.1 V19.9 M16.1 18 H19.9" {...line(strokeWidth)} style={{ stroke: accent }} />
    </Svg>
  )
}

/** Dostava */
export function IconDostava({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M2 6 H14 V16.5 H2 Z" fill={`url(#${hatch})`} />
      <path d="M2 6 H14 V16.5 H2 Z" {...line(strokeWidth)} />
      <path d="M14 9.5 H18.5 L21.5 13 V16.5 H14" {...line(strokeWidth)} />
      <circle cx="6.5" cy="17.5" r="2.6" style={{ fill: bg }} />
      <circle cx="6.5" cy="17.5" r="2" {...line(strokeWidth)} />
      <circle cx="17.5" cy="17.5" r="2.6" style={{ fill: bg }} />
      <circle cx="17.5" cy="17.5" r="2" {...line(strokeWidth)} />
    </Svg>
  )
}

/** Gradbišče */
export function IconGradbisce({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M6 6 V21 M8.5 6 V21 M6 9 L8.5 12 L6 15 L8.5 18" {...line(strokeWidth)} />
      <path d="M3 6 H21 M7.25 2.5 L21 6 M7.25 2.5 L3 6 M7.25 2.5 V6" {...line(strokeWidth)} />
      <path d="M17 6 V10.5 M3.5 21 H11" {...line(strokeWidth)} />
      <path d="M14.5 10.5 H19.5 V14.5 H14.5 Z" fill={`url(#${hatch})`} />
      <path d="M14.5 10.5 H19.5 V14.5 H14.5 Z" {...line(strokeWidth)} />
      <path d="M3 6 H5.5 V9 H3 Z" fill={`url(#${hatch})`} />
      <path d="M3 6 H5.5 V9 H3 Z" {...line(strokeWidth)} />
    </Svg>
  )
}

/** Poraba */
export function IconPoraba({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M4 17 A8 8 0 0 1 20 17 Z" fill={`url(#${hatch})`} />
      <path d="M4 17 A8 8 0 0 1 20 17 Z" {...line(strokeWidth)} />
      <path d="M6.6 11.6 L7.6 12.6 M12 9 V10.5 M17.4 11.6 L16.4 12.6" {...line(strokeWidth)} />
      <path d="M12 17 L15.6 11.8" {...line(strokeWidth + 2.6)} style={{ stroke: bg }} />
      <path d="M12 17 L15.6 11.8" {...line(strokeWidth)} style={{ stroke: accent }} />
      <circle cx="12" cy="17" r="1.6" style={{ fill: accent }} />
    </Svg>
  )
}

/** Poročila */
export function IconPorocila({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M5 4.5 H19 V21 H5 Z" {...line(strokeWidth)} />
      <path d="M7.6 13 H9.6 V18 H7.6 Z" fill="currentColor" />
      <path d="M11 9.5 H13 V18 H11 Z" style={{ fill: accent }} />
      <path d="M14.4 11.5 H16.4 V18 H14.4 Z" fill="currentColor" />
      <path d="M9 2.8 H15 V6.2 H9 Z" style={{ fill: bg }} />
      <path d="M9 2.8 H15 V6.2 H9 Z" fill={`url(#${hatch})`} />
      <path d="M9 2.8 H15 V6.2 H9 Z" {...line(strokeWidth)} />
    </Svg>
  )
}

/** Orodje */
export function IconOrodje({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M12.24 10.06 L13.94 11.76 L6.16 19.54 L4.46 17.84 Z" {...line(strokeWidth)} />
      <path d="M9.55 7.37 L12.37 4.55 L19.45 11.63 L16.63 14.45 Z" fill={`url(#${hatch})`} />
      <path d="M9.55 7.37 L12.37 4.55 L19.45 11.63 L16.63 14.45 Z" {...line(strokeWidth)} />
      <path d="M19.5 17 V21.5 M17.9 17 H21.1" {...line(strokeWidth)} style={{ stroke: accent }} />
    </Svg>
  )
}

/** Delavci */
export function IconDelavci({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M4.5 16 A7.5 7.5 0 0 1 19.5 16 Z" fill={`url(#${hatch})`} />
      <path d="M4.5 16 A7.5 7.5 0 0 1 19.5 16 Z" {...line(strokeWidth)} />
      <path d="M10.5 8.9 V13 M13.5 8.9 V13" {...line(strokeWidth)} />
      <path d="M2.5 16 H21.5 V17 Q21.5 18.5 20 18.5 H4 Q2.5 18.5 2.5 17 Z" {...line(strokeWidth)} />
    </Svg>
  )
}

/** Koledar */
export function IconKoledar({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M3.5 5 H20.5 V9.5 H3.5 Z" fill={`url(#${hatch})`} />
      <path d="M3.5 5 H20.5 V9.5 H3.5 Z" {...line(strokeWidth)} />
      <path d="M3.5 5 H20.5 V21 H3.5 Z M8 3 V7 M16 3 V7" {...line(strokeWidth)} />
      <path d="M13.5 13 H17 V16.5 H13.5 Z" style={{ fill: accent }} />
    </Svg>
  )
}

/** Nastavitve */
export function IconNastavitve({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M2.5 8.5 H21.5 V15.5 H2.5 Z M5 8.5 V15.5 M19 8.5 V15.5" {...line(strokeWidth)} />
      <path d="M8.5 10.3 H15.5 V13.7 H8.5 Z" fill={`url(#${hatch})`} />
      <path d="M8.5 10.3 H15.5 V13.7 H8.5 Z" {...line(strokeWidth)} />
      <path d="M10.8 10.3 V13.7 M13.2 10.3 V13.7" {...line(strokeWidth)} />
      <circle cx="12" cy="12" r="0.95" style={{ fill: accent }} />
    </Svg>
  )
}

/** Dodaj */
export function IconDodaj({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  return (
    <Svg size={size} title={title} {...props}>
      <path d="M12 4 V20 M4 12 H20" {...line(strokeWidth)} />
    </Svg>
  )
}

/** Uredi */
export function IconUredi({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M17.09 4.09 L19.91 6.91 L10.01 16.81 L7.19 13.99 Z" fill={`url(#${hatch})`} />
      <path d="M17.09 4.09 L19.91 6.91 L10.01 16.81 L7.19 13.99 Z" {...line(strokeWidth)} />
      <path d="M15.68 5.5 L18.5 8.32" {...line(strokeWidth)} />
      <path d="M7.19 13.99 L4.5 19.5 L10.01 16.81" {...line(strokeWidth)} />
      <path d="M5.6 17.25 L4.5 19.5 L6.75 18.4 Z" style={{ fill: accent }} />
    </Svg>
  )
}

/** Izbriši */
export function IconIzbrisi({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M3.5 6.5 H20.5 M9 6.5 V3.5 H15 V6.5" {...line(strokeWidth)} />
      <path d="M6 6.5 H18 L17 21 H7 Z" fill={`url(#${hatch})`} />
      <path d="M6 6.5 H18 L17 21 H7 Z" {...line(strokeWidth)} />
    </Svg>
  )
}

/** Iskanje */
export function IconIskanje({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <circle cx="10.5" cy="10.5" r="6.5" fill={`url(#${hatch})`} />
      <circle cx="10.5" cy="10.5" r="6.5" {...line(strokeWidth)} />
      <path d="M15.3 15.3 L21 21" {...line(strokeWidth)} />
    </Svg>
  )
}

/** Filter */
export function IconFilter({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M3 4 H21 L14 12.5 V19 L10 21 V12.5 Z" fill={`url(#${hatch})`} />
      <path d="M3 4 H21 L14 12.5 V19 L10 21 V12.5 Z" {...line(strokeWidth)} />
    </Svg>
  )
}

/** Skeniraj QR */
export function IconSkeniraj({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M3 8 V3 H8 M16 3 H21 V8 M21 16 V21 H16 M8 21 H3 V16" {...line(strokeWidth)} />
      <path d="M6.5 6.5 H10.5 V10.5 H6.5 Z" fill={`url(#${hatch})`} />
      <path d="M6.5 6.5 H10.5 V10.5 H6.5 Z" {...line(strokeWidth)} />
      <path d="M13.5 6.5 H17.5 V10.5 H13.5 Z M6.5 13.5 H10.5 V17.5 H6.5 Z" {...line(strokeWidth)} />
      <path d="M13.5 13.5 H15.3 V15.3 H13.5 Z M15.7 15.7 H17.5 V17.5 H15.7 Z" fill="currentColor" />
      <path d="M2.5 12 H21.5" {...line(strokeWidth)} style={{ stroke: accent }} />
    </Svg>
  )
}

/** Uvoz Excel */
export function IconUvoz({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M8 3 H16 L20 7 V21 H8 Z M16 3 V7 H20" {...line(strokeWidth)} />
      <path d="M11 11 H17 V18 H11 Z" fill={`url(#${hatch})`} />
      <path d="M11 11 H17 V18 H11 Z" {...line(strokeWidth)} />
      <path d="M11 14.5 H17 M14 11 V18" {...line(strokeWidth)} />
      <path d="M2 12 H9 M6.4 9.4 L9 12 L6.4 14.6" {...line(strokeWidth + 2.6)} style={{ stroke: bg }} />
      <path d="M2 12 H9 M6.4 9.4 L9 12 L6.4 14.6" {...line(strokeWidth)} style={{ stroke: accent }} />
    </Svg>
  )
}

/** Izvoz */
export function IconIzvoz({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M4 3 H12 L16 7 V21 H4 Z M12 3 V7 H16" {...line(strokeWidth)} />
      <path d="M7 11 H13 V18 H7 Z" fill={`url(#${hatch})`} />
      <path d="M7 11 H13 V18 H7 Z" {...line(strokeWidth)} />
      <path d="M7 14.5 H13 M10 11 V18" {...line(strokeWidth)} />
      <path d="M15 12 H22 M19.4 9.4 L22 12 L19.4 14.6" {...line(strokeWidth + 2.6)} style={{ stroke: bg }} />
      <path d="M15 12 H22 M19.4 9.4 L22 12 L19.4 14.6" {...line(strokeWidth)} style={{ stroke: accent }} />
    </Svg>
  )
}

/** Obvestila */
export function IconObvestila({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M7 16 V11 A5 5 0 0 1 17 11 V16 Z" fill={`url(#${hatch})`} />
      <path d="M7 16 V11 A5 5 0 0 1 17 11 V16 Z" {...line(strokeWidth)} />
      <path d="M5 16 H19 V19.5 H5 Z" {...line(strokeWidth)} />
      <path d="M12 2.5 V4.5 M4.2 5.7 L5.6 7.1 M19.8 5.7 L18.4 7.1 M2 11.5 H4 M20 11.5 H22" {...line(strokeWidth)} style={{ stroke: accent }} />
    </Svg>
  )
}

/** Profil */
export function IconProfil({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <circle cx="12" cy="8" r="4" {...line(strokeWidth)} />
      <path d="M4 21 V19 A5 5 0 0 1 9 14 H15 A5 5 0 0 1 20 19 V21 Z" fill={`url(#${hatch})`} />
      <path d="M4 21 V19 A5 5 0 0 1 9 14 H15 A5 5 0 0 1 20 19 V21 Z" {...line(strokeWidth)} />
    </Svg>
  )
}

/** Odjava */
export function IconOdjava({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M4 3 H13 V21 H4 Z" fill={`url(#${hatch})`} />
      <path d="M4 3 H13 V21 H4 Z" {...line(strokeWidth)} />
      <path d="M10 12 H21 M17.5 8.5 L21 12 L17.5 15.5" {...line(strokeWidth + 2.6)} style={{ stroke: bg }} />
      <path d="M10 12 H21 M17.5 8.5 L21 12 L17.5 15.5" {...line(strokeWidth)} style={{ stroke: accent }} />
    </Svg>
  )
}

/** Meni */
export function IconMeni({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  return (
    <Svg size={size} title={title} {...props}>
      <path d="M3 6 H21 M3 12 H21 M3 18 H21" {...line(strokeWidth)} />
    </Svg>
  )
}

/** Potrjeno */
export function IconPotrjeno({ size = 24, accent = '#1F7A4D', bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <circle cx="12" cy="12" r="9" fill={`url(#${hatch})`} />
      <circle cx="12" cy="12" r="9" {...line(strokeWidth)} />
      <path d="M7.5 12.3 L10.6 15.4 L16.5 9.2" {...line(strokeWidth + 2.6)} style={{ stroke: bg }} />
      <path d="M7.5 12.3 L10.6 15.4 L16.5 9.2" {...line(strokeWidth)} style={{ stroke: accent }} />
    </Svg>
  )
}

/** V pripravi */
export function IconVPripravi({ size = 24, accent = '#B86E00', bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <circle cx="12" cy="12" r="9" fill={`url(#${hatch})`} />
      <circle cx="12" cy="12" r="9" {...line(strokeWidth)} />
      <path d="M12 6.8 V12 L15.6 14.2" {...line(strokeWidth + 2.6)} style={{ stroke: bg }} />
      <path d="M12 6.8 V12 L15.6 14.2" {...line(strokeWidth)} style={{ stroke: accent }} />
    </Svg>
  )
}

/** Zavrnjeno */
export function IconZavrnjeno({ size = 24, accent = '#C8322B', bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <circle cx="12" cy="12" r="9" fill={`url(#${hatch})`} />
      <circle cx="12" cy="12" r="9" {...line(strokeWidth)} />
      <path d="M8.5 8.5 L15.5 15.5 M15.5 8.5 L8.5 15.5" {...line(strokeWidth + 2.6)} style={{ stroke: bg }} />
      <path d="M8.5 8.5 L15.5 15.5 M15.5 8.5 L8.5 15.5" {...line(strokeWidth)} style={{ stroke: accent }} />
    </Svg>
  )
}

/** Nizka zaloga */
export function IconNizkaZaloga({ size = 24, accent = '#C8322B', bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M2.5 19 H16.5 M2.5 21.5 H16.5 M4.5 19 V21.5 M9.5 19 V21.5 M14.5 19 V21.5" {...line(strokeWidth)} />
      <path d="M4.5 13 H10.5 V19 H4.5 Z" fill={`url(#${hatch})`} />
      <path d="M4.5 13 H10.5 V19 H4.5 Z" {...line(strokeWidth)} />
      <path d="M17 4.5 L22.5 14 H11.5 Z" {...line(strokeWidth + 2.6)} style={{ stroke: bg }} />
      <path d="M17 4.5 L22.5 14 H11.5 Z" {...line(strokeWidth)} style={{ stroke: accent }} />
      <path d="M17 8 V10.6" {...line(strokeWidth)} style={{ stroke: accent }} />
      <circle cx="17" cy="12.3" r="0.95" style={{ fill: accent }} />
    </Svg>
  )
}

/** Lokacija */
export function IconLokacija({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M12 21.5 C12 21.5 5 14.5 5 9.5 A7 7 0 0 1 19 9.5 C19 14.5 12 21.5 12 21.5 Z" fill={`url(#${hatch})`} />
      <path d="M12 21.5 C12 21.5 5 14.5 5 9.5 A7 7 0 0 1 19 9.5 C19 14.5 12 21.5 12 21.5 Z" {...line(strokeWidth)} />
      <circle cx="12" cy="9.5" r="2.8" style={{ fill: bg }} />
      <circle cx="12" cy="9.5" r="2.8" {...line(strokeWidth)} style={{ stroke: accent }} />
    </Svg>
  )
}

/** Jeziki */
export function IconJeziki({ size = 24, accent = ACCENT, bg = BG, strokeWidth = 1.5, title, ...props }: IconProps) {
  const hatch = useHatchId()
  return (
    <Svg size={size} title={title} {...props}>
      <Hatch id={hatch} />
      <path d="M2 2.5 H13 V11 H7 L4.5 13.5 V11 H2 Z" {...line(strokeWidth)} />
      <path d="M3.6 9.2 L5.8 5 L8 9.2 M4.4 7.8 H7.2" {...line(strokeWidth)} />
      <path d="M10 8 H21 V18 H18.5 V21 L15.5 18 H10 Z" style={{ fill: bg }} />
      <path d="M10 8 H21 V18 H18.5 V21 L15.5 18 H10 Z" fill={`url(#${hatch})`} />
      <path d="M10 8 H21 V18 H18.5 V21 L15.5 18 H10 Z" {...line(strokeWidth)} />
      <path d="M17 10.5 H13.5 V16 H15.6 A1.6 1.6 0 0 0 15.6 12.8 H13.5" {...line(strokeWidth)} />
    </Svg>
  )
}

export const BUILDFLOW_ICONS = {
  pregled: IconPregled,
  skladisce: IconSkladisce,
  material: IconMaterial,
  narocilo: IconNarocilo,
  dostava: IconDostava,
  gradbisce: IconGradbisce,
  poraba: IconPoraba,
  porocila: IconPorocila,
  orodje: IconOrodje,
  delavci: IconDelavci,
  koledar: IconKoledar,
  nastavitve: IconNastavitve,
  dodaj: IconDodaj,
  uredi: IconUredi,
  izbrisi: IconIzbrisi,
  iskanje: IconIskanje,
  filter: IconFilter,
  qr: IconSkeniraj,
  uvoz: IconUvoz,
  izvoz: IconIzvoz,
  obvestila: IconObvestila,
  profil: IconProfil,
  odjava: IconOdjava,
  meni: IconMeni,
  potrjeno: IconPotrjeno,
  vpripravi: IconVPripravi,
  zavrnjeno: IconZavrnjeno,
  zaloga: IconNizkaZaloga,
  lokacija: IconLokacija,
  jeziki: IconJeziki,
}

/** <BuildFlowIcon name="skladisce" size={20} /> */
export function BuildFlowIcon({ name, ...props }: { name: keyof typeof BUILDFLOW_ICONS } & IconProps) {
  const Icon = BUILDFLOW_ICONS[name]
  return Icon ? <Icon {...props} /> : null
}

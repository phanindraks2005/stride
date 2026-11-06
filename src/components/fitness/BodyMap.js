'use client'
import { REGIONS } from '@/lib/muscles'
import styles from './bodyMap.module.css'

// A front and back figure built from simple shapes, one per muscle. Shapes are
// drawn for the figure's right side and mirrored. Coordinates: 200 × 410.
const MIRROR = 'translate(200 0) scale(-1 1)'

const SHAPES = {
  head: <ellipse cx="100" cy="31" rx="19" ry="23" />,
  neck: <path d="M91 52 L109 52 L111 66 L89 66 Z" />,
  deltoid: <path d="M74 70 C61 70 52 79 50 93 C49 102 51 110 55 116 C58 104 63 94 71 86 C73 80 75 75 76 71 Z" />,
  pec: <path d="M98 72 L98 110 C89 115 77 114 70 108 C64 101 64 91 68 84 C72 77 83 72 98 72 Z" />,
  upperArm: <path d="M55 120 C51 131 50 143 52 155 C56 159 62 157 64 151 C66 139 66 127 64 116 C61 112 58 114 55 120 Z" />,
  forearm: <path d="M52 160 C48 174 46 189 47 202 C51 205 55 205 57 202 C61 188 64 173 64 157 C60 161 56 162 52 160 Z" />,
  hand: <ellipse cx="51" cy="212" rx="6" ry="10" />,
  abs: <path d="M88 116 Q88 113 91 113 L109 113 Q112 113 112 116 L112 182 Q112 192 100 194 Q88 192 88 182 Z" />,
  oblique: <path d="M85 116 C79 118 73 126 71 138 C70 154 73 169 79 182 L86 186 Z" />,
  hips: <path d="M78 188 C84 198 92 203 100 205 C108 203 116 198 122 188 L124 206 L76 206 Z" />,
  quad: <path d="M76 210 L98 210 C99 236 97 266 94 292 C90 300 82 300 78 294 C72 268 70 240 76 210 Z" />,
  knee: <ellipse cx="86" cy="303" rx="8.5" ry="7.5" />,
  shin: <path d="M78 314 C76 336 77 358 80 380 C84 386 90 386 92 380 C95 358 96 336 94 314 C89 318 83 318 78 314 Z" />,
  foot: <path d="M79 388 L93 388 L95 399 C90 403 80 403 76 399 Z" />,
  traps: <path d="M88 56 L112 56 C116 64 123 70 131 74 L100 96 L69 74 C77 70 84 64 88 56 Z" />,
  lat: <path d="M98 99 L98 147 C90 152 80 149 74 137 C68 123 66 108 68 89 C78 95 88 99 98 99 Z" />,
  lowerBack: <path d="M88 151 Q100 155 112 151 L112 183 Q100 187 88 183 Z" />,
  glute: <path d="M76 189 C75 204 82 214 98 216 L99 191 C90 187 82 187 76 189 Z" />,
  hamstring: <path d="M76 221 L98 221 C99 245 97 270 94 292 C90 300 82 300 78 294 C72 270 70 246 76 221 Z" />,
  calf: <path d="M77 312 C73 330 75 348 80 368 C84 374 90 374 92 368 C96 348 97 330 94 312 C89 317 82 317 77 312 Z" />,
}

// Each view: shapes that aren't a trainable group, then the regions with their shapes.
// `center` shapes sit on the midline and aren't mirrored.
const VIEWS = {
  front: {
    base: ['forearm', 'hand', 'knee', 'foot'], center: ['head', 'neck', 'hips'],
    regions: { shoulders: ['deltoid'], chest: ['pec'], biceps: ['upperArm'], core: ['oblique', { c: 'abs' }], legs: ['quad', 'shin'] },
  },
  back: {
    base: ['forearm', 'hand', 'knee', 'foot'], center: ['head', 'neck'],
    regions: { back: ['lat', { c: 'traps' }, { c: 'lowerBack' }], shoulders: ['deltoid'], triceps: ['upperArm'], legs: ['glute', 'hamstring', 'calf'] },
  },
}

function Pair({ name }) {
  return (
    <>
      {SHAPES[name]}
      <g transform={MIRROR}>{SHAPES[name]}</g>
    </>
  )
}

function Figure({ view, fills, selected, groups, onSelect, interactive, labels }) {
  const v = VIEWS[view]
  return (
    <svg viewBox="0 0 200 410" className={styles.figure} role={interactive ? 'group' : 'img'} aria-label={`${view === 'front' ? 'Front' : 'Back'} of the body`}>
      <g className={styles.base}>
        {v.center.map((n) => <g key={n}>{SHAPES[n]}</g>)}
        {v.base.map((n) => <Pair key={n} name={n} />)}
      </g>
      {Object.entries(v.regions).map(([region, parts]) => {
        const group = groups?.[region]
        const live = interactive && group
        return (
          <g
            key={region}
            className={styles.region}
            style={{ '--fill': fills[region] }}
            data-hot={fills.hot?.[region] || undefined}
            data-selected={selected === region || undefined}
            data-dim={(selected && selected !== region) || undefined}
            role={live ? 'button' : undefined}
            tabIndex={live ? 0 : undefined}
            aria-pressed={live ? selected === region : undefined}
            aria-label={live ? labels?.[region] : undefined}
            onClick={live ? () => onSelect(region) : undefined}
            onKeyDown={live ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(region) } } : undefined}
          >
            {parts.map((p) => (typeof p === 'string' ? <Pair key={p} name={p} /> : <g key={p.c}>{SHAPES[p.c]}</g>))}
          </g>
        )
      })}
    </svg>
  )
}

const HEAT = ['#3a3b55', '#4d7cff', '#9a6bff', '#ff5a7a', '#ff9a3d']

// The full map: front and back, each region coloured by `levels` (0–4, cool → hot).
// Regions with a group are buttons; `onSelect(region)` toggles a filter.
export default function BodyMap({ levels = {}, groups = {}, labels = {}, selected = null, onSelect, compact = false }) {
  const fills = { hot: {} }
  for (const k of Object.keys(REGIONS)) {
    fills[k] = HEAT[levels[k] || 0]
    fills.hot[k] = (levels[k] || 0) >= 3
  }
  return (
    <div className={styles.map} data-compact={compact || undefined} data-filtering={selected || undefined}>
      {['front', 'back'].map((view) => (
        <figure key={view} className={styles.side}>
          <Figure view={view} fills={fills} selected={selected} groups={groups} labels={labels} onSelect={onSelect} interactive={!!onSelect} />
          <figcaption>{view === 'front' ? 'Front' : 'Back'}</figcaption>
        </figure>
      ))}
    </div>
  )
}

// One small figure with a single muscle lit in its colour (cards and chips)
export function MuscleFigure({ region, hue, size = 64, rest = '#3a3b55', base, className = '' }) {
  const view = region ? REGIONS[region].view : 'front'
  const fills = { hot: {} }
  for (const k of Object.keys(REGIONS)) fills[k] = k === region ? hue : rest
  return (
    <span className={`${styles.mini} ${className}`} style={{ height: size, width: size * 0.49, '--base': base }} aria-hidden="true">
      <Figure view={view} fills={fills} />
    </span>
  )
}

export const HEAT_RAMP = HEAT

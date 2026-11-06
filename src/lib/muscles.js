import { getTrackerColor } from './trackerIcons'

// Where a muscle group sits on the body map, and its colour. Group names are
// free text, so they're matched by keyword; anything unmatched has no region.
export const REGIONS = {
  chest: { label: 'Chest', keys: ['chest', 'pec'], hue: '#ff5a7a', view: 'front' },
  shoulders: { label: 'Shoulders', keys: ['shoulder', 'delt'], hue: '#ff9a3d', view: 'front' },
  biceps: { label: 'Biceps', keys: ['bicep'], hue: '#c792ff', view: 'front' },
  core: { label: 'Core', keys: ['core', 'abs', 'oblique', 'abdom'], hue: '#ffd03d', view: 'front' },
  legs: { label: 'Legs', keys: ['leg', 'quad', 'hamstring', 'glute', 'calf', 'calves'], hue: '#3ddc97', view: 'front' },
  back: { label: 'Back', keys: ['back', 'lat', 'trap'], hue: '#3fc6f2', view: 'back' },
  triceps: { label: 'Triceps', keys: ['tricep'], hue: '#8ea6ff', view: 'back' },
}

export function regionOf(name = '') {
  const lower = name.toLowerCase()
  return Object.keys(REGIONS).find((k) => REGIONS[k].keys.some((kw) => lower.includes(kw))) || null
}

export function muscleHue(name) {
  const region = regionOf(name)
  return region ? REGIONS[region].hue : getTrackerColor(name)
}

// Sets a week per muscle: under 6 is light, 10–20 is the usual target
export function intensityLevel(sets) {
  if (!sets) return 0
  if (sets < 6) return 1
  if (sets < 12) return 2
  if (sets < 20) return 3
  return 4
}

// How recovered a muscle is from when it was last trained
export function recoveryOf(lastIso, now = new Date()) {
  if (!lastIso) return { label: 'Not trained', state: 'none', fill: 0 }
  const hours = (now - new Date(lastIso)) / 3600000
  if (hours < 48) return { label: 'Recovering', state: 'recovering', fill: Math.max(0.08, hours / 48) }
  if (hours < 96) return { label: 'Fresh', state: 'fresh', fill: 1 }
  return { label: 'Rested', state: 'rested', fill: 1 }
}

import {
  Droplet, Moon, Dumbbell, Flame, Beef, BookOpen, Footprints,
  Activity, Pill, Timer, Heart, Brain, Bike, Apple,
} from 'lucide-react'

const iconRules = [
  { keywords: ['water', 'hydration'], icon: Droplet },
  { keywords: ['sleep', 'rest'], icon: Moon },
  // Minutes of exercise: a stopwatch. Dumbbells mean strength training (Fitness, sessions).
  { keywords: ['workout', 'exercise', 'cardio min'], icon: Timer },
  { keywords: ['gym', 'strength', 'lift'], icon: Dumbbell },
  { keywords: ['calorie'], icon: Flame },
  { keywords: ['protein'], icon: Beef },
  { keywords: ['study', 'read', 'learn'], icon: BookOpen },
  { keywords: ['run', 'jog', 'walk'], icon: Footprints },
  { keywords: ['creatine', 'supplement', 'vitamin'], icon: Pill },
  { keywords: ['meditat', 'mindful'], icon: Brain },
  { keywords: ['cycle', 'bike'], icon: Bike },
  { keywords: ['heart', 'cardio'], icon: Heart },
  { keywords: ['fruit', 'veg', 'diet'], icon: Apple },
]

export function getTrackerIcon(name) {
  const lower = name.toLowerCase()
  const match = iconRules.find((rule) => rule.keywords.some((kw) => lower.includes(kw)))
  return match ? match.icon : Activity
}

// One hue per tracker, used for its bar, wave, chart, calendar dot and Libra chip.
// Lime (--volt) is never a tracker colour: it only means "done" or the primary action.
const fallbackPalette = ['#c792ff', '#ff7ad9', '#5ee0d0', '#f7a072', '#9ad0ff', '#e6c36a']

// The colours offered when a user picks one for a tracker
export const TRACKER_HUES = [
  { hex: '#3fc6f2', name: 'Sky' },
  { hex: '#8ea6ff', name: 'Periwinkle' },
  { hex: '#ff5a7a', name: 'Rose' },
  { hex: '#ff9a3d', name: 'Orange' },
  { hex: '#ffd03d', name: 'Sun' },
  { hex: '#3ddc97', name: 'Mint' },
  { hex: '#c792ff', name: 'Lilac' },
  { hex: '#ff7ad9', name: 'Pink' },
  { hex: '#5ee0d0', name: 'Teal' },
  { hex: '#f7a072', name: 'Peach' },
  { hex: '#9ad0ff', name: 'Ice' },
  { hex: '#e6c36a', name: 'Sand' },
]

export function isHex(color) {
  return typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)
}

// Takes a tracker (its own colour wins when set) or just a name
export function getTrackerColor(tracker = '') {
  if (tracker && typeof tracker === 'object') {
    if (isHex(tracker.color)) return tracker.color
    tracker = tracker.name || ''
  }
  const name = tracker
  const lower = name.toLowerCase()
  if (lower.includes('water') || lower.includes('hydrat')) return '#3fc6f2'
  if (lower.includes('sleep') || lower.includes('rest')) return '#8ea6ff'
  if (lower.includes('workout') || lower.includes('gym') || lower.includes('train')) return '#ff5a7a'
  if (lower.includes('protein')) return '#ff9a3d'
  if (lower.includes('calorie') || lower.includes('kcal')) return '#ffd03d'
  if (['step', 'run', 'walk', 'jog'].some((k) => lower.includes(k))) return '#3ddc97'

  // Any other tracker: a stable colour from its name
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return fallbackPalette[Math.abs(hash) % fallbackPalette.length]
}

// Two quick-add amounts that make sense for a unit
export function getQuickSteps(unit = '') {
  const u = unit.toLowerCase().trim()
  if (u === 'ml') return [250, 500]
  if (u === 'l' || u.startsWith('litre') || u.startsWith('liter')) return [0.25, 0.5]
  if (u === 'g' || u.startsWith('gram')) return [10, 25]
  if (u === 'h' || u.startsWith('hr') || u.startsWith('hour')) return [0.5, 1]
  if (u.startsWith('min')) return [15, 30]
  if (u.startsWith('kcal') || u.startsWith('cal')) return [100, 250]
  if (u.startsWith('step')) return [1000, 2500]
  if (u === 'km') return [1, 5]
  return [1, 5]
}

import { Zap, Shield, Move, ArrowUp } from 'lucide-react'

const muscleIconRules = [
  { keywords: ['chest'], icon: Shield },
  { keywords: ['back'], icon: Move },
  { keywords: ['bicep'], icon: Dumbbell },
  { keywords: ['tricep'], icon: Zap },
  { keywords: ['leg', 'quad', 'hamstring', 'calf'], icon: ArrowUp },
  { keywords: ['shoulder', 'delt'], icon: Activity },
  { keywords: ['core', 'ab'], icon: Timer },
]

export function getMuscleIcon(name) {
  const lower = name.toLowerCase()
  const match = muscleIconRules.find((rule) => rule.keywords.some((kw) => lower.includes(kw)))
  return match ? match.icon : Dumbbell
}

import { ChestIcon, BackIcon, BicepsIcon, TricepsIcon, LegsIcon } from '@/components/MuscleIcons'

export function getMuscleIconComponent(name) {
  const lower = name.toLowerCase()
  if (lower.includes('chest')) return ChestIcon
  if (lower.includes('back')) return BackIcon
  if (lower.includes('bicep')) return BicepsIcon
  if (lower.includes('tricep')) return TricepsIcon
  if (lower.includes('leg')) return LegsIcon
  return Dumbbell
}
import {
  Droplet, Moon, Dumbbell, Flame, Beef, BookOpen, Footprints,
  Activity, Pill, Timer, Heart, Brain, Bike, Apple,
} from 'lucide-react'

const iconRules = [
  { keywords: ['water', 'hydration'], icon: Droplet },
  { keywords: ['sleep', 'rest'], icon: Moon },
  { keywords: ['workout', 'gym', 'strength', 'lift'], icon: Dumbbell },
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
  return match ? match.icon : Timer
}

const fallbackPalette = [
  '#ff6b9d', '#c86dd7', '#4affc4', '#ffd166', '#6dc0ff',
  '#ff8c69', '#a78bfa', '#fb7185', '#34d399', '#f59e0b',
]

export function getTrackerColor(name) {
  const lower = name.toLowerCase()
  if (lower.includes('water')) return '#4a9eff'
  if (lower.includes('sleep')) return '#7f5af0'
  if (lower.includes('workout') || lower.includes('gym')) return '#ff6b4a'
  if (lower.includes('protein')) return '#2ce8c9'
  if (lower.includes('calorie')) return '#ffb84a'
  if (lower.includes('run')) return '#4aff88'

  // Generate a consistent color for any other tracker name
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % fallbackPalette.length
  return fallbackPalette[index]
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
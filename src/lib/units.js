'use client'
import { useSyncExternalStore } from 'react'

// Everything is stored metric (cm, kg). The profile's unit choice only changes
// what is shown and typed. It is kept in the profile row and mirrored here, so
// formatting helpers can read it without a request.
const KEY = 'stride-units'
const EVENT = 'stride-units'
const LB_PER_KG = 2.20462

export function getUnits() {
  try {
    return localStorage.getItem(KEY) === 'imperial' ? 'imperial' : 'metric'
  } catch {
    return 'metric'
  }
}

export function storeUnits(units) {
  try {
    localStorage.setItem(KEY, units === 'imperial' ? 'imperial' : 'metric')
  } catch { /* private mode: metric it is */ }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(callback) {
  window.addEventListener(EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

export function useUnits() {
  return useSyncExternalStore(subscribe, getUnits, () => 'metric')
}

export function weightUnit(units = getUnits()) {
  return units === 'imperial' ? 'lb' : 'kg'
}

// kg → the number shown in the chosen unit
export function toShownWeight(kg, units = getUnits()) {
  if (kg === null || kg === undefined || kg === '') return kg
  return units === 'imperial' ? Math.round(Number(kg) * LB_PER_KG * 10) / 10 : Number(kg)
}

// A typed weight in the chosen unit → kg for the database
export function toKg(value, units = getUnits()) {
  return units === 'imperial' ? Math.round((Number(value) / LB_PER_KG) * 1000) / 1000 : Number(value)
}

export function cmToFeetInches(cm) {
  const inches = Number(cm) / 2.54
  let feet = Math.floor(inches / 12)
  let rest = Math.round(inches - feet * 12)
  if (rest === 12) { feet += 1; rest = 0 }
  return { feet, inches: rest }
}

export function feetInchesToCm(feet, inches) {
  return Math.round(((Number(feet) || 0) * 12 + (Number(inches) || 0)) * 2.54 * 10) / 10
}

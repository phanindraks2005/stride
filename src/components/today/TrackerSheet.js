'use client'
import { createElement, useEffect, useRef, useState } from 'react'
import { Check, Minus, Plus, Trash2, X } from 'lucide-react'
import WaveFill from '@/components/WaveFill'
import { TRACKER_HUES, getTrackerColor, getTrackerIcon, getQuickSteps, isHex } from '@/lib/trackerIcons'
import { fmt, timeOf } from './format'
import styles from './sheet.module.css'

const UNITS = ['ml', 'g', 'hrs', 'mins', 'steps', 'kcal', 'km', 'reps']

// Add or edit a tracker, see the day's entries, delete. A bottom sheet on phones,
// a panel from the right on desktop. `mode`: 'new' | 'edit' | 'entries' | 'delete'.
export default function TrackerSheet({
  mode, tracker, initial, entries, dayLabel = 'today', readOnly = false,
  onClose, onSubmit, onDelete, onDeleteEntry,
}) {
  const ref = useRef(null)
  const isNew = mode === 'new'
  const start = isNew ? initial : tracker
  const [values, setValues] = useState({
    name: start?.name || '',
    unit: start?.unit || '',
    target_value: start?.target_value ? String(start.target_value) : '',
    color: isHex(start?.color) ? start.color : '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(mode === 'delete')
  const [closing, setClosing] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    dialog.showModal()
    if (mode === 'entries' || mode === 'delete') dialog.querySelector('[data-autofocus]')?.focus()
    // On touch screens the keyboard would cover half the sheet, so leave focus on Close
    else if (!window.matchMedia('(pointer: coarse)').matches) dialog.querySelector('input')?.focus()
  }, [mode])

  function close() {
    if (closing) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return onClose()
    setClosing(true)
    setTimeout(onClose, 220)
  }

  const color = values.color || getTrackerColor(values.name || tracker?.name || 'x')
  const preview = { name: values.name || 'New tracker', unit: values.unit || 'units' }
  const target = parseFloat(values.target_value)
  const step = getQuickSteps(values.unit)[0]

  function nudge(dir) {
    const now = Number.isFinite(target) ? target : 0
    const next = Math.max(0, Math.round((now + dir * step) * 100) / 100)
    setValues({ ...values, target_value: String(next) })
    setError('')
  }

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    if (!values.name.trim()) return setError('Give the tracker a name.')
    if (values.name.trim().length > 40) return setError('Keep the name under 40 characters.')
    if (!Number.isFinite(target) || target <= 0) return setError('The daily goal must be above 0.')
    if (target > 1000000) return setError('That goal is too large.')
    setBusy(true)
    setError('')
    const result = await onSubmit({
      name: values.name.trim(),
      unit: values.unit.trim() || 'units',
      target_value: target,
      color: values.color || null,
    })
    setBusy(false)
    if (result?.error) setError(result.error)
    else close()
  }

  async function remove() {
    if (busy) return
    setBusy(true)
    const result = await onDelete()
    setBusy(false)
    if (result?.error) setError(result.error)
    else close()
  }

  const titleId = 'tracker-sheet-title'
  const showForm = !readOnly && mode !== 'entries'
  const title = isNew ? 'New tracker' : mode === 'entries' ? tracker.name : 'Edit tracker'

  return (
    <dialog
      ref={ref}
      className={styles.sheet}
      data-closing={closing || undefined}
      aria-labelledby={titleId}
      style={{ '--hue': color }}
      onCancel={(e) => { e.preventDefault(); close() }}
      onClick={(e) => { if (e.target === ref.current) close() }}
    >
      <div className={styles.inner}>
        <span className={styles.grabber} aria-hidden="true" />
        <header className={styles.head}>
          <h2 id={titleId} className={styles.title}>{title}</h2>
          <button type="button" className="icon-btn" onClick={close} aria-label="Close">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div className={styles.body}>
          {mode === 'entries' && (
            <section className={styles.entries} aria-label={`Entries for ${dayLabel}`}>
              <p className={styles.entriesHead}>Logged {dayLabel}</p>
              {entries === undefined ? (
                <p className="faint">Loading entries…</p>
              ) : entries.length === 0 ? (
                <p className="faint">Nothing logged {dayLabel} yet. Use the buttons on the card to add some.</p>
              ) : (
                <ul className={styles.entryList}>
                  {entries.map((entry) => (
                    <li key={entry.id}>
                      <span className={styles.entryDot} aria-hidden="true" />
                      <span className="tnum"><b>{fmt(entry.value)}</b> {tracker.unit}</span>
                      <span className="faint tnum">{timeOf(entry.logged_at)}</span>
                      {!readOnly && (
                        <button type="button" className="icon-btn" aria-label={`Remove ${fmt(entry.value)} ${tracker.unit} logged at ${timeOf(entry.logged_at)}`} onClick={() => onDeleteEntry(entry)}>
                          <X size={15} aria-hidden="true" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {!readOnly && <button type="button" data-autofocus className="btn btn-secondary" onClick={close}>Done</button>}
            </section>
          )}

          {showForm && (
            <form id="tracker-form" className={styles.form} onSubmit={submit} noValidate>
              <div className={styles.preview} aria-hidden="true">
                <WaveFill percent={62} color={color} speed={6} rise={false} />
                <span className={styles.previewIcon}>{createElement(getTrackerIcon(preview.name), { size: 18, color })}</span>
                <span className={styles.previewName}>{preview.name}</span>
                <span className={styles.previewNum}>
                  <span className="num">{Number.isFinite(target) && target > 0 ? fmt(Math.round(target * 0.62 * 100) / 100) : '0'}</span>
                  <span>/ {Number.isFinite(target) && target > 0 ? fmt(target) : '…'} {preview.unit}</span>
                </span>
              </div>

              <label className={styles.field}>
                <span className="field-label">Name</span>
                <input className="input" maxLength={40} placeholder="Meditation…" value={values.name} onChange={(e) => { setValues({ ...values, name: e.target.value }); setError('') }} />
              </label>

              <div className={styles.field}>
                <label htmlFor="tracker-unit" className="field-label">Unit</label>
                <input id="tracker-unit" className="input" maxLength={16} placeholder="mins" value={values.unit} onChange={(e) => setValues({ ...values, unit: e.target.value })} />
                <div className={styles.unitChips} role="group" aria-label="Common units">
                  {UNITS.map((u) => (
                    <button key={u} type="button" className={styles.unitChip} aria-pressed={values.unit === u} onClick={() => setValues({ ...values, unit: u })}>{u}</button>
                  ))}
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="tracker-goal" className="field-label">Daily goal</label>
                <div className={styles.stepper}>
                  <button type="button" className={styles.stepBtn} onClick={() => nudge(-1)} aria-label={`Lower the goal by ${fmt(step)}`}>
                    <Minus size={18} aria-hidden="true" />
                  </button>
                  <input id="tracker-goal" className={`input ${styles.goalInput}`} type="number" inputMode="decimal" min="0" step="any" placeholder="10" value={values.target_value} onChange={(e) => { setValues({ ...values, target_value: e.target.value }); setError('') }} />
                  <button type="button" className={styles.stepBtn} onClick={() => nudge(1)} aria-label={`Raise the goal by ${fmt(step)}`}>
                    <Plus size={18} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <fieldset className={styles.field}>
                <legend className="field-label">Colour</legend>
                <div className={styles.swatches}>
                  <label className={`${styles.swatch} ${styles.auto}`} style={{ '--sw': getTrackerColor(values.name || 'x') }} title="Match the name">
                    <input type="radio" name="tracker-color" className="sr-only" checked={!values.color} onChange={() => setValues({ ...values, color: '' })} />
                    <span aria-hidden="true">{!values.color && <Check size={14} strokeWidth={3} />}</span>
                    <span className="sr-only">Automatic, from the name</span>
                  </label>
                  {TRACKER_HUES.map((h) => (
                    <label key={h.hex} className={styles.swatch} style={{ '--sw': h.hex }} title={h.name}>
                      <input type="radio" name="tracker-color" className="sr-only" checked={values.color === h.hex} onChange={() => setValues({ ...values, color: h.hex })} />
                      <span aria-hidden="true">{values.color === h.hex && <Check size={14} strokeWidth={3} />}</span>
                      <span className="sr-only">{h.name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {error && <p className="error-text" role="alert">{error}</p>}

              {!isNew && (
                <div className={styles.danger}>
                  {confirming ? (
                    <div className={styles.confirm} role="alert">
                      <p>Delete <b>{tracker.name}</b> and everything logged to it? This can&apos;t be undone.</p>
                      <div className={styles.confirmActions}>
                        <button type="button" data-autofocus className="btn btn-danger btn-sm" onClick={remove} disabled={busy}>
                          <Trash2 size={15} aria-hidden="true" />{busy ? 'Deleting…' : 'Delete tracker'}
                        </button>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>Keep it</button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className={styles.deleteLink} onClick={() => setConfirming(true)}>
                      <Trash2 size={15} aria-hidden="true" />Delete tracker
                    </button>
                  )}
                </div>
              )}
            </form>
          )}
        </div>

        {showForm && (
          <footer className={styles.foot}>
            <button type="button" className="btn btn-ghost" onClick={close}>Cancel</button>
            <button type="submit" form="tracker-form" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : isNew ? 'Add tracker' : 'Save changes'}
            </button>
          </footer>
        )}
      </div>
    </dialog>
  )
}

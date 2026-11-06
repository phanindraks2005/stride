'use client'
import { useEffect, useId, useRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import styles from './auth.module.css'

// A labelled input with an optional hint tied to it, and a show/hide toggle for passwords
export default function Field({ label, hint, hintOk, type = 'text', autoFocus = false, ...props }) {
  const id = useId()
  const ref = useRef(null)

  // Focus on load with a mouse or trackpad only; on phones it would open the keyboard over the page
  useEffect(() => {
    if (autoFocus && window.matchMedia('(pointer: fine)').matches) ref.current?.focus()
  }, [autoFocus])
  const hintId = `${id}-hint`
  const [shown, setShown] = useState(false)
  const isPassword = type === 'password'

  return (
    <div className={styles.field}>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className={styles.inputWrap}>
        <input
          ref={ref}
          id={id}
          className={`input ${styles.input}`}
          type={isPassword && shown ? 'text' : type}
          aria-describedby={hint ? hintId : undefined}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.reveal}
            onClick={() => setShown(!shown)}
            aria-label={shown ? 'Hide password' : 'Show password'}
            aria-pressed={shown}
          >
            {shown ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        )}
      </div>
      {hint && <p id={hintId} className={styles.hint} data-ok={hintOk || undefined}>{hint}</p>}
    </div>
  )
}

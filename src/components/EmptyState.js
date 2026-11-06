import styles from './EmptyState.module.css'

// A colourful empty state: a glow in the page's accents (--e1, --e2), a gradient
// icon tile, one sentence of what goes here, a bright action, and a picture of
// what the page will look like (`art`).
export default function EmptyState({ icon, title, children, action, art, hues = ['var(--t-workout)', 'var(--t-protein)'], headingLevel = 2, id, className = '' }) {
  const Heading = `h${headingLevel}`
  return (
    <section className={`surface ${styles.empty} ${className}`} style={{ '--e1': hues[0], '--e2': hues[1] }} aria-labelledby={id}>
      <div className={styles.text}>
        {icon && <span className={styles.icon} aria-hidden="true">{icon}</span>}
        <Heading id={id} className={styles.title}>{title}</Heading>
        <div className={styles.body}>{children}</div>
        {action && <div className={styles.actions}>{action}</div>}
      </div>
      {art && <div className={styles.art} aria-hidden="true">{art}</div>}
    </section>
  )
}

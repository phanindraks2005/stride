import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import Logo from '@/components/Logo'
import LibraGlyph from '@/components/LibraGlyph'
import Spotlight from '@/components/Spotlight'
import Hero from '@/components/landing/Hero'
import LineReveal from '@/components/landing/LineReveal'
import LazyVisual from '@/components/landing/LazyVisual'
import styles from './page.module.css'

export default function Home() {
  return (
    <div className={styles.page}>
      <Spotlight />
      <header className={styles.nav}>
        <Link href="/" aria-label="Stride home"><Logo /></Link>
        <nav className={styles.navLinks} aria-label="Sections">
          <a href="#trackers">Trackers</a>
          <a href="#libra">Libra</a>
          <a href="#year">Streaks</a>
          <a href="#how">How it works</a>
        </nav>
        <div className={styles.navActions}>
          <Link prefetch={false} href="/login" className="btn btn-ghost btn-sm">Log in</Link>
          <Link prefetch={false} href="/signup" className="btn btn-primary btn-sm">Start free</Link>
        </div>
      </header>

      <main>
        <Hero />

        <section id="trackers" className={`${styles.section} glow-bg`} style={{ '--g': 'var(--t-water)', '--gx': '72%', '--gy': '50%' }} aria-labelledby="trackers-title">
          <div className={styles.split}>
            <div className={styles.copy}>
              <LineReveal id="trackers-title" className={styles.h2} lines={['Water to deadlifts.', 'You pick what counts.']} />
              <p className={styles.body}>
                Make a tracker for anything with a number: millilitres, hours, grams, pages, minutes of reading.
                Set a daily target, log in two taps, and watch it fill. Every tracker keeps its own colour across
                the dashboard, charts, calendar and Libra.
              </p>
              <ul className={styles.ticks}>
                <li><Check size={18} aria-hidden="true" />Five sensible trackers on day one, change them any time</li>
                <li><Check size={18} aria-hidden="true" />Quick-add buttons sized to the unit: +250 ml, +10 g, +15 min</li>
                <li><Check size={18} aria-hidden="true" />Look back at any day from the calendar</li>
              </ul>
            </div>
            <LazyVisual name="trackers" minHeight={480} />
          </div>
        </section>

        <section id="libra" className={`${styles.section} glow-bg`} style={{ '--gx': '28%', '--gy': '50%' }} aria-labelledby="libra-title">
          <div className={styles.splitReverse}>
            <LazyVisual name="chat" minHeight={580} />
            <div className={styles.copy}>
              <LibraGlyph size={56} draw className={styles.libraBig} />
              <LineReveal id="libra-title" className={styles.h2} lines={['Say it once.', 'Libra logs it.']} />
              <p className={styles.body}>
                Libra sees your trackers, today&apos;s totals, your last notes and a week of workouts. Talk to it like a coach
                and it acts on what it sees, instead of handing you a generic answer.
              </p>
              <dl className={styles.abilities}>
                <div><dt>Logs for you</dt><dd>&ldquo;300 ml water and 20 g protein&rdquo; becomes two entries.</dd></div>
                <div><dt>Makes trackers</dt><dd>&ldquo;Track my reading, 30 minutes a day.&rdquo;</dd></div>
                <div><dt>Plans meals</dt><dd>Built around what you are short on today.</dd></div>
                <div><dt>Plans workouts</dt><dd>From what you trained this week and how you feel.</dd></div>
              </dl>
            </div>
          </div>
        </section>

        <section className={`${styles.section} glow-bg`} style={{ '--g': 'var(--t-sleep)', '--gx': '30%', '--gy': '60%' }} aria-labelledby="bento-title">
          <div className={styles.sectionHead}>
            <LineReveal id="bento-title" className={styles.h2} lines={['Everything else,', 'already working.']} />
            <p className={styles.body}>Charts, lifts, a calendar, Libra&apos;s plans and a notebook. These are the real screens, running on a sample account.</p>
          </div>
          <LazyVisual name="bento" minHeight={720} />
        </section>

        <section id="year" className={`${styles.year} glow-bg`} style={{ '--gx': '50%', '--gy': '40%' }} aria-labelledby="year-title">
          <div className={styles.yearHead}>
            <LineReveal id="year-title" className={styles.h2} lines={['A year of', 'showing up.']} />
            <p className={styles.body}>
              A sample year. Every square is a day; the brighter it is, the more trackers were logged.
              The streak only asks for one entry a day, so a bad day still counts if you show up.
            </p>
          </div>
          <LazyVisual name="year" minHeight={420} />
        </section>

        <section id="how" className={styles.section} aria-labelledby="how-title">
          <div className={styles.sectionHead}>
            <LineReveal id="how-title" className={styles.h2} lines={['Running', 'in a minute.']} />
          </div>
          <LazyVisual name="how" minHeight={520} />
        </section>

        <section className={styles.cta} aria-labelledby="cta-title">
          <LineReveal id="cta-title" className={styles.ctaTitle} lines={['Your streak', 'starts today.']} />
          <div className={styles.ctaSide}>
            <p>Free to use. Or look around a full sample account first, no sign-up needed.</p>
            <div className={styles.ctas}>
              <Link prefetch={false} href="/signup" className={`btn btn-lg ${styles.ctaPrimary}`}>Create your account</Link>
              <Link prefetch={false} href="/demo" className={`btn btn-lg ${styles.ctaSecondary}`}>Try the demo <ArrowRight size={18} aria-hidden="true" /></Link>
            </div>
          </div>
          <div className={styles.ctaChain} aria-hidden="true">
            {Array.from({ length: 28 }, (_, i) => <i key={i} style={{ animationDelay: `${i * 45}ms` }} />)}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footLinks}>
          <Link prefetch={false} href="/demo">Demo</Link>
          <Link prefetch={false} href="/login">Log in</Link>
          <Link prefetch={false} href="/signup">Sign up</Link>
          <a href="https://github.com/phanindraks2005/stride">Source on GitHub</a>
        </div>
        <p className={styles.wordmark} aria-hidden="true">stride</p>
        <p className="faint" style={{ fontSize: 14 }}>Built by K S Phanindra.</p>
      </footer>
    </div>
  )
}

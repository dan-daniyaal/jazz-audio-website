import { useId, useRef, useState, type FormEvent } from 'react'
import { business } from '../data/business'
import { copy } from '../data/copy'
import { looks } from '../data/looks'
import { services } from '../data/services'
import { work } from '../data/work'
import { hoursRows } from '../lib/hours'
import { useOpenStatus } from '../lib/useOpenStatus'
import { IconArrow, IconCopy, IconPhone, IconPin, Wordmark } from './bits'

/* ---------- services: big rows, a photo slides out on hover ---------- */

// only services we have a true photo for
const THUMB: Record<string, string> = {
  sound: '/img/temp/work-bronco.jpg',
  lighting: '/img/temp/work-sierra.jpg',
  custom: '/img/temp/work-jeep-bumper.jpg',
  interior: '/img/temp/work-civic.jpg',
}

export function Services() {
  return (
    <section className="sec" id="services" aria-labelledby="svc-h">
      <div className="wrap">
        <div data-reveal>
          <h2 id="svc-h" className="h-sec">
            Sound, security, video and lights.
          </h2>
          <p className="lede">Come on in and let us update your car’s sound system.</p>
        </div>
        <ul className="svc">
          {services.map((s) => (
            <li key={s.id} className={THUMB[s.id] ? 'has-img' : undefined}>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
              {THUMB[s.id] && <img src={THUMB[s.id]} alt="" width={160} height={200} loading="lazy" />}
            </li>
          ))}
        </ul>
        <p className="svc-note">{copy.services.note}</p>
      </div>
    </section>
  )
}

/* ---------- work: a swipe rail ---------- */

export function Work() {
  const cur = looks[0]
  const rail = useRef<HTMLDivElement>(null)
  const nudge = (dir: number) => rail.current?.scrollBy({ left: dir * Math.min(420, window.innerWidth * 0.8), behavior: 'smooth' })

  return (
    <section className="sec work" id="work" aria-labelledby="work-h" style={{ ['--glow' as string]: cur.hex }}>
      <div className="work-glow" aria-hidden="true" />
      <div className="wrap work-head">
        <div data-reveal>
          <h2 id="work-h" className="h-sec">
            Some beautiful <em>installs</em> coming out of Jazz Audio.
          </h2>
          <p className="lede">
            <a className="ig-link" href={business.instagram} target="_blank" rel="noreferrer">
              @jazzaudioselden
            </a>
          </p>
        </div>
        <div className="work-tools" data-reveal>
          <div className="arrows">
            <button type="button" className="arrow" onClick={() => nudge(-1)} aria-label="Previous photos">
              <span style={{ transform: 'scaleX(-1)', display: 'flex' }}>
                <IconArrow />
              </span>
            </button>
            <button type="button" className="arrow" onClick={() => nudge(1)} aria-label="Next photos">
              <IconArrow />
            </button>
          </div>
        </div>
      </div>

      <div className="rail" ref={rail} tabIndex={0} aria-label="Photos of our work, scroll sideways">
        {work.map((w, i) => (
          <figure className="card" key={w.id}>
            <a className="card-img" href={w.post} target="_blank" rel="noreferrer" aria-label={`${w.title}: open the Instagram post`}>
              <img src={w.img} width={520} height={690} loading={i < 2 ? 'eager' : 'lazy'} alt={`${w.title}. ${w.line}`} />
              <span className="card-go" aria-hidden="true">
                <IconArrow />
              </span>
            </a>
            <figcaption>
              <b>{w.title}</b>
              <span>{w.line}</span>
            </figcaption>
          </figure>
        ))}
        <a className="card more" href={business.instagram} target="_blank" rel="noreferrer">
          <span>More on Instagram</span>
          <IconArrow />
        </a>
      </div>
    </section>
  )
}

/* ---------- how it works: a slim strip, not a section ---------- */

export function How() {
  return (
    <section className="strip" aria-label="Getting started">
      <ol className="wrap strip-in">
        {copy.how.map((s) => (
          <li key={s.title}>
            <b>{s.title}</b>
            <span>{s.body}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/* ---------- quote form (not sent anywhere yet) ---------- */

interface Sent {
  name: string
  car: string
  jobs: string[]
  note: string
}

export function Quote() {
  const uid = useId()
  const [name, setName] = useState('')
  const [car, setCar] = useState('')
  const [note, setNote] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [error, setError] = useState('')
  const [sent, setSent] = useState<Sent | null>(null)
  const [copied, setCopied] = useState(false)

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!car.trim()) {
      setError('Tell us what you drive first.')
      document.getElementById(`${uid}-car`)?.focus()
      return
    }
    if (picked.length === 0 && !note.trim()) {
      setError('Pick at least one job, or tell us what you need.')
      return
    }
    setError('')
    setSent({ name: name.trim(), car: car.trim(), jobs: services.filter((s) => picked.includes(s.id)).map((s) => s.title), note: note.trim() })
  }

  const text = (s: Sent) =>
    [`Jazz Audio quote request`, s.name && `Name: ${s.name}`, `Vehicle: ${s.car}`, `Jobs: ${s.jobs.join(', ') || 'see note'}`, s.note && `Note: ${s.note}`]
      .filter(Boolean)
      .join('\n')

  async function copyIt() {
    if (!sent) return
    try {
      await navigator.clipboard.writeText(text(sent))
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      setError('Copy did not work here. Just call and tell us.')
    }
  }

  return (
    <section className="sec quote" id="quote" aria-labelledby="quote-h">
      <div className="wrap quote-grid">
        <div data-reveal>
          <h2 id="quote-h" className="h-sec">
            What are we doing to your ride?
          </h2>
          <a className="quote-phone" href={business.phoneHref}>
            <IconPhone />
            {business.phoneDisplay}
          </a>
        </div>

        <div className="panel is-soon">
          <div className="soon" role="note">
            <span className="soon-tape" aria-hidden="true" />
            <div className="soon-card">
              <svg viewBox="0 0 48 48" aria-hidden="true">
                <path d="M6 40h36M10 40c0-9 6-16 14-16s14 7 14 16M24 24V14M18 24l-3-8h18l-3 8" />
              </svg>
              <b>Under construction</b>
              <span>Online quotes are coming soon. Call {business.phoneDisplay} and we will set you up.</span>
            </div>
            <span className="soon-tape soon-tape-b" aria-hidden="true" />
          </div>
          <div className="panel-body" inert>
          {sent ? (
            <div className="done" aria-live="polite">
              <h3>Got it. Now call us.</h3>
              <dl>
                {sent.name && (
                  <>
                    <dt>Name</dt>
                    <dd>{sent.name}</dd>
                  </>
                )}
                <dt>Vehicle</dt>
                <dd>{sent.car}</dd>
                <dt>Jobs</dt>
                <dd>{sent.jobs.join(', ') || 'See note'}</dd>
                {sent.note && (
                  <>
                    <dt>Note</dt>
                    <dd>{sent.note}</dd>
                  </>
                )}
              </dl>
              <p className="fine">This page does not send requests to the shop yet. Call or stop in and show us this.</p>
              <div className="actions">
                <a className="btn btn-red" href={business.phoneHref}>
                  <IconPhone />
                  <span>Call {business.phoneDisplay}</span>
                </a>
                <button type="button" className="btn btn-line" onClick={copyIt}>
                  <IconCopy />
                  <span>{copied ? 'Copied' : 'Copy request'}</span>
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => setSent(null)}>
                  Edit
                </button>
              </div>
              {error && <p className="err" role="alert">{error}</p>}
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <label className="field">
                <span>Your name</span>
                <input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" />
              </label>
              <label className="field">
                <span>Year, make, model</span>
                <input
                  id={`${uid}-car`}
                  type="text"
                  value={car}
                  onChange={(e) => setCar(e.target.value)}
                  placeholder="2018 Jeep Wrangler"
                  aria-invalid={!!error && !car.trim()}
                />
              </label>
              <fieldset className="chips">
                <legend>What do you need?</legend>
                {services.map((s) => (
                  <label className="chip" key={s.id}>
                    <input type="checkbox" checked={picked.includes(s.id)} onChange={() => toggle(s.id)} />
                    <span>{s.title}</span>
                  </label>
                ))}
              </fieldset>
              <label className="field">
                <span>Anything else</span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Two 12s in the trunk, keep the back seat" rows={3} />
              </label>
              <p className={error ? 'err' : 'fine'} role={error ? 'alert' : undefined}>
                {error || 'No price list here. Every car is different, so we quote it when you call.'}
              </p>
              <button type="submit" className="btn btn-red btn-wide">
                <span>Build my request</span>
                <IconArrow />
              </button>
            </form>
          )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- visit ---------- */

export function Visit() {
  const status = useOpenStatus()
  const rows = hoursRows(business.hours, business.timeZone, new Date())

  return (
    <section className="sec visit" id="visit" aria-labelledby="visit-h">
      <div className="wrap visit-grid">
        <div data-reveal>
          <h2 id="visit-h" className="h-sec">
            Come on in.
          </h2>
          <p className="addr">
            {business.street}
            <br />
            {business.cityLine}
          </p>
          <a className="phone-big" href={business.phoneHref}>
            {business.phoneDisplay}
          </a>
          <p className={`state${status.isOpen ? ' is-open' : ''}`} role="status">
            <i aria-hidden="true" />
            {status.label}
          </p>
          <div className="actions">
            <a className="btn btn-red" href={business.directionsUrl} target="_blank" rel="noreferrer">
              <IconPin />
              <span>Get directions</span>
            </a>
            <a className="btn btn-line" href={business.phoneHref}>
              <IconPhone />
              <span>Call the shop</span>
            </a>
          </div>
          <ul className="hours" aria-label="Hours">
            {rows.map((r) => (
              <li key={r.day} className={r.isToday ? 'today' : undefined}>
                <span>{r.day}</span>
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
          <p className="fine">Installs are by appointment.</p>
        </div>

        <div className="visit-media">
          <img
            className="store"
            src="/img/temp/visit-storefront.jpg"
            width={800}
            height={600}
            loading="lazy"
            alt="The Jazz Audio storefront at night, lit in red neon with the JAZZ Audio sign above the door."
          />
          <iframe
            className="map"
            title="Map to Jazz Audio, 1198 Middle Country Rd, Selden NY"
            loading="lazy"
            referrerPolicy="no-referrer"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1500!2d-73.0547551!3d40.8624272!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89e8470f1d9052e3%3A0x8e78cf8ea87066c3!2sJazz%20Audio!5e0!3m2!1sen!2sus"
          />
        </div>
      </div>
    </section>
  )
}

export function Foot() {
  return (
    <footer className="foot">
      <div className="wrap foot-in">
        <Wordmark label="Jazz Audio" />
        <p>
          {business.street}, {business.cityLine}
          <br />
          <a href={business.phoneHref}>{business.phoneDisplay}</a> ·{' '}
          <a href={business.instagram} target="_blank" rel="noreferrer">
            Instagram
          </a>
        </p>
        <p className="foot-copy">© 2026 Jazz Audio Sound and Security.</p>
      </div>
    </footer>
  )
}

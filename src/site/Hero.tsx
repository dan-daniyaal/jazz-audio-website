import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { business } from '../data/business'
import { getTier, hasWebGL } from '../lib/device'
import type { Drag, FrameCb } from '../three/ExplodeHero'
import { Halftone } from './Halftone'
import { IconArrow, IconPhone } from './bits'

const ExplodeHero = lazy(() => import('../three/ExplodeHero'))

const tier = getTier()
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

const PARTS = [
  { name: 'Mounting ring', line: 'Holds it down and carries the light.' },
  { name: 'Dust cap', line: 'Keeps the coil clean.' },
  { name: 'Cone', line: 'The part that moves the air.' },
  { name: 'Surround', line: 'The flexible rubber edge.' },
  { name: 'Basket', line: 'The metal frame.' },
  { name: 'Voice coil', line: 'The coil that moves.' },
  { name: 'Magnet', line: 'The big one at the back.' },
]

function ss(a: number, b: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function Hero() {
  const section = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const labels = useRef<(HTMLDivElement | null)[]>([])
  const lines = useRef<(SVGGElement | null)[]>([])
  const drag = useRef<Drag>({ spin: 0, vel: 0, dragging: false })
  const [active, setActive] = useState(true)
  const [ready, setReady] = useState(false)
  const [gl, setGl] = useState(hasWebGL)
  const last = useRef({ x: 0, t: 0 })
  const pump = useRef(0)

  // only render while the hero is on screen
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '10% 0px' })
    if (section.current) io.observe(section.current)
    return () => io.disconnect()
  }, [])

  const onFrame = useCallback<FrameCb>((p, pts, w, h, narrow, bass) => {
    const s = stage.current
    if (!s) return
    pump.current = bass
    const heroA = 1 - ss(0.05, 0.14, p)
    const labA = ss(0.3, 0.4, p) * (1 - ss(0.6, 0.68, p))
    const finA = ss(0.86, 0.95, p)
    const headA = ss(0.14, 0.24, p) * (1 - ss(0.62, 0.7, p))
    s.style.setProperty('--p', p.toFixed(4))
    s.style.setProperty('--h', heroA.toFixed(3))
    s.style.setProperty('--l', labA.toFixed(3))
    s.style.setProperty('--f', finA.toFixed(3))
    s.style.setProperty('--t', headA.toFixed(3))
    s.dataset.hero = heroA > 0.05 ? '1' : '0'
    s.dataset.fin = finA > 0.05 ? '1' : '0'

    if (labA <= 0.01) return
    const colX = narrow ? w * 0.6 : w * 0.7
    const gap = narrow ? 40 : 58
    const order = Array.from({ length: 7 }, (_, i) => i).sort((a, b) => pts[2 * a + 1] - pts[2 * b + 1])
    const ly: number[] = []
    let prev = -1e9
    const top = narrow ? 96 : 110
    for (const i of order) {
      const y = Math.max(pts[2 * i + 1], prev + gap, top)
      ly[i] = y
      prev = y
    }
    // pull the stack up if it ran off the bottom
    const over = prev - (h - (narrow ? 130 : 100))
    if (over > 0) for (let i = 0; i < 7; i++) ly[i] -= over
    for (let i = 0; i < 7; i++) {
      const el = labels.current[i]
      const ln = lines.current[i]
      if (el) el.style.transform = `translate3d(${colX}px, ${ly[i]}px, 0) translateY(-50%)`
      if (ln) {
        const l = ln.firstElementChild as SVGLineElement
        const c = ln.lastElementChild as SVGCircleElement
        l.setAttribute('x1', String(pts[2 * i]))
        l.setAttribute('y1', String(pts[2 * i + 1]))
        l.setAttribute('x2', String(colX - 8))
        l.setAttribute('y2', String(ly[i]))
        c.setAttribute('cx', String(pts[2 * i]))
        c.setAttribute('cy', String(pts[2 * i + 1]))
      }
    }
  }, [])

  // drag to spin, vertical swipes still scroll the page (touch-action: pan-y)
  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('a,button')) return
    drag.current.dragging = true
    drag.current.vel = 0
    last.current = { x: e.clientX, t: e.timeStamp }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d.dragging) return
    const dx = e.clientX - last.current.x
    const dt = Math.max(e.timeStamp - last.current.t, 1) / 1000
    const dRad = dx * 0.009
    d.spin += dRad
    d.vel = d.vel * 0.6 + (dRad / dt) * 0.4
    last.current = { x: e.clientX, t: e.timeStamp }
  }
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      drag.current.vel += e.key === 'ArrowRight' ? 1.6 : -1.6
    }
  }
  const up = (e: React.PointerEvent) => {
    const d = drag.current
    d.dragging = false
    d.vel = Math.max(-9, Math.min(9, d.vel))
    const t = e.currentTarget as HTMLElement
    if (t.hasPointerCapture(e.pointerId)) t.releasePointerCapture(e.pointerId)
  }

  return (
    <section className={`hero${gl ? '' : ' static'}`} id="top" ref={section} aria-label="Jazz Audio">
      <div className="stage" ref={stage} data-hero="1" data-fin="0" data-ready={ready ? '1' : '0'}>
        <div className="stage-glow" aria-hidden="true" />
        {gl && <Halftone src="/img/temp/visit-storefront.jpg" active={active} pump={pump} reduced={reduced} />}

        <div
          className="gl"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={key}
          tabIndex={0}
          role="img"
          aria-label="A 12 inch subwoofer with a red LED ring. Drag sideways or use the arrow keys to spin it. Scrolling takes it apart into its seven parts: mounting ring, dust cap, cone, surround, basket, voice coil and magnet."
        >
          <img className="still" src="/hero/f000.webp" alt="" width={900} height={900} />
          {gl && (
            <Suspense fallback={null}>
              <ExplodeHero
                tier={tier}
                section={section}
                active={active}
                drag={drag}
                onFrame={onFrame}
                onReady={() => setReady(true)}
                onSlow={() => setGl(false)}
                reduced={reduced}
              />
            </Suspense>
          )}
        </div>

        <svg className="leaders" aria-hidden="true">
          {PARTS.map((_, i) => (
            <g key={i} ref={(el) => { lines.current[i] = el }}>
              <line />
              <circle r="3.5" />
            </g>
          ))}
        </svg>
        {PARTS.map((p, i) => (
          <div className="lab" key={p.name} ref={(el) => { labels.current[i] = el }} aria-hidden="true">
            <b>
              <i>{String(i + 1).padStart(2, '0')}</i> {p.name}
            </b>
            <span>{p.line}</span>
          </div>
        ))}

        <div className="copy copy-hero">
          <h1>
            Get you
            <br />
            <em>bumpin’</em> today.
          </h1>
          <p>Car sound, security, lighting and custom installs in Selden, NY.</p>
          <div className="actions">
            <a className="btn btn-red" href={business.phoneHref}>
              <IconPhone />
              <span>Call {business.phoneDisplay}</span>
            </a>
            <a className="btn btn-line" href="#work">
              <span>See the work</span>
              <IconArrow />
            </a>
          </div>
        </div>

        <div className="copy copy-mid" aria-hidden="true">
          <h2>
            What’s inside
            <br />
            a 12 inch sub.
          </h2>
        </div>

        <div className="copy copy-fin">
          <h2>
            Stop in and pick out
            <br />
            your next sub setup.
          </h2>
        </div>

        <div className="rail-p" aria-hidden="true">
          <i />
        </div>
      </div>
    </section>
  )
}

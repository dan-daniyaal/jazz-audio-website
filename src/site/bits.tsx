import { useLayoutEffect } from 'react'

/* ---------- icons: authored, one 2px stroke ---------- */

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

export const IconPhone = () => (
  <svg {...base}>
    <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
  </svg>
)

export const IconPin = () => (
  <svg {...base}>
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.4" />
  </svg>
)

export const IconArrow = () => (
  <svg {...base}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

export const IconPrint = () => (
  <svg {...base}>
    <path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5a1 1 0 0 1-1 1h-2" />
    <path d="M7 14h10v6H7z" />
  </svg>
)

export const IconCopy = () => (
  <svg {...base}>
    <rect x="9" y="9" width="11" height="11" rx="1.5" />
    <path d="M5 15V5a1 1 0 0 1 1-1h10" />
  </svg>
)

/* ---------- wordmark: red JAZZ with the triangle A, script Audio ---------- */

export function Wordmark({ href = '#top', label = 'Jazz Audio, home' }: { href?: string; label?: string }) {
  return (
    <a className="wm" href={href} aria-label={label}>
      <span className="wm-jazz" aria-hidden="true">
        J
        <svg className="wm-a" viewBox="0 0 20 18">
          <path fillRule="evenodd" d="M10 0 20 18H0L10 0Zm0 8.2L7.4 13h5.2L10 8.2Z" />
        </svg>
        ZZ
      </span>
      <span className="wm-audio" aria-hidden="true">
        Audio
      </span>
    </a>
  )
}

/* ---------- reveal: below-fold blocks rise once; above-fold stays put ---------- */

export function useRevealOnScroll() {
  useLayoutEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'))
    const vh = window.innerHeight
    const hide = els.filter((el) => el.classList.contains('pre') || el.getBoundingClientRect().top > vh * 0.92)
    hide.forEach((el) => el.classList.add('pre', 'reveal'))
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.remove('pre')
            io.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    hide.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

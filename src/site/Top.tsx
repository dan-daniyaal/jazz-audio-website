import { useState } from 'react'
import { business } from '../data/business'
import { IconPhone, Wordmark } from './bits'

const THEMES = [
  { id: 'red', name: 'Shop red', c: '#e11d2a' },
  { id: 'blue', name: 'Electric blue', c: '#2f4bff' },
  { id: 'green', name: 'Rock light green', c: '#35e85c' },
]

function apply(id: string) {
  if (id === 'red') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', id)
  const t = THEMES.find((x) => x.id === id)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#08080a')
  return t
}

export function Swatches() {
  const [theme, setTheme] = useState(() => {
    let id = 'red'
    try {
      id = localStorage.getItem('ja-theme') || 'red'
    } catch {
      /* private mode */
    }
    if (!THEMES.some((t) => t.id === id)) id = 'red'
    apply(id)
    return id
  })
  const pick = (id: string) => {
    setTheme(id)
    apply(id)
    try {
      localStorage.setItem('ja-theme', id)
    } catch {
      /* ignore */
    }
  }
  return (
    <div className="swatches" role="group" aria-label="Page colour">
      {THEMES.map((t) => (
        <button key={t.id} type="button" className="sw" aria-pressed={theme === t.id} aria-label={t.name} title={`Colour: ${t.name}`} onClick={() => pick(t.id)} style={{ ['--c' as string]: t.c }} />
      ))}
    </div>
  )
}

export function Top() {
  return (
    <header className="top">
      <div className="wrap top-in">
        <Wordmark />
        <nav className="top-nav" aria-label="Main">
          <a href="#services">What we do</a>
          <a href="#work">The work</a>
          <a href="#visit">Visit</a>
        </nav>
        <div className="top-right">
          <Swatches />
          <a className="plate" href={business.phoneHref} aria-label={`Call ${business.phoneDisplay}`}>
            <i className="bolt" aria-hidden="true" />
            <span className="plate-ac" aria-hidden="true">
              (631)
            </span>
            <b aria-hidden="true">696-0303</b>
            <i className="bolt" aria-hidden="true" />
          </a>
        </div>
      </div>
    </header>
  )
}

export function MobileBar() {
  return (
    <div className="mbar">
      <a className="btn btn-red" href={business.phoneHref}>
        <IconPhone />
        <span>{business.phoneDisplay}</span>
      </a>
      <a className="btn btn-line" href="#visit">
        Hours
      </a>
    </div>
  )
}

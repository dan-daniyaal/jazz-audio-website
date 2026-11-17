export type Tier = 'high' | 'low'

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** Rough device tier: phones and weak machines get cheaper 3D settings. */
export function getTier(): Tier {
  // ?tier=low forces the low tier (for testing); ?tier=high forces the high one
  const q = new URLSearchParams(window.location.search).get('tier')
  if (q === 'low' || q === 'high') return q
  const nav = navigator as Navigator & { deviceMemory?: number }
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const small = Math.min(window.innerWidth, window.innerHeight) < 700
  const weak = (nav.deviceMemory ?? 8) <= 4 || (nav.hardwareConcurrency ?? 8) <= 4
  return coarse || small || weak ? 'low' : 'high'
}

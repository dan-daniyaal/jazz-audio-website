/**
 * Rhythm of the subwoofer. Everything here is a pure function of time, so nothing needs state
 * and scrubbing the page never leaves anything stuck.
 *
 * Idle pattern: two hits per 1.2 s (at 0 s and 0.42 s of every cycle), the same clock as lib/beat.ts
 * (callers pass performance.now() / 1000 so the cone, the thump and the rattle land together).
 * One hit = a fast attack (40 ms) then a damped ring-down: exp(-9x) * cos(2 pi 3.2 x).
 */
export const CYCLE = 1.2
export const HIT_OFFSETS = [0, 0.42] as const
export const ATTACK = 0.04

/** shape of one hit, tau = seconds since the hit started. Returns about -1..1 */
export function hitShape(tau: number): number {
  if (tau < 0) return 0
  if (tau < ATTACK) {
    const k = tau / ATTACK
    return k * k * (3 - 2 * k)
  }
  const x = tau - ATTACK
  return Math.exp(-9 * x) * Math.cos(2 * Math.PI * 3.2 * x)
}

/** cone displacement shape for the idle rhythm, -1..1 */
export function beat(t: number): number {
  const c = ((t % CYCLE) + CYCLE) % CYCLE
  let v = 0
  for (const off of HIT_OFFSETS) {
    v += hitShape(c - off)
    v += hitShape(c + CYCLE - off)
  }
  return v < -1 ? -1 : v > 1 ? 1 : v
}

/** time (s) at which hit number i starts. Hits are numbered 0, 1, 2, ... */
export function hitTime(i: number): number {
  return Math.floor(i / 2) * CYCLE + (i % 2) * HIT_OFFSETS[1]
}

/**
 * Fills `out` with the ages (seconds since the hit, newest first) of the most recent hits at time t.
 * Returns how many were written. Rings are spawned from these, so they are exactly on the hits.
 */
export function hitAges(t: number, out: Float32Array): number {
  if (t < 0) return 0
  const c = t % CYCLE
  const idx0 = 2 * Math.floor(t / CYCLE) + (c >= HIT_OFFSETS[1] ? 1 : 0)
  let n = 0
  for (let k = 0; k < out.length; k++) {
    const i = idx0 - k
    if (i < 0) break
    out[k] = t - hitTime(i)
    n++
  }
  return n
}

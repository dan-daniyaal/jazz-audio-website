import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Procedural 12 inch subwoofer driver. Units: outer diameter 2 (R = 1). Axis = +Z, the cap faces +Z.
 * Every shape here is a profile revolved around Z, a swept tube or an extrusion. No models, no textures files.
 */

/** one point of a profile: r = distance from the axis, z = position along the axis */
export interface PP {
  r: number
  z: number
  /** hard corner: the normal splits here instead of being smoothed */
  sharp?: boolean
}

/**
 * Own lathe (three's LatheGeometry has soft corners and its v follows the point index, not real distance).
 * Travel the profile so that the visible side is on the RIGHT of the direction of travel
 * (outer to inner at a fixed z gives a +Z facing surface). v is the real arc length, 0..1, so
 * concentric textures do not bunch up. u goes round the axis, 0..1.
 */
export function lathe(profile: PP[], seg: number): THREE.BufferGeometry {
  const n = profile.length
  const sn: [number, number][] = []
  const sl: number[] = []
  for (let k = 0; k < n - 1; k++) {
    const dr = profile[k + 1].r - profile[k].r
    const dz = profile[k + 1].z - profile[k].z
    const L = Math.hypot(dr, dz) || 1e-9
    sl.push(L)
    sn.push([dz / L, -dr / L])
  }
  interface Row {
    r: number
    z: number
    nr: number
    nz: number
    s: number
  }
  const rows: Row[] = []
  let s = 0
  for (let j = 0; j < n; j++) {
    if (j > 0) s += sl[j - 1]
    const prev = j > 0 ? sn[j - 1] : null
    const next = j < n - 1 ? sn[j] : null
    const p = profile[j]
    if (prev && next && p.sharp) {
      rows.push({ r: p.r, z: p.z, nr: prev[0], nz: prev[1], s })
      rows.push({ r: p.r, z: p.z, nr: next[0], nz: next[1], s })
    } else {
      let nr: number
      let nz: number
      if (prev && next) {
        nr = prev[0] + next[0]
        nz = prev[1] + next[1]
      } else {
        const q = (prev ?? next)!
        nr = q[0]
        nz = q[1]
      }
      const l = Math.hypot(nr, nz) || 1
      rows.push({ r: p.r, z: p.z, nr: nr / l, nz: nz / l, s })
    }
  }
  const total = s || 1
  const R = rows.length
  const cols = seg + 1
  const pos = new Float32Array(R * cols * 3)
  const nor = new Float32Array(R * cols * 3)
  const uv = new Float32Array(R * cols * 2)
  for (let j = 0; j < R; j++) {
    const row = rows[j]
    for (let i = 0; i < cols; i++) {
      const a = (i / seg) * Math.PI * 2
      const ca = Math.cos(a)
      const sa = Math.sin(a)
      const k = j * cols + i
      pos[k * 3] = row.r * ca
      pos[k * 3 + 1] = row.r * sa
      pos[k * 3 + 2] = row.z
      nor[k * 3] = row.nr * ca
      nor[k * 3 + 1] = row.nr * sa
      nor[k * 3 + 2] = row.nz
      uv[k * 2] = i / seg
      uv[k * 2 + 1] = row.s / total
    }
  }
  const idx: number[] = []
  for (let j = 0; j < R - 1; j++) {
    if (rows[j + 1].s - rows[j].s < 1e-9) continue
    for (let i = 0; i < seg; i++) {
      const a = j * cols + i
      const b = (j + 1) * cols + i
      const c = j * cols + i + 1
      const d = (j + 1) * cols + i + 1
      idx.push(a, c, b, b, c, d)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  g.setIndex(idx)
  return g
}

/** a solid ring section (outer wall up, front face inward, inner wall down, back face outward), hard corners */
function ringSection(r0: number, r1: number, z0: number, z1: number, bevel = 0): PP[] {
  const b = bevel
  const pts: PP[] = [
    { r: r1, z: z0 + b, sharp: true },
    { r: r1, z: z1 - b, sharp: true },
  ]
  if (b > 0) pts.push({ r: r1 - b, z: z1, sharp: true })
  pts.push({ r: r0, z: z1, sharp: true }, { r: r0, z: z0, sharp: true })
  if (b > 0) pts.push({ r: r1 - b, z: z0, sharp: true })
  pts.push({ r: r1, z: z0 + b })
  return pts
}

export interface Flex {
  /** original z of every vertex */
  baseZ: Float32Array
  /** 0 at the fixed edge, 1 at the moving edge */
  w: Float32Array
}

/** Per-vertex weights so a shell can bend: fixed at rFixed, following the cone fully at rMove. */
export function makeFlex(geo: THREE.BufferGeometry, rFixed: number, rMove: number): Flex {
  const p = geo.attributes.position
  const baseZ = new Float32Array(p.count)
  const w = new Float32Array(p.count)
  for (let i = 0; i < p.count; i++) {
    baseZ[i] = p.getZ(i)
    const r = Math.hypot(p.getX(i), p.getY(i))
    const t = Math.min(1, Math.max(0, (rFixed - r) / (rFixed - rMove)))
    w[i] = t * t * (3 - 2 * t)
  }
  return { baseZ, w }
}

/** a tapered bar between two points, thickness along the face normal; returns geometry plus the frame used */
function spokeGeo(p0: THREE.Vector3, p1: THREE.Vector3, theta: number, w0: number, w1: number, thick: number) {
  const L = p0.distanceTo(p1)
  const shape = new THREE.Shape()
  shape.moveTo(-w0 / 2, 0)
  shape.lineTo(w0 / 2, 0)
  shape.lineTo(w1 / 2, L)
  shape.lineTo(-w1 / 2, L)
  shape.closePath()
  const g = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false })
  g.translate(0, 0, -thick / 2)
  const y = p1.clone().sub(p0).normalize()
  const x = new THREE.Vector3(-Math.sin(theta), Math.cos(theta), 0)
  const z = new THREE.Vector3().crossVectors(x, y).normalize()
  const m = new THREE.Matrix4().makeBasis(x, y, z).setPosition(p0)
  g.applyMatrix4(m)
  return { geo: g, frame: m, x, y, z, L }
}

export function buildSubGeometry(seg: number, low: boolean) {
  const TAU = Math.PI * 2

  /* ---- ring: mounting ring, r 0.92 to 1.00, 0.05 thick, bevelled outer edge ---- */
  const ring = lathe(ringSection(0.92, 1.0, -0.025, 0.025, 0.012), seg)

  /* bolt heads: hex, with a small round inset drawn on top by a second instanced mesh */
  const bolt = new THREE.CylinderGeometry(0.028, 0.028, 0.02, 6)
  bolt.rotateX(Math.PI / 2)
  bolt.translate(0, 0, 0.01)
  const boltInset = new THREE.CylinderGeometry(0.0125, 0.0125, 0.004, 12)
  boltInset.rotateX(Math.PI / 2)
  boltInset.translate(0, 0, 0.0205)

  /* ---- surround: ribbed rubber double roll, r 0.92 (outer, fixed to the ring) to 0.68 (inner, on the cone) ---- */
  const sPts: PP[] = []
  const SN = 72
  for (let k = 0; k <= SN; k++) {
    const t = k / SN
    const arch = 0.11 * Math.pow(Math.sin(Math.PI * t), 0.82)
    const ribs = 0.012 * Math.sin(TAU * 3 * t) * Math.pow(Math.sin(Math.PI * t), 0.6)
    sPts.push({ r: 0.92 - 0.24 * t, z: arch + ribs })
  }
  const surround = lathe(sPts, seg)
  const surroundFlex = makeFlex(surround, 0.92, 0.68)

  /* ---- cone: r 0.68 at the front to r 0.36 at depth 0.44, gently curved, then a short neck down to the coil ---- */
  const cPts: PP[] = []
  const CN = 36
  for (let k = 0; k <= CN; k++) {
    const t = k / CN
    cPts.push({ r: 0.68 - 0.32 * t, z: -0.44 * (0.62 * t + 0.38 * t * t) })
  }
  cPts.push({ r: 0.3, z: -0.452 }, { r: 0.19, z: -0.46 })
  const cone = lathe(cPts, seg)
  {
    // ambient shading baked in: the cone gets darker toward the cap and the coil, so the gap reads as a recess
    const pp = cone.attributes.position
    const cols = new Float32Array(pp.count * 3)
    for (let i = 0; i < pp.count; i++) {
      const r = Math.hypot(pp.getX(i), pp.getY(i))
      const t = Math.min(1, Math.max(0, (r - 0.19) / (0.68 - 0.19)))
      const v = 0.18 + 0.82 * Math.pow(t, 0.7)
      cols[i * 3] = cols[i * 3 + 1] = cols[i * 3 + 2] = v
    }
    cone.setAttribute('color', new THREE.BufferAttribute(cols, 3))
  }

  /* ---- cap: big nearly flat disc r 0.66, domed 0.04 at the centre, with a small rolled edge ---- */
  const kPts: PP[] = [
    { r: 0.646, z: -0.066 },
    { r: 0.658, z: -0.052 },
    { r: 0.666, z: -0.032 },
    { r: 0.664, z: -0.012 },
    { r: 0.652, z: 0.002 },
    { r: 0.636, z: 0.01 },
  ]
  const KN = 28
  for (let k = 1; k <= KN; k++) {
    const q = k / KN
    const r = 0.636 * (1 - q)
    kPts.push({ r, z: 0.01 + 0.03 * (1 - Math.pow(r / 0.636, 2)) })
  }
  const cap = lathe(kPts, seg)

  /* ---- basket: flange ring, rear ring and six tapered spokes ---- */
  const flange = lathe(ringSection(0.9, 1.0, -0.105, -0.055, 0.008), seg)
  const rearRing = lathe(ringSection(0.3, 0.44, -0.53, -0.47, 0.01), seg)
  const spokes: THREE.BufferGeometry[] = []
  const TERM_K = 4
  let terminal: { matrix: THREE.Matrix4; zAxis: THREE.Vector3; xAxis: THREE.Vector3; yAxis: THREE.Vector3; at: THREE.Vector3 } | null = null
  for (let k = 0; k < 6; k++) {
    const th = (k * 60 + 30) * (Math.PI / 180)
    const p0 = new THREE.Vector3(0.95 * Math.cos(th), 0.95 * Math.sin(th), -0.085)
    const p1 = new THREE.Vector3(0.4 * Math.cos(th), 0.4 * Math.sin(th), -0.5)
    const sp = spokeGeo(p0, p1, th, 0.115, 0.075, 0.034)
    spokes.push(sp.geo)
    if (k === TERM_K) {
      const at = p0.clone().lerp(p1, 0.34).addScaledVector(sp.z, 0.017)
      terminal = { matrix: sp.frame.clone().setPosition(at), zAxis: sp.z, xAxis: sp.x, yAxis: sp.y, at }
    }
  }
  const spokesMerged = mergeGeometries(spokes)!

  /* ---- voice coil: dark former with winding (texture), a tight helix on high tier, plus the spider ---- */
  const former = lathe(
    [
      { r: 0.19, z: -0.17 },
      { r: 0.19, z: 0.17 },
    ],
    seg,
  )
  const formerInner = lathe(
    [
      { r: 0.184, z: 0.17 },
      { r: 0.184, z: -0.17 },
    ],
    seg,
  )
  let helix: THREE.BufferGeometry | null = null
  if (!low) {
    const turns = 30
    class Helix extends THREE.Curve<THREE.Vector3> {
      constructor() {
        super()
      }
      getPoint(t: number, target = new THREE.Vector3()) {
        const a = t * turns * TAU
        return target.set(0.1935 * Math.cos(a), 0.1935 * Math.sin(a), -0.13 + 0.26 * t)
      }
    }
    helix = new THREE.TubeGeometry(new Helix(), turns * 14, 0.0042, 5, false)
  }
  const sp2: PP[] = []
  const PN = 56
  for (let k = 0; k <= PN; k++) {
    const t = k / PN
    sp2.push({ r: 0.44 - 0.24 * t, z: 0.013 * Math.sin(TAU * 4 * t) * Math.sin(Math.PI * Math.min(1, t * 1.15)) - 0.003 })
  }
  const spider = lathe(sp2, seg)
  const spiderFlex = makeFlex(spider, 0.44, 0.2)

  /* ---- magnet stack (local z: ferrite -0.13..+0.13, top plate +0.13..+0.18, back plate -0.19..-0.13) ---- */
  const plateTop = lathe(
    [
      { r: 0.52, z: 0.18, sharp: true },
      { r: 0.23, z: 0.18, sharp: true },
      { r: 0.23, z: 0.13, sharp: true },
      { r: 0.52, z: 0.13 },
    ],
    seg,
  )
  const plateEdge = lathe(
    [
      { r: 0.52, z: 0.13 },
      { r: 0.52, z: 0.18 },
    ],
    seg,
  )
  const ferriteWall = lathe(
    [
      { r: 0.6, z: -0.13 },
      { r: 0.6, z: 0.13 },
    ],
    seg,
  )
  const ferriteCaps = lathe(
    [
      { r: 0.6, z: 0.13, sharp: true },
      { r: 0.3, z: 0.13, sharp: true },
      { r: 0.3, z: -0.13 },
      { r: 0.6, z: -0.13 },
    ],
    seg,
  )
  const backPlate = lathe(
    [
      { r: 0.07, z: -0.13, sharp: true },
      { r: 0.07, z: -0.19, sharp: true },
      { r: 0.5, z: -0.19 },
    ],
    seg,
  )
  const backWall = lathe(
    [
      { r: 0.5, z: -0.19 },
      { r: 0.5, z: -0.13 },
    ],
    seg,
  )
  const vent = lathe(
    [
      { r: 0.075, z: -0.12 },
      { r: 0, z: -0.12 },
    ],
    24,
  )
  const pole = lathe(
    [
      { r: 0.17, z: -0.13 },
      { r: 0.17, z: 0.1 },
      { r: 0, z: 0.1 },
    ],
    seg,
  )

  return {
    ring,
    bolt,
    boltInset,
    surround,
    surroundFlex,
    cone,
    cap,
    flange,
    rearRing,
    spokes: spokesMerged,
    terminal: terminal!,
    former,
    formerInner,
    helix,
    spider,
    spiderFlex,
    plateTop,
    plateEdge,
    ferriteWall,
    ferriteCaps,
    backPlate,
    backWall,
    vent,
    pole,
  }
}

export type SubGeometry = ReturnType<typeof buildSubGeometry>

import * as THREE from 'three'
import { useMemo, useRef, useState } from 'react'
import type { MutableRefObject, RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import { Sub } from './SubParts'
import type { SubHandle, SubState } from './SubParts'
import { beat, hitShape } from './subMotion'
import type { Tier } from '../lib/device'

const D2R = Math.PI / 180
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const ss = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export interface Drag {
  spin: number
  vel: number
  dragging: boolean
}
export type FrameCb = (p: number, pts: Float32Array, w: number, h: number, narrow: boolean, pump: number) => void

/** three 0.187 ignores envMapIntensity unless the material owns an envMap: hand every standard material the scene environment once. */
function EnvFix() {
  const seen = useState(() => new WeakSet<THREE.Material>())[0]
  const n = useState(() => ({ i: 0 }))[0]
  useFrame(({ scene }) => {
    const env = scene.environment
    if (!env) return
    if (n.i++ > 90 && n.i % 20) return
    scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
      if (!m) return
      for (const mat of Array.isArray(m) ? m : [m]) {
        if (seen.has(mat)) continue
        seen.add(mat)
        const sm = mat as THREE.MeshStandardMaterial
        if (sm.isMeshStandardMaterial && sm.envMap == null) {
          sm.envMap = env
          sm.needsUpdate = true
        }
      }
    })
  })
  return null
}

const _v = new THREE.Vector3()

/**
 * The scroll film. Everything is a pure function of p (smoothed scroll through the tall hero) and time:
 *  0.00  assembled, thumping, drag to spin
 *  0.12  turns side-on and the parts slide out along the axis, labels appear
 *  0.72  everything slides back together
 *  1.00  assembled again, closer, the call to action
 */
function Rig({ tier, section, drag, onFrame, onSlow, reduced }: { onSlow: () => void; tier: Tier; section: RefObject<HTMLElement | null>; drag: MutableRefObject<Drag>; onFrame: FrameCb; reduced: boolean }) {
  const { size, camera } = useThree()
  const pose = useRef<THREE.Group>(null!)
  const pivot = useRef<THREE.Group>(null!)
  const sub = useRef<SubHandle>(null)
  const state = useRef<SubState>({ pump: 0, spread: 0, led: new THREE.Color('#ff2a35'), ledPower: 1, opacity: 1 })
  const mm = useRef({ p: 0, first: true, n: 0, fn: 0, fsum: 0 })
  const fit = useRef({ hero: { y: 1.9, s: 0.8 }, fin: { y: 1.9, s: 0.8 } })
  const pts = useMemo(() => new Float32Array(14), [])

  useFrame((rs, dtRaw) => {
    // frame-rate guard: if a long run of frames averages under 15 fps, give the 3D up (the still image and the text stay)
    if (dtRaw < 0.5 && mm.current.n > 60) {
      mm.current.fn++
      mm.current.fsum += dtRaw
      if (mm.current.fn >= 150) {
        if (mm.current.fn / mm.current.fsum < 15 && !new URLSearchParams(location.search).has('fps')) onSlow()
        mm.current.fn = 0
        mm.current.fsum = 0
      }
    }
    const dt = Math.min(dtRaw, 0.05)
    const el = section.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const total = Math.max(1, r.height - window.innerHeight)
    const target = clamp01(-r.top / total)
    const m = mm.current
    m.p = m.first ? target : m.p + (target - m.p) * (1 - Math.exp(-dt * 8))
    m.first = false
    const p = m.p
    const t = reduced ? 0 : rs.clock.elapsedTime
    if (mm.current.n++ % 15 === 0) {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--led').trim()
      if (v) state.current.led.lerp(new THREE.Color(v), 1)
    }
    const bt = reduced ? 0 : performance.now() / 1000

    const narrow = size.width <= 820
    const dist = narrow ? 11.5 : 9
    const d = drag.current
    if (!d.dragging && !reduced) {
      d.spin += d.vel * dt
      d.vel *= Math.exp(-2.6 * dt)
    }
    const heroK = 1 - ss(0.04, 0.14, p)

    const a2 = ss(0.05, 0.28, p) // turn out for the explode
    const a3 = ss(0.7, 0.92, p) // turn back
    const spread = ss(0.1, 0.4, p) * (1 - ss(0.68, 0.84, p))

    // pose
    // phone: the driver is sized and placed in the space above the text, whatever the screen height
    if (narrow && mm.current.n % 15 === 1) {
      const place = (sel: string) => {
        const el = section.current?.querySelector<HTMLElement>(sel)
        if (!el) return null
        const pxPerWorld = size.height / (2 * dist * Math.tan(16 * D2R))
        const top = 74
        const avail = Math.max(120, el.offsetTop - top - 6)
        const diam = Math.min(avail * 0.96, size.width * 0.9)
        return { y: (size.height / 2 - (top + avail / 2)) / pxPerWorld, s: Math.min(1.1, Math.max(0.4, diam / (2.45 * pxPerWorld))) }
      }
      fit.current.hero = place('.copy-hero') ?? fit.current.hero
      fit.current.fin = place('.copy-fin') ?? fit.current.fin
    }
    const fh = fit.current.hero
    const ff = fit.current.fin
    const S = narrow ? [fh.s, 0.66, ff.s] : [1.38, 1.0, 1.5]
    const X = narrow ? [0, -0.35, 0] : [1.7, -1.1, 1.7]
    const Y = narrow ? [fh.y, 0.1, ff.y] : [0, 0, 0]
    const YAW = narrow ? [-30, 24, -22] : [-30, 64, -20]
    const PITCH = narrow ? [-14, -68, -14] : [-12, 6, -10]
    const mix = (a: number[]) => lerp(lerp(a[0], a[1], a2), a[2], a3)

    const g = pose.current
    g.rotation.order = 'YXZ'
    const sway = reduced ? 0 : Math.sin(t * 0.55) * 0.1 * heroK
    g.rotation.set(mix(PITCH) * D2R, mix(YAW) * D2R + (d.spin + sway) * heroK, 0)
    g.position.set(mix(X), mix(Y) + (reduced ? 0 : Math.sin(t * 1.1) * 0.035 * heroK), 0)
    g.scale.setScalar(mix(S))
    pivot.current.position.z = 0.25 * spread

    // pump: thumping while assembled, still while apart, one hit when it snaps back
    const st = state.current
    let pump = 0
    let power = 1
    if (!reduced) {
      const b = beat(bt)
      const amp = lerp(0.2, 0.0, ss(0.06, 0.2, p)) + 0.12 * ss(0.9, 1, p)
      pump = amp * b
      power += 0.7 * Math.max(0, b) * (amp > 0.01 ? 1 : 0)
      const tau = (p - 0.86) * 12
      if (tau > 0 && tau < 3) {
        pump += 0.22 * hitShape(tau)
        power += 1.6 * Math.exp(-tau * 2)
      }
      power += 0.08 * Math.sin(t * 2.2)
    }
    st.pump = pump
    st.spread = spread
    st.ledPower = power
    st.opacity = 1

    camera.position.set(0, 0, dist)
    camera.lookAt(0, 0, 0)
    camera.updateMatrixWorld()

    // project each part so the HTML labels can point at it
    const labelOn = ss(0.3, 0.4, p) * (1 - ss(0.6, 0.68, p))
    if (labelOn > 0.01 && sub.current) {
      for (let i = 0; i < 7; i++) {
        sub.current.getPartWorldPosition(i, _v)
        _v.project(camera)
        pts[2 * i] = (_v.x * 0.5 + 0.5) * size.width
        pts[2 * i + 1] = (-_v.y * 0.5 + 0.5) * size.height
      }
    }
    onFrame(p, pts, size.width, size.height, narrow, pump)
  }, -1)

  return (
    <group ref={pose}>
      <group ref={pivot}>
        <Sub ref={sub} state={state} tier={tier} />
      </group>
    </group>
  )
}

export default function ExplodeHero({
  tier,
  section,
  active,
  drag,
  onFrame,
  onReady,
  onSlow,
  reduced,
}: {
  onSlow: () => void
  tier: Tier
  section: RefObject<HTMLElement | null>
  active: boolean
  drag: MutableRefObject<Drag>
  onFrame: FrameCb
  onReady: () => void
  reduced: boolean
}) {
  const [dprMax, setDprMax] = useState(tier === 'low' ? 1.5 : 2)
  return (
    <Canvas
      dpr={[1, dprMax]}
      frameloop={active ? 'always' : 'never'}
      camera={{ fov: 32, position: [0, 0, 9], near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.1
        onReady()
      }}
    >
      <PerformanceMonitor onDecline={() => setDprMax(1)} />
      <ambientLight intensity={0.16} />
      <directionalLight position={[-4, 5, 6]} intensity={1.5} color="#ffffff" />
      <directionalLight position={[3, 2, -6]} intensity={1.3} color="#ff5a5a" />
      <directionalLight position={[6, 1, 2]} intensity={0.9} color="#ffd9d2" />
      <Environment resolution={256}>
        <color attach="background" args={['#050508']} />
        <Lightformer form="rect" intensity={14} position={[-5.6, 0.5, 2.4]} rotation-y={Math.PI / 2 - 0.35} scale={[0.5, 9, 1]} />
        <Lightformer form="rect" intensity={10} position={[5.6, 0.5, 2.4]} rotation-y={-(Math.PI / 2 - 0.35)} scale={[0.5, 9, 1]} />
        <Lightformer form="rect" intensity={1.4} position={[0, 7, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} />
        <Lightformer form="rect" intensity={4} position={[0, 4, -7]} scale={[10, 1.4, 1]} color="#ffe3e0" />
        <Lightformer form="ring" intensity={1} position={[0, -0.5, 9]} scale={3.5} />
        <Lightformer form="rect" intensity={1.8} position={[0.5, 3.5, 8]} scale={[7, 2.4, 1]} />
      </Environment>
      <EnvFix />
      <Rig tier={tier} section={section} drag={drag} onFrame={onFrame} onSlow={onSlow} reduced={reduced} />
    </Canvas>
  )
}

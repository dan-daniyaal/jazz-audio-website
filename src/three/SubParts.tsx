import * as THREE from 'three'
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Tier } from '../lib/device'
import { buildSubGeometry } from './subGeometry'
import type { Flex } from './subGeometry'
import { makeSubMaterials } from './subMaterials'
import { glowTexture } from './Glow'
import { capLogoTexture } from './capLogo'

/** What drives the driver. FilmScene (and later LightsScene) write it, Sub reads it every frame. */
export interface SubState {
  /** cone travel in world units, about -0.24 to 0.24 (positive = toward the viewer) */
  pump: number
  /** 0 assembled, 1 fully exploded */
  spread: number
  led: THREE.Color
  /** 1 = normal brightness, 3 = flare */
  ledPower: number
  /** 0..1 for the whole driver */
  opacity: number
}

export const PART_ORDER = ['ring', 'cap', 'cone', 'surround', 'basket', 'coil', 'magnet'] as const
export type PartName = (typeof PART_ORDER)[number]

/** exploded offsets in D (outer diameter) from the storyboard, in PART_ORDER order. World units = D * 2. */
export const OFFSET_D = [0.95, 0.62, 0.3, 0.08, -0.25, -0.55, -0.85] as const
/** z of each part's own origin when assembled */
export const ASSEMBLED_Z = [0, -0.02, 0, 0, 0, -0.5, -0.7] as const

export interface SubHandle {
  /** world position of the origin of part i (PART_ORDER index), read from the current state */
  getPartWorldPosition(i: number, target: THREE.Vector3): THREE.Vector3
}

function flexInto(geo: THREE.BufferGeometry, f: Flex, pump: number) {
  const p = geo.attributes.position as THREE.BufferAttribute
  const arr = p.array as Float32Array
  for (let i = 0, n = p.count; i < n; i++) arr[i * 3 + 2] = f.baseZ[i] + f.w[i] * pump
  p.needsUpdate = true
}

export const Sub = forwardRef<SubHandle, { state: RefObject<SubState>; tier: Tier; glow?: boolean }>(function Sub({ state, tier, glow = true }, ref) {
  const low = tier === 'low'
  const seg = low ? 48 : 96
  const g = useMemo(() => buildSubGeometry(seg, low), [seg, low])
  const m = useMemo(() => makeSubMaterials(tier), [tier])
  const ringTex = useMemo(() => glowTexture('ring'), [])
  const softTex = useMemo(() => glowTexture('soft'), [])
  const logoTex = useMemo(() => capLogoTexture(), [])

  const root = useRef<THREE.Group>(null!)
  const parts = useRef<(THREE.Group | null)[]>([])
  const coneGrp = useRef<THREE.Group>(null!)
  const capGrp = useRef<THREE.Group>(null!)
  const coilGrp = useRef<THREE.Group>(null!)
  const bolts = useRef<THREE.InstancedMesh>(null!)
  const insets = useRef<THREE.InstancedMesh>(null!)
  const light = useRef<THREE.PointLight>(null!)
  const glowMats = useRef<(THREE.SpriteMaterial | null)[]>([])
  const last = useRef({ pump: 1e9, op: -1 })
  const col = useMemo(() => new THREE.Color(), [])

  useImperativeHandle(
    ref,
    () => ({
      getPartWorldPosition(i, target) {
        const st = state.current
        root.current.updateWorldMatrix(true, false)
        target.set(0, 0, ASSEMBLED_Z[i] + st.spread * 2 * OFFSET_D[i])
        return target.applyMatrix4(root.current.matrixWorld)
      },
    }),
    [state],
  )

  // eight bolts round the ring
  useEffect(() => {
    const mat = new THREE.Matrix4()
    const eul = new THREE.Euler()
    const quat = new THREE.Quaternion()
    const one = new THREE.Vector3(1, 1, 1)
    const pos = new THREE.Vector3()
    for (let k = 0; k < 8; k++) {
      const a = ((k + 0.5) / 8) * Math.PI * 2
      // under one degree of tilt per bolt so they are not clones; hex turned a little differently each
      eul.set(0.012 * Math.sin(k * 2.7 + 1), 0.012 * Math.cos(k * 1.9), a + 0.4 + 0.25 * Math.sin(k * 3.1))
      quat.setFromEuler(eul)
      pos.set(0.96 * Math.cos(a), 0.96 * Math.sin(a), 0.025)
      mat.compose(pos, quat, one)
      bolts.current.setMatrixAt(k, mat)
      insets.current.setMatrixAt(k, mat)
    }
    bolts.current.instanceMatrix.needsUpdate = true
    insets.current.instanceMatrix.needsUpdate = true
  }, [])

  useFrame(() => {
    const st = state.current
    const r = root.current
    if (!r) return
    if (st.opacity <= 0.001) {
      r.visible = false
      return
    }
    r.visible = true

    // each part slides along Z
    for (let i = 0; i < 7; i++) {
      const pg = parts.current[i]
      if (pg) pg.position.z = ASSEMBLED_Z[i] + st.spread * 2 * OFFSET_D[i]
    }

    // cone, cap and coil move with the pump, surround and spider flex with it
    const pump = st.pump
    coneGrp.current.position.z = pump
    capGrp.current.position.z = pump
    coilGrp.current.position.z = pump
    if (Math.abs(pump - last.current.pump) > 1e-5) {
      last.current.pump = pump
      flexInto(g.surround, g.surroundFlex, pump)
      flexInto(g.spider, g.spiderFlex, pump)
    }

    // LED
    m.led.color.copy(st.led).multiplyScalar(st.ledPower)
    const op = st.opacity
    light.current.color.copy(st.led)
    light.current.intensity = 16 * st.ledPower * op
    col.copy(st.led)
    const gp = Math.min(st.ledPower, 2.2)
    const base = [0.7, 0.16, 0.07]
    for (let i = 0; i < glowMats.current.length; i++) {
      const gm = glowMats.current[i]
      if (!gm) continue
      gm.color.copy(col)
      // the halo gives way as the driver comes apart, so it does not wash the ring and the back parts
      gm.opacity = Math.min(1, base[i] * gp) * op * (1 - 0.6 * st.spread)
    }

    // opacity on every material, transparent only while it is below 1
    if (last.current.op !== op) {
      last.current.op = op
      const tr = op < 0.999
      for (const mat of m.all) {
        mat.opacity = op
        if (mat.transparent !== tr) {
          mat.transparent = tr
          mat.needsUpdate = true
        }
      }
    }
  })

  const setPart = (i: number) => (el: THREE.Group | null) => {
    parts.current[i] = el
  }
  const setGlow = (i: number) => (el: THREE.SpriteMaterial | null) => {
    glowMats.current[i] = el
  }
  const T = g.terminal

  return (
    <group ref={root}>
      {/* ring: mounting ring, 8 bolts, the LED ring and its glow and light */}
      <group ref={setPart(0)}>
        <mesh geometry={g.ring} material={m.rim} />
        <instancedMesh ref={bolts} args={[g.bolt, m.chrome, 8]} frustumCulled={false} />
        <instancedMesh ref={insets} args={[g.boltInset, m.black, 8]} frustumCulled={false} />
        <mesh position={[0, 0, -0.06]} material={m.led}>
          <torusGeometry args={[1.04, 0.018, 12, low ? 64 : 144]} />
        </mesh>
        <sprite position={[0, 0, -0.35]} scale={[4.3, 4.3, 1]} renderOrder={4} visible={glow}>
          <spriteMaterial ref={setGlow(0)} map={ringTex} transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </sprite>
        {!low && (
          <>
            <sprite position={[0, 0, -0.9]} scale={[6.5, 6.5, 1]} renderOrder={4} visible={glow}>
              <spriteMaterial ref={setGlow(1)} map={softTex} transparent opacity={0.4} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </sprite>
            <sprite position={[0, 0, -1.3]} scale={[10, 10, 1]} renderOrder={4} visible={glow}>
              <spriteMaterial ref={setGlow(2)} map={softTex} transparent opacity={0.2} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </sprite>
          </>
        )}
        <pointLight ref={light} position={[0, 0, -0.3]} distance={6} decay={2} intensity={16} />
      </group>

      {/* cap */}
      <group ref={setPart(1)}>
        <group ref={capGrp}>
          <mesh geometry={g.cap} material={m.cap} />
          {/* the shop wordmark on the cap */}
          <mesh position={[0, 0.005, 0.0418]} renderOrder={2}>
            <circleGeometry args={[0.36, 64]} />
            <meshStandardMaterial map={logoTex} transparent roughness={0.45} metalness={0.2} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} depthWrite={false} />
          </mesh>
          {/* thin machined ring at 0.2 of the cap radius, and a faint dark dimple inside it */}
          <mesh position={[0, 0, 0.0392]}>
            <torusGeometry args={[0.132, 0.0035, 6, low ? 48 : 96]} />
            <primitive object={m.steel} attach="material" />
          </mesh>
        </group>
      </group>

      {/* cone */}
      <group ref={setPart(2)}>
        <group ref={coneGrp}>
          <mesh geometry={g.cone} material={m.cone} />
        </group>
      </group>

      {/* surround */}
      <group ref={setPart(3)}>
        <mesh geometry={g.surround} material={m.rubber} frustumCulled={false} />
      </group>

      {/* basket: flange, rear ring, six spokes, terminal block with two gold posts */}
      <group ref={setPart(4)}>
        <mesh geometry={g.flange} material={m.basket} />
        <mesh geometry={g.rearRing} material={m.basket} />
        <mesh geometry={g.spokes} material={m.basket} />
        <group matrixAutoUpdate={false} matrix={T.matrix}>
          <mesh position={[0, 0, 0.0175]} material={m.blackBlock}>
            <boxGeometry args={[0.17, 0.14, 0.035]} />
          </mesh>
          <mesh position={[0, 0, 0.05]} material={m.red}>
            <boxGeometry args={[0.13, 0.105, 0.03]} />
          </mesh>
          <mesh position={[-0.038, 0, 0.09]} rotation-x={Math.PI / 2} material={m.gold}>
            <cylinderGeometry args={[0.017, 0.017, 0.05, 14]} />
          </mesh>
          <mesh position={[0.038, 0, 0.09]} rotation-x={Math.PI / 2} material={m.gold}>
            <cylinderGeometry args={[0.017, 0.017, 0.05, 14]} />
          </mesh>
        </group>
      </group>

      {/* coil: former with winding, spider */}
      <group ref={setPart(5)}>
        <group ref={coilGrp}>
          <mesh geometry={g.former} material={m.former} />
          <mesh geometry={g.formerInner} material={m.black} />
          {g.helix && <mesh geometry={g.helix} material={m.copper} />}
        </group>
        <mesh geometry={g.spider} material={m.spider} frustumCulled={false} />
      </group>

      {/* magnet: top plate (chrome edge), ferrite ring with label band, back plate with centre vent */}
      <group ref={setPart(6)}>
        <mesh geometry={g.plateTop} material={m.steel} />
        <mesh geometry={g.plateEdge} material={m.chrome} />
        <mesh geometry={g.ferriteWall} material={m.magnetBand} />
        <mesh geometry={g.ferriteCaps} material={m.magnet} />
        <mesh geometry={g.pole} material={m.steel} />
        <mesh geometry={g.backPlate} material={m.steel} />
        <mesh geometry={g.backWall} material={m.steel} />
        <mesh geometry={g.vent} material={m.black} />
      </group>
    </group>
  )
})

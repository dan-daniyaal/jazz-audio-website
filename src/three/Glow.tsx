import * as THREE from 'three'
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'

/**
 * Radial-gradient textures drawn on a canvas, used as additive glow. No bloom pass anywhere:
 * 'soft' is a bright centre falling to nothing; 'ring' peaks at half the radius so it hugs a rim.
 */
export function glowTexture(kind: 'soft' | 'ring'): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  if (kind === 'soft') {
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.18, 'rgba(255,255,255,0.72)')
    grad.addColorStop(0.45, 'rgba(255,255,255,0.28)')
    grad.addColorStop(0.75, 'rgba(255,255,255,0.06)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
  } else {
    grad.addColorStop(0, 'rgba(255,255,255,0)')
    grad.addColorStop(0.3, 'rgba(255,255,255,0)')
    grad.addColorStop(0.5, 'rgba(255,255,255,1)')
    grad.addColorStop(0.62, 'rgba(255,255,255,0.4)')
    grad.addColorStop(0.8, 'rgba(255,255,255,0.09)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
  }
  g.fillStyle = grad
  g.fillRect(0, 0, 256, 256)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export interface GlowHandle {
  /** k 0..1 how far the flood has grown, color is the LED colour */
  update(k: number, color: THREE.Color): void
}

const END = [9, 13, 18, 24, 32]
const START = [2.4, 3, 3.6, 4.2, 5]

/**
 * Five soft additive discs behind the driver. They grow until they cover the frame (the dive).
 * They live in world space behind the driver, so the camera flies toward them.
 */
export const GlowDiscs = forwardRef<GlowHandle, object>(function GlowDiscs(_props, ref) {
  const tex = useMemo(() => glowTexture('soft'), [])
  const meshes = useRef<(THREE.Mesh | null)[]>([])
  const group = useRef<THREE.Group>(null!)

  useImperativeHandle(
    ref,
    () => ({
      update(k, color) {
        const g = group.current
        if (!g) return
        g.visible = k > 0.002
        if (!g.visible) return
        const e = Math.pow(k, 1.15)
        for (let i = 0; i < 5; i++) {
          const m = meshes.current[i]
          if (!m) continue
          const s = START[i] + (END[i] - START[i]) * e
          m.scale.set(s, s, 1)
          const mat = m.material as THREE.MeshBasicMaterial
          mat.color.copy(color)
          mat.opacity = Math.min(1, k * 1.6) * 0.34
        }
      },
    }),
    [],
  )

  return (
    <group ref={group} visible={false}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            meshes.current[i] = m
          }}
          position={[0, 0, -1.3 - i * 0.35]}
          renderOrder={-2}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={tex}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
})

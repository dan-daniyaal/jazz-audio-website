import * as THREE from 'three'
import type { Tier } from '../lib/device'

/** tiny seeded random so textures are identical on every load */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, srgb: boolean, repeat = false) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  draw(g)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
  t.anisotropy = 8
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
  else t.wrapS = THREE.RepeatWrapping
  return t
}

/** fine concentric lines (v runs along the radius): rows of different brightness, a few bolder grooves */
function concentricTex() {
  return canvasTex(
    4,
    2048,
    (g) => {
      // very fine lines of slightly random spacing and a narrow brightness range: satin, not striped
      const r = rng(11)
      let y = 0
      while (y < 2048) {
        const h = 1 + Math.floor(r() * 3)
        const v = 205 + Math.floor(r() * 50)
        g.fillStyle = `rgb(${v},${v},${v})`
        g.fillRect(0, y, 4, h)
        y += h
      }
    },
    false,
  )
}

/** faint radial fibres of paper cone: u runs round the cone, so vary strongly with u */
function fibreTex() {
  return canvasTex(
    1024,
    32,
    (g) => {
      const r = rng(23)
      let x = 0
      while (x < 1024) {
        const w = 1 + Math.floor(r() * 3)
        const v = 110 + Math.floor(r() * 145)
        g.fillStyle = `rgb(${v},${v},${v})`
        g.fillRect(x, 0, w, 32)
        x += w
      }
    },
    false,
  )
}

/** cast metal: blotchy noise */
function castTex() {
  return canvasTex(
    256,
    256,
    (g) => {
      const r = rng(5)
      g.fillStyle = 'rgb(150,150,150)'
      g.fillRect(0, 0, 256, 256)
      for (let k = 0; k < 2600; k++) {
        const v = 90 + Math.floor(r() * 130)
        g.fillStyle = `rgba(${v},${v},${v},0.45)`
        const s = 1 + r() * 4
        g.fillRect(r() * 256, r() * 256, s, s)
      }
    },
    false,
    true,
  )
}

/** copper winding on a dark former: ends are former, the middle is tight wire */
function coilTex(bump: boolean) {
  return canvasTex(
    8,
    256,
    (g) => {
      g.fillStyle = bump ? '#808080' : '#2a2018'
      g.fillRect(0, 0, 8, 256)
      const y0 = 26
      const y1 = 230
      for (let y = y0; y < y1; y += 1) {
        const k = (y - y0) / 6.4
        const f = 0.5 + 0.5 * Math.sin(k * Math.PI * 2)
        if (bump) {
          const v = Math.floor(70 + 170 * f)
          g.fillStyle = `rgb(${v},${v},${v})`
        } else {
          const rr = Math.floor(120 + 85 * f)
          const gg = Math.floor(66 + 50 * f)
          const bb = Math.floor(24 + 22 * f)
          g.fillStyle = `rgb(${rr},${gg},${bb})`
        }
        g.fillRect(0, y, 8, 1)
      }
    },
    !bump,
  )
}

/** paper label band round the ferrite: plain bands and a few dashes, no words */
function magnetBandTex() {
  return canvasTex(
    1024,
    128,
    (g) => {
      g.fillStyle = '#1a1a1f'
      g.fillRect(0, 0, 1024, 128)
      g.fillStyle = '#2c2c34'
      g.fillRect(0, 38, 1024, 56)
      g.fillStyle = '#44444e'
      g.fillRect(0, 38, 1024, 3)
      g.fillRect(0, 91, 1024, 3)
      g.fillStyle = '#5a5a66'
      for (let x = 20; x < 1024; x += 34) g.fillRect(x, 58, 18, 4)
      for (let x = 60; x < 1024; x += 118) g.fillRect(x, 70, 52, 3)
      g.fillStyle = '#25252c'
      g.fillRect(0, 10, 1024, 4)
      g.fillRect(0, 114, 1024, 4)
    },
    true,
  )
}

export interface SubMats {
  rubber: THREE.MeshPhysicalMaterial
  rim: THREE.MeshStandardMaterial
  cone: THREE.MeshPhysicalMaterial
  cap: THREE.MeshPhysicalMaterial
  basket: THREE.MeshStandardMaterial
  magnet: THREE.MeshStandardMaterial
  magnetBand: THREE.MeshStandardMaterial
  chrome: THREE.MeshStandardMaterial
  steel: THREE.MeshStandardMaterial
  copper: THREE.MeshStandardMaterial
  former: THREE.MeshStandardMaterial
  spider: THREE.MeshStandardMaterial
  black: THREE.MeshStandardMaterial
  gold: THREE.MeshStandardMaterial
  red: THREE.MeshStandardMaterial
  blackBlock: THREE.MeshStandardMaterial
  led: THREE.MeshBasicMaterial
  /** every material, so opacity can be applied to all of them */
  all: THREE.Material[]
}

export function makeSubMaterials(tier: Tier): SubMats {
  const low = tier === 'low'
  const concentric = concentricTex()
  const fibre = fibreTex()
  const cast = castTex()
  cast.repeat.set(3, 3)

  const rubber = new THREE.MeshPhysicalMaterial({
    color: '#17181f',
    roughness: 0.55,
    clearcoat: low ? 0 : 0.3,
    clearcoatRoughness: 0.4,
    sheen: low ? 0 : 0.35,
    sheenColor: new THREE.Color('#40466a'),
    sheenRoughness: 0.55,
    side: THREE.DoubleSide,
  })
  const rim = new THREE.MeshStandardMaterial({ color: '#15161b', roughness: 0.4, metalness: 0.55 })
  const cone = new THREE.MeshPhysicalMaterial({
    color: '#1f2027',
    vertexColors: true,
    roughness: 0.55,
    sheen: low ? 0 : 0.45,
    sheenColor: new THREE.Color('#4a5070'),
    sheenRoughness: 0.45,
    bumpMap: fibre,
    bumpScale: 1.0,
    side: THREE.DoubleSide,
  })
  const cap = new THREE.MeshPhysicalMaterial({
    color: '#8d9198',
    metalness: 0.95,
    roughness: 0.33,
    roughnessMap: concentric,
    bumpMap: concentric,
    bumpScale: 0.12,
    side: THREE.DoubleSide,
  })
  const basket = new THREE.MeshStandardMaterial({
    color: '#4a4b55',
    metalness: 0.85,
    roughness: 0.38,
    bumpMap: cast,
    bumpScale: 0.8,
  })
  const magnet = new THREE.MeshStandardMaterial({ color: '#2a2a32', roughness: 0.72, metalness: 0.15, side: THREE.DoubleSide })
  const magnetBand = new THREE.MeshStandardMaterial({ map: magnetBandTex(), color: '#ffffff', roughness: 0.82, metalness: 0.05 })
  const chrome = new THREE.MeshStandardMaterial({ color: '#b8bcc4', metalness: 1, roughness: 0.12 })
  const steel = new THREE.MeshStandardMaterial({ color: '#767982', metalness: 1, roughness: 0.38 })
  const copper = new THREE.MeshStandardMaterial({ color: '#b87333', metalness: 1, roughness: 0.3 })
  const former = new THREE.MeshStandardMaterial({
    map: coilTex(false),
    bumpMap: coilTex(true),
    bumpScale: 1.4,
    color: '#ffffff',
    metalness: 0.85,
    roughness: 0.36,
    side: THREE.DoubleSide,
  })
  const spider = new THREE.MeshStandardMaterial({ color: '#6b5a3a', roughness: 0.9, metalness: 0, side: THREE.DoubleSide })
  const black = new THREE.MeshStandardMaterial({ color: '#08080a', roughness: 0.9, metalness: 0 })
  const gold = new THREE.MeshStandardMaterial({ color: '#c9a227', metalness: 1, roughness: 0.3 })
  const red = new THREE.MeshStandardMaterial({ color: '#c0282e', roughness: 0.5, metalness: 0 })
  const blackBlock = new THREE.MeshStandardMaterial({ color: '#0e0e11', roughness: 0.6, metalness: 0 })
  const led = new THREE.MeshBasicMaterial({ color: '#2b3cff', toneMapped: false })

  const all: THREE.Material[] = [rubber, rim, cone, cap, basket, magnet, magnetBand, chrome, steel, copper, former, spider, black, gold, red, blackBlock, led]
  return { rubber, rim, cone, cap, basket, magnet, magnetBand, chrome, steel, copper, former, spider, black, gold, red, blackBlock, led, all }
}

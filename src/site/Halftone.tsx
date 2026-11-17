import { useEffect, useRef, type MutableRefObject } from 'react'

/**
 * The shop photo redrawn as a grid of square dots. Bright parts of the picture get big dots.
 * The dots swell under the cursor and ripple out from the sub with the bass.
 * Plain 2D canvas: one pass of luminance sampling per resize, two batched fills per frame.
 */
interface Props {
  src: string
  active: boolean
  /** 0..~1 bass amount, written every frame by the 3D hero */
  pump: MutableRefObject<number>
  reduced: boolean
}

export function Halftone({ src, active, pump, reduced }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)
  const live = useRef(active)
  live.current = active

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let cols = 0
    let rows = 0
    let cell = 9
    let W = 0
    let H = 0
    let lum = new Float32Array(0)
    let neon = new Uint8Array(0)
    let tint = '#ff3b46'
    let img: HTMLImageElement | null = null
    let raf = 0
    let frame = 0
    const mouse = { x: -9999, y: -9999, s: 0 }
    let narrow = false

    const sample = () => {
      if (!img || !W) return
      cols = Math.ceil(W / cell)
      rows = Math.ceil(H / cell)
      const s = document.createElement('canvas')
      s.width = cols
      s.height = rows
      const sc = s.getContext('2d', { willReadFrequently: true })
      if (!sc) return
      // cover-fit the photo into the grid
      const k = Math.max(cols / img.naturalWidth, rows / img.naturalHeight)
      const dw = img.naturalWidth * k
      const dh = img.naturalHeight * k
      sc.drawImage(img, (cols - dw) / 2, (rows - dh) / 2, dw, dh)
      let data: Uint8ClampedArray
      try {
        data = sc.getImageData(0, 0, cols, rows).data
      } catch {
        return
      }
      lum = new Float32Array(cols * rows)
      neon = new Uint8Array(cols * rows)
      for (let i = 0; i < lum.length; i++) {
        const r = data[i * 4]
        const g = data[i * 4 + 1]
        const l = (0.2126 * r + 0.7152 * g + 0.0722 * data[i * 4 + 2]) / 255
        // lift the shadows so the building reads, keep the sign the brightest thing
        lum[i] = Math.pow(l, 0.55)
        // the red neon: strongly red pixels get drawn in the theme colour
        neon[i] = r > 150 && r > g * 1.7 ? 1 : 0
      }
    }

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      const d = Math.min(window.devicePixelRatio || 1, 1.5)
      W = r.width
      H = r.height
      narrow = W < 820
      cell = narrow ? 8 : 10
      canvas.width = Math.round(W * d)
      canvas.height = Math.round(H * d)
      ctx.setTransform(d, 0, 0, d, 0, 0)
      sample()
      draw(0)
    }

    const draw = (t: number) => {
      if (!lum.length) return
      ctx.clearRect(0, 0, W, H)
      const p = pump.current
      // where the sub sits on screen
      const cx = narrow ? W * 0.5 : W * 0.7
      const cy = narrow ? H * 0.34 : H * 0.5
      const reach = Math.max(W, H) * 0.55
      const mr2 = 150 * 150
      const base = new Path2D()
      const hot = new Path2D()
      for (let j = 0; j < rows; j++) {
        const y = j * cell + cell / 2
        for (let i = 0; i < cols; i++) {
          const x = i * cell + cell / 2
          const v = lum[j * cols + i] * 0.8
          // bass swells the dots around the sub, fading with distance
          const dx = x - cx
          const dy = y - cy
          const dist = Math.hypot(dx, dy)
          const bass = p * Math.exp(-dist / reach) * (0.8 + 0.2 * Math.sin(dist * 0.045 - t * 9))
          // the cursor lights a patch
          const mx = x - mouse.x
          const my = y - mouse.y
          const m = mouse.s * Math.exp(-(mx * mx + my * my) / mr2)
          const size = Math.min(cell - 0.5, cell * (v * 0.95 + bass * 1.1 + m * 0.7))
          if (size < 0.9) continue
          const path = neon[j * cols + i] || m > 0.22 || bass > 0.2 ? hot : base
          path.rect(x - size / 2, y - size / 2, size, size)
        }
      }
      ctx.fillStyle = 'rgba(214, 214, 224, 0.5)'
      ctx.fill(base)
      ctx.fillStyle = tint
      ctx.fill(hot)
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!live.current || document.hidden) return
      if (++frame % 30 === 0) tint = getComputedStyle(document.documentElement).getPropertyValue('--red-hot').trim() || tint
      mouse.s += ((mouse.x > -999 ? 1 : 0) - mouse.s) * 0.08
      draw(now / 1000)
    }

    const move = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.x = e.clientX - r.left
      mouse.y = e.clientY - r.top
    }
    const leave = () => {
      mouse.x = mouse.y = -9999
    }

    const im = new Image()
    im.decoding = 'async'
    im.onload = () => {
      img = im
      resize()
      if (!reduced) raf = requestAnimationFrame(loop)
    }
    im.src = src

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
    }
  }, [src, pump, reduced])

  return <canvas ref={ref} className="halftone" aria-hidden="true" />
}

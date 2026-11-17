import * as THREE from 'three'

/** The shop wordmark drawn on a canvas, used as a decal on the dust cap. Redraws once the fonts have loaded. */
export function capLogoTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8

  const draw = () => {
    const g = c.getContext('2d')!
    g.clearRect(0, 0, 512, 512)
    g.textAlign = 'center'
    g.textBaseline = 'alphabetic'
    g.fillStyle = '#c4121e'
    g.font = 'italic 900 150px "Archivo Variable", sans-serif'
    g.fillText('JAZZ', 256, 270)
    g.fillStyle = '#17171c'
    g.font = '150px "Mr Dafoe", cursive'
    g.fillText('Audio', 256, 395)
    g.strokeStyle = '#f4c20d'
    g.lineWidth = 9
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(120, 420)
    g.lineTo(400, 410)
    g.stroke()
    tex.needsUpdate = true
  }
  draw()
  const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
  if (fonts) {
    Promise.all([fonts.load('italic 900 150px "Archivo Variable"'), fonts.load('150px "Mr Dafoe"')]).then(draw).catch(() => undefined)
  }
  return tex
}

# Jazz Audio Sound and Security

Prototype website for [Jazz Audio](https://www.instagram.com/jazzaudioselden/), a car audio, security, lighting and custom install shop at 1198 Middle Country Rd, Selden, NY.

The home page opens on a real-time 3D 12 inch subwoofer that thumps, then comes apart into its seven parts as you scroll and puts itself back together. Behind it, the shop's storefront photo is redrawn as a halftone dot field that reacts to the cursor and the bass. Below are services, a swipe rail of installs, a quote panel (marked "under construction"), and the visit section with live open or closed status.

## Stack

- Vite, React 19, TypeScript
- three.js with @react-three/fiber and drei for the 3D hero
- Plain CSS in one stylesheet (`src/styles/site.css`), no CSS framework

## Run it

Requires Node.js 20 or newer.

```
npm install
npm run dev        # http://localhost:5181
npm run build      # type check, then production build into dist/
npm run preview    # serve the build on http://localhost:4181
```

## Where things live

| Path | What |
| --- | --- |
| `src/site/` | Page sections: `Hero`, `Halftone`, `Sections` (services, work, quote, visit), `Top` (header, colour picker) |
| `src/three/` | The 3D subwoofer: geometry, materials, scroll-driven motion, `ExplodeHero` canvas |
| `src/data/` | All shop content: `business.ts` (name, address, phone, hours, links), `services.ts`, `work.ts`, `looks.ts`, `copy.ts` |
| `src/lib/` | Hours and open or closed logic, device tier checks, JSON-LD (`seo.ts`) |
| `public/` | Images. Photos in `public/img/temp/` are placeholders from the shop's Instagram |

## How the hero works

`Hero.tsx` makes the hero 440svh tall with a sticky 100svh stage. Scroll progress through it is smoothed into a value `p` (0 to 1). Everything in the 3D scene (spin, how far the parts spread, the bass pump) is a pure function of `p` and time, and the labels and leader lines are HTML and SVG placed every frame from the projected 3D points. A frame-rate guard drops to a still image and plain text below about 15 fps, and `prefers-reduced-motion` is respected.

## Notes

- `index.html` has `noindex`. Remove it when the shop approves the site and it goes live.
- The quote form does not send anywhere yet. It is dimmed and marked under construction.
- Colour picker (red, blue, green) is stored in `localStorage` as `ja-theme`.
- Open items marked `TODO: confirm with owner` in `src/data/` are details the shop has not confirmed.

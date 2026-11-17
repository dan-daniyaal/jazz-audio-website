import { Hero } from './site/Hero'
import { Foot, How, Quote, Services, Visit, Work } from './site/Sections'
import { MobileBar, Top } from './site/Top'
import { useRevealOnScroll } from './site/bits'

export default function App() {
  useRevealOnScroll()

  return (
    <>
      <Top />
      <main id="main">
        <Hero />
        <Services />
        <Work />
        <How />
        <Quote />
        <Visit />
      </main>
      <Foot />
      <MobileBar />
    </>
  )
}

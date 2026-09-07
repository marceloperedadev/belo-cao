
import { Header } from './components/Header/Header'
import { Hero } from './components/Hero/Hero'
import { TrustStrip } from './components/TrustStrip/TrustStrip'
import { Specialties } from './components/Specialties/Specialties'
import { About } from './components/About/About'
import { Experience } from './components/Experience/Experience'
import { Testimonial } from './components/Testimonial/Testimonial'
import { Faq } from './components/Faq/Faq'
import { Location } from './components/Location/Location'
import { Contact } from './components/Contact/Contact'
import { Footer } from './components/Footer/Footer'
import { WhatsAppFloat } from './components/WhatsAppFloat/WhatsAppFloat'

export default function Home() {
  return (
    <div className="dental-site">
      <Header />

      <main>
        <Hero />

        <TrustStrip />

        <section id="especialidades">
          <Specialties />
        </section>

        <section id="sobre">
          <About />
        </section>

        <section id="experiencia">
          <Experience />
        </section>

        <Testimonial />

        <Faq />

        <section id="localizacao">
          <Location />
        </section>

        <Contact />

        <WhatsAppFloat />
      </main>

      <Footer />
    </div>
  )
}

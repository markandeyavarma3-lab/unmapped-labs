import { site, socials } from "@/config/site";
import { WorldLayer } from "@/components/three/WorldLayer";
import { Intro } from "@/components/motion/Intro";
import { Hero } from "@/components/sections/Hero";
import { IntroSection } from "@/components/sections/IntroSection";
import { Approach } from "@/components/sections/Approach";
import { FocusAreas } from "@/components/sections/FocusAreas";
import { FieldNotes } from "@/components/sections/FieldNotes";
import { Principles } from "@/components/sections/Principles";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";
import { SheetFrame } from "@/components/ui/SheetFrame";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: site.name,
  url: site.url,
  slogan: site.tagline,
  description: site.description,
  email: site.email,
  logo: `${site.url}/icon.svg`,
  ...(socials.length ? { sameAs: socials.map((s) => s.href) } : {}),
};

export default function Home() {
  return (
    <>
      <Intro />
      <WorldLayer />
      <main id="main" tabIndex={-1} className="relative z-[var(--z-content)]">
        <Hero />
        <IntroSection />
        <Approach />

        <div data-covers-world className="surface-paper relative">
          <SheetFrame sheet="Sheet 03–04 · Survey areas & field notes" note="Scale: to be discovered" />
          <FocusAreas />
          <FieldNotes />
        </div>

        <Principles />

        <div data-covers-world className="surface-paper relative">
          <SheetFrame sheet="Sheet 06 · About" note="Status: evolving" />
          <About />
        </div>

        <Contact />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  );
}

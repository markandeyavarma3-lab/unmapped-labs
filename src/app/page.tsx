import { site, socials } from "@/config/site";
import { WorldLayer } from "@/components/three/WorldLayer";
import { Intro } from "@/components/motion/Intro";
import { TitleSequence } from "@/components/sections/TitleSequence";
import { Hero } from "@/components/sections/Hero";
import { IntroSection } from "@/components/sections/IntroSection";
import { Approach } from "@/components/sections/Approach";
import { FocusAreas } from "@/components/sections/FocusAreas";
import { FieldNotes } from "@/components/sections/FieldNotes";
import { Principles } from "@/components/sections/Principles";
import { About } from "@/components/sections/About";
import { Contact } from "@/components/sections/Contact";

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
        <TitleSequence />
        <Hero />
        <IntroSection />
        <Approach />

        <FocusAreas />
        <FieldNotes />

        <Principles />

        <About />

        <Contact />
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </>
  );
}

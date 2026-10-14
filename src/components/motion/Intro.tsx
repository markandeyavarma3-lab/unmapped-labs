import { LogoMark } from "@/components/brand/Logo";
import { site } from "@/config/site";
import { IntroSkip } from "./IntroSkip";

/**
 * Runs before first paint. Shows the intro only on a first visit to the home
 * page, never with reduced motion. Everything else renders with no delay.
 */
export const introGateScript = `(function(){try{
var d=document.documentElement,k='ul:intro-seen';d.classList.add('js');
if(location.pathname!=='/'||matchMedia('(prefers-reduced-motion: reduce)').matches||localStorage.getItem(k))return;
d.dataset.intro='on';localStorage.setItem(k,'1');
}catch(e){}})();`;

export function Intro() {
  return (
    <div
      className="intro fixed inset-0 z-[var(--z-intro)] flex flex-col items-center justify-center bg-[color:var(--color-ink)]"
      role="presentation"
    >
      <div className="relative flex flex-col items-center gap-7">
        <LogoMark className="intro-mark h-14 w-14 text-[color:var(--color-fg)]" />
        <p className="text-lg font-medium tracking-[-0.02em] text-[color:var(--color-fg)] sm:text-xl">{site.tagline}</p>
        <div className="flex w-56 items-center gap-3">
          <span className="label tabular-nums text-[color:var(--color-fg-2)]">
            <span className="intro-count" />
          </span>
          <span className="relative h-px flex-1 overflow-hidden bg-[color:var(--color-line)]">
            <span className="intro-bar absolute inset-y-0 left-0 bg-[color:var(--color-cyan)]" />
          </span>
          <span className="label text-[color:var(--color-fg-3)]">Survey</span>
        </div>
      </div>
      <IntroSkip />
    </div>
  );
}

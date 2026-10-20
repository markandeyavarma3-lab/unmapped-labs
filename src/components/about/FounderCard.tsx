import Image from "next/image";
import { founder } from "@/content/site-content";
import { Arrow } from "@/components/ui/Arrow";

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

/** Who you'll work with. Renders nothing until the founder's details are published. */
export function FounderCard({ compact = false }: { compact?: boolean }) {
  if (!founder.published || !founder.name) return null;
  return (
    <figure className={`card grid gap-6 overflow-hidden ${compact ? "sm:grid-cols-[10rem_1fr]" : "sm:grid-cols-[14rem_1fr]"}`} data-reveal="">
      {founder.photo ? (
        <div className="relative aspect-square sm:aspect-auto">
          <Image src={founder.photo} alt={`${founder.name}, ${founder.role}`} fill sizes="14rem" className="object-cover" />
        </div>
      ) : (
        // Until there's a photo: initials on the survey grid.
        <div aria-hidden className="bp-grid flex aspect-square items-center justify-center bg-[color:var(--color-ink-3)] sm:aspect-auto sm:min-h-[14rem]">
          <span className="display text-[3.5rem] text-[color:var(--color-accent)]">{initials(founder.name)}</span>
        </div>
      )}
      <figcaption className="flex flex-col justify-center gap-3 p-6 sm:pl-0">
        <p className="label text-[color:var(--color-accent)]">{founder.role}</p>
        <p className="display text-[1.8rem] leading-tight">{founder.name}</p>
        {founder.bio && <p className="max-w-[36rem] text-[15px] leading-relaxed text-[color:var(--color-fg-2)]">{founder.bio}</p>}
        {founder.linkedin && (
          <a href={founder.linkedin} target="_blank" rel="noopener noreferrer" className="label mt-1 inline-flex items-center gap-2 py-1 text-[color:var(--color-accent)]">
            LinkedIn <Arrow className="h-3.5 w-3.5" />
          </a>
        )}
      </figcaption>
    </figure>
  );
}

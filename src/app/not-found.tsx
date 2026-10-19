import Link from "next/link";
import { Page } from "@/components/motion/Page";

export default function NotFound() {
  return (
    <Page className="container-site py-[clamp(5rem,3rem+8vw,10rem)]">
      <p className="label text-[color:var(--color-accent)]">404 · Page not found</p>
      <h1 className="h-display mt-5 max-w-[16ch]">This page hasn&apos;t been mapped.</h1>
      <p className="lead mt-6 max-w-[34rem]">The page you were looking for doesn&apos;t exist, or it has moved.</p>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/" className="btn btn-primary">
          Back to the home page
        </Link>
        <Link href="/insights" className="btn btn-ghost">
          Browse insights
        </Link>
      </div>
    </Page>
  );
}

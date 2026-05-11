import Link from "next/link";

const PROJECTS = [
  { href: "/tangtherapeutics", label: "Tang Therapeutics", note: "massage & bodywork" },
  { href: "/sunshower", label: "sunshower", note: "native CA pollinator garden, in progress" },
];

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
      <nav className="flex justify-end p-6 sm:p-8">
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-full border border-black/10 bg-black/[0.03] px-4 py-2 text-sm font-medium tracking-wide hover:bg-black/[0.06] dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10">
            Projects ↓
          </summary>
          <ul className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg dark:border-white/15 dark:bg-neutral-900">
            {PROJECTS.map((p) => (
              <li key={p.href}>
                <Link
                  href={p.href}
                  className="block px-4 py-3 hover:bg-black/[0.04] dark:hover:bg-white/5"
                >
                  <div className="text-sm font-medium">{p.label}</div>
                  <div className="text-xs text-black/60 dark:text-white/60">{p.note}</div>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      </nav>

      <section className="mx-auto max-w-2xl px-6 pb-24 pt-12 sm:px-8 sm:pt-20">
        <p className="text-xs uppercase tracking-[0.2em] text-black/50 dark:text-white/50">
          Luc Tang
        </p>
        <h1 className="mt-3 text-4xl font-medium leading-tight sm:text-5xl">
          Software, bodywork, and a garden.
        </h1>
        <p className="mt-6 text-base leading-relaxed text-black/70 sm:text-lg dark:text-white/70">
          South Bay, California. I build software, practice massage, and tend a
          native pollinator garden in the foothills. This site indexes the
          projects I&apos;m actively working on — pick one from the menu above.
        </p>

        <ul className="mt-10 space-y-4">
          {PROJECTS.map((p) => (
            <li key={p.href}>
              <Link
                href={p.href}
                className="group block rounded-xl border border-black/10 p-5 transition hover:border-black/30 dark:border-white/15 dark:hover:border-white/40"
              >
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-lg font-medium">{p.label}</span>
                  <span className="text-sm text-black/50 group-hover:text-black/80 dark:text-white/50 dark:group-hover:text-white/80">
                    →
                  </span>
                </div>
                <p className="mt-1 text-sm text-black/60 dark:text-white/60">{p.note}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

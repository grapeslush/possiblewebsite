import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-12 bg-gradient-to-b from-brand-muted to-white px-6 py-16 text-center">
      <section className="max-w-3xl space-y-6">
        <span className="rounded-full bg-brand-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-brand-secondary">
          Creative Studio
        </span>
        <h1 className="text-4xl font-bold sm:text-5xl">
          Building unforgettable experiences for ambitious brands.
        </h1>
        <p className="text-lg text-neutral-600">
          Possible Website is a full-stack playground that showcases a modern toolkit: Next.js 14,
          Tailwind CSS, and shadcn/ui components styled with our signature energetic palette.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button className="w-full sm:w-auto">
            Start a project
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="outline" className="w-full sm:w-auto border-brand-primary text-brand-primary hover:bg-brand-primary/10">
            View our work
          </Button>
        </div>
      </section>
      <div className="grid w-full max-w-4xl gap-6 sm:grid-cols-3">
        {featureItems.map((feature) => (
          <article
            key={feature.title}
            className="rounded-xl border border-brand-secondary/10 bg-white/80 p-6 text-left shadow-sm backdrop-blur"
          >
            <h2 className="text-lg font-semibold text-brand-secondary">{feature.title}</h2>
            <p className="mt-2 text-sm text-neutral-600">{feature.description}</p>
          </article>
        ))}
      </div>
    </main>
  );
}

const featureItems = [
  {
    title: 'Design Systems',
    description: 'Systematic UI foundations with reusable shadcn/ui components tailored to your brand.'
  },
  {
    title: 'Modern Frontends',
    description: 'Next.js App Router experiences with edge-ready performance, accessibility, and SEO.'
  },
  {
    title: 'Robust APIs',
    description: 'Type-safe backends that keep your data flowing securely between web and mobile clients.'
  }
] as const;

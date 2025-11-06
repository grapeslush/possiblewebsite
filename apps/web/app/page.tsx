import Link from 'next/link';
import { ArrowRight, LineChart, Rocket, ShieldCheck, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-neutral-950 text-neutral-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(246,15,32,0.18)_0%,_rgba(27,32,110,0.65)_45%,_rgba(7,7,7,0.95)_100%)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-24 px-6 pb-24 pt-28 sm:px-12">
        <section className="space-y-10 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.35em] text-brand-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Possible Studio
          </div>
          <div className="grid gap-8 sm:grid-cols-5 sm:items-start sm:gap-12">
            <div className="space-y-6 sm:col-span-3">
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Modern digital products that feel effortless and perform brilliantly.
              </h1>
              <p className="text-lg text-neutral-300">
                We blend product strategy, interface design, and resilient engineering to launch
                experiences that scale with your brand. Built with Next.js 14, fully typed APIs, and
                a design system you can grow into.
              </p>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-stretch">
                <Button className="h-11 w-full sm:w-auto" asChild>
                  <Link href="/listing">
                    Start a project
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-11 w-full border-white/30 text-neutral-100 hover:bg-white/10 sm:w-auto"
                  asChild
                >
                  <Link href="/help-center">Explore our work</Link>
                </Button>
              </div>
            </div>
            <ul className="grid gap-4 rounded-2xl border border-white/10 bg-white/10 p-6 text-left sm:col-span-2">
              {stats.map((stat) => (
                <li key={stat.label} className="space-y-1">
                  <p className="text-sm uppercase tracking-[0.3em] text-white/60">{stat.label}</p>
                  <p className="text-2xl font-semibold text-white">{stat.value}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur sm:grid-cols-3">
          {featureItems.map((feature) => (
            <article
              key={feature.title}
              className="space-y-4 border-white/10 sm:border-r sm:last:border-r-0 sm:pr-6"
            >
              <feature.icon className="h-10 w-10 rounded-full bg-white/10 p-2 text-brand-primary" />
              <h2 className="text-xl font-semibold text-white">{feature.title}</h2>
              <p className="text-sm text-neutral-300">{feature.description}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-12 rounded-3xl border border-white/10 bg-white/5 p-10 backdrop-blur lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.35em] text-brand-secondary">
              <ShieldCheck className="h-4 w-4" />
              Trusted Delivery
            </p>
            <h2 className="text-3xl font-semibold text-white lg:text-4xl">
              From strategy to launch, our team leads every phase.
            </h2>
            <p className="text-neutral-300">
              Leverage a production-ready toolkit that ships with observability, accessibility, and
              security controls by default. Our workflows keep your releases dependable while
              leaving room for experimentation.
            </p>
            <div className="grid gap-6 sm:grid-cols-2">
              {processSteps.map((step) => (
                <div
                  key={step.title}
                  className="space-y-2 rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="text-sm font-semibold text-brand-primary">{step.stage}</p>
                  <h3 className="text-lg font-medium text-white">{step.title}</h3>
                  <p className="text-sm text-neutral-300">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
          <aside className="space-y-6 rounded-2xl border border-white/10 bg-neutral-950/70 p-6">
            <h3 className="text-lg font-semibold text-white">What partners say</h3>
            <div className="space-y-4">
              {testimonials.map((testimonial) => (
                <blockquote
                  key={testimonial.name}
                  className="space-y-2 rounded-xl border border-white/5 bg-white/5 p-4"
                >
                  <p className="text-sm italic text-neutral-200">“{testimonial.quote}”</p>
                  <footer className="text-xs uppercase tracking-[0.2em] text-white/60">
                    {testimonial.name} · {testimonial.role}
                  </footer>
                </blockquote>
              ))}
            </div>
          </aside>
        </section>

        <section className="rounded-3xl border border-white/10 bg-gradient-to-r from-brand-primary/90 via-brand-secondary/80 to-brand-primary/90 px-8 py-12 text-center text-white shadow-lg">
          <h2 className="text-3xl font-semibold">Ready to explore what’s possible?</h2>
          <p className="mt-3 text-base text-white/80">
            Access our knowledge base, review detailed policies, and see how our marketplace starter
            can accelerate your next launch.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              className="h-11 w-full bg-white text-brand-primary hover:bg-white/90 sm:w-auto"
              asChild
            >
              <Link href="/dashboard">Launch the dashboard</Link>
            </Button>
            <Button
              variant="outline"
              className="h-11 w-full border-white/40 text-white hover:bg-white/10 sm:w-auto"
              asChild
            >
              <Link href="/policies">Review compliance docs</Link>
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}

const featureItems = [
  {
    title: 'Design Systems',
    description:
      'Systematic UI foundations with reusable shadcn/ui components tailored to your brand.',
    icon: Sparkles,
  },
  {
    title: 'Modern Frontends',
    description:
      'Next.js App Router experiences with edge-ready performance, accessibility, and SEO.',
    icon: Rocket,
  },
  {
    title: 'Robust APIs',
    description:
      'Type-safe backends that keep your data flowing securely between web and mobile clients.',
    icon: LineChart,
  },
] as const;

const stats = [
  { label: 'Time to launch', value: '< 6 weeks' },
  { label: 'Accessibility score', value: '98 Lighthouse' },
  { label: 'Observability coverage', value: '100% core flows' },
] as const;

const processSteps = [
  {
    stage: '01 · Discover',
    title: 'Research & Alignment',
    description:
      'We synthesize user insights, business goals, and technical constraints into a roadmap everyone can trust.',
  },
  {
    stage: '02 · Design',
    title: 'System-first Interfaces',
    description:
      'Component libraries and motion principles create consistency across marketing sites, apps, and dashboards.',
  },
  {
    stage: '03 · Build',
    title: 'Type-safe Delivery',
    description:
      'Full-stack TypeScript, automated testing, and staging observability ensure each release ships confidently.',
  },
  {
    stage: '04 · Evolve',
    title: 'Growth & Optimization',
    description:
      'Experimentation pipelines, analytics reviews, and accessibility audits keep the experience sharp over time.',
  },
] as const;

const testimonials = [
  {
    name: 'Elena Martinez',
    role: 'VP Product, Nova Retail',
    quote:
      'The team translated our offline retail experience into a digital storefront that immediately boosted conversion.',
  },
  {
    name: 'Jordan Liu',
    role: 'CTO, Brightline',
    quote:
      'Observability and compliance were ready from day one, which made our security team instant advocates.',
  },
  {
    name: 'Priya Singh',
    role: 'Founder, Studio Horizon',
    quote:
      'Our design system finally feels cohesive across platforms. Iterating on new ideas is now enjoyable again.',
  },
] as const;

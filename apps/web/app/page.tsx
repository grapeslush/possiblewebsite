import { ArrowRight, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-20 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-6 py-16 text-center text-slate-100">
      <section className="max-w-4xl space-y-6">
        <span className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-secondary/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-brand-primary">
          Trusted used tackle hub
        </span>
        <h1 className="text-4xl font-bold sm:text-5xl">
          Reel in the gear you need. Pass on the tackle you do not.
        </h1>
        <p className="text-lg text-slate-300">
          Tackle Exchange matches anglers with quality pre-owned rods, reels, lures, and
          accessories. Every order is held in escrow until the gear arrives as described, so both
          sides can trade with confidence.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button className="w-full sm:w-auto">
            Shop rods & reels
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="w-full border-brand-primary text-brand-primary hover:bg-brand-primary/10 sm:w-auto"
          >
            List your tackle
          </Button>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-400">
          {categories.map((category) => (
            <span key={category} className="rounded-full border border-slate-700 px-3 py-1">
              {category}
            </span>
          ))}
        </div>
      </section>

      <div className="grid w-full max-w-5xl gap-6 text-left sm:grid-cols-3">
        {featureItems.map((feature) => (
          <article
            key={feature.title}
            className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-lg backdrop-blur"
          >
            <h2 className="text-lg font-semibold text-slate-50">{feature.title}</h2>
            <p className="mt-2 text-sm text-slate-300">{feature.description}</p>
            {feature.highlight && (
              <p className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-primary">
                <ShieldCheck className="h-4 w-4" /> {feature.highlight}
              </p>
            )}
          </article>
        ))}
      </div>

      <section className="w-full max-w-4xl space-y-8">
        <div className="space-y-3">
          <h2 className="text-3xl font-semibold text-slate-50">Anglers who trade with us</h2>
          <p className="text-base text-slate-300">
            Seasoned guides and weekend casters alike count on Tackle Exchange to keep gear moving
            without the usual risks of peer-to-peer marketplaces.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <article
              key={testimonial.name}
              className="flex h-full flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-left"
            >
              <p className="text-sm text-slate-200">“{testimonial.quote}”</p>
              <div className="mt-6 text-sm text-slate-400">
                <p className="font-semibold text-slate-100">{testimonial.name}</p>
                <p>{testimonial.role}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

const categories = [
  'Freshwater rods',
  'Saltwater reels',
  'Bait & tackle kits',
  'Kayak rigging',
  'Electronics',
];

const featureItems = [
  {
    title: 'Escrow-protected payouts',
    description:
      'Funds stay in neutral escrow until buyers confirm the condition of every rod, reel, or tackle lot on delivery.',
    highlight: '2-day inspection window',
  },
  {
    title: 'Safety-checked listings',
    description:
      'Condition checklists, photo prompts, and serial validation help sellers document gear accurately before publishing.',
    highlight: 'Verified seller program',
  },
  {
    title: 'Smart matchmaking',
    description:
      'AI-powered search surfaces compatible combos and seasonal recommendations tailored to your water and target species.',
    highlight: 'Personalized loadouts',
  },
] as const;

const testimonials = [
  {
    name: 'Harper Diaz',
    role: 'Tournament angler, Texas Gulf',
    quote:
      'Sold three saltwater setups in under a week and rolled the escrow payout into new jigging gear without worrying about chargebacks.',
  },
  {
    name: 'Mason Lee',
    role: 'Weekend bank fisher, Minnesota',
    quote:
      'The inspection checklist made it easy to understand what condition to expect. My “like-new” crankbait box arrived exactly as promised.',
  },
  {
    name: 'Asha Patel',
    role: 'Fly shop owner & verified seller',
    quote:
      'I list demo rods every season. Tackle Exchange messaging keeps conversations in one place and builds trust with new buyers.',
  },
] as const;

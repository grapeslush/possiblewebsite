import type { Metadata } from 'next';

import { Card } from '@/components/ui/card';
import { faqs } from '@/data/knowledge-base';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Quick answers to the most common questions about buying, selling, and getting paid on Tackle Exchange.',
};

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-neutral-900">Frequently asked questions</h1>
        <p className="mt-3 text-lg text-neutral-600">
          If you need step-by-step guidance tailored to anglers, explore the help center articles or
          contact the Tackle Exchange support crew anytime.
        </p>
      </header>

      <section className="mt-12 space-y-4">
        {faqs.map((entry) => (
          <Card key={entry.question} className="border border-brand-secondary/20 p-6">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between text-left text-lg font-semibold text-neutral-900">
                {entry.question}
                <span className="text-brand-secondary transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-neutral-600">{entry.answer}</p>
            </details>
          </Card>
        ))}
      </section>
    </main>
  );
}

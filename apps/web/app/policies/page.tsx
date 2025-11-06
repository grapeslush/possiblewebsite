import Link from 'next/link';
import type { Metadata } from 'next';

import { Card } from '@/components/ui/card';
import { policies } from '@/data/knowledge-base';

export const metadata: Metadata = {
  title: 'Policies',
  description:
    'Key Tackle Exchange policies covering terms of service, privacy practices, and seller responsibilities.',
};

export default function PoliciesPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <header className="text-center">
        <h1 className="text-4xl font-bold text-neutral-900">Marketplace policies</h1>
        <p className="mt-3 text-lg text-neutral-600">
          These documents outline how Tackle Exchange keeps trades fair—from acceptable listings to
          privacy standards and seller responsibilities.
        </p>
      </header>

      <section className="mt-12 space-y-4">
        {policies.map((policy) => (
          <Card key={policy.slug} className="border border-brand-secondary/20 p-6">
            <h2 className="text-xl font-semibold text-brand-secondary">{policy.title}</h2>
            <p className="mt-2 text-neutral-600">{policy.summary}</p>
            <p className="mt-2 text-sm text-neutral-500">
              Last updated {new Date(policy.lastUpdated).toLocaleDateString()}
            </p>
            <Link
              href={`/policies/${policy.slug}`}
              className="mt-4 inline-flex items-center text-sm font-semibold text-brand-primary"
            >
              Read document →
            </Link>
          </Card>
        ))}
      </section>
    </main>
  );
}

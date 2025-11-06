import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';

import { MarkdownContent } from '@/components/knowledge-base/markdown-content';
import { Card } from '@/components/ui/card';
import { policies } from '@/data/knowledge-base';

interface PolicyPageProps {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  return policies.map((policy) => ({ slug: policy.slug }));
}

export function generateMetadata({ params }: PolicyPageProps): Metadata {
  const policy = policies.find((item) => item.slug === params.slug);

  if (!policy) {
    return { title: 'Policy not found' };
  }

  return {
    title: `${policy.title} — Policies`,
    description: policy.summary,
    openGraph: {
      title: policy.title,
      description: policy.summary,
    },
  };
}

export default function PolicyPage({ params }: PolicyPageProps) {
  const policy = policies.find((item) => item.slug === params.slug);

  if (!policy) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link href="/policies" className="text-sm font-semibold text-brand-primary">
        ← Back to policies
      </Link>

      <header className="mt-6 space-y-2">
        <h1 className="text-4xl font-bold text-neutral-900">{policy.title}</h1>
        <p className="text-neutral-600">{policy.summary}</p>
        <p className="text-sm text-neutral-500">
          Last updated {new Date(policy.lastUpdated).toLocaleDateString()}
        </p>
      </header>

      <Card className="mt-10 border border-brand-secondary/20 p-8 shadow-sm">
        <MarkdownContent>{policy.body}</MarkdownContent>
      </Card>
    </main>
  );
}

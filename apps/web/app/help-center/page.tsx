import Link from 'next/link';
import type { Metadata } from 'next';

import { Card } from '@/components/ui/card';
import { helpArticles, helpCategories } from '@/data/knowledge-base';

export const metadata: Metadata = {
  title: 'Help Center',
  description: 'Step-by-step guides for buyers and sellers using the Possible Website marketplace.',
};

export default function HelpCenterPage() {
  const articlesByCategory = helpCategories.map((category) => ({
    category,
    articles: helpArticles.filter((article) => article.categoryId === category.id),
  }));

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <header className="mx-auto max-w-3xl text-center">
        <span className="rounded-full bg-brand-secondary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.4em] text-brand-secondary">
          Support hub
        </span>
        <h1 className="mt-4 text-4xl font-bold text-neutral-900">How can we help today?</h1>
        <p className="mt-3 text-lg text-neutral-600">
          Browse curated guides, policy highlights, and best practices for running your business on
          Possible Website.
        </p>
      </header>

      <section className="mt-12 grid gap-8 md:grid-cols-2">
        {articlesByCategory.map(({ category, articles }) => (
          <Card
            key={category.id}
            className="flex flex-col gap-4 border border-brand-secondary/20 p-6 shadow-sm"
          >
            <div>
              <h2 className="text-xl font-semibold text-brand-secondary">{category.title}</h2>
              <p className="mt-1 text-sm text-neutral-600">{category.description}</p>
            </div>
            <ul className="space-y-3">
              {articles.map((article) => (
                <li key={article.slug} className="group">
                  <Link
                    href={`/help-center/${article.slug}`}
                    className="flex flex-col rounded-md border border-transparent p-2 transition hover:border-brand-secondary/40 hover:bg-brand-secondary/5"
                  >
                    <span className="text-base font-medium text-neutral-900 group-hover:text-brand-primary">
                      {article.title}
                    </span>
                    <span className="text-sm text-neutral-600">{article.summary}</span>
                    <span className="mt-1 text-xs font-semibold uppercase tracking-wide text-brand-secondary">
                      {article.readingTime} · Updated{' '}
                      {new Date(article.updatedAt).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </section>
    </main>
  );
}

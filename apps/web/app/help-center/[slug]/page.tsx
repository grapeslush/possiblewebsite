import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';

import { MarkdownContent } from '@/components/knowledge-base/markdown-content';
import { Card } from '@/components/ui/card';
import { helpArticles, helpCategories } from '@/data/knowledge-base';

interface HelpArticlePageProps {
  params: {
    slug: string;
  };
}

export function generateStaticParams() {
  return helpArticles.map((article) => ({ slug: article.slug }));
}

export function generateMetadata({ params }: HelpArticlePageProps): Metadata {
  const article = helpArticles.find((item) => item.slug === params.slug);

  if (!article) {
    return {
      title: 'Help article not found',
    };
  }

  const category = helpCategories.find((item) => item.id === article.categoryId);

  return {
    title: `${article.title} — Help Center`,
    description: article.summary,
    openGraph: {
      title: article.title,
      description: article.summary,
    },
    other: category ? { 'data-help-category': category.title } : undefined,
  };
}

export default function HelpArticlePage({ params }: HelpArticlePageProps) {
  const article = helpArticles.find((item) => item.slug === params.slug);

  if (!article) {
    notFound();
  }

  const category = helpCategories.find((item) => item.id === article.categoryId);

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <Link href="/help-center" className="text-sm font-semibold text-brand-primary">
        ← Back to help center
      </Link>

      <header className="mt-6 space-y-3">
        {category ? (
          <span className="inline-flex items-center rounded-full bg-brand-secondary/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-secondary">
            {category.title}
          </span>
        ) : null}
        <h1 className="text-4xl font-bold text-neutral-900">{article.title}</h1>
        <p className="text-neutral-600">{article.summary}</p>
        <div className="text-sm font-medium text-neutral-500">
          {article.readingTime} · Updated {new Date(article.updatedAt).toLocaleDateString()}
        </div>
      </header>

      <Card className="mt-10 border border-brand-secondary/20 p-8 shadow-sm">
        <MarkdownContent>{article.body}</MarkdownContent>
      </Card>

      <aside className="mt-12 rounded-lg border border-neutral-200 bg-neutral-50 p-6">
        <h2 className="text-lg font-semibold text-neutral-900">Need more help?</h2>
        <p className="mt-2 text-sm text-neutral-600">
          Our support specialists answer most questions in under 24 hours. Include screenshots and
          order numbers when possible.
        </p>
        <div className="mt-4 flex gap-3 text-sm font-semibold text-brand-primary">
          <Link href="/faqs">Browse FAQs</Link>
          <span aria-hidden="true">·</span>
          <a href="mailto:support@possiblewebsite.test">Email support</a>
        </div>
      </aside>
    </main>
  );
}

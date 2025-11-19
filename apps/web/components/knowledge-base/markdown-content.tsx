'use client';

import React, { type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      ['target', ['_blank']],
      ['rel', ['noopener', 'noreferrer']],
    ],
    code: [...(defaultSchema.attributes?.code ?? []), ['className']],
  },
};

export function MarkdownContent({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[[rehypeSanitize, schema]]}
      components={{
        h2: (props) => <h2 className="mt-8 text-2xl font-semibold" {...props} />,
        h3: (props) => <h3 className="mt-6 text-xl font-semibold" {...props} />,
        p: (props) => <p className="mt-4 leading-7 text-neutral-700" {...props} />,
        ul: (props) => <ul className="mt-4 list-disc space-y-2 pl-6 text-neutral-700" {...props} />,
        ol: (props) => (
          <ol className="mt-4 list-decimal space-y-2 pl-6 text-neutral-700" {...props} />
        ),
        li: (props) => <li {...props} />,
        a: (props) => <a className="text-brand-primary underline" {...props} />,
        blockquote: (props) => (
          <blockquote
            className="mt-4 border-l-4 border-brand-secondary/60 bg-brand-secondary/5 p-4 text-neutral-700"
            {...props}
          />
        ),
        table: (props) => (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-sm" {...props} />
          </div>
        ),
        th: (props) => (
          <th className="bg-brand-secondary/10 px-3 py-2 text-left font-semibold" {...props} />
        ),
        td: (props) => <td className="px-3 py-2" {...props} />,
        code: ({
          inline,
          className,
          children,
          ...props
        }: ComponentPropsWithoutRef<'code'> & { inline?: boolean }) => (
          <code
            className={`rounded bg-neutral-100 px-1 py-0.5 text-sm font-mono ${inline ? 'align-baseline' : 'block'} ${className ?? ''}`.trim()}
            {...props}
          >
            {children}
          </code>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

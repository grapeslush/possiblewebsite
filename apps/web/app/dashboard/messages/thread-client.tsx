'use client';

import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { Button } from '@/components/ui/button';
import { HCaptchaField, HCaptchaFieldHandle } from '@/components/hcaptcha-field';

type Message = {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  optimistic?: boolean;
};

type OrderThread = {
  orderId: string;
  listingTitle: string;
  buyerId: string;
  sellerId: string;
  counterpartName: string;
  messages: Message[];
};

type DisputeThread = {
  disputeId: string;
  orderId: string;
  title: string;
  raisedById: string;
  assignedToId: string | null;
  counterpartName: string;
  messages: Message[];
};

type ThreadSelection = { kind: 'order'; id: string } | { kind: 'dispute'; id: string };

interface MessageCenterProps {
  currentUserId: string;
  initialOrders: OrderThread[];
  initialDisputes: DisputeThread[];
}

export function MessageCenter({
  currentUserId,
  initialOrders,
  initialDisputes,
}: MessageCenterProps) {
  const [orderThreads, setOrderThreads] = useState(initialOrders);
  const [disputeThreads, setDisputeThreads] = useState(initialDisputes);
  const [selection, setSelection] = useState<ThreadSelection>(() => {
    if (initialOrders.length > 0) {
      return { kind: 'order', id: initialOrders[0].orderId };
    }
    if (initialDisputes.length > 0) {
      return { kind: 'dispute', id: initialDisputes[0].disputeId };
    }
    throw new Error('No conversations available');
  });
  const [draft, setDraft] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
  const captchaRef = useRef<HCaptchaFieldHandle>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

  const threads = useMemo(() => {
    return [
      ...orderThreads.map((thread) => ({
        key: thread.orderId,
        label: `Order · ${thread.listingTitle}`,
        kind: 'order' as const,
        id: thread.orderId,
        counterpart: thread.counterpartName,
        updatedAt: thread.messages[thread.messages.length - 1]?.createdAt,
      })),
      ...disputeThreads.map((thread) => ({
        key: thread.disputeId,
        label: `Dispute · ${thread.title}`,
        kind: 'dispute' as const,
        id: thread.disputeId,
        counterpart: thread.counterpartName,
        updatedAt: thread.messages[thread.messages.length - 1]?.createdAt,
      })),
    ].sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    });
  }, [orderThreads, disputeThreads]);

  const currentThread =
    selection.kind === 'order'
      ? orderThreads.find((thread) => thread.orderId === selection.id)
      : disputeThreads.find((thread) => thread.disputeId === selection.id);

  const messages = currentThread?.messages ?? [];

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentThread) {
      return;
    }

    if (!draft.trim()) {
      setStatus({ type: 'error', message: 'Enter a message before sending.' });
      return;
    }

    if (!captchaToken) {
      setStatus({ type: 'error', message: 'Complete the captcha challenge to continue.' });
      return;
    }

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      body: draft,
      createdAt: new Date().toISOString(),
      author: {
        id: currentUserId,
        displayName: 'You',
        avatarUrl: null,
      },
      optimistic: true,
    };

    const draftText = draft;
    setDraft('');
    setStatus(null);
    setSending(true);

    if (selection.kind === 'order') {
      setOrderThreads((prev) =>
        prev.map((thread) =>
          thread.orderId === currentThread.orderId
            ? { ...thread, messages: [...thread.messages, optimisticMessage] }
            : thread,
        ),
      );
    } else {
      setDisputeThreads((prev) =>
        prev.map((thread) =>
          thread.disputeId === (currentThread as DisputeThread).disputeId
            ? { ...thread, messages: [...thread.messages, optimisticMessage] }
            : thread,
        ),
      );
    }

    const endpoint =
      selection.kind === 'order'
        ? `${apiBase}/api/orders/${(currentThread as OrderThread).orderId}/messages`
        : `${apiBase}/api/disputes/${(currentThread as DisputeThread).disputeId}/messages`;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorId: currentUserId,
          body: draftText,
          captchaToken,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to send message' }));
        throw new Error(
          typeof error === 'string' ? error : (error.error ?? 'Failed to send message'),
        );
      }

      const saved: Message = await response.json();

      if (selection.kind === 'order') {
        setOrderThreads((prev) =>
          prev.map((thread) =>
            thread.orderId === (currentThread as OrderThread).orderId
              ? {
                  ...thread,
                  messages: thread.messages.map((message) =>
                    message.id === optimisticId ? saved : message,
                  ),
                }
              : thread,
          ),
        );
      } else {
        setDisputeThreads((prev) =>
          prev.map((thread) =>
            thread.disputeId === (currentThread as DisputeThread).disputeId
              ? {
                  ...thread,
                  messages: thread.messages.map((message) =>
                    message.id === optimisticId ? saved : message,
                  ),
                }
              : thread,
          ),
        );
      }

      setStatus({ type: 'success', message: 'Message sent' });
      setCaptchaToken(null);
      captchaRef.current?.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      setStatus({ type: 'error', message });

      if (selection.kind === 'order') {
        setOrderThreads((prev) =>
          prev.map((thread) =>
            thread.orderId === (currentThread as OrderThread).orderId
              ? {
                  ...thread,
                  messages: thread.messages.filter((message) => message.id !== optimisticId),
                }
              : thread,
          ),
        );
      } else {
        setDisputeThreads((prev) =>
          prev.map((thread) =>
            thread.disputeId === (currentThread as DisputeThread).disputeId
              ? {
                  ...thread,
                  messages: thread.messages.filter((message) => message.id !== optimisticId),
                }
              : thread,
          ),
        );
      }

      setDraft(draftText);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-8 grid gap-6 md:grid-cols-[260px_1fr]">
      <aside className="rounded-lg border bg-white shadow-sm">
        <ul className="divide-y">
          {threads.map((thread) => (
            <li key={thread.key}>
              <button
                type="button"
                className={clsx(
                  'flex w-full flex-col gap-1 px-4 py-3 text-left transition',
                  selection.kind === thread.kind && selection.id === thread.id
                    ? 'bg-brand-primary/10 text-brand-secondary'
                    : 'hover:bg-muted/60',
                )}
                onClick={() => setSelection({ kind: thread.kind, id: thread.id })}
              >
                <span className="text-sm font-semibold">{thread.label}</span>
                <span className="text-xs text-muted-foreground">With {thread.counterpart}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        {currentThread ? (
          <div className="flex h-full flex-col">
            <header className="mb-4 border-b pb-4">
              <h2 className="text-xl font-semibold text-brand-secondary">
                {selection.kind === 'order'
                  ? `Conversation about ${(currentThread as OrderThread).listingTitle}`
                  : `Dispute ${(currentThread as DisputeThread).title}`}
              </h2>
              <p className="text-sm text-muted-foreground">
                Messages are shared instantly with optimistic updates for the other party.
              </p>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No messages yet. Start the conversation below.
                </p>
              ) : (
                messages.map((message) => (
                  <article
                    key={message.id}
                    className={clsx(
                      'max-w-lg rounded-lg border px-4 py-3 text-sm shadow-sm',
                      message.author.id === currentUserId
                        ? 'ml-auto border-brand-primary/40 bg-brand-primary/5'
                        : 'border-muted/80 bg-white',
                      message.optimistic ? 'opacity-70' : 'opacity-100',
                    )}
                  >
                    <header className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{message.author.displayName ?? 'Marketplace user'}</span>
                      <time>{new Date(message.createdAt).toLocaleString()}</time>
                    </header>
                    <p className="mt-2 whitespace-pre-line text-brand-secondary">{message.body}</p>
                  </article>
                ))
              )}
            </div>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <textarea
                className="w-full rounded-md border border-muted/60 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-primary focus:outline-none"
                rows={4}
                placeholder="Type your message"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={sending}
              />
              <HCaptchaField onVerify={setCaptchaToken} ref={captchaRef} />
              {status ? (
                <p
                  className={clsx(
                    'text-sm',
                    status.type === 'error' ? 'text-red-600' : 'text-green-600',
                  )}
                >
                  {status.message}
                </p>
              ) : null}
              <div className="flex justify-end">
                <Button type="submit" disabled={sending}>
                  {sending ? 'Sending…' : 'Send message'}
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Select a conversation to get started.</p>
        )}
      </section>
    </div>
  );
}

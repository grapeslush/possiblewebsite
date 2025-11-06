'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { HCaptchaField, HCaptchaFieldHandle } from '@/components/hcaptcha-field';

interface ReviewFormProps {
  currentUserId: string;
  orders: Array<{
    id: string;
    listingTitle: string;
    buyerId: string;
    sellerId: string;
    sellerName: string;
  }>;
}

export function ReviewForm({ currentUserId, orders }: ReviewFormProps) {
  const [orderId, setOrderId] = useState(orders[0]?.id ?? '');
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const captchaRef = useRef<HCaptchaFieldHandle>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!orderId) {
      setStatus({ type: 'error', message: 'Select an order to review.' });
      return;
    }

    if (!body.trim()) {
      setStatus({ type: 'error', message: 'Share a few details about your experience.' });
      return;
    }

    if (!captchaToken) {
      setStatus({ type: 'error', message: 'Complete the captcha challenge to continue.' });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    const order = orders.find((item) => item.id === orderId);

    try {
      const response = await fetch(`${apiBase}/api/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          authorId: currentUserId,
          targetUserId: order?.sellerId,
          rating,
          body,
          captchaToken,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof payload === 'string' ? payload : (payload.error ?? 'Unable to submit review');
        throw new Error(message);
      }

      if (response.status === 202) {
        setStatus({
          type: 'error',
          message: 'Your review was blocked by moderation. Please revise and try again.',
        });
      } else if (payload.status === 'UNDER_REVIEW') {
        setStatus({
          type: 'success',
          message: 'Thanks! Your review is queued for moderator approval.',
        });
      } else {
        setStatus({
          type: 'success',
          message: 'Review submitted. We will notify you once it is published.',
        });
      }

      setBody('');
      setCaptchaToken(null);
      captchaRef.current?.reset();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to submit review';
      setStatus({ type: 'error', message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 space-y-6 rounded-lg border bg-white p-6 shadow-sm"
    >
      <div>
        <label className="text-sm font-medium text-brand-secondary" htmlFor="orderId">
          Order
        </label>
        <select
          id="orderId"
          className="mt-2 w-full rounded-md border border-muted/60 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-primary focus:outline-none"
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
          disabled={submitting}
        >
          {orders.map((order) => (
            <option key={order.id} value={order.id}>
              {order.listingTitle} · {order.sellerName}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary" htmlFor="rating">
          Rating
        </label>
        <input
          id="rating"
          type="number"
          min={1}
          max={5}
          value={rating}
          onChange={(event) => setRating(Number(event.target.value))}
          className="mt-2 w-full rounded-md border border-muted/60 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-primary focus:outline-none"
          disabled={submitting}
        />
      </div>
      <div>
        <label className="text-sm font-medium text-brand-secondary" htmlFor="body">
          Review
        </label>
        <textarea
          id="body"
          rows={5}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="mt-2 w-full rounded-md border border-muted/60 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-primary focus:outline-none"
          placeholder="Tell other buyers about the product quality, shipping, and communication."
          disabled={submitting}
        />
      </div>
      <HCaptchaField onVerify={setCaptchaToken} ref={captchaRef} />
      {status ? (
        <p className={`text-sm ${status.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
          {status.message}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit review'}
        </Button>
      </div>
    </form>
  );
}

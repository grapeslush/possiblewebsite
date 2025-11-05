'use client';

import { useState, useEffect } from 'react';
import { getCsrfHeaderName } from '@/lib/auth/csrf';

export default function ConnectOnboardingButton() {
  const [csrfToken, setCsrfToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/auth/csrf');
      if (!response.ok) return;
      const data = await response.json();
      setCsrfToken(data.csrfToken);
    };
    load();
  }, []);

  const startOnboarding = async () => {
    setError(null);
    setLoading(true);

    const response = await fetch('/api/stripe/connect/onboarding', {
      method: 'POST',
      headers: { [getCsrfHeaderName()]: csrfToken }
    });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? 'Unable to start onboarding');
      return;
    }

    const data = await response.json();
    window.location.href = data.url;
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Stripe Connect Express handles account verification and payout management securely.
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={startOnboarding}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        disabled={loading || !csrfToken}
      >
        {loading ? 'Redirecting…' : 'Start Stripe onboarding'}
      </button>
    </div>
  );
}

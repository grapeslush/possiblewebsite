'use client';

import { useEffect, useState } from 'react';
import { getCsrfHeaderName } from '@/lib/auth/csrf';

export default function SecurityForm() {
  const [csrfToken, setCsrfToken] = useState('');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadToken = async () => {
      const response = await fetch('/api/auth/csrf');
      if (!response.ok) return;
      const data = await response.json();
      setCsrfToken(data.csrfToken);
    };

    loadToken();
  }, []);

  const startEnrollment = async () => {
    setError(null);
    setMessage(null);

    const response = await fetch('/api/auth/mfa/setup', {
      method: 'POST',
      headers: { [getCsrfHeaderName()]: csrfToken }
    });

    if (!response.ok) {
      setError('Unable to start MFA enrollment');
      return;
    }

    const data = await response.json();
    setDeviceId(data.deviceId);
    setOtpauthUrl(data.otpauthUrl);
  };

  const verifyEnrollment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!deviceId) {
      setError('Start enrollment first.');
      return;
    }

    const form = new FormData(event.currentTarget);
    const token = form.get('token');

    const response = await fetch('/api/auth/mfa/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [getCsrfHeaderName()]: csrfToken
      },
      body: JSON.stringify({ deviceId, token })
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? 'Unable to verify code');
      return;
    }

    setMessage('Multi-factor authentication enabled successfully.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Authenticator app</h2>
        <p className="text-sm text-muted-foreground">
          Scan the configuration link with your preferred authenticator app and confirm with a code.
        </p>
      </div>
      <button
        type="button"
        onClick={startEnrollment}
        className="rounded bg-black px-4 py-2 text-white disabled:opacity-60"
        disabled={!csrfToken}
      >
        Start enrollment
      </button>
      {otpauthUrl && (
        <div className="rounded bg-gray-100 p-4 text-sm">
          <p className="font-medium">Setup link</p>
          <p className="break-all text-xs">{otpauthUrl}</p>
        </div>
      )}
      <form className="space-y-4" onSubmit={verifyEnrollment}>
        <div>
          <label className="block text-sm font-medium">Authenticator code</label>
          <input className="mt-1 w-full rounded border px-3 py-2" name="token" required placeholder="123456" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-600">{message}</p>}
        <button type="submit" className="rounded border px-4 py-2">
          Confirm code
        </button>
      </form>
    </div>
  );
}

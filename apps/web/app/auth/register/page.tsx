'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCsrfHeaderName } from '@/lib/auth/csrf';

type Policy = { policy: string; version: string };

interface RegisterResponse {
  csrfToken: string;
  policies: Policy[];
}

export default function RegisterPage() {
  const router = useRouter();
  const [csrfToken, setCsrfToken] = useState('');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const response = await fetch('/api/auth/register');
      if (!response.ok) return;
      const data = (await response.json()) as RegisterResponse;
      setCsrfToken(data.csrfToken);
      setPolicies(data.policies);
    };
    load();
  }, []);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const acceptPolicies = policies.map((policy) => ({
      policy: policy.policy,
      version: policy.version,
    }));

    const payload = {
      email: form.get('email'),
      password: form.get('password'),
      displayName: form.get('displayName'),
      dateOfBirth: form.get('dateOfBirth'),
      marketingOptIn: form.get('marketingOptIn') === 'on',
      acceptPolicies,
    };

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        [getCsrfHeaderName()]: csrfToken,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      router.push('/auth/login?registered=1');
      return;
    }

    const data = await response.json().catch(() => ({}));
    setError(data.error ?? 'Unable to register');
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="text-2xl font-semibold mb-4">Create your account</h1>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            name="email"
            type="email"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Display name</label>
          <input className="mt-1 w-full rounded border px-3 py-2" name="displayName" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Date of birth</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            name="dateOfBirth"
            type="date"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Password</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            name="password"
            type="password"
            required
          />
        </div>
        <div className="flex items-center space-x-2">
          <input
            id="marketingOptIn"
            name="marketingOptIn"
            type="checkbox"
            className="h-4 w-4 rounded border"
          />
          <label htmlFor="marketingOptIn" className="text-sm">
            Receive Tackle Exchange updates and announcements
          </label>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Required policies</p>
          {policies.map((policy) => (
            <div key={`${policy.policy}-${policy.version}`} className="flex items-center space-x-2">
              <input type="checkbox" checked readOnly className="h-4 w-4" />
              <span className="text-sm">
                I agree to the {policy.policy.replace(/-/g, ' ')} (version {policy.version})
              </span>
            </div>
          ))}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </div>
  );
}

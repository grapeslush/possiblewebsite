'use client';

import { Suspense, useState } from 'react';
import type { Route } from 'next';
import { useSearchParams, useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const result = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      totp: form.get('totp'),
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }

    const callbackUrl = searchParams?.get('callbackUrl');
    const destination = callbackUrl && callbackUrl.startsWith('/') ? callbackUrl : '/dashboard';

    router.push(destination as Route);
  };

  const registered = searchParams?.has('registered');

  return (
    <div className="mx-auto max-w-md py-12">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      {registered && (
        <p className="mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Account created! Please verify your email before signing in.
        </p>
      )}
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
          <label className="block text-sm font-medium">Password</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            name="password"
            type="password"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Authenticator code</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            name="totp"
            type="text"
            placeholder="123456"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded bg-black px-4 py-2 text-white disabled:opacity-60"
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={<div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>}
    >
      <LoginForm />
    </Suspense>
  );
}

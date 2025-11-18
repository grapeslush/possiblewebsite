'use client';

import { FormEvent, useCallback, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Mail,
  RefreshCcw,
  ShieldCheck,
  Server,
  ServerCog,
  UserCog,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SetupRun {
  ranAt: string;
  status: 'succeeded' | 'failed';
  message?: string;
}

interface SetupStatus {
  ready: boolean;
  missingKeys: string[];
  databaseConnected: boolean;
  configPath: string;
  mailConfigured: boolean;
  objectStorageConfigured: boolean;
  migrations: {
    applied: boolean;
    lastFinishedAt: string | null;
    lastRun?: SetupRun;
  };
  seed: {
    seeded: boolean;
    summary: string | null;
    lastRun?: SetupRun;
  };
}

const defaultStatus: SetupStatus = {
  ready: false,
  missingKeys: [],
  databaseConnected: false,
  configPath: '/var/lib/possible/config.env',
  mailConfigured: false,
  objectStorageConfigured: false,
  migrations: { applied: false, lastFinishedAt: null },
  seed: { seeded: false, summary: null },
};

type Feedback = { type: 'success' | 'error'; message: string } | null;

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
        ok ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {ok ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />} {label}
    </span>
  );
}

export default function SetupClient({
  apiBase,
  initialStatus,
}: {
  apiBase: string;
  initialStatus?: SetupStatus;
}) {
  const [status, setStatus] = useState<SetupStatus>(initialStatus ?? defaultStatus);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    setLoading('refresh');
    try {
      const response = await fetch(`${apiBase}/api/setup/status`, { cache: 'no-store' });
      const payload = await response.json();
      setStatus(payload);
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: 'Unable to refresh status. Is the API reachable?' });
    } finally {
      setLoading(null);
    }
  }, [apiBase]);

  const submitForm = useCallback(
    async (event: FormEvent<HTMLFormElement>, endpoint: string) => {
      event.preventDefault();
      setFeedback(null);
      setLoading(endpoint);
      const formData = new FormData(event.currentTarget);
      const payload: Record<string, string> = {};
      formData.forEach((value, key) => {
        if (typeof value === 'string' && value.trim()) {
          payload[key] = value.trim();
        }
      });

      try {
        const response = await fetch(`${apiBase}${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(
            error.error ? JSON.stringify(error.error) : 'Unable to save configuration',
          );
        }

        setFeedback({
          type: 'success',
          message: 'Saved. Runtime reload will pick this up automatically.',
        });
        await refreshStatus();
        event.currentTarget.reset();
      } catch (error) {
        console.error(error);
        setFeedback({ type: 'error', message: (error as Error).message });
      } finally {
        setLoading(null);
      }
    },
    [apiBase, refreshStatus],
  );

  const runOperation = useCallback(
    async (endpoint: string, successMessage: string) => {
      setFeedback(null);
      setLoading(endpoint);
      try {
        const response = await fetch(`${apiBase}${endpoint}`, { method: 'POST' });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? 'Operation failed');
        }

        setFeedback({ type: 'success', message: successMessage });
        await refreshStatus();
      } catch (error) {
        console.error(error);
        setFeedback({ type: 'error', message: (error as Error).message });
      } finally {
        setLoading(null);
      }
    },
    [apiBase, refreshStatus],
  );

  const missingCopy = useMemo(() => {
    if (!status.missingKeys.length) return 'All required configuration values are present.';
    return `Missing: ${status.missingKeys.join(', ')}`;
  }, [status.missingKeys]);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-3 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-wide text-brand-primary">
            <ShieldCheck className="h-5 w-5" /> First-run setup
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            Connect services and unlock the dashboard
          </h1>
          <p className="text-base text-slate-600">
            Provide your database, object storage, and mail credentials. We will persist them to{' '}
            {status.configPath} so restarts pick them up, then create an administrator account once
            data is ready.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              ok={status.databaseConnected}
              label={status.databaseConnected ? 'Database reachable' : 'DB blocked'}
            />
            <StatusPill ok={status.objectStorageConfigured} label="Object storage" />
            <StatusPill ok={status.mailConfigured} label="Mail" />
            <StatusPill
              ok={status.seed.seeded}
              label={status.seed.seeded ? 'Seed data detected' : 'Seed pending'}
            />
          </div>
          <p className="text-sm text-slate-500">{missingCopy}</p>
          {feedback && (
            <div
              className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                feedback.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle className="mt-0.5 h-4 w-4" />
              ) : (
                <AlertCircle className="mt-0.5 h-4 w-4" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-slate-900">
                <Server className="h-5 w-5 text-brand-primary" />
                <CardTitle>Database and cache</CardTitle>
              </div>
              <CardDescription>
                Provide a Postgres connection string and optional Redis URL so migrations and queues
                can run.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => submitForm(event, '/api/setup/database')}
              >
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  <span>Postgres connection URL</span>
                  <input
                    name="databaseUrl"
                    required
                    placeholder="postgresql://user:pass@host:5432/database?schema=public"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                  />
                </label>
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  <span>Redis URL (optional)</span>
                  <input
                    name="redisUrl"
                    placeholder="redis://localhost:6379"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                  />
                </label>
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  <span>NextAuth secret (optional)</span>
                  <input
                    name="nextAuthSecret"
                    placeholder="generated secret for JWT encryption"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                  />
                </label>
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading === '/api/setup/database'}>
                    {loading === '/api/setup/database' && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save database
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-slate-900">
                <ServerCog className="h-5 w-5 text-brand-primary" />
                <CardTitle>Object storage</CardTitle>
              </div>
              <CardDescription>
                Configure S3-compatible storage for uploads and media rendering.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => submitForm(event, '/api/setup/storage')}
              >
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  <span>Endpoint</span>
                  <input
                    name="endpoint"
                    required
                    placeholder="https://s3.your-cloud.com"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                  />
                </label>
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  <span>Bucket name</span>
                  <input
                    name="bucket"
                    required
                    placeholder="possible-uploads"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                  />
                </label>
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  <span>Region</span>
                  <input
                    name="region"
                    required
                    placeholder="us-east-1"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                  />
                </label>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block space-y-1 text-sm font-medium text-slate-700">
                    <span>Access key</span>
                    <input
                      name="accessKey"
                      required
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                    />
                  </label>
                  <label className="block space-y-1 text-sm font-medium text-slate-700">
                    <span>Secret key</span>
                    <input
                      name="secretKey"
                      required
                      type="password"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                    />
                  </label>
                </div>
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  <span>Public CDN base (optional)</span>
                  <input
                    name="publicUrl"
                    placeholder="https://cdn.your-cloud.com/uploads"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                  />
                </label>
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading === '/api/setup/storage'}>
                    {loading === '/api/setup/storage' && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save storage
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-slate-900">
                <Mail className="h-5 w-5 text-brand-primary" />
                <CardTitle>Mail provider</CardTitle>
              </div>
              <CardDescription>
                We support Postmark or SendGrid API keys. Choose the provider that matches your
                templates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => submitForm(event, '/api/setup/mail')}
              >
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  <span>Provider</span>
                  <select
                    name="provider"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                  >
                    <option value="postmark">Postmark</option>
                    <option value="sendgrid">SendGrid</option>
                  </select>
                </label>
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  <span>API key</span>
                  <input
                    name="apiKey"
                    required
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                  />
                </label>
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  <span>From email</span>
                  <input
                    name="fromEmail"
                    required
                    type="email"
                    placeholder="notifications@yourdomain.com"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                  />
                </label>
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading === '/api/setup/mail'}>
                    {loading === '/api/setup/mail' && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save mail
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-slate-900">
                <UserCog className="h-5 w-5 text-brand-primary" />
                <CardTitle>Administrator account</CardTitle>
              </div>
              <CardDescription>
                Seed and migrations should be complete first so your account can log in immediately.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(event) => submitForm(event, '/api/setup/admin')}
              >
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  <span>Display name</span>
                  <input
                    name="displayName"
                    required
                    placeholder="Operations Admin"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                  />
                </label>
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  <span>Email</span>
                  <input
                    name="email"
                    required
                    type="email"
                    placeholder="admin@example.com"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                  />
                </label>
                <label className="block space-y-1 text-sm font-medium text-slate-700">
                  <span>Password</span>
                  <input
                    name="password"
                    required
                    type="password"
                    placeholder="Use at least 12 characters"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-primary focus:outline-none"
                  />
                </label>
                <div className="flex justify-end">
                  <Button type="submit" disabled={loading === '/api/setup/admin'}>
                    {loading === '/api/setup/admin' && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create admin
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2 text-slate-900">
                <RefreshCcw className="h-5 w-5 text-brand-primary" />
                <CardTitle>Migrations and seed status</CardTitle>
              </div>
              <CardDescription>
                Run these after saving credentials. We will keep a timestamp and status so you know
                when each step finished.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Prisma migrations</p>
                  <p className="text-sm text-slate-600">
                    {status.migrations.applied
                      ? `Applied${status.migrations.lastFinishedAt ? ` on ${new Date(status.migrations.lastFinishedAt).toLocaleString()}` : ''}`
                      : 'Pending'}
                  </p>
                  {status.migrations.lastRun && (
                    <p className="text-xs text-slate-500">
                      Last attempt {new Date(status.migrations.lastRun.ranAt).toLocaleString()} ·{' '}
                      {status.migrations.lastRun.status}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => runOperation('/api/setup/migrations', 'Migrations finished')}
                  disabled={loading === '/api/setup/migrations'}
                >
                  {loading === '/api/setup/migrations' && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Run migrations
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Seed demo data</p>
                  <p className="text-sm text-slate-600">
                    {status.seed.seeded
                      ? status.seed.summary
                        ? `Detected (${status.seed.summary})`
                        : 'Detected'
                      : 'Not detected yet'}
                  </p>
                  {status.seed.lastRun && (
                    <p className="text-xs text-slate-500">
                      Last attempt {new Date(status.seed.lastRun.ranAt).toLocaleString()} ·{' '}
                      {status.seed.lastRun.status}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => runOperation('/api/setup/seed', 'Seed completed')}
                  disabled={loading === '/api/setup/seed'}
                >
                  {loading === '/api/setup/seed' && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Run seed
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What to expect</CardTitle>
              <CardDescription>
                We will restart API processes automatically in production after saving values.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              <p>
                Use strong credentials and dedicated buckets for this environment. Secrets are
                written to {status.configPath} so future deployments can source them automatically.
              </p>
              <p>
                After migrations and seeds succeed, sign in with the admin account you created. You
                should see listings, orders, and support workflows populated from the seed script.
              </p>
              <p>
                If anything fails, rerun the step. Logs above will show the last error message
                returned by the API.
              </p>
            </CardContent>
          </Card>
        </section>

        <div className="flex items-center justify-end gap-2 text-sm text-slate-500">
          <Button variant="outline" onClick={refreshStatus} disabled={loading === 'refresh'}>
            {loading === 'refresh' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="mr-2 h-4 w-4" />
            )}
            Refresh status
          </Button>
        </div>
      </div>
    </main>
  );
}

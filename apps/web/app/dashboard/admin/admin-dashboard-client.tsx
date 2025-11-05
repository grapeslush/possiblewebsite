'use client';

import { useMemo, useState, useTransition } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  role: string;
  risk: string;
  totalGmv: string;
}

interface AdminListingSummary {
  id: string;
  title: string;
  seller: string;
  reason: string;
}

interface AdminDisputeSummary {
  id: string;
  order: string;
  buyer: string;
  seller: string;
  summary: string;
  priority: string;
}

interface AdminFinancialSnapshot {
  label: string;
  value: string;
}

interface AdminWebhookEvent {
  id: string;
  event: string;
  status: string;
  deliveredAt: string;
}

interface AdminFeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface AdminDashboardClientProps {
  users: AdminUserSummary[];
  listings: AdminListingSummary[];
  disputes: AdminDisputeSummary[];
  financialSnapshots: AdminFinancialSnapshot[];
  webhookEvents: AdminWebhookEvent[];
  featureFlags: AdminFeatureFlag[];
}

const tabs = [
  { id: 'users', label: 'User search' },
  { id: 'listings', label: 'Moderation queue' },
  { id: 'disputes', label: 'Disputes triage' },
  { id: 'financials', label: 'Financial reports' },
  { id: 'webhooks', label: 'Webhooks' },
  { id: 'flags', label: 'Feature flags' },
] as const;

type TabId = (typeof tabs)[number]['id'];

type ModerationState = Record<
  string,
  {
    decision: 'approve' | 'reject';
    rationale: string;
  }
>;

type DisputeAssignments = Record<
  string,
  {
    assignedTo: string | null;
    resolved: boolean;
  }
>;

type FeatureFlagState = Record<string, boolean>;

const adminFetch = async (endpoint: string, payload: Record<string, unknown>) => {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error((errorBody as { error?: string }).error ?? 'Request failed');
  }

  return response.json().catch(() => ({}));
};

export default function AdminDashboardClient({
  users,
  listings,
  disputes,
  financialSnapshots,
  webhookEvents,
  featureFlags,
}: AdminDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('users');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [impersonationTarget, setImpersonationTarget] = useState<AdminUserSummary | null>(null);
  const [impersonationReason, setImpersonationReason] = useState('');
  const [moderationState, setModerationState] = useState<ModerationState>({});
  const [disputeAssignments, setDisputeAssignments] = useState<DisputeAssignments>({});
  const [flagState, setFlagState] = useState<FeatureFlagState>(
    featureFlags.reduce<FeatureFlagState>(
      (acc, flag) => ({ ...acc, [flag.key]: flag.enabled }),
      {},
    ),
  );
  const [webhookFilter, setWebhookFilter] = useState<'all' | 'failed'>('all');
  const [isPending, startTransition] = useTransition();

  const filteredUsers = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter((user) =>
      [user.name, user.email, user.role, user.risk].some((value) =>
        value.toLowerCase().includes(normalized),
      ),
    );
  }, [search, users]);

  const filteredWebhooks = useMemo(() => {
    if (webhookFilter === 'all') return webhookEvents;
    return webhookEvents.filter((event) => event.status !== 'success');
  }, [webhookFilter, webhookEvents]);

  const resetBanners = () => {
    setMessage(null);
    setError(null);
  };

  const handleAdminAction = (action: () => Promise<void>) => {
    resetBanners();
    startTransition(async () => {
      try {
        await action();
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Unexpected error';
        setError(reason);
      }
    });
  };

  const confirmImpersonation = () => {
    if (!impersonationTarget) return;

    if (impersonationTarget.role === 'ADMIN') {
      setError('Impersonating fellow administrators requires CISO approval.');
      return;
    }

    if (impersonationReason.trim().length < 10) {
      setError('Provide a detailed reason (at least 10 characters).');
      return;
    }

    handleAdminAction(async () => {
      await adminFetch('/api/admin/impersonate', {
        targetUserId: impersonationTarget.id,
        reason: impersonationReason.trim(),
        targetRole: impersonationTarget.role,
      });
      setMessage(`Impersonation session initialised for ${impersonationTarget.name}.`);
      setImpersonationTarget(null);
      setImpersonationReason('');
    });
  };

  const submitModeration = (listingId: string) => {
    const state = moderationState[listingId];
    if (!state?.rationale || state.rationale.trim().length < 12) {
      setError('Provide moderation rationale (12+ characters).');
      return;
    }

    handleAdminAction(async () => {
      await adminFetch('/api/admin/listings/moderate', {
        listingId,
        decision: state.decision,
        rationale: state.rationale.trim(),
      });
      setMessage(`Moderation event captured for ${listingId}.`);
      setModerationState((current) => ({
        ...current,
        [listingId]: { ...state, rationale: '' },
      }));
    });
  };

  const updateDispute = (disputeId: string, action: 'ASSIGN' | 'RESOLVE') => {
    handleAdminAction(async () => {
      await adminFetch('/api/admin/disputes/update', {
        disputeId,
        action,
      });
      setDisputeAssignments((current) => ({
        ...current,
        [disputeId]: {
          assignedTo: 'You',
          resolved: action === 'RESOLVE',
        },
      }));
      setMessage(`Dispute ${disputeId} updated.`);
    });
  };

  const exportFinancialSnapshot = () => {
    handleAdminAction(async () => {
      await adminFetch('/api/admin/financial-reports/export', { format: 'csv' });
      setMessage('Financial snapshot export queued. Check your email in a few minutes.');
    });
  };

  const replayWebhook = (eventId: string) => {
    handleAdminAction(async () => {
      await adminFetch('/api/admin/webhooks/replay', { eventId });
      setMessage(`Webhook ${eventId} scheduled for replay.`);
    });
  };

  const toggleFeatureFlag = (flag: AdminFeatureFlag, enabled: boolean) => {
    setFlagState((current) => ({ ...current, [flag.key]: enabled }));
    handleAdminAction(async () => {
      await adminFetch('/api/admin/feature-flags', { key: flag.key, enabled });
      setMessage(`${flag.name} ${enabled ? 'enabled' : 'disabled'} successfully.`);
    });
  };

  return (
    <div className="space-y-8" data-testid="admin-dashboard">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Admin control center</h1>
        <p className="text-sm text-slate-600">
          Search users, moderate listings, triage disputes, and audit sensitive configuration
          changes with full RBAC and logging.
        </p>
      </header>

      <nav className="flex flex-wrap items-center gap-3" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-brand-secondary bg-brand-secondary text-white'
                : 'border-slate-300 text-slate-600 hover:border-brand-secondary hover:text-brand-secondary'
            }`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {message && (
        <div
          className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          data-testid="admin-toast"
        >
          {message}
        </div>
      )}
      {error && (
        <div
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
          data-testid="admin-error"
        >
          {error}
        </div>
      )}

      {activeTab === 'users' && (
        <section className="space-y-4" data-testid="admin-users">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="search"
              placeholder="Search by name, email, role, or risk"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full max-w-md rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-brand-secondary focus:outline-none"
              data-testid="admin-user-search"
            />
            <span className="text-xs text-slate-500">{filteredUsers.length} results</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {filteredUsers.map((user) => (
              <Card key={user.id}>
                <CardHeader className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">
                      {user.name}
                    </CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {user.role}
                  </span>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Risk level</span>
                    <span className="font-medium text-slate-900">{user.risk}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Lifetime GMV</span>
                    <span className="font-medium text-slate-900">{user.totalGmv}</span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetBanners();
                      setImpersonationTarget(user);
                    }}
                    data-testid={`admin-impersonate-${user.id}`}
                  >
                    Impersonate
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {activeTab === 'listings' && (
        <section className="space-y-4" data-testid="admin-listings">
          {listings.map((listing) => {
            const state = moderationState[listing.id] ?? { decision: 'reject', rationale: '' };
            return (
              <Card key={listing.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900">
                        {listing.title}
                      </CardTitle>
                      <CardDescription>{listing.reason}</CardDescription>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Seller: {listing.seller}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <label
                      className="text-sm font-medium text-slate-700"
                      htmlFor={`decision-${listing.id}`}
                    >
                      Decision
                    </label>
                    <select
                      id={`decision-${listing.id}`}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                      value={state.decision}
                      onChange={(event) =>
                        setModerationState((current) => ({
                          ...current,
                          [listing.id]: {
                            ...state,
                            decision: event.target.value as 'approve' | 'reject',
                          },
                        }))
                      }
                      data-testid={`moderation-decision-${listing.id}`}
                    >
                      <option value="approve">Approve</option>
                      <option value="reject">Reject</option>
                    </select>
                  </div>
                  <textarea
                    placeholder="Add human review notes"
                    value={state.rationale}
                    onChange={(event) =>
                      setModerationState((current) => ({
                        ...current,
                        [listing.id]: { ...state, rationale: event.target.value },
                      }))
                    }
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-secondary focus:outline-none"
                    rows={3}
                    data-testid={`moderation-rationale-${listing.id}`}
                  />
                  <Button
                    onClick={() => submitModeration(listing.id)}
                    data-testid={`moderation-submit-${listing.id}`}
                  >
                    Log moderation decision
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {activeTab === 'disputes' && (
        <section className="space-y-4" data-testid="admin-disputes">
          {disputes.map((dispute) => {
            const state = disputeAssignments[dispute.id] ?? { assignedTo: null, resolved: false };
            return (
              <Card key={dispute.id}>
                <CardHeader>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    {dispute.order}
                  </CardTitle>
                  <CardDescription>
                    {dispute.summary} — Buyer {dispute.buyer} / Seller {dispute.seller}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      Priority: {dispute.priority}
                    </span>
                    {state.assignedTo && <span>Assigned to: {state.assignedTo}</span>}
                    {state.resolved && <span className="text-emerald-600">Resolved</span>}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => updateDispute(dispute.id, 'ASSIGN')}
                      data-testid={`dispute-assign-${dispute.id}`}
                    >
                      Assign to me
                    </Button>
                    <Button
                      onClick={() => updateDispute(dispute.id, 'RESOLVE')}
                      data-testid={`dispute-resolve-${dispute.id}`}
                    >
                      Resolve dispute
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>
      )}

      {activeTab === 'financials' && (
        <section className="space-y-6" data-testid="admin-financials">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {financialSnapshots.map((snapshot) => (
              <Card key={snapshot.label}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-slate-600">
                    {snapshot.label}
                  </CardTitle>
                  <CardDescription className="text-2xl font-semibold text-slate-900">
                    {snapshot.value}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
          <Button onClick={exportFinancialSnapshot} data-testid="financial-export">
            Export finance snapshot
          </Button>
        </section>
      )}

      {activeTab === 'webhooks' && (
        <section className="space-y-4" data-testid="admin-webhooks">
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Filter</label>
            <select
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={webhookFilter}
              onChange={(event) => setWebhookFilter(event.target.value as 'all' | 'failed')}
              data-testid="webhook-filter"
            >
              <option value="all">All events</option>
              <option value="failed">Needs attention</option>
            </select>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-2">Event</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Delivered</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWebhooks.map((event) => (
                  <tr key={event.id}>
                    <td className="px-4 py-2 font-medium text-slate-900">{event.event}</td>
                    <td className="px-4 py-2 text-slate-600">{event.status}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {formatDistanceToNow(new Date(event.deliveredAt), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Button
                        variant="outline"
                        onClick={() => replayWebhook(event.id)}
                        data-testid={`webhook-replay-${event.id}`}
                      >
                        Replay
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'flags' && (
        <section className="space-y-4" data-testid="admin-flags">
          {featureFlags.map((flag) => (
            <Card key={flag.key}>
              <CardHeader className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold text-slate-900">
                    {flag.name}
                  </CardTitle>
                  <CardDescription>{flag.description}</CardDescription>
                </div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={flagState[flag.key] ?? false}
                    onChange={(event) => toggleFeatureFlag(flag, event.target.checked)}
                    data-testid={`feature-flag-${flag.key}`}
                  />
                  <span>{flagState[flag.key] ? 'Enabled' : 'Disabled'}</span>
                </label>
              </CardHeader>
            </Card>
          ))}
        </section>
      )}

      {impersonationTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="dialog"
          aria-modal="true"
          data-testid="impersonation-modal"
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-slate-900">Confirm impersonation</h2>
            <p className="mt-2 text-sm text-slate-600">
              You are requesting to impersonate {impersonationTarget.name}. This action is fully
              audited. Provide a justification.
            </p>
            <textarea
              className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand-secondary focus:outline-none"
              rows={4}
              value={impersonationReason}
              onChange={(event) => setImpersonationReason(event.target.value)}
              placeholder="Explain why this impersonation is necessary..."
              data-testid="impersonation-reason"
            />
            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setImpersonationTarget(null);
                  setImpersonationReason('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={confirmImpersonation} data-testid="impersonation-confirm">
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {isPending && (
        <div className="fixed bottom-4 right-4 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg">
          Processing request…
        </div>
      )}
    </div>
  );
}

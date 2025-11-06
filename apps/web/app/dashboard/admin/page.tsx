import { ensurePageRole } from '@/lib/auth/page-role';
import AdminDashboardClient from './admin-dashboard-client';

const users = [
  {
    id: 'angler-221',
    name: 'Harper Diaz',
    email: 'harper@tackle.exchange',
    role: 'SELLER',
    risk: 'Medium',
    totalGmv: '$128k',
  },
  {
    id: 'angler-222',
    name: 'Mason Lee',
    email: 'mason@tackle.exchange',
    role: 'BUYER',
    risk: 'Low',
    totalGmv: '$9.3k',
  },
  {
    id: 'angler-223',
    name: 'Asha Patel',
    email: 'asha@tackle.exchange',
    role: 'SELLER',
    risk: 'High',
    totalGmv: '$302k',
  },
  {
    id: 'staff-101',
    name: 'Jordan Smith',
    email: 'jordan@support.tackle.exchange',
    role: 'SUPPORT',
    risk: 'Low',
    totalGmv: '$0',
  },
];

const listings = [
  {
    id: 'listing-reef-901',
    title: 'Offshore jigging combo (custom Calstar + Talica)',
    seller: 'Asha Patel',
    reason: 'Serial number mismatch flagged during verification',
  },
  {
    id: 'listing-river-447',
    title: 'Vintage fly lot with bamboo rod and Hardy reel',
    seller: 'Harper Diaz',
    reason: 'Buyer reported undisclosed repair on stripping guide',
  },
];

const disputes = [
  {
    id: 'dispute-hex-3301',
    order: '#TX-12428',
    buyer: 'Leah Cole',
    seller: 'Asha Patel',
    summary: 'Buyer uploaded inspection video showing bent rod ferrule',
    priority: 'High',
  },
  {
    id: 'dispute-hex-3302',
    order: '#TX-12112',
    buyer: 'David Kim',
    seller: 'Mason Lee',
    summary: 'Electronics bundle delayed; carrier investigating weather hold',
    priority: 'Medium',
  },
];

const financialSnapshots = [
  { label: 'Net GMV (30d)', value: '$1.92M' },
  { label: 'Escrow released', value: '$1.53M' },
  { label: 'Fees captured', value: '$192k' },
  { label: 'Refunds issued', value: '$72k' },
];

const webhookEvents = [
  {
    id: 'evt-reef-9101',
    event: 'escrow.released',
    status: 'success',
    deliveredAt: '2024-05-13T12:12:00Z',
  },
  {
    id: 'evt-reef-9102',
    event: 'payout.failed',
    status: 'failed',
    deliveredAt: '2024-05-12T08:07:00Z',
  },
  {
    id: 'evt-reef-9103',
    event: 'listing.reviewed',
    status: 'success',
    deliveredAt: '2024-05-11T18:40:00Z',
  },
];

const featureFlags = [
  {
    key: 'ai_pricing_beta',
    name: 'AI tackle pricing beta',
    description: 'Enable experimental pricing recommendations tuned for rod and reel categories',
    enabled: true,
  },
  {
    key: 'express_payouts',
    name: 'Express payouts',
    description: 'Allow verified captains and shops to request instant settlement',
    enabled: false,
  },
  {
    key: 'auto_escalate_disputes',
    name: 'Auto escalate disputes',
    description: 'Automatically escalate inspections with high-risk tackle signals to specialists',
    enabled: false,
  },
];

export default async function AdminDashboardPage() {
  await ensurePageRole(['ADMIN']);

  return (
    <main className="px-6 py-10">
      <AdminDashboardClient
        users={users}
        listings={listings}
        disputes={disputes}
        financialSnapshots={financialSnapshots}
        webhookEvents={webhookEvents}
        featureFlags={featureFlags}
      />
    </main>
  );
}

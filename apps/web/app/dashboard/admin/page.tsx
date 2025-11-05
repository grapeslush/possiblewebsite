import { ensurePageRole } from '@/lib/auth/page-role';
import AdminDashboardClient from './admin-dashboard-client';

const users = [
  {
    id: 'user-1101',
    name: 'Avery Johnson',
    email: 'avery@possiblecommerce.com',
    role: 'SELLER',
    risk: 'Medium',
    totalGmv: '$128k',
  },
  {
    id: 'user-1102',
    name: 'Morgan Patel',
    email: 'morgan@possiblecommerce.com',
    role: 'BUYER',
    risk: 'Low',
    totalGmv: '$9.3k',
  },
  {
    id: 'user-1103',
    name: 'Taylor Wright',
    email: 'taylor@possiblecommerce.com',
    role: 'SELLER',
    risk: 'High',
    totalGmv: '$302k',
  },
  {
    id: 'user-1104',
    name: 'Jordan Smith',
    email: 'jordan@possiblecommerce.com',
    role: 'SUPPORT',
    risk: 'Low',
    totalGmv: '$0',
  },
];

const listings = [
  {
    id: 'listing-501',
    title: 'Luxury leather weekender bag',
    seller: 'Taylor Wright',
    reason: 'AI flagged duplicate imagery across marketplaces',
  },
  {
    id: 'listing-502',
    title: 'Rare vinyl: Sunrise Collective',
    seller: 'Avery Johnson',
    reason: 'Buyer dispute referencing counterfeit pressing',
  },
];

const disputes = [
  {
    id: 'dispute-3301',
    order: '#MKT-12428',
    buyer: 'Leah Cole',
    seller: 'Taylor Wright',
    summary: 'Buyer reports lamp arrived damaged; images uploaded',
    priority: 'High',
  },
  {
    id: 'dispute-3302',
    order: '#MKT-12112',
    buyer: 'David Kim',
    seller: 'Morgan Patel',
    summary: 'Item lost in transit; carrier shows investigation in progress',
    priority: 'Medium',
  },
];

const financialSnapshots = [
  { label: 'Net GMV (30d)', value: '$1.82M' },
  { label: 'Payouts released', value: '$1.47M' },
  { label: 'Fees captured', value: '$182k' },
  { label: 'Refunds issued', value: '$64k' },
];

const webhookEvents = [
  {
    id: 'evt-9101',
    event: 'order.fulfilled',
    status: 'success',
    deliveredAt: '2024-03-13T12:12:00Z',
  },
  { id: 'evt-9102', event: 'payout.failed', status: 'failed', deliveredAt: '2024-03-12T08:07:00Z' },
  {
    id: 'evt-9103',
    event: 'listing.reviewed',
    status: 'success',
    deliveredAt: '2024-03-11T18:40:00Z',
  },
];

const featureFlags = [
  {
    key: 'ai_pricing_beta',
    name: 'AI Pricing beta',
    description: 'Enable experimental pricing recommendations',
    enabled: true,
  },
  {
    key: 'instant_payouts',
    name: 'Instant payouts',
    description: 'Allow qualified sellers to request instant settlement',
    enabled: false,
  },
  {
    key: 'auto_escalate_disputes',
    name: 'Auto escalate disputes',
    description: 'Automatically escalate disputes with high risk signals',
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

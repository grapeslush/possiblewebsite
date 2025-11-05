import { ensurePageRole } from '@/lib/auth/page-role';
import SellerDashboardClient from './seller-dashboard-client';

export default async function SellerDashboardPage() {
  await ensurePageRole(['ADMIN', 'SELLER']);

  const kpis = [
    { label: 'Gross merchandise value', value: '$42,780', change: '+12% vs last month' },
    { label: 'Orders fulfilled', value: '318', change: '98.2% on-time' },
    { label: 'Offer acceptance', value: '37%', change: '+5 pts week over week' },
  ];

  const revenueTrend = [
    { date: 'Week 1', revenue: 6400, orders: 92 },
    { date: 'Week 2', revenue: 7200, orders: 98 },
    { date: 'Week 3', revenue: 8300, orders: 105 },
    { date: 'Week 4', revenue: 9600, orders: 118 },
  ];

  const payoutSummary = [
    { label: 'Released', value: 18200, fill: '#1b206e' },
    { label: 'Scheduled', value: 9100, fill: '#f60f20' },
    { label: 'On hold', value: 2400, fill: '#f97316' },
  ];

  const aiSuggestions = [
    {
      id: 'bundles',
      title: 'Bundle complementary items',
      insight:
        'Shoppers buying your vintage tees also view enamel pins. Create a bundle with a 12% discount to lift cart conversion.',
      impact: 'Estimated +8% AOV',
      actionLabel: 'Create bundle',
    },
    {
      id: 'pricing-refresh',
      title: 'Refresh stale listings',
      insight:
        'Seven listings have not received views in 14 days. AI recommends lowering price by 6% and adding lifestyle photos.',
      impact: 'Moves items out of long-tail inventory',
      actionLabel: 'Review price suggestions',
    },
    {
      id: 'loyalty',
      title: 'Message repeat buyers',
      insight:
        'You have 23 buyers with 3+ orders in the past quarter. Offer a loyalty coupon to protect LTV.',
      impact: 'Retain high-value buyers',
      actionLabel: 'Draft message',
    },
  ];

  return (
    <SellerDashboardClient
      kpis={kpis}
      revenueTrend={revenueTrend}
      payoutSummary={payoutSummary}
      aiSuggestions={aiSuggestions}
    />
  );
}

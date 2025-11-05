import { ensurePageRole } from '@/lib/auth/page-role';
import {
  SellerTable,
  type SellerTableBulkAction,
  type SellerTableColumn,
} from '../components/seller-table';

type PayoutRow = {
  id: string;
  batch: string;
  status: string;
  amount: string;
  destination: string;
  initiatedAt: string;
  expectedAt: string;
};

const payouts: PayoutRow[] = [
  {
    id: 'payout-3101',
    batch: 'Weekly batch · 14 Mar',
    status: 'PENDING',
    amount: '$9,180.00',
    destination: 'Chase ••4839',
    initiatedAt: 'Today 05:45',
    expectedAt: 'Mar 18, 12:00',
  },
  {
    id: 'payout-3102',
    batch: 'Weekly batch · 7 Mar',
    status: 'RELEASED',
    amount: '$8,420.00',
    destination: 'Chase ••4839',
    initiatedAt: 'Mar 07, 05:31',
    expectedAt: 'Mar 11, 12:00',
  },
  {
    id: 'payout-3103',
    batch: 'Express · 4 Mar',
    status: 'ON HOLD',
    amount: '$2,140.00',
    destination: 'Stripe Balance',
    initiatedAt: 'Mar 04, 23:10',
    expectedAt: 'Manual review',
  },
];

const columns: SellerTableColumn<PayoutRow>[] = [
  { key: 'batch', label: 'Batch' },
  { key: 'status', label: 'Status' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'destination', label: 'Destination' },
  { key: 'initiatedAt', label: 'Initiated' },
  { key: 'expectedAt', label: 'Expected' },
];

const bulkActions: SellerTableBulkAction<PayoutRow>[] = [
  {
    value: 'expedite',
    label: 'Request expedite',
    apply: (rows, selectedIds) => ({
      rows,
      message: `Expedite review triggered for ${selectedIds.length} payouts`,
    }),
  },
  {
    value: 'mark-received',
    label: 'Mark as received',
    apply: (rows, selectedIds) => ({
      rows: rows.map((row) =>
        selectedIds.includes(row.id) ? { ...row, status: 'RELEASED' } : row,
      ),
      message: `Marked ${selectedIds.length} payouts as received`,
    }),
  },
];

const csvTemplate = `id,batch,status,amount,destination,initiatedAt,expectedAt\npayout-4001,Weekly batch · 21 Mar,PENDING,$10,240.00,Chase ••4839,2024-03-21,2024-03-25`;

export default async function SellerPayoutsPage() {
  await ensurePageRole(['ADMIN', 'SELLER']);

  return (
    <main className="px-6 py-12">
      <SellerTable
        title="Payout operations"
        description="Audit cash flow, trigger expedited reviews, and reconcile settlement timelines."
        columns={columns}
        initialRows={payouts}
        bulkActions={bulkActions}
        csvTemplate={csvTemplate}
      />
    </main>
  );
}

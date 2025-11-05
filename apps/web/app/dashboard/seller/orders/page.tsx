import { ensurePageRole } from '@/lib/auth/page-role';
import {
  SellerTable,
  type SellerTableBulkAction,
  type SellerTableColumn,
} from '../components/seller-table';

type OrderRow = {
  id: string;
  orderNumber: string;
  buyer: string;
  status: string;
  total: string;
  fulfillment: string;
  lastUpdate: string;
};

const orders: OrderRow[] = [
  {
    id: 'order-9101',
    orderNumber: '#MKT-12450',
    buyer: 'ava.chen',
    status: 'PENDING',
    total: '$420.00',
    fulfillment: 'Label required',
    lastUpdate: 'Today 08:42',
  },
  {
    id: 'order-9102',
    orderNumber: '#MKT-12438',
    buyer: 'jacob.torres',
    status: 'FULFILLED',
    total: '$118.00',
    fulfillment: 'Delivered Mar 12',
    lastUpdate: 'Mar 12, 16:02',
  },
  {
    id: 'order-9103',
    orderNumber: '#MKT-12428',
    buyer: 'leah.cole',
    status: 'DISPUTED',
    total: '$268.00',
    fulfillment: 'Awaiting evidence',
    lastUpdate: 'Mar 11, 11:38',
  },
  {
    id: 'order-9104',
    orderNumber: '#MKT-12419',
    buyer: 'monique.styles',
    status: 'CONFIRMED',
    total: '$92.00',
    fulfillment: 'Pack by Mar 14',
    lastUpdate: 'Mar 10, 09:10',
  },
];

const columns: SellerTableColumn<OrderRow>[] = [
  { key: 'orderNumber', label: 'Order' },
  { key: 'buyer', label: 'Buyer' },
  { key: 'status', label: 'Status' },
  { key: 'total', label: 'Total', align: 'right' },
  { key: 'fulfillment', label: 'Fulfillment' },
  { key: 'lastUpdate', label: 'Last update' },
];

const bulkActions: SellerTableBulkAction<OrderRow>[] = [
  {
    value: 'print-labels',
    label: 'Print shipping labels',
    apply: (rows, selectedIds) => ({
      rows,
      message: `Queued label purchase for ${selectedIds.length} orders`,
    }),
  },
  {
    value: 'mark-fulfilled',
    label: 'Mark as fulfilled',
    apply: (rows, selectedIds) => ({
      rows: rows.map((row) =>
        selectedIds.includes(row.id)
          ? { ...row, status: 'FULFILLED', fulfillment: 'Tracking pending' }
          : row,
      ),
      message: `Marked ${selectedIds.length} orders as fulfilled`,
    }),
  },
  {
    value: 'escalate',
    label: 'Escalate to support',
    apply: (rows, selectedIds) => ({
      rows: rows.map((row) =>
        selectedIds.includes(row.id) ? { ...row, status: 'DISPUTED' } : row,
      ),
      message: `Escalated ${selectedIds.length} orders to support`,
    }),
  },
];

const csvTemplate = `id,orderNumber,buyer,status,total,fulfillment,lastUpdate\norder-9300,#MKT-12501,casey.holt,PENDING,$76.00,Awaiting pickup,2024-03-12`;

export default async function SellerOrdersPage() {
  await ensurePageRole(['ADMIN', 'SELLER']);

  return (
    <main className="px-6 py-12">
      <SellerTable
        title="Order operations"
        description="Manage fulfillment SLAs, escalate risk signals, and coordinate post-sale messaging."
        columns={columns}
        initialRows={orders}
        bulkActions={bulkActions}
        csvTemplate={csvTemplate}
      />
    </main>
  );
}

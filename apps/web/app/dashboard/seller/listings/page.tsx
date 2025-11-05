import { ensurePageRole } from '@/lib/auth/page-role';
import {
  SellerTable,
  type SellerTableBulkAction,
  type SellerTableColumn,
} from '../components/seller-table';

type ListingRow = {
  id: string;
  title: string;
  status: string;
  price: string;
  views: number;
  stock: number;
  lastSale: string;
};

const listings: ListingRow[] = [
  {
    id: 'listing-1001',
    title: 'Vintage denim jacket',
    status: 'ACTIVE',
    price: '$120',
    views: 1268,
    stock: 6,
    lastSale: '2 hours ago',
  },
  {
    id: 'listing-1002',
    title: 'Hand-loomed alpaca throw',
    status: 'PAUSED',
    price: '$240',
    views: 812,
    stock: 3,
    lastSale: '4 days ago',
  },
  {
    id: 'listing-1003',
    title: 'Mid-century floor lamp',
    status: 'ACTIVE',
    price: '$380',
    views: 2090,
    stock: 1,
    lastSale: '12 hours ago',
  },
  {
    id: 'listing-1004',
    title: 'Ceramic pour-over set',
    status: 'DRAFT',
    price: '$68',
    views: 164,
    stock: 12,
    lastSale: '—',
  },
];

const columns: SellerTableColumn<ListingRow>[] = [
  { key: 'title', label: 'Listing' },
  { key: 'status', label: 'Status' },
  { key: 'price', label: 'Price' },
  { key: 'views', label: 'Views', render: (row) => row.views.toLocaleString(), align: 'right' },
  { key: 'stock', label: 'Qty', align: 'center' },
  { key: 'lastSale', label: 'Last sale' },
];

const bulkActions: SellerTableBulkAction<ListingRow>[] = [
  {
    value: 'publish',
    label: 'Publish listings',
    apply: (rows, selectedIds) => ({
      rows: rows.map((row) => (selectedIds.includes(row.id) ? { ...row, status: 'ACTIVE' } : row)),
      message: `Published ${selectedIds.length} listings`,
    }),
  },
  {
    value: 'pause',
    label: 'Pause listings',
    apply: (rows, selectedIds) => ({
      rows: rows.map((row) => (selectedIds.includes(row.id) ? { ...row, status: 'PAUSED' } : row)),
      message: `Paused ${selectedIds.length} listings`,
    }),
  },
  {
    value: 'archive',
    label: 'Archive listings',
    apply: (rows, selectedIds) => ({
      rows: rows.map((row) =>
        selectedIds.includes(row.id) ? { ...row, status: 'ARCHIVED' } : row,
      ),
      message: `Archived ${selectedIds.length} listings`,
    }),
  },
];

const csvTemplate = `id,title,status,price,views,stock,lastSale\nlisting-2042,Modern plant stand,ACTIVE,$120,1200,8,2024-03-11`;

export default async function SellerListingsPage() {
  await ensurePageRole(['ADMIN', 'SELLER']);

  return (
    <main className="px-6 py-12">
      <SellerTable
        title="Listings manager"
        description="Bulk update pricing, statuses, and launch playbooks across your active catalogue."
        columns={columns}
        initialRows={listings}
        bulkActions={bulkActions}
        csvTemplate={csvTemplate}
      />
    </main>
  );
}

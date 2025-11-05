import { ensurePageRole } from '@/lib/auth/page-role';
import {
  SellerTable,
  type SellerTableBulkAction,
  type SellerTableColumn,
} from '../components/seller-table';

type OfferRow = {
  id: string;
  listing: string;
  buyer: string;
  status: string;
  amount: string;
  submittedAt: string;
  expiresAt: string;
};

const offers: OfferRow[] = [
  {
    id: 'offer-7001',
    listing: 'Vintage denim jacket',
    buyer: 'mia.thompson',
    status: 'PENDING',
    amount: '$108',
    submittedAt: 'Today 09:12',
    expiresAt: 'Today 21:12',
  },
  {
    id: 'offer-7002',
    listing: 'Mid-century floor lamp',
    buyer: 'lucas.owens',
    status: 'COUNTERED',
    amount: '$340',
    submittedAt: 'Yesterday 18:06',
    expiresAt: 'Tomorrow 18:06',
  },
  {
    id: 'offer-7003',
    listing: 'Hand-loomed alpaca throw',
    buyer: 'flora.designs',
    status: 'ACCEPTED',
    amount: '$228',
    submittedAt: 'Mar 12, 14:22',
    expiresAt: 'Mar 13, 14:22',
  },
  {
    id: 'offer-7004',
    listing: 'Ceramic pour-over set',
    buyer: 'roasters.collective',
    status: 'PENDING',
    amount: '$58',
    submittedAt: 'Mar 10, 10:33',
    expiresAt: 'Mar 17, 10:33',
  },
];

const columns: SellerTableColumn<OfferRow>[] = [
  { key: 'listing', label: 'Listing' },
  { key: 'buyer', label: 'Buyer' },
  { key: 'status', label: 'Status' },
  { key: 'amount', label: 'Amount', align: 'right' },
  { key: 'submittedAt', label: 'Submitted' },
  { key: 'expiresAt', label: 'Expires' },
];

const bulkActions: SellerTableBulkAction<OfferRow>[] = [
  {
    value: 'accept',
    label: 'Accept offers',
    apply: (rows, selectedIds) => ({
      rows: rows.map((row) =>
        selectedIds.includes(row.id) ? { ...row, status: 'ACCEPTED' } : row,
      ),
      message: `Accepted ${selectedIds.length} offers`,
    }),
  },
  {
    value: 'decline',
    label: 'Decline offers',
    apply: (rows, selectedIds) => ({
      rows: rows.map((row) =>
        selectedIds.includes(row.id) ? { ...row, status: 'DECLINED' } : row,
      ),
      message: `Declined ${selectedIds.length} offers`,
    }),
  },
  {
    value: 'counter',
    label: 'Send counter',
    apply: (rows, selectedIds) => ({
      rows: rows.map((row) =>
        selectedIds.includes(row.id) ? { ...row, status: 'COUNTERED' } : row,
      ),
      message: `Countered ${selectedIds.length} offers`,
    }),
  },
];

const csvTemplate = `id,listing,buyer,status,amount,submittedAt,expiresAt\noffer-8010,Studio pottery vase,PENDING,$45,2024-03-11,2024-03-18`;

export default async function SellerOffersPage() {
  await ensurePageRole(['ADMIN', 'SELLER']);

  return (
    <main className="px-6 py-12">
      <SellerTable
        title="Offer desk"
        description="Respond in bulk with accepts, declines, and counteroffers while AI drafts messages for buyers."
        columns={columns}
        initialRows={offers}
        bulkActions={bulkActions}
        csvTemplate={csvTemplate}
      />
    </main>
  );
}

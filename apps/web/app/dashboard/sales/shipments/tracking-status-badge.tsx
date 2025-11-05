'use client';

import { ShipmentTrackingStatus } from '@prisma/client';
import clsx from 'clsx';

const statusCopy: Record<ShipmentTrackingStatus, string> = {
  [ShipmentTrackingStatus.UNKNOWN]: 'Unknown',
  [ShipmentTrackingStatus.LABEL_PURCHASED]: 'Label purchased',
  [ShipmentTrackingStatus.IN_TRANSIT]: 'In transit',
  [ShipmentTrackingStatus.OUT_FOR_DELIVERY]: 'Out for delivery',
  [ShipmentTrackingStatus.DELIVERED]: 'Delivered',
  [ShipmentTrackingStatus.EXCEPTION]: 'Attention needed',
};

export function TrackingStatusBadge({ status }: { status: ShipmentTrackingStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide',
        {
          'bg-brand-primary/10 text-brand-primary':
            status === ShipmentTrackingStatus.LABEL_PURCHASED ||
            status === ShipmentTrackingStatus.IN_TRANSIT,
          'bg-emerald-100 text-emerald-700': status === ShipmentTrackingStatus.DELIVERED,
          'bg-orange-100 text-orange-700': status === ShipmentTrackingStatus.OUT_FOR_DELIVERY,
          'bg-rose-100 text-rose-700': status === ShipmentTrackingStatus.EXCEPTION,
          'bg-slate-200 text-slate-700': status === ShipmentTrackingStatus.UNKNOWN,
        },
      )}
    >
      {statusCopy[status]}
    </span>
  );
}

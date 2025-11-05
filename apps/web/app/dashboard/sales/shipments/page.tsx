import { ShipmentTrackingStatus, ShipmentStatus } from '@prisma/client';
import { redirect } from 'next/navigation';

import { prisma } from '@possiblewebsite/db';

import { Button } from '@/components/ui/button';
import { getServerAuthSession } from '@/lib/auth';

import { PurchaseLabelDialog } from './purchase-label-dialog';
import { TrackingStatusBadge } from './tracking-status-badge';

function formatDate(value: Date | null | undefined) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(value);
}

export default async function SellerShipmentsPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect('/auth/login');
  }

  const orders = await prisma.order.findMany({
    where: { sellerId: session.user.id },
    include: {
      buyer: true,
      shipment: true,
      shippingAddress: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 25,
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <header>
        <h1 className="text-3xl font-semibold text-brand-secondary">Shipments</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Purchase Pirate Ship labels, monitor tracking updates, and keep buyers informed as
          packages make their way to their destinations.
        </p>
      </header>
      <div className="space-y-6">
        {orders.length === 0 ? (
          <p className="rounded-lg border border-dashed border-brand-secondary/30 bg-muted/40 p-10 text-center text-sm text-muted-foreground">
            No orders ready for fulfillment yet. Once buyers check out, you&apos;ll be able to
            create shipping labels and monitor delivery progress here.
          </p>
        ) : (
          orders.map((order) => {
            const shipment = order.shipment;
            const hasLabel = Boolean(shipment?.labelUrl);
            const trackingStatus = shipment?.trackingStatus ?? ShipmentTrackingStatus.UNKNOWN;
            const trackingDetail = shipment?.trackingStatusDetail ?? 'Awaiting label purchase';

            return (
              <section key={order.id} className="rounded-lg border bg-white p-6 shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-brand-secondary">
                      Order {order.id.slice(0, 8)}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Buyer: {order.buyer.displayName}
                    </p>
                  </div>
                  <TrackingStatusBadge status={trackingStatus} />
                </header>
                <dl className="mt-4 grid gap-4 text-sm text-muted-foreground md:grid-cols-3">
                  <div>
                    <dt className="font-medium text-brand-secondary">Tracking number</dt>
                    <dd>{shipment?.trackingNumber ?? 'Not purchased'}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-brand-secondary">Carrier / Service</dt>
                    <dd>
                      {shipment?.carrier
                        ? `${shipment.carrier}${shipment.serviceLevel ? ` · ${shipment.serviceLevel}` : ''}`
                        : 'Pending'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-brand-secondary">Last update</dt>
                    <dd>{formatDate(shipment?.trackingLastEventAt ?? shipment?.updatedAt)}</dd>
                  </div>
                  <div className="md:col-span-3">
                    <dt className="font-medium text-brand-secondary">Destination</dt>
                    <dd>
                      {order.shippingAddress
                        ? `${order.shippingAddress.line1}, ${order.shippingAddress.city}, ${order.shippingAddress.state ?? ''} ${order.shippingAddress.postalCode}`
                        : 'No shipping address recorded'}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm text-muted-foreground">{trackingDetail}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <PurchaseLabelDialog
                    orderId={order.id}
                    sellerId={order.sellerId}
                    disabled={hasLabel && shipment?.status !== ShipmentStatus.PREPARING}
                    existingLabelUrl={shipment?.labelUrl ?? undefined}
                    trackingNumber={shipment?.trackingNumber ?? undefined}
                  />
                  {shipment?.labelUrl ? (
                    <Button asChild variant="outline">
                      <a href={shipment.labelUrl} target="_blank" rel="noreferrer">
                        Download label
                      </a>
                    </Button>
                  ) : null}
                  {shipment?.trackingUrl ? (
                    <Button asChild variant="ghost">
                      <a href={shipment.trackingUrl} target="_blank" rel="noreferrer">
                        View tracking portal
                      </a>
                    </Button>
                  ) : null}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

interface PurchaseLabelDialogProps {
  orderId: string;
  sellerId: string;
  disabled?: boolean;
  existingLabelUrl?: string;
  trackingNumber?: string;
}

interface RateQuote {
  id: string;
  carrier: string;
  service: string;
  amount: number;
  currency: string;
  deliveryDays?: number | null;
}

const defaultParcel = {
  weightOz: 16,
  lengthInches: 8,
  widthInches: 6,
  heightInches: 4,
};

export function PurchaseLabelDialog({
  orderId,
  sellerId,
  disabled,
  existingLabelUrl,
  trackingNumber,
}: PurchaseLabelDialogProps) {
  const [open, setOpen] = useState(false);
  const [parcel, setParcel] = useState(defaultParcel);
  const [rates, setRates] = useState<RateQuote[]>([]);
  const [selectedRate, setSelectedRate] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const toggle = () => setOpen((prev) => !prev);

  const requestRates = async () => {
    setQuoting(true);
    setStatusMessage(null);
    setRates([]);
    setSelectedRate(null);

    try {
      const response = await fetch('/api/shipping/rates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, sellerId, parcel }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? 'Unable to fetch rates');
      }

      setRates(Array.isArray(data.rates) ? data.rates : []);
      if (!data.rates?.length) {
        setStatusMessage('No rates available for the provided package details.');
      }
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to retrieve rates.');
    } finally {
      setQuoting(false);
    }
  };

  const purchaseLabel = async () => {
    if (!selectedRate) return;

    setPurchasing(true);
    setStatusMessage(null);

    try {
      const response = await fetch('/api/shipping/labels', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, sellerId, rateId: selectedRate, parcel }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? 'Unable to purchase label');
      }

      setStatusMessage(
        'Label purchased successfully. Refresh this page to see the latest tracking details.',
      );
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Label purchase failed.');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="w-full max-w-xl">
      <Button onClick={toggle} disabled={disabled} variant={open ? 'secondary' : 'default'}>
        {existingLabelUrl ? 'Manage label' : 'Purchase label'}
      </Button>
      {open ? (
        <div className="mt-4 space-y-4 rounded-lg border border-brand-secondary/20 bg-muted/30 p-4 text-sm">
          <p className="text-muted-foreground">
            Provide your package dimensions to quote Pirate Ship rates. Select the service you
            prefer and complete the purchase when ready.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase text-brand-secondary">
                Weight (oz)
              </span>
              <input
                type="number"
                className="rounded border px-3 py-2"
                min={1}
                value={parcel.weightOz}
                onChange={(event) =>
                  setParcel((prev) => ({
                    ...prev,
                    weightOz: Number(event.target.value) || prev.weightOz,
                  }))
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase text-brand-secondary">
                Length (in)
              </span>
              <input
                type="number"
                className="rounded border px-3 py-2"
                min={1}
                value={parcel.lengthInches}
                onChange={(event) =>
                  setParcel((prev) => ({
                    ...prev,
                    lengthInches: Number(event.target.value) || prev.lengthInches,
                  }))
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase text-brand-secondary">Width (in)</span>
              <input
                type="number"
                className="rounded border px-3 py-2"
                min={1}
                value={parcel.widthInches}
                onChange={(event) =>
                  setParcel((prev) => ({
                    ...prev,
                    widthInches: Number(event.target.value) || prev.widthInches,
                  }))
                }
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase text-brand-secondary">
                Height (in)
              </span>
              <input
                type="number"
                className="rounded border px-3 py-2"
                min={1}
                value={parcel.heightInches}
                onChange={(event) =>
                  setParcel((prev) => ({
                    ...prev,
                    heightInches: Number(event.target.value) || prev.heightInches,
                  }))
                }
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={requestRates} disabled={quoting}>
              {quoting ? 'Fetching rates…' : 'Get rates'}
            </Button>
            {trackingNumber ? (
              <span className="self-center text-xs text-muted-foreground">
                Current tracking: {trackingNumber}
              </span>
            ) : null}
          </div>
          {rates.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-brand-secondary">
                Available rates
              </p>
              <ul className="space-y-2">
                {rates.map((rate) => (
                  <li key={rate.id}>
                    <label className="flex cursor-pointer items-center justify-between rounded border px-3 py-2 text-sm">
                      <input
                        type="radio"
                        name={`rate-${orderId}`}
                        value={rate.id}
                        checked={selectedRate === rate.id}
                        onChange={() => setSelectedRate(rate.id)}
                      />
                      <span className="ml-3 flex-1">
                        <strong className="text-brand-secondary">{rate.carrier}</strong> ·{' '}
                        {rate.service}
                        {rate.deliveryDays ? ` · ${rate.deliveryDays} days` : ''}
                      </span>
                      <span className="font-semibold text-brand-secondary">
                        {rate.currency} {rate.amount.toFixed(2)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <Button onClick={purchaseLabel} disabled={!selectedRate || purchasing}>
                {purchasing ? 'Purchasing…' : 'Purchase selected label'}
              </Button>
            </div>
          ) : null}
          {statusMessage ? <p className="text-xs text-muted-foreground">{statusMessage}</p> : null}
          {existingLabelUrl ? (
            <p className="text-xs text-muted-foreground">
              A label already exists for this order. Purchasing a new label will replace the
              previous tracking number.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

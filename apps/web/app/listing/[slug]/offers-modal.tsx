'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/button';

interface OfferSummary {
  id: string;
  amount: string;
  buyer: {
    id: string;
    displayName: string;
    avatarUrl?: string | null;
  };
  status: string;
  message?: string | null;
  createdAt: string;
}

interface OffersModalProps {
  offers: OfferSummary[];
  listingTitle: string;
}

export function OffersModal({ offers, listingTitle }: OffersModalProps) {
  const [open, setOpen] = useState(false);

  if (offers.length === 0) {
    return null;
  }

  return (
    <div>
      <Button variant="outline" onClick={() => setOpen(true)}>
        View {offers.length} offer{offers.length > 1 ? 's' : ''}
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Recent offers</h2>
                <p className="text-sm text-muted-foreground">{listingTitle}</p>
              </div>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
            <div className="mt-4 space-y-4">
              {offers.map((offer) => (
                <article key={offer.id} className="rounded-lg border border-brand-secondary/20 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-brand-secondary">{offer.buyer.displayName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(offer.createdAt).toLocaleString()}</p>
                    </div>
                    <span className="text-sm font-semibold text-brand-primary">${Number(offer.amount).toFixed(2)}</span>
                  </div>
                  {offer.message ? (
                    <p className="mt-3 text-sm text-muted-foreground">“{offer.message}”</p>
                  ) : null}
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-brand-secondary/70">{offer.status}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

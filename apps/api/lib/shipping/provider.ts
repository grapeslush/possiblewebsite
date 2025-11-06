import { ShipmentTrackingStatus } from '@prisma/client';

export interface AddressPayload {
  name?: string;
  company?: string | null;
  street1: string;
  street2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  phone?: string | null;
  email?: string | null;
}

export interface ParcelPayload {
  lengthInches: number;
  widthInches: number;
  heightInches: number;
  weightOz: number;
}

export interface RateQuoteRequest {
  from: AddressPayload;
  to: AddressPayload;
  parcel: ParcelPayload;
}

export interface RateQuote {
  id: string;
  carrier: string;
  service: string;
  amount: number;
  currency: string;
  deliveryDays?: number | null;
  deliveryDate?: string | null;
}

export interface LabelPurchaseRequest extends RateQuoteRequest {
  rateId: string;
  labelFormat?: 'PDF' | 'ZPL';
  reference?: string;
}

export interface LabelPurchaseResponse {
  trackingNumber: string;
  carrier: string;
  service: string;
  trackingUrl?: string | null;
  labelFile: Buffer;
  labelFormat: 'PDF' | 'ZPL';
  amount: number;
  currency: string;
  providerReference: string;
}

export interface TrackingSubscriptionRequest {
  trackingNumber: string;
  carrier: string;
  reference?: string;
}

export interface TrackingSubscriptionResponse {
  subscriptionId: string;
}

export interface TrackingStatusResponse {
  trackingNumber: string;
  status: ShipmentTrackingStatus;
  detail?: string | null;
  occurredAt?: Date | null;
  trackingUrl?: string | null;
}

export interface ShippingWebhookEvent {
  type: 'tracking.updated' | 'label.voided' | 'unknown';
  trackingNumber?: string;
  carrier?: string;
  status?: ShipmentTrackingStatus;
  detail?: string;
  occurredAt?: Date;
  trackingUrl?: string;
  raw: unknown;
}

export interface ShippingProvider {
  quoteRates(request: RateQuoteRequest): Promise<RateQuote[]>;
  purchaseLabel(request: LabelPurchaseRequest): Promise<LabelPurchaseResponse>;
  subscribeTracking(request: TrackingSubscriptionRequest): Promise<TrackingSubscriptionResponse>;
  fetchTrackingStatus(
    trackingNumber: string,
    carrier?: string | null,
  ): Promise<TrackingStatusResponse | null>;
  verifyWebhookSignature(
    payload: Buffer,
    signature?: string | null,
    timestamp?: string | null,
  ): Promise<boolean>;
  parseWebhookEvent(payload: unknown): Promise<ShippingWebhookEvent>;
}

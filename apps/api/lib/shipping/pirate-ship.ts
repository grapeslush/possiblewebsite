import crypto from 'node:crypto';

import { ShipmentTrackingStatus } from '@prisma/client';

import type {
  AddressPayload,
  LabelPurchaseRequest,
  LabelPurchaseResponse,
  ParcelPayload,
  RateQuote,
  RateQuoteRequest,
  ShippingProvider,
  ShippingWebhookEvent,
  TrackingStatusResponse,
  TrackingSubscriptionRequest,
  TrackingSubscriptionResponse,
} from './provider';

interface PirateShipAdapterOptions {
  apiKey?: string;
  baseUrl?: string;
  webhookSecret?: string;
  mock?: boolean;
}

const DEFAULT_BASE_URL = 'https://api.pirateship.com';
const MOCK_TRANSITION_INTERVAL_MS = 5 * 60 * 1000;

type MockState = {
  status: ShipmentTrackingStatus;
  lastTransition: number;
};

export class PirateShipAdapter implements ShippingProvider {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly webhookSecret?: string;
  private readonly mock: boolean;
  private readonly mockState: Map<string, MockState>;

  constructor(options: PirateShipAdapterOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.webhookSecret = options.webhookSecret;
    this.mock = options.mock ?? !options.apiKey;

    const globalSymbol = Symbol.for('__pirateShipMockState__');
    type PirateShipGlobal = typeof globalThis & {
      [globalSymbol]?: Map<string, MockState>;
    };
    const globalObject = globalThis as PirateShipGlobal;

    if (!globalObject[globalSymbol]) {
      globalObject[globalSymbol] = new Map<string, MockState>();
    }

    this.mockState = globalObject[globalSymbol]!;
  }

  async quoteRates(request: RateQuoteRequest): Promise<RateQuote[]> {
    if (this.mock) {
      return this.buildMockRates(request.parcel);
    }

    const response = await fetch(`${this.baseUrl}/v1/rates/quotes`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        from: this.mapAddress(request.from),
        to: this.mapAddress(request.to),
        parcel: this.mapParcel(request.parcel),
      }),
    });

    if (!response.ok) {
      throw new Error(`Pirate Ship rate quote failed: ${response.status} ${response.statusText}`);
    }

    const payload = (await response.json()) as { rates: Array<Record<string, unknown>> };
    const rates = Array.isArray(payload.rates) ? payload.rates : [];

    return rates.map((rate) => ({
      id: String(rate.id ?? rate.rateId ?? crypto.randomUUID()),
      carrier: String(rate.carrier ?? 'Unknown'),
      service: String(rate.service ?? rate.serviceName ?? 'Standard'),
      amount: Number(rate.amount ?? rate.price ?? 0),
      currency: String(rate.currency ?? 'USD'),
      deliveryDays: rate.deliveryDays ? Number(rate.deliveryDays) : null,
      deliveryDate: typeof rate.deliveryDate === 'string' ? rate.deliveryDate : null,
    }));
  }

  async purchaseLabel(request: LabelPurchaseRequest): Promise<LabelPurchaseResponse> {
    if (this.mock) {
      return this.createMockLabelResponse(request);
    }

    const response = await fetch(`${this.baseUrl}/v1/labels`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        rateId: request.rateId,
        from: this.mapAddress(request.from),
        to: this.mapAddress(request.to),
        parcel: this.mapParcel(request.parcel),
        labelFormat: request.labelFormat ?? 'PDF',
        reference: request.reference,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Pirate Ship label purchase failed: ${response.status} ${response.statusText}`,
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const labelField = payload.label;
    const labelData =
      typeof labelField === 'object' && labelField !== null && 'data' in labelField
        ? (labelField as { data?: unknown }).data
        : labelField;
    const labelBase64 = String(labelData ?? '');
    const labelBuffer = Buffer.from(labelBase64, 'base64');

    const trackingNumber = String(
      payload.trackingNumber ?? payload.tracking_number ?? crypto.randomUUID(),
    );
    const carrier = String(payload.carrier ?? payload.carrier_name ?? 'Unknown');
    const service = String(payload.service ?? payload.service_name ?? 'Standard');

    this.mockState.set(trackingNumber, {
      status: ShipmentTrackingStatus.LABEL_PURCHASED,
      lastTransition: Date.now(),
    });

    return {
      trackingNumber,
      carrier,
      service,
      trackingUrl: typeof payload.trackingUrl === 'string' ? payload.trackingUrl : null,
      labelFile: labelBuffer,
      labelFormat: (payload.labelFormat as 'PDF' | 'ZPL') ?? 'PDF',
      amount: Number(payload.amount ?? payload.price ?? 0),
      currency: String(payload.currency ?? 'USD'),
      providerReference: String(payload.id ?? payload.labelId ?? crypto.randomUUID()),
    };
  }

  async subscribeTracking(
    request: TrackingSubscriptionRequest,
  ): Promise<TrackingSubscriptionResponse> {
    if (this.mock) {
      const subscriptionId = `mock-${request.trackingNumber}`;
      this.ensureMockState(request.trackingNumber);
      return { subscriptionId };
    }

    const response = await fetch(`${this.baseUrl}/v1/tracking/subscriptions`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        trackingNumber: request.trackingNumber,
        carrier: request.carrier,
        reference: request.reference,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Pirate Ship tracking subscription failed: ${response.status} ${response.statusText}`,
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    return {
      subscriptionId: String(payload.id ?? payload.subscriptionId ?? crypto.randomUUID()),
    };
  }

  async fetchTrackingStatus(
    trackingNumber: string,
    _carrier?: string | null,
  ): Promise<TrackingStatusResponse | null> {
    if (this.mock) {
      return this.progressMockTracking(trackingNumber);
    }

    const response = await fetch(
      `${this.baseUrl}/v1/tracking/${encodeURIComponent(trackingNumber)}`,
      {
        method: 'GET',
        headers: this.buildHeaders(),
      },
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(
        `Pirate Ship tracking fetch failed: ${response.status} ${response.statusText}`,
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    const status = this.normalizeStatus(
      String(payload.status ?? payload.trackingStatus ?? 'unknown'),
    );

    return {
      trackingNumber,
      status,
      detail: typeof payload.detail === 'string' ? payload.detail : null,
      occurredAt: payload.timestamp ? new Date(String(payload.timestamp)) : null,
      trackingUrl: typeof payload.trackingUrl === 'string' ? payload.trackingUrl : null,
    };
  }

  async verifyWebhookSignature(
    payload: Buffer,
    signature?: string | null,
    timestamp?: string | null,
  ): Promise<boolean> {
    if (!this.webhookSecret || this.mock) {
      return true;
    }

    if (!signature || !timestamp) {
      return false;
    }

    const computed = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(`${timestamp}.${payload.toString('utf8')}`)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
  }

  async parseWebhookEvent(payload: unknown): Promise<ShippingWebhookEvent> {
    if (!payload || typeof payload !== 'object') {
      return { type: 'unknown', raw: payload };
    }

    const data = payload as Record<string, unknown>;
    const eventType = typeof data.type === 'string' ? data.type : 'unknown';

    if (eventType === 'tracking.updated' || eventType === 'tracking_update') {
      const status = this.normalizeStatus(String(data.status ?? data.trackingStatus ?? 'unknown'));
      return {
        type: 'tracking.updated',
        trackingNumber: typeof data.trackingNumber === 'string' ? data.trackingNumber : undefined,
        carrier: typeof data.carrier === 'string' ? data.carrier : undefined,
        status,
        detail: typeof data.detail === 'string' ? data.detail : undefined,
        occurredAt: data.occurredAt ? new Date(String(data.occurredAt)) : new Date(),
        trackingUrl: typeof data.trackingUrl === 'string' ? data.trackingUrl : undefined,
        raw: payload,
      };
    }

    if (eventType === 'label.voided') {
      return {
        type: 'label.voided',
        trackingNumber: typeof data.trackingNumber === 'string' ? data.trackingNumber : undefined,
        carrier: typeof data.carrier === 'string' ? data.carrier : undefined,
        raw: payload,
      };
    }

    if (this.mock && typeof data.mockEvent === 'string') {
      return {
        type: 'tracking.updated',
        trackingNumber: typeof data.trackingNumber === 'string' ? data.trackingNumber : undefined,
        carrier: typeof data.carrier === 'string' ? data.carrier : undefined,
        status: this.normalizeStatus(data.mockEvent),
        detail: typeof data.detail === 'string' ? data.detail : undefined,
        occurredAt: new Date(),
        trackingUrl: typeof data.trackingUrl === 'string' ? data.trackingUrl : undefined,
        raw: payload,
      };
    }

    return { type: 'unknown', raw: payload };
  }

  private buildHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private mapAddress(address: AddressPayload) {
    return {
      name: address.name,
      company: address.company ?? undefined,
      street1: address.street1,
      street2: address.street2 ?? undefined,
      city: address.city,
      state: address.state ?? undefined,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone ?? undefined,
      email: address.email ?? undefined,
    };
  }

  private mapParcel(parcel: ParcelPayload) {
    return {
      length: parcel.lengthInches,
      width: parcel.widthInches,
      height: parcel.heightInches,
      weightOz: parcel.weightOz,
    };
  }

  private buildMockRates(parcel: ParcelPayload): RateQuote[] {
    const volumetricWeight = (parcel.lengthInches * parcel.widthInches * parcel.heightInches) / 139;
    const billableWeight = Math.max(parcel.weightOz / 16, volumetricWeight);
    const base = Math.max(4.5, billableWeight * 0.6 + 3);

    return [
      {
        id: 'mock-usps-priority',
        carrier: 'USPS',
        service: 'Priority Mail',
        amount: Number(base.toFixed(2)),
        currency: 'USD',
        deliveryDays: 3,
        deliveryDate: null,
      },
      {
        id: 'mock-ups-ground',
        carrier: 'UPS',
        service: 'Ground',
        amount: Number((base + 2.1).toFixed(2)),
        currency: 'USD',
        deliveryDays: 5,
        deliveryDate: null,
      },
      {
        id: 'mock-fedex-2day',
        carrier: 'FedEx',
        service: '2Day',
        amount: Number((base + 6.75).toFixed(2)),
        currency: 'USD',
        deliveryDays: 2,
        deliveryDate: null,
      },
    ];
  }

  private createMockLabelResponse(request: LabelPurchaseRequest): LabelPurchaseResponse {
    const rate = this.buildMockRates(request.parcel).find((item) => item.id === request.rateId);
    const chosenRate = rate ?? {
      id: request.rateId,
      carrier: 'MockCarrier',
      service: 'Standard',
      amount: 7.5,
      currency: 'USD',
    };

    const trackingNumber = `PS${Math.random().toString(36).slice(2, 12).toUpperCase()}`;
    const pdfContent = `%PDF-1.4\n% Mock PirateShip label for ${trackingNumber}\n`;
    const labelFile = Buffer.from(pdfContent, 'utf8');

    this.mockState.set(trackingNumber, {
      status: ShipmentTrackingStatus.LABEL_PURCHASED,
      lastTransition: Date.now(),
    });

    return {
      trackingNumber,
      carrier: chosenRate.carrier,
      service: chosenRate.service,
      trackingUrl: `https://example.test/track/${trackingNumber}`,
      labelFile,
      labelFormat: 'PDF',
      amount: chosenRate.amount,
      currency: chosenRate.currency,
      providerReference: `mock-${trackingNumber}`,
    };
  }

  private ensureMockState(trackingNumber: string) {
    if (!this.mockState.has(trackingNumber)) {
      this.mockState.set(trackingNumber, {
        status: ShipmentTrackingStatus.LABEL_PURCHASED,
        lastTransition: Date.now(),
      });
    }
  }

  private progressMockTracking(trackingNumber: string): TrackingStatusResponse | null {
    const state = this.mockState.get(trackingNumber);

    if (!state) {
      return null;
    }

    const now = Date.now();
    let { status } = state;

    if (now - state.lastTransition > MOCK_TRANSITION_INTERVAL_MS) {
      status = this.nextMockStatus(state.status);
      this.mockState.set(trackingNumber, {
        status,
        lastTransition: now,
      });
    }

    return {
      trackingNumber,
      status,
      detail: `Mock status: ${status.replace(/_/g, ' ').toLowerCase()}`,
      occurredAt: new Date(now),
      trackingUrl: `https://example.test/track/${trackingNumber}`,
    };
  }

  private nextMockStatus(current: ShipmentTrackingStatus): ShipmentTrackingStatus {
    switch (current) {
      case ShipmentTrackingStatus.LABEL_PURCHASED:
        return ShipmentTrackingStatus.IN_TRANSIT;
      case ShipmentTrackingStatus.IN_TRANSIT:
        return ShipmentTrackingStatus.OUT_FOR_DELIVERY;
      case ShipmentTrackingStatus.OUT_FOR_DELIVERY:
        return ShipmentTrackingStatus.DELIVERED;
      default:
        return current;
    }
  }

  private normalizeStatus(status: string): ShipmentTrackingStatus {
    const normalized = status.toLowerCase();

    if (normalized.includes('out_for_delivery') || normalized.includes('out-for-delivery')) {
      return ShipmentTrackingStatus.OUT_FOR_DELIVERY;
    }

    if (
      normalized.includes('in_transit') ||
      normalized.includes('in-transit') ||
      normalized.includes('transit')
    ) {
      return ShipmentTrackingStatus.IN_TRANSIT;
    }

    if (
      normalized.includes('label') ||
      normalized.includes('purchased') ||
      normalized.includes('created')
    ) {
      return ShipmentTrackingStatus.LABEL_PURCHASED;
    }

    if (normalized.includes('deliver')) {
      return ShipmentTrackingStatus.DELIVERED;
    }

    if (
      normalized.includes('exception') ||
      normalized.includes('failed') ||
      normalized.includes('return')
    ) {
      return ShipmentTrackingStatus.EXCEPTION;
    }

    return ShipmentTrackingStatus.UNKNOWN;
  }
}

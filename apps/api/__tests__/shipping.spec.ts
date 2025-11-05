import { NextRequest } from 'next/server';

jest.mock('@prisma/client', () => ({
  ShipmentStatus: {
    PREPARING: 'PREPARING',
    SHIPPED: 'SHIPPED',
    DELIVERED: 'DELIVERED',
    RETURNED: 'RETURNED',
    LOST: 'LOST',
  },
  ShipmentTrackingStatus: {
    UNKNOWN: 'UNKNOWN',
    LABEL_PURCHASED: 'LABEL_PURCHASED',
    IN_TRANSIT: 'IN_TRANSIT',
    OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
    DELIVERED: 'DELIVERED',
    EXCEPTION: 'EXCEPTION',
  },
  NotificationType: {
    ORDER_UPDATED: 'ORDER_UPDATED',
  },
  OrderEventType: {
    NOTE: 'NOTE',
  },
  AddressType: {
    SHIPPING: 'SHIPPING',
    BILLING: 'BILLING',
  },
}));

type PrismaMock = {
  shipment: {
    findFirst: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  notification: {
    create: jest.Mock;
  };
};

const updateShipmentStatus = jest.fn();
const addTimelineEvent = jest.fn();
const prismaMock: PrismaMock = {
  shipment: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  notification: {
    create: jest.fn(),
  },
};

jest.mock('@possiblewebsite/db', () => ({
  OrderRepository: jest.fn().mockImplementation(() => ({
    updateShipmentStatus,
    addTimelineEvent,
  })),
  prisma: prismaMock,
}));

const enqueueShipmentTrackingPoll = jest.fn();

jest.mock('../lib/queues.js', () => ({
  enqueueShipmentTrackingPoll,
}));

const releasePayoutForOrder = jest.fn();

jest.mock('../lib/payouts.js', () => ({
  releasePayoutForOrder,
}));

const mockProvider = {
  verifyWebhookSignature: jest.fn(),
  parseWebhookEvent: jest.fn(),
};

jest.mock('../lib/shipping/index.js', () => ({
  getShippingProvider: () => mockProvider,
}));

let ShipmentStatus: any;
let ShipmentTrackingStatus: any;
let applyTrackingUpdate: (typeof import('../lib/shipping/service.js'))['applyTrackingUpdate'];

beforeAll(async () => {
  ({ ShipmentStatus, ShipmentTrackingStatus } = await import('@prisma/client'));
  ({ applyTrackingUpdate } = await import('../lib/shipping/service.js'));
});

const resetMocks = () => {
  updateShipmentStatus.mockReset();
  addTimelineEvent.mockReset();
  prismaMock.shipment.findFirst.mockReset();
  prismaMock.shipment.findUnique.mockReset();
  prismaMock.shipment.update.mockReset();
  prismaMock.notification.create.mockReset();
  enqueueShipmentTrackingPoll.mockReset();
  releasePayoutForOrder.mockReset();
  mockProvider.verifyWebhookSignature.mockReset();
  mockProvider.parseWebhookEvent.mockReset();
};

describe('applyTrackingUpdate', () => {
  beforeEach(() => {
    resetMocks();
    jest.useFakeTimers().setSystemTime(new Date('2024-05-30T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('records delivered shipments and releases payouts', async () => {
    prismaMock.shipment.findFirst.mockResolvedValue({
      id: 'ship_1',
      orderId: 'order_1',
      trackingNumber: 'TRACK123',
      carrier: 'USPS',
      trackingUrl: null,
      order: {
        id: 'order_1',
        buyerId: 'buyer_1',
        buyer: { id: 'buyer_1', displayName: 'Buyer' },
        seller: { id: 'seller_1', displayName: 'Seller' },
      },
    });

    await applyTrackingUpdate(
      'TRACK123',
      {
        status: ShipmentTrackingStatus.DELIVERED,
        detail: 'Package delivered',
        occurredAt: new Date('2024-05-30T11:45:00Z'),
        trackingUrl: 'https://track.test/TRACK123',
        carrier: 'USPS',
      },
      'webhook',
    );

    expect(updateShipmentStatus).toHaveBeenCalledWith(
      'order_1',
      ShipmentStatus.DELIVERED,
      'TRACK123',
      expect.objectContaining({
        trackingStatus: ShipmentTrackingStatus.DELIVERED,
        trackingUrl: 'https://track.test/TRACK123',
        carrier: 'USPS',
      }),
    );
    expect(addTimelineEvent).toHaveBeenCalled();
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'buyer_1',
          payload: expect.objectContaining({ status: ShipmentStatus.DELIVERED }),
        }),
      }),
    );
    expect(releasePayoutForOrder).toHaveBeenCalledWith('order_1');
    expect(enqueueShipmentTrackingPoll).not.toHaveBeenCalled();
  });

  it('schedules polling for in-transit shipments', async () => {
    prismaMock.shipment.findFirst.mockResolvedValue({
      id: 'ship_2',
      orderId: 'order_2',
      trackingNumber: 'TRACK456',
      carrier: 'UPS',
      trackingUrl: null,
      order: {
        id: 'order_2',
        buyerId: 'buyer_2',
        buyer: { id: 'buyer_2', displayName: 'Buyer Two' },
        seller: { id: 'seller_2', displayName: 'Seller Two' },
      },
    });

    await applyTrackingUpdate(
      'TRACK456',
      {
        status: ShipmentTrackingStatus.IN_TRANSIT,
        detail: 'In transit',
        occurredAt: new Date('2024-05-30T11:30:00Z'),
        trackingUrl: 'https://track.test/TRACK456',
        carrier: 'UPS',
      },
      'poller',
    );

    expect(updateShipmentStatus).toHaveBeenCalledWith(
      'order_2',
      ShipmentStatus.SHIPPED,
      'TRACK456',
      expect.objectContaining({ trackingStatus: ShipmentTrackingStatus.IN_TRANSIT }),
    );
    expect(enqueueShipmentTrackingPoll).toHaveBeenCalledWith('ship_2', expect.any(Date));
    const scheduledAt = (enqueueShipmentTrackingPoll.mock.calls[0] as [string, Date])[1];
    expect(scheduledAt.getTime()).toBeGreaterThan(Date.now());
    expect(releasePayoutForOrder).not.toHaveBeenCalled();
  });
});

describe('shipping webhook route', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('verifies signature and applies tracking updates', async () => {
    mockProvider.verifyWebhookSignature.mockResolvedValue(true);
    mockProvider.parseWebhookEvent.mockResolvedValue({
      type: 'tracking.updated',
      trackingNumber: 'TRACK123',
      status: ShipmentTrackingStatus.IN_TRANSIT,
      detail: 'In transit',
      occurredAt: new Date('2024-05-30T11:00:00Z'),
      trackingUrl: 'https://track.test/TRACK123',
      carrier: 'USPS',
      raw: {},
    });

    const payload = {
      type: 'tracking.updated',
      trackingNumber: 'TRACK123',
      status: 'in_transit',
    };

    prismaMock.shipment.findFirst.mockResolvedValue({
      id: 'ship_webhook',
      orderId: 'order_webhook',
      trackingNumber: 'TRACK123',
      carrier: 'USPS',
      trackingUrl: null,
      order: {
        id: 'order_webhook',
        buyerId: 'buyer_webhook',
        buyer: { id: 'buyer_webhook', displayName: 'Buyer Webhook' },
        seller: { id: 'seller_webhook', displayName: 'Seller Webhook' },
      },
    });

    const request = new NextRequest('http://localhost/api/shipping/webhook', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: new Headers({
        'content-type': 'application/json',
        'x-pirateship-signature': 'signature',
        'x-pirateship-timestamp': '123',
      }),
    });

    const { POST } = await import('../app/api/shipping/webhook/route');
    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(mockProvider.verifyWebhookSignature).toHaveBeenCalled();
    expect(mockProvider.parseWebhookEvent).toHaveBeenCalled();
    expect(updateShipmentStatus).toHaveBeenCalled();
  });

  it('rejects invalid signatures', async () => {
    mockProvider.verifyWebhookSignature.mockResolvedValue(false);

    const request = new NextRequest('http://localhost/api/shipping/webhook', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: new Headers({
        'content-type': 'application/json',
        'x-pirateship-signature': 'invalid',
        'x-pirateship-timestamp': '123',
      }),
    });

    const { POST } = await import('../app/api/shipping/webhook/route');
    const response = await POST(request);

    expect(response.status).toBe(401);
    expect(updateShipmentStatus).not.toHaveBeenCalled();
  });
});

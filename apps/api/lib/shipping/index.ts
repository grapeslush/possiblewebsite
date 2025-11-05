import { PirateShipAdapter } from './pirate-ship.js';
import type { ShippingProvider } from './provider.js';

let provider: ShippingProvider | null = null;

export const getShippingProvider = (): ShippingProvider => {
  if (!provider) {
    provider = new PirateShipAdapter({
      apiKey: process.env.PIRATESHIP_API_KEY,
      baseUrl: process.env.PIRATESHIP_API_URL,
      webhookSecret: process.env.PIRATESHIP_WEBHOOK_SECRET,
      mock: process.env.PIRATESHIP_USE_MOCK === 'true' || !process.env.PIRATESHIP_API_KEY,
    });
  }

  return provider;
};

export * from './provider.js';
export { PirateShipAdapter } from './pirate-ship.js';

jest.mock('@possiblewebsite/db', () => ({
  PaymentRepository: class {},
  prisma: {},
}));

import { calculateFinancialBreakdown } from '../lib/stripe.js';

describe('financial breakdown calculations', () => {
  it('applies fee, tax, and escrow percentages', () => {
    const breakdown = calculateFinancialBreakdown(100, {
      applicationFeePercent: 10,
      taxRatePercent: 5,
      escrowPercent: 50,
    });

    expect(breakdown.applicationFeeAmount).toBe(10);
    expect(breakdown.taxAmount).toBe(5);
    expect(breakdown.escrowAmount).toBe(42.5);
  });

  it('defaults escrow to remaining balance when not provided', () => {
    const breakdown = calculateFinancialBreakdown(200, {
      applicationFeePercent: 5,
      taxRatePercent: 5,
    });

    expect(breakdown.applicationFeeAmount).toBe(10);
    expect(breakdown.taxAmount).toBe(10);
    expect(breakdown.escrowAmount).toBe(180);
  });
});

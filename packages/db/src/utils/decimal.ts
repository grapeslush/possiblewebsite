import { Prisma } from '@prisma/client';

export const toDecimal = (value: number | string | Prisma.Decimal) => {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  return typeof value === 'number' ? new Prisma.Decimal(value) : new Prisma.Decimal(value);
};

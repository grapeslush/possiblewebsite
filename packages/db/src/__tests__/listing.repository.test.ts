import { ListingStatus, PrismaClient } from '@prisma/client';
import { ListingRepository } from '../repositories/listing.repository.js';

describe('ListingRepository', () => {
  it('publishes a listing by setting the correct status and timestamp', async () => {
    const updateMock = jest.fn().mockResolvedValue({ id: 'listing-1', status: ListingStatus.ACTIVE });
    const prisma = { listing: { update: updateMock } } as unknown as PrismaClient;
    const repository = new ListingRepository(prisma);

    await repository.publishListing('listing-1');

    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'listing-1' },
        data: expect.objectContaining({ status: ListingStatus.ACTIVE })
      })
    );
  });

  it('applies search filters when finding listings', async () => {
    const findManyMock = jest.fn().mockResolvedValue([]);
    const prisma = { listing: { findMany: findManyMock } } as unknown as PrismaClient;
    const repository = new ListingRepository(prisma);

    await repository.findListings({ sellerId: 'seller-1', searchTerm: 'vintage' });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sellerId: 'seller-1',
          OR: expect.arrayContaining([
            expect.objectContaining({ title: expect.objectContaining({ contains: 'vintage' }) })
          ])
        })
      })
    );
  });
});

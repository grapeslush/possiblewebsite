import { faker } from '@faker-js/faker';
import { authenticator } from 'otplib';
import type { PolicyAcceptance, PrismaClient, TotpDevice, User } from '@prisma/client';
import { AuthService } from '../services/auth.service';

type PrismaMock = jest.Mocked<PrismaClient>;

const buildPrisma = (): PrismaMock => {
  const prisma = {
    verificationToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    policyAcceptance: {
      create: jest.fn(),
    },
    totpDevice: {
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(async (operations: readonly Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  } satisfies Record<string, unknown>;

  return prisma as unknown as PrismaMock;
};

describe('AuthService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates an email verification token', async () => {
    const prisma = buildPrisma();
    const service = new AuthService(prisma);
    const user = { id: faker.string.uuid(), email: faker.internet.email() } as Pick<
      User,
      'id' | 'email'
    >;

    const result = await service.createEmailVerificationToken(user);

    expect(result.token).toHaveLength(64);
    expect(prisma.verificationToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ identifier: user.email }),
      }),
    );
  });

  it('verifies email token and marks user verified', async () => {
    const prisma = buildPrisma();
    const service = new AuthService(prisma);
    const token = faker.string.alphanumeric(32);
    const user = { id: faker.string.uuid(), email: faker.internet.email() } as User;
    const record = {
      identifier: user.email,
      token,
      expires: new Date(Date.now() + 1000),
    };

    (prisma.verificationToken.findUnique as unknown as jest.Mock).mockResolvedValue(record);
    (prisma.user.findUnique as unknown as jest.Mock).mockResolvedValue(user);
    (prisma.$transaction as unknown as jest.Mock).mockImplementation(
      async (operations: readonly Promise<unknown>[]) => {
        await Promise.all(operations);
        return operations;
      },
    );

    const userId = await service.verifyEmailToken(token);

    expect(userId).toBe(user.id);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ emailVerified: expect.any(Date) }),
      }),
    );
  });

  it('detects missing policy acceptance', () => {
    const acceptances: PolicyAcceptance[] = [
      {
        id: faker.string.uuid(),
        userId: faker.string.uuid(),
        policyId: 'terms',
        policyVersion: '2024-01-01',
        acceptedAt: new Date(),
        ipAddress: null,
      },
      {
        id: faker.string.uuid(),
        userId: faker.string.uuid(),
        policyId: 'privacy',
        policyVersion: '2024-01-01',
        acceptedAt: new Date(),
        ipAddress: null,
      },
    ];

    const prisma = buildPrisma();
    const service = new AuthService(prisma);

    expect(service.hasAcceptedPolicy('terms', '2024-01-01', acceptances)).toBe(true);
    expect(service.hasAcceptedPolicy('terms', '2024-05-01', acceptances)).toBe(false);
  });

  it('generates and validates totp codes', async () => {
    const prisma = buildPrisma();
    const service = new AuthService(prisma);
    const { secret } = service.generateTotpSecret('user@example.com', 'TackleExchange');
    const device: TotpDevice = {
      id: faker.string.uuid(),
      userId: faker.string.uuid(),
      secret,
      label: null,
      verifiedAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
    };

    (prisma.totpDevice.update as unknown as jest.Mock).mockResolvedValue(device);
    (prisma.user.update as unknown as jest.Mock).mockResolvedValue({});

    const token = authenticator.generate(secret);
    const verified = await service.verifyTotpCode(device, token);

    expect(verified).toBe(true);
    expect(prisma.totpDevice.update).toHaveBeenCalled();
  });

  it('calculates adult age correctly', () => {
    expect(AuthService.isAdult(new Date('2000-01-01'))).toBe(true);
    expect(AuthService.isAdult(new Date('2010-01-02'))).toBe(false);
  });
});

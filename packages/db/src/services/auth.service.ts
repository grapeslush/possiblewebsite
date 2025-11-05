import { randomBytes, timingSafeEqual } from 'crypto';
import { authenticator } from 'otplib';
import type { PolicyAcceptance, PrismaClient, TotpDevice, User } from '@prisma/client';

const EMAIL_VERIFICATION_TTL = 1000 * 60 * 60 * 24; // 24 hours

export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  async createEmailVerificationToken(user: Pick<User, 'id' | 'email'>) {
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + EMAIL_VERIFICATION_TTL);

    await this.prisma.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires
      }
    });

    return { token, expires };
  }

  async verifyEmailToken(token: string) {
    const record = await this.prisma.verificationToken.findUnique({
      where: { token }
    });

    if (!record) {
      return null;
    }

    if (record.expires.getTime() < Date.now()) {
      await this.prisma.verificationToken.delete({ where: { token } });
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { email: record.identifier }
    });

    if (!user) {
      await this.prisma.verificationToken.delete({ where: { token } });
      return null;
    }

    await this.prisma.$transaction([
      this.prisma.verificationToken.delete({ where: { token } }),
      this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() }
      })
    ]);

    return user.id;
  }

  async recordPolicyAcceptance(
    userId: string,
    policy: string,
    version: string,
    ipAddress?: string | null
  ) {
    return this.prisma.policyAcceptance.create({
      data: {
        userId,
        policy,
        version,
        ipAddress: ipAddress ?? undefined
      }
    });
  }

  hasAcceptedPolicy(
    policy: string,
    version: string,
    acceptances: PolicyAcceptance[]
  ) {
    return acceptances.some((acceptance) => acceptance.policy === policy && acceptance.version === version);
  }

  generateTotpSecret(label: string, issuer: string) {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(label, issuer, secret);
    return { secret, otpauthUrl: otpauth };
  }

  async createTotpDevice(userId: string, secret: string, label?: string | null) {
    return this.prisma.totpDevice.create({
      data: {
        userId,
        secret,
        label: label ?? undefined
      }
    });
  }

  async verifyTotpCode(device: TotpDevice, token: string) {
    const isValid = authenticator.verify({ token, secret: device.secret });

    if (!isValid) {
      return false;
    }

    await this.prisma.totpDevice.update({
      where: { id: device.id },
      data: { verifiedAt: device.verifiedAt ?? new Date(), lastUsedAt: new Date() }
    });

    if (!device.verifiedAt) {
      await this.prisma.user.update({
        where: { id: device.userId },
        data: { twoFactorEnabled: true, twoFactorSecret: device.secret }
      });
    }

    return true;
  }

  async disableTwoFactor(userId: string) {
    await this.prisma.$transaction([
      this.prisma.totpDevice.deleteMany({ where: { userId } }),
      this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: false, twoFactorSecret: null }
      })
    ]);
  }

  static isAdult(dateOfBirth: Date, minimumAge = 18) {
    const today = new Date();
    const ageDiff = today.getFullYear() - dateOfBirth.getFullYear();
    if (ageDiff > minimumAge) return true;
    if (ageDiff < minimumAge) return false;

    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff > 0) return true;
    if (monthDiff < 0) return false;

    return today.getDate() >= dateOfBirth.getDate();
  }

  static safeCompare(a: string, b: string) {
    const aBuffer = Buffer.from(a);
    const bBuffer = Buffer.from(b);
    return (
      aBuffer.length === bBuffer.length &&
      timingSafeEqual(aBuffer, bBuffer)
    );
  }
}

export default AuthService;

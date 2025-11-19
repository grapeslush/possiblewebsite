import { hash } from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { exec as execCallback } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import util from 'node:util';

import { logger } from './observability';
import { prisma } from './services';

const execAsync = util.promisify(execCallback);

const CONFIG_PATH = process.env.CONFIG_FILE_PATH ?? '/var/lib/possible/config.env';
const STATE_PATH = path.join(path.dirname(CONFIG_PATH), 'setup-state.json');
const ONBOARDING_STATE_KEY = 'platform.onboarding';

const REQUIRED_KEYS = [
  'DATABASE_URL',
  'OBJECT_STORAGE_BUCKET',
  'OBJECT_STORAGE_ACCESS_KEY',
  'OBJECT_STORAGE_SECRET_KEY',
  'OBJECT_STORAGE_ENDPOINT',
  'NEXTAUTH_SECRET',
];

interface SetupStateEntry {
  ranAt: string;
  status: 'succeeded' | 'failed';
  message?: string;
}

interface SetupState {
  migrations?: SetupStateEntry;
  seed?: SetupStateEntry;
}

type OnboardingState = {
  completed: boolean;
  completedAt?: string;
  migrationsRanAt?: string;
  seedRanAt?: string;
};

const parseEnvFile = (content: string): Record<string, string> => {
  const lines = content.split(/\r?\n/);
  const entries: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const [key, ...rest] = trimmed.split('=');
    const value = rest.join('=');
    if (key) {
      entries[key] = value.replace(/^"|"$/g, '');
    }
  }

  return entries;
};

async function readPersistedConfig(): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(CONFIG_PATH, 'utf-8');
    return parseEnvFile(raw);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

const serializeEnv = (env: Record<string, string>): string =>
  Object.entries(env)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join('\n');

async function writeConfigFile(env: Record<string, string>) {
  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, serializeEnv(env), 'utf-8');
}

export async function applyPersistedConfigToEnv() {
  try {
    const fileConfig = await readPersistedConfig();
    for (const [key, value] of Object.entries(fileConfig)) {
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    logger.warn({ err: error }, 'failed to hydrate environment from config file');
  }
}

export async function persistConfig(updates: Record<string, string>) {
  const existing = await readPersistedConfig();
  const merged = { ...existing, ...updates };

  await writeConfigFile(merged);

  for (const [key, value] of Object.entries(updates)) {
    process.env[key] = value;
  }

  if (process.env.NODE_ENV === 'production') {
    logger.info({ updates }, 'persisted config updated, scheduling restart');
    setTimeout(() => process.exit(0), 150);
  } else {
    logger.info({ updates }, 'persisted config updated, hot reloaded env vars');
  }

  return { path: CONFIG_PATH, keys: Object.keys(updates) };
}

async function readSetupState(): Promise<SetupState> {
  try {
    const raw = await fs.readFile(STATE_PATH, 'utf-8');
    return JSON.parse(raw) as SetupState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    throw error;
  }
}

const parseOnboardingState = (value: Prisma.JsonValue | null | undefined): OnboardingState => {
  const payload = value as Prisma.JsonObject | undefined;
  const completedAt = typeof payload?.completedAt === 'string' ? payload.completedAt : undefined;
  const migrationsRanAt =
    typeof payload?.migrationsRanAt === 'string' ? payload.migrationsRanAt : undefined;
  const seedRanAt = typeof payload?.seedRanAt === 'string' ? payload.seedRanAt : undefined;

  return {
    completed: payload?.completed === true,
    completedAt,
    migrationsRanAt,
    seedRanAt,
  };
};

async function readOnboardingState(): Promise<OnboardingState> {
  try {
    const record = await prisma.platformSetting.findUnique({
      where: { key: ONBOARDING_STATE_KEY },
    });
    return parseOnboardingState(record?.value);
  } catch (error) {
    logger.warn({ err: error }, 'unable to read onboarding state');
    return { completed: false };
  }
}

async function writeOnboardingState(state: OnboardingState) {
  await prisma.platformSetting.upsert({
    where: { key: ONBOARDING_STATE_KEY },
    update: { value: state },
    create: { key: ONBOARDING_STATE_KEY, value: state },
  });
}

async function writeSetupState(update: Partial<SetupState>) {
  const current = await readSetupState();
  const merged = { ...current, ...update } satisfies SetupState;
  await fs.mkdir(path.dirname(STATE_PATH), { recursive: true });
  await fs.writeFile(STATE_PATH, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

const configHasMail = (env: Record<string, string | undefined>) =>
  Boolean(env.POSTMARK_SERVER_TOKEN || env.SENDGRID_API_KEY);

export async function getSetupStatus() {
  const persisted = await readPersistedConfig();
  const env = { ...persisted, ...process.env } as Record<string, string | undefined>;

  const missingKeys = REQUIRED_KEYS.filter((key) => !env[key]);
  if (!configHasMail(env)) {
    missingKeys.push('MAIL_PROVIDER');
  }

  let databaseConnected = false;
  let migrationsApplied = false;
  let latestMigration: string | null = null;
  let seeded = false;
  let seedSummary: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseConnected = true;

    try {
      const migrationRows =
        (await prisma.$queryRaw`SELECT id, finished_at FROM "_prisma_migrations" ORDER BY finished_at DESC LIMIT 1`) as
          | { id: string; finished_at: Date | null }[]
          | Prisma.JsonObject;

      if (Array.isArray(migrationRows) && migrationRows.length > 0) {
        migrationsApplied = true;
        const latestMigrationRow = migrationRows[0]!;
        latestMigration = latestMigrationRow.finished_at
          ? new Date(latestMigrationRow.finished_at).toISOString()
          : null;
      }
    } catch (migrationError) {
      logger.warn({ err: migrationError }, 'migration status lookup failed');
    }

    try {
      const [userCount, listingCount] = await Promise.all([
        prisma.user.count(),
        prisma.listing.count(),
      ]);
      seeded = userCount > 0 && listingCount > 0;
      seedSummary = `${userCount} users / ${listingCount} listings`;
    } catch (seedError) {
      logger.warn({ err: seedError }, 'seed status lookup failed');
    }
  } catch (error) {
    logger.warn({ err: error }, 'database connectivity check failed');
  }

  const state = await readSetupState();
  const onboarding = await readOnboardingState();

  return {
    ready: missingKeys.length === 0 && databaseConnected,
    missingKeys,
    databaseConnected,
    configPath: CONFIG_PATH,
    mailConfigured: configHasMail(env),
    objectStorageConfigured:
      Boolean(env.OBJECT_STORAGE_BUCKET) &&
      Boolean(env.OBJECT_STORAGE_ACCESS_KEY) &&
      Boolean(env.OBJECT_STORAGE_SECRET_KEY) &&
      Boolean(env.OBJECT_STORAGE_ENDPOINT),
    migrations: {
      applied: migrationsApplied,
      lastFinishedAt: latestMigration,
      lastRun: state.migrations,
    },
    seed: {
      seeded,
      summary: seedSummary,
      lastRun: state.seed,
    },
    onboardingComplete: onboarding.completed,
    onboardingCompletedAt: onboarding.completedAt ?? null,
  };
}

export async function runMigrations() {
  const ranAt = new Date().toISOString();
  try {
    const result = await execAsync('pnpm --filter @possiblewebsite/db prisma:migrate', {
      cwd: path.resolve(process.cwd()),
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
    });

    await writeSetupState({
      migrations: { ranAt, status: 'succeeded', message: result.stdout.slice(-2000) },
    });

    return { ok: true, output: result.stdout, ranAt } as const;
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr ?? (error as Error).message;
    await writeSetupState({
      migrations: { ranAt, status: 'failed', message: stderr.slice(-2000) },
    });
    logger.error({ err: error }, 'migration run failed');
    return { ok: false, error: stderr, ranAt } as const;
  }
}

export async function runSeed() {
  const ranAt = new Date().toISOString();
  try {
    const result = await execAsync('pnpm --filter @possiblewebsite/db prisma:seed', {
      cwd: path.resolve(process.cwd()),
      env: process.env,
      maxBuffer: 10 * 1024 * 1024,
    });

    await writeSetupState({
      seed: { ranAt, status: 'succeeded', message: result.stdout.slice(-2000) },
    });

    return { ok: true, output: result.stdout, ranAt } as const;
  } catch (error) {
    const stderr = (error as { stderr?: string }).stderr ?? (error as Error).message;
    await writeSetupState({ seed: { ranAt, status: 'failed', message: stderr.slice(-2000) } });
    logger.error({ err: error }, 'seed run failed');
    return { ok: false, error: stderr, ranAt } as const;
  }
}

export async function getOnboardingStatus() {
  return readOnboardingState();
}

export async function initializePlatform() {
  const onboarding = await readOnboardingState();

  if (onboarding.completed) {
    return {
      ok: true,
      alreadyCompleted: true,
      completedAt: onboarding.completedAt ?? null,
      migrationsRanAt: onboarding.migrationsRanAt ?? null,
      seedRanAt: onboarding.seedRanAt ?? null,
    } as const;
  }

  try {
    const migrationResult = await runMigrations();
    if (!migrationResult.ok) {
      return { ok: false, error: migrationResult.error, ranAt: migrationResult.ranAt } as const;
    }

    let seedRanAt = onboarding.seedRanAt ?? null;

    if (!seedRanAt) {
      const seedResult = await runSeed();
      if (!seedResult.ok) {
        return { ok: false, error: seedResult.error, ranAt: seedResult.ranAt } as const;
      }

      seedRanAt = seedResult.ranAt;
    }

    const completedAt = new Date().toISOString();
    await writeOnboardingState({
      completed: true,
      completedAt,
      migrationsRanAt: migrationResult.ranAt,
      seedRanAt,
    });

    return {
      ok: true,
      alreadyCompleted: false,
      completedAt,
      migrationsRanAt: migrationResult.ranAt,
      seedRanAt,
    } as const;
  } catch (error) {
    logger.error({ err: error }, 'platform initialization failed');
    return { ok: false, error: (error as Error).message } as const;
  }
}

const defaultPolicyCopy = (title: string) =>
  `${title} placeholder created during setup so new accounts can sign in.`;

const ensureDefaultPolicies = async (version: string) =>
  prisma.$transaction([
    prisma.policy.upsert({
      where: { id: 'terms-of-service' },
      update: { version, slug: 'terms-of-service', title: 'Terms of Service', isActive: true },
      create: {
        id: 'terms-of-service',
        slug: 'terms-of-service',
        title: 'Terms of Service',
        category: 'compliance',
        summary: 'Required to access the marketplace.',
        body: defaultPolicyCopy('Terms of Service'),
        isActive: true,
        publishedAt: new Date(),
        version,
      },
    }),
    prisma.policy.upsert({
      where: { id: 'privacy-policy' },
      update: { version, slug: 'privacy-policy', title: 'Privacy Policy', isActive: true },
      create: {
        id: 'privacy-policy',
        slug: 'privacy-policy',
        title: 'Privacy Policy',
        category: 'compliance',
        summary: 'Explains how customer data is handled.',
        body: defaultPolicyCopy('Privacy Policy'),
        isActive: true,
        publishedAt: new Date(),
        version,
      },
    }),
  ]);

export async function createAdminAccount(params: {
  email: string;
  password: string;
  displayName: string;
}) {
  const normalizedEmail = params.email.toLowerCase();
  const passwordHash = await hash(params.password, 10);
  const policyVersion = process.env.NEXT_PUBLIC_TERMS_VERSION ?? '2024-01-01';

  await ensureDefaultPolicies(policyVersion);

  const admin = await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: {
      displayName: params.displayName,
      passwordHash,
      role: 'ADMIN',
      emailVerified: new Date(),
      ageVerifiedAt: new Date(),
      dateOfBirth: new Date('1988-01-01T00:00:00Z'),
    },
    create: {
      email: normalizedEmail,
      passwordHash,
      displayName: params.displayName,
      role: 'ADMIN',
      emailVerified: new Date(),
      ageVerifiedAt: new Date(),
      dateOfBirth: new Date('1988-01-01T00:00:00Z'),
      policyAcceptances: {
        create: [
          {
            policyId: 'terms-of-service',
            policyVersion,
            acceptedAt: new Date(),
          },
          {
            policyId: 'privacy-policy',
            policyVersion,
            acceptedAt: new Date(),
          },
        ],
      },
    },
  });

  await prisma.policyAcceptance.deleteMany({
    where: { userId: admin.id, policyId: { in: ['terms-of-service', 'privacy-policy'] } },
  });

  await prisma.policyAcceptance.createMany({
    data: [
      {
        userId: admin.id,
        policyId: 'terms-of-service',
        policyVersion,
        acceptedAt: new Date(),
      },
      {
        userId: admin.id,
        policyId: 'privacy-policy',
        policyVersion,
        acceptedAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  return admin;
}

export { CONFIG_PATH };

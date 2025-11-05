import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

let cachedClient: S3Client | null = null;

const getClient = () => {
  if (!process.env.OBJECT_STORAGE_BUCKET) {
    return null;
  }

  if (!cachedClient) {
    cachedClient = new S3Client({
      region: process.env.OBJECT_STORAGE_REGION ?? 'us-east-1',
      endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
      forcePathStyle: Boolean(process.env.OBJECT_STORAGE_ENDPOINT),
      credentials:
        process.env.OBJECT_STORAGE_ACCESS_KEY && process.env.OBJECT_STORAGE_SECRET_KEY
          ? {
              accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY,
              secretAccessKey: process.env.OBJECT_STORAGE_SECRET_KEY,
            }
          : undefined,
    });
  }

  return cachedClient;
};

export interface UploadResult {
  key: string;
  url: string;
}

const uploadToDisk = async (prefix: string, buffer: Buffer): Promise<UploadResult> => {
  const uploadsDir = path.join(process.cwd(), 'public', prefix);
  await fs.mkdir(uploadsDir, { recursive: true });
  const key = `${randomUUID()}.bin`;
  const filePath = path.join(uploadsDir, key);
  await fs.writeFile(filePath, buffer);
  return { key: `${prefix}/${key}`, url: `/${prefix}/${key}` };
};

export const uploadBinary = async (
  prefix: string,
  buffer: Buffer,
  contentType?: string,
): Promise<UploadResult> => {
  const client = getClient();

  if (!client || !process.env.OBJECT_STORAGE_BUCKET) {
    return uploadToDisk(prefix, buffer);
  }

  const key = `${prefix.replace(/\/$/, '')}/${randomUUID()}`;

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.OBJECT_STORAGE_BUCKET,
      Key: key,
      Body: buffer,
      ACL: 'private',
      ContentType: contentType ?? 'application/octet-stream',
    }),
  );

  const base = process.env.OBJECT_STORAGE_PUBLIC_URL
    ? process.env.OBJECT_STORAGE_PUBLIC_URL.replace(/\/$/, '')
    : `https://${process.env.OBJECT_STORAGE_BUCKET}.s3.amazonaws.com`;

  return {
    key,
    url: `${base}/${key}`,
  };
};

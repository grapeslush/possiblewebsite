import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { incrementMetric, logger, withTiming } from '@/lib/observability';

export const runtime = 'nodejs';

const uploadSchema = z.object({
  fileName: z.string().min(1).optional(),
  contentType: z.string().min(1).optional()
});

const getS3Client = () => {
  if (!process.env.OBJECT_STORAGE_BUCKET) {
    return null;
  }

  return new S3Client({
    region: process.env.OBJECT_STORAGE_REGION ?? 'us-east-1',
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT,
    forcePathStyle: Boolean(process.env.OBJECT_STORAGE_ENDPOINT),
    credentials:
      process.env.OBJECT_STORAGE_ACCESS_KEY && process.env.OBJECT_STORAGE_SECRET_KEY
        ? {
            accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY,
            secretAccessKey: process.env.OBJECT_STORAGE_SECRET_KEY
          }
        : undefined
  });
};

async function uploadToDisk(key: string, buffer: Buffer) {
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });
  const destination = path.join(uploadsDir, key);
  await fs.writeFile(destination, buffer);
  return `/uploads/${key}`;
}

async function uploadToObjectStore(key: string, buffer: Buffer, contentType?: string | null) {
  const client = getS3Client();

  if (!client || !process.env.OBJECT_STORAGE_BUCKET) {
    return uploadToDisk(key, buffer);
  }

  await client.send(
    new PutObjectCommand({
      Bucket: process.env.OBJECT_STORAGE_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType ?? undefined,
      ACL: 'public-read'
    })
  );

  if (process.env.OBJECT_STORAGE_PUBLIC_URL) {
    return `${process.env.OBJECT_STORAGE_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  }

  return `https://${process.env.OBJECT_STORAGE_BUCKET}.s3.amazonaws.com/${key}`;
}

export async function POST(request: NextRequest) {
  return withTiming('ai.upload', async () => {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof Blob)) {
      incrementMetric('ai.upload.validation_error');
      logger.warn('Upload missing file');
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const parsedMeta = uploadSchema.safeParse({
      fileName: formData.get('fileName'),
      contentType: formData.get('contentType')
    });

    if (!parsedMeta.success) {
      incrementMetric('ai.upload.validation_error');
      return NextResponse.json({ error: 'Invalid upload metadata' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = parsedMeta.data.fileName ?? (file instanceof File ? file.name : 'upload');
    const extension = path.extname(fileName) || '.bin';
    const key = `listing-assets/${new Date().getUTCFullYear()}/${randomUUID()}${extension}`;

    incrementMetric('ai.upload.bytes', buffer.byteLength);

    const url = await uploadToObjectStore(key, buffer, parsedMeta.data.contentType ?? file.type);

    logger.info('upload completed', { key, url });

    return NextResponse.json({ key, url });
  });
}

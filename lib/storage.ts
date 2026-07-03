import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs/promises";
import path from "path";

// ---------------------------------------------------------------------------
// Storage adapter interface
// ---------------------------------------------------------------------------
export interface StorageAdapter {
  upload(key: string, data: Buffer, contentType: string): Promise<string>;
  download(key: string): Promise<Buffer>;
  getUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// S3 adapter
// ---------------------------------------------------------------------------
function createS3Adapter(): StorageAdapter {
  const bucket = process.env.S3_BUCKET!;
  const region = process.env.S3_REGION || "ap-south-1";

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  return {
    async upload(key, data, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: data,
          ContentType: contentType,
        }),
      );
      return key;
    },

    async download(key) {
      const res = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      const stream = res.Body as NodeJS.ReadableStream;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk as Uint8Array));
      }
      return Buffer.concat(chunks);
    },

    async getUrl(key) {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      return getSignedUrl(client, command, { expiresIn: 3600 });
    },

    async delete(key) {
      await client.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: key }),
      );
    },
  };
}

// ---------------------------------------------------------------------------
// Local filesystem adapter
// ---------------------------------------------------------------------------
function createLocalAdapter(): StorageAdapter {
  const storageDir = process.env.STORAGE_DIR || "./uploads";

  async function ensureDir(filePath: string) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
  }

  return {
    async upload(key, data, _contentType) {
      const filePath = path.join(storageDir, key);
      await ensureDir(filePath);
      await fs.writeFile(filePath, data);
      return key;
    },

    async download(key) {
      const filePath = path.join(storageDir, key);
      return fs.readFile(filePath);
    },

    async getUrl(key) {
      return path.join(storageDir, key);
    },

    async delete(key) {
      const filePath = path.join(storageDir, key);
      await fs.unlink(filePath);
    },
  };
}

// ---------------------------------------------------------------------------
// Exported singleton — S3 when S3_BUCKET is set, local otherwise
// ---------------------------------------------------------------------------
export const storage: StorageAdapter = process.env.S3_BUCKET
  ? createS3Adapter()
  : createLocalAdapter();

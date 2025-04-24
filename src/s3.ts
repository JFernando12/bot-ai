import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { ACCESS_KEY_ID, SECRET_ACCESS_KEY } from './config/environment';

const s3 = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY
  }
});
const BUCKET_NAME = 'cpa-test-1';

export async function uploadToS3(key: string, content: string) {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: content
  }));
}

export async function saveEmbeddingsToS3(service: string, data: any[]) {
  const key = `${service}/embeddings.json`;
  await uploadToS3(key, JSON.stringify(data));
}

export async function getEmbeddingsFromS3(service: string): Promise<{ chunk: string; embedding: number[] }[]> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: `${service}/embeddings.json`
  });
  const res = await s3.send(command);
  const body = res.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of body) chunks.push(chunk as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString());
}

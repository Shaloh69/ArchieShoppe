import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { env } from '../config/env';
import { prisma } from '../config/db';

const pythonClient = axios.create({
  baseURL: env.PYTHON_SERVER_URL,
  headers: { 'X-API-Key': env.PYTHON_API_KEY },
  timeout: 30000,
});

export interface ClassificationResult {
  verified: boolean;
  confidence: number;
  verdict: 'VERIFIED' | 'MANUAL_REVIEW' | 'REJECTED';
  details: Record<string, unknown>;
}

export async function extractFeatures(imagePath: string): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.append('file', fs.createReadStream(imagePath));

  const response = await pythonClient.post('/api/v1/extract-features', form, {
    headers: form.getHeaders(),
  });
  return response.data;
}

export async function verifyItem(
  referencePath: string,
  returnPath: string,
): Promise<ClassificationResult> {
  const form = new FormData();
  form.append('reference_image', fs.createReadStream(referencePath));
  form.append('return_image', fs.createReadStream(returnPath));

  const response = await pythonClient.post('/api/v1/verify', form, {
    headers: form.getHeaders(),
  });
  return response.data;
}

export async function recordCapture(
  slotId: string,
  captureType: 'PLACEMENT' | 'RETURN',
  imagePath: string,
  itemId?: string,
  classificationResult?: Record<string, unknown>,
) {
  return prisma.cameraCapture.create({
    data: {
      slotId,
      captureType,
      imagePath,
      itemId,
      classificationResult: (classificationResult as object) ?? undefined,
    },
  });
}

export async function getCaptures(slotId: string, limit = 20) {
  return prisma.cameraCapture.findMany({
    where: { slotId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { item: { select: { id: true, title: true } } },
  });
}

export async function checkPythonHealth(): Promise<boolean> {
  try {
    await pythonClient.get('/api/v1/health', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

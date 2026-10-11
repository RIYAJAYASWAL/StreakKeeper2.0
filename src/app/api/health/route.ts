import { NextResponse } from 'next/server';
import { prisma } from '@/server/lib/prisma';
import { logger } from '@/server/lib/logger';

export async function GET() {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const durationMs = Date.now() - startTime;

    return NextResponse.json(
      {
        data: {
          status: 'ok',
          uptime: process.uptime(),
          timestamp: new Date().toISOString(),
          database: {
            status: 'connected',
            latencyMs: durationMs,
          },
        },
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    logger.error('Health check failed', err);
    return NextResponse.json(
      {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Database health check failed',
        },
      },
      { status: 503 }
    );
  }
}

export async function HEAD() {
  return GET();
}

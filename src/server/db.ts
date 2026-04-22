import { PrismaClient } from '@prisma/client';

/**
 * Single Prisma client instance across hot reloads in dev, and across
 * module imports in prod. Do NOT `new PrismaClient()` anywhere else.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

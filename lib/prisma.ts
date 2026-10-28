import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    // Si no está definido en tiempo de build o runtime, devolvemos un cliente mockeable o con error controlado
    const adapter = new PrismaPg({ connectionString: "postgresql://postgres:postgres@localhost:5432/clubdefinanzas-db?schema=public" });
    return new PrismaClient({ adapter });
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

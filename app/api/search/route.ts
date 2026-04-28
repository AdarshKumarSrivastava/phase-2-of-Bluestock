import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Initialize Prisma Client with the pg adapter
const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('q');

  if (!searchTerm || searchTerm.length < 2) {
    return Response.json([]);
  }

  try {
    const villages = await prisma.village.findMany({
      where: {
        name: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      },
      take: 10,
      include: {
        subDistrict: {
          include: {
            district: {
              include: { state: true }
            }
          }
        }
      }
    });

    return Response.json(villages);
  } catch (error) {
    console.error("Prisma error:", error);
    return Response.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}

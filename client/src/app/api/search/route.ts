import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('q'); // The user's input

  if (!searchTerm || searchTerm.length < 2) {
    return Response.json([]);
  }

  const villages = await prisma.village.findMany({
    where: {
      name: {
        startsWith: searchTerm,
        mode: 'insensitive', // Finds "gorakhpur" or "Gorakhpur"
      },
    },
    take: 10, // Returns only the top 10 results for speed
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
}
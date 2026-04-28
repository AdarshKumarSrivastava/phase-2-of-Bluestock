import { defineConfig } from '@prisma/config';
import dotenv from 'dotenv';

dotenv.config({ override: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
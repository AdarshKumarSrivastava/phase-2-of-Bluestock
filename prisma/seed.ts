import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';

dotenv.config({ override: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in environment");
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalizeField(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function processCSV(filePath: string) {
  const fileName = path.basename(filePath);
  const rows: any[] = [];
  let successCount = 0;
  let errorCount = 0;

  return new Promise((resolve, reject) => {
    console.log(`\n📂 Reading file: ${fileName}`);
    
    fs.createReadStream(filePath)
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, ''),
      }))
      .on('data', (data) => rows.push(data))
      .on('error', (err) => reject(err))
      .on('end', async () => {
        console.log(`⏳ Processing ${rows.length} records from ${fileName}...`);

        for (const row of rows) {
          const stateCode = normalizeField(row['MDDS STC'] ?? row['\uFEFFMDDS STC']);
          const stateName = normalizeField(row['STATE NAME']);
          const districtCode = normalizeField(row['MDDS DTC']);
          const districtName = normalizeField(row['DISTRICT NAME']);
          const subDistrictCode = normalizeField(row['MDDS Sub_DT']);
          const subDistrictName = normalizeField(row['SUB-DISTRICT NAME']);
          const villageCode = normalizeField(row['MDDS PLCN']);
          const villageName = normalizeField(row['Area Name']);

          // 1. Clean data: Skip summary rows (PLCN 000000) or rows missing codes
          if (!villageCode || villageCode === '000000') continue;
          if (!stateCode || !stateName || !districtCode || !districtName || !subDistrictCode || !subDistrictName || !villageName) {
            errorCount++;
            if (errorCount <= 5) {
              console.error(`Skipping incomplete row in ${fileName}:`, row);
            }
            continue;
          }

          try {
            // 2. Nested Upsert: This creates/connects the hierarchy in one go
            await prisma.village.upsert({
              where: { code: villageCode },
              update: {}, // Don't update anything if it already exists
              create: {
                code: villageCode,
                name: villageName,
                fullAddress: `${villageName}, ${subDistrictName}, ${districtName}, ${stateName}`,
                subDistrict: {
                  connectOrCreate: {
                    where: { code: subDistrictCode },
                    create: {
                      code: subDistrictCode,
                      name: subDistrictName,
                      district: {
                        connectOrCreate: {
                          where: { code: districtCode },
                          create: {
                            code: districtCode,
                            name: districtName,
                            state: {
                              connectOrCreate: {
                                where: { code: stateCode },
                                create: {
                                  code: stateCode,
                                  name: stateName,
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            });
            successCount++;
          } catch (error) {
            errorCount++;
            if (errorCount <= 5) {
              console.error(`Failed row in ${fileName}:`, error);
            }
          }
        }
        console.log(`✅ Finished ${fileName} (${successCount} saved, ${errorCount} failed)`);
        resolve(true);
      });
  });
}

async function main() {
  // Path to your CSV files
  const dataFolder = path.join(__dirname, '../data');

  if (!fs.existsSync(dataFolder)) {
    console.error("❌ Folder 'data' not found at project root!");
    return;
  }

  const files = fs.readdirSync(dataFolder).filter(file => file.endsWith('.csv'));

  if (files.length === 0) {
    console.log("ℹ️ No CSV files found in the 'data' folder.");
    return;
  }

  console.log(`🚀 Starting seed for ${files.length} files...`);

  for (const file of files) {
    await processCSV(path.join(dataFolder, file));
  }

  console.log('\n✨ Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
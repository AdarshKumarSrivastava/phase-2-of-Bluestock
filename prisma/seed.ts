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
  
  const stateSet = new Map<string, string>();
  const districtSet = new Map<string, { name: string, stateCode: string }>();
  const subDistrictSet = new Map<string, { name: string, districtCode: string }>();
  const villageList: { code: string, name: string, fullAddress: string, subDistrictCode: string }[] = [];

  return new Promise((resolve, reject) => {
    console.log(`\n📂 Reading file: ${fileName}`);
    
    fs.createReadStream(filePath)
      .pipe(csv({
        mapHeaders: ({ header }) => header.trim().replace(/^\uFEFF/, ''),
      }))
      .on('data', (row) => {
          const stateCode = normalizeField(row['MDDS STC'] ?? row['\uFEFFMDDS STC']);
          const stateName = normalizeField(row['STATE NAME']);
          const districtCode = normalizeField(row['MDDS DTC']);
          const districtName = normalizeField(row['DISTRICT NAME']);
          const subDistrictCode = normalizeField(row['MDDS Sub_DT']);
          const subDistrictName = normalizeField(row['SUB-DISTRICT NAME']);
          const villageCode = normalizeField(row['MDDS PLCN']);
          const villageName = normalizeField(row['Area Name']);

          if (!villageCode || villageCode === '000000') return;
          if (!stateCode || !stateName || !districtCode || !districtName || !subDistrictCode || !subDistrictName || !villageName) return;

          if (!stateSet.has(stateCode)) {
             stateSet.set(stateCode, stateName);
          }
          if (!districtSet.has(districtCode)) {
             districtSet.set(districtCode, { name: districtName, stateCode });
          }
          if (!subDistrictSet.has(subDistrictCode)) {
             subDistrictSet.set(subDistrictCode, { name: subDistrictName, districtCode });
          }
          villageList.push({
             code: villageCode,
             name: villageName,
             fullAddress: `${villageName}, ${subDistrictName}, ${districtName}, ${stateName}`,
             subDistrictCode
          });
      })
      .on('error', (err) => reject(err))
      .on('end', async () => {
         resolve({ stateSet, districtSet, subDistrictSet, villageList, fileName });
      });
  });
}

async function main() {
  const dataFolder = path.join(__dirname, '../data');
  if (!fs.existsSync(dataFolder)) {
    console.error("❌ Folder 'data' not found at project root!");
    return;
  }
  const files = fs.readdirSync(dataFolder).filter(file => file.endsWith('.csv'));
  if (files.length === 0) return;

  console.log(`🚀 Starting seed for ${files.length} files...`);

  for (const file of files) {
    const result = await processCSV(path.join(dataFolder, file)) as any;
    const { stateSet, districtSet, subDistrictSet, villageList, fileName } = result;
    
    console.log(`⏳ Processing ${villageList.length} villages from ${fileName}...`);
    
    // 1. Upsert states
    for (const [code, name] of stateSet.entries()) {
      await prisma.state.upsert({
        where: { code },
        update: {},
        create: { code, name }
      });
    }

    // 2. Fetch states to get IDs
    const states = await prisma.state.findMany();
    const stateIdMap = new Map(states.map((s: any) => [s.code, s.id]));

    // 3. Upsert districts
    for (const [code, data] of districtSet.entries()) {
      await prisma.district.upsert({
        where: { code },
        update: {},
        create: { code, name: data.name, stateId: stateIdMap.get(data.stateCode)! }
      });
    }

    // 4. Fetch districts to get IDs
    const districts = await prisma.district.findMany();
    const districtIdMap = new Map(districts.map((d: any) => [d.code, d.id]));

    // 5. Upsert subdistricts
    for (const [code, data] of subDistrictSet.entries()) {
      await prisma.subDistrict.upsert({
        where: { code },
        update: {},
        create: { code, name: data.name, districtId: districtIdMap.get(data.districtCode)! }
      });
    }

    // 6. Fetch subdistricts to get IDs
    const subDistricts = await prisma.subDistrict.findMany();
    const subDistrictIdMap = new Map(subDistricts.map((sd: any) => [sd.code, sd.id]));

    // 7. Insert villages in chunks
    const chunkSize = 10000;
    let successCount = 0;
    
    for (let i = 0; i < villageList.length; i += chunkSize) {
      const chunk = villageList.slice(i, i + chunkSize);
      const dataToInsert = chunk.map((v: any) => ({
        code: v.code,
        name: v.name,
        fullAddress: v.fullAddress,
        subDistrictId: subDistrictIdMap.get(v.subDistrictCode)!
      }));
      
      try {
        await prisma.village.createMany({
          data: dataToInsert,
          skipDuplicates: true
        });
        successCount += dataToInsert.length;
      } catch (err) {
        console.error(`Failed to insert chunk in ${fileName}`, err);
      }
    }
    
    console.log(`✅ Finished ${fileName} (${successCount} saved)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
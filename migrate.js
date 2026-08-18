import { PrismaClient } from './generated/prisma/index.js';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://user:userpassword@127.0.0.1:3306/harita"
    }
  }
});

async function main() {
  // Check if we have layers without mapId
  const layersWithoutMap = await prisma.layer.findMany({
    where: { mapId: null }
  });

  if (layersWithoutMap.length > 0) {
    console.log(`Found ${layersWithoutMap.length} layers without mapId. Migrating...`);
    
    // Create Default Map
    const defaultMap = await prisma.mapProject.create({
      data: {
        name: "Varsayılan Harita",
        description: "Otomatik taşınan katmanlar"
      }
    });
    
    console.log(`Created default map with ID: ${defaultMap.id}`);
    
    // Update all layers
    await prisma.layer.updateMany({
      where: { mapId: null },
      data: { mapId: defaultMap.id }
    });
    
    console.log("Migration complete.");
  } else {
    console.log("No layers need migration.");
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

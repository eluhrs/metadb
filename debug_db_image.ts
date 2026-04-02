import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const collections = await prisma.collection.findMany({
    take: 1,
    orderBy: { createdAt: 'desc' },
    include: {
      fieldDefinitions: true,
      records: { 
        take: 1, 
        include: { image: true, values: true }, 
        orderBy: { createdAt: "asc" } 
      }
    }
  });

  if (!collections.length) {
    console.log("NO COLLECTIONS");
    return;
  }
  const col = collections[0];
  console.log("Collection:", col.name);
  
  const imageUriField = col.fieldDefinitions.find(f => f.isFile);
  let firstImageUri = col.records[0]?.image?.uri || null;
  console.log("Initial firstImageUri:", firstImageUri);
  console.log("imageUriField:", imageUriField ? imageUriField.name : "NULL");

  if (imageUriField && col.records[0]) {
     const val = col.records[0].values.find(v => v.fieldId === imageUriField.id);
     if (val && val.value) {
        firstImageUri = val.value;
     }
  }

  console.log("Resolved firstImageUri:", firstImageUri);

  let fileId = "";
  if (firstImageUri) {
    const match = firstImageUri.match(/\/d\/([a-zA-Z0-9-_]+)/) || firstImageUri.match(/id=([a-zA-Z0-9-_]+)/);
    fileId = match ? match[1] : "";
  }
  let finalThumbnailSrc = fileId ? `/api/images/proxy/${fileId}` : (firstImageUri || "");
  console.log("fileId:", fileId);
  console.log("finalThumbnailSrc:", finalThumbnailSrc);
}
main().finally(() => prisma.$disconnect());

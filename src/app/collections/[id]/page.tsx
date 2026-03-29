import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CatalogingClient } from "./CatalogingClient";

export default async function CatalogingPage(props: { params: Promise<{ id: string }>, searchParams: Promise<{ index?: string }> }) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  
  const session = await getServerSession(authOptions);
  if (!session) redirect("/api/auth/signin");

  const collectionId = params.id;
  const currentIndex = parseInt(searchParams.index || "0", 10);

  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: {
      fieldDefinitions: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  const allCollections = await prisma.collection.findMany({
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  if (!collection) return <div>Collection not found</div>;

  // Fetch all record IDs for pagination logic
  const records = await prisma.record.findMany({
    where: { collectionId },
    orderBy: { createdAt: 'asc' },
    select: { id: true }
  });

  if (records.length === 0) {
    return <div className="p-8 text-center text-gray-500">No records found to catalog.</div>;
  }

  const safeIndex = Math.max(0, Math.min(currentIndex, records.length - 1));
  const currentRecordId = records[safeIndex].id;

  // Fetch full details of the current active record
  const currentRecord = await prisma.record.findUnique({
    where: { id: currentRecordId },
    include: {
      image: true,
      values: true,
    }
  });

  if (!currentRecord) return <div>Error loading record</div>;

  const fileField = collection.fieldDefinitions.find((f: any) => f.isFile);
  let activeImageUri = currentRecord.image?.uri;

  if (fileField) {
    const val = currentRecord.values.find((v: any) => v.fieldId === fileField.id);
    if (val && val.value) {
       activeImageUri = val.value;
    }
  }

  return (
    <CatalogingClient 
       allCollections={allCollections}
       collection={collection}
       recordsLength={records.length}
       safeIndex={safeIndex}
       activeImageUri={activeImageUri || null}
       currentRecord={currentRecord}
    />
  );
}

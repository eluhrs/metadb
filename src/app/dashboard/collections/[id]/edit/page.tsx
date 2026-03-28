import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { EditFieldMappings } from "@/components/EditFieldMappings";

export default async function EditCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collection = await prisma.collection.findUnique({
    where: { id },
    include: { fieldDefinitions: { orderBy: { createdAt: "asc" } } }
  });

  if (!collection) return notFound();

  const modelsStr = process.env.GEMINI_MODELS || "gemini-2.5-flash,gemini-2.0-flash,gemini-pro-latest";
  const availableModels = modelsStr.split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div className="bg-slate-100 min-h-[calc(100vh-64px)] w-full">
      <div className="max-w-[1300px] w-full mx-auto p-8 lg:p-12">
        <EditFieldMappings collection={collection} availableModels={availableModels} />
      </div>
    </div>
  );
}

import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { CollectionActions } from "@/components/CollectionActions";
import { AdminSettingsTrigger } from "@/components/AdminSettingsTrigger";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  const isAdmin = Boolean(session?.user && (session.user as any).role === "LIBRARIAN");

  const rawCollections = await prisma.collection.findMany({
    include: { 
      fieldDefinitions: true,
      records: { 
        take: 1, 
        include: { image: true, values: true }, 
        orderBy: { createdAt: "asc" } 
      }
    },
    orderBy: { createdAt: "desc" }
  });

  // Calculate generic counts via standalone raw aggregation to bypass adapter subquery parse bugs locally 
  const counts = await prisma.record.groupBy({
    by: ['collectionId'],
    _count: { id: true }
  });

  const collections = rawCollections.map((col: any) => {
    const matchedCount = counts.find((c: any) => c.collectionId === col.id)?._count.id || 0;
    return { ...col, _count: { records: matchedCount } };
  });

  return (
    <div className="bg-slate-100 min-h-[calc(100vh-64px)] w-full">
      <div className="max-w-[1300px] w-full mx-auto px-8 pb-8 pt-0 lg:px-12 lg:pb-12 lg:pt-0">
        {/* Sticky Top Header */}
        <div className="sticky top-0 z-30 bg-slate-100 pt-8 lg:pt-12 pb-6 mb-6 flex items-center justify-between border-b border-gray-400 transition-all">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Collections</h1>
          <AdminSettingsTrigger isAdmin={isAdmin} />
        </div>

      <div className="flex flex-col space-y-0">
        
        {collections.map((col: any) => {
          const imageUriField = col.fieldDefinitions.find((f: any) => f.isFile);
          let firstImageUri = col.records[0]?.image?.uri || null;
          
          if (imageUriField && col.records[0]) {
             const val = col.records[0].values.find((v: any) => v.fieldId === imageUriField.id);
             if (val && val.value) {
                firstImageUri = val.value;
             }
          }

          let fileId = "";
          if (firstImageUri) {
            const match = firstImageUri.match(/\/d\/([a-zA-Z0-9-_]+)/) || firstImageUri.match(/id=([a-zA-Z0-9-_]+)/);
            fileId = match ? match[1] : "";
          }
          let finalThumbnailSrc = fileId ? `/api/images/proxy/${fileId}` : (firstImageUri || "");
          if (finalThumbnailSrc && !finalThumbnailSrc.startsWith("http") && !finalThumbnailSrc.startsWith("/") && !finalThumbnailSrc.startsWith("data:")) {
             finalThumbnailSrc = `/${finalThumbnailSrc}`;
          }
          const dateStarted = new Date(col.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
          
          return (
            <div key={col.id}>
              <div className="flex flex-col lg:flex-row lg:items-center justify-between group py-6 sm:py-8 gap-y-4 lg:gap-y-0">
                <Link href={`/collections/${col.id}?index=0`} className="flex items-center space-x-4 sm:space-x-6 flex-1 hover:opacity-80 transition cursor-pointer pr-0 lg:pr-8 w-full">
                  {/* Deep-Linked Thumbnail */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-gray-100 rounded-lg border border-gray-200 overflow-hidden relative shadow-sm flex items-center justify-center">
                    {firstImageUri ? (
                      <Image 
                        src={finalThumbnailSrc}
                        alt={`${col.name} Thumbnail`}
                        fill
                        className="object-cover transition-transform group-hover:scale-105 duration-500"
                        sizes="(max-width: 640px) 80px, 96px"
                      />
                    ) : (
                      <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    )}
                  </div>
                  
                  {/* Meta Details */}
                  <div className="flex flex-col">
                    <h2 className="text-2xl font-bold text-gray-800 tracking-tight mb-2 group-hover:text-blue-600 transition-colors">
                      {col.name}
                    </h2>
                    <div className="flex flex-col sm:flex-row sm:items-center text-sm font-medium text-gray-500 sm:space-x-3 space-y-1 sm:space-y-0 mt-1">
                      <span>{col._count.records} {(col._count.records === 1) ? 'item' : 'items'}</span>
                      <span className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full"></span>
                      <span>{dateStarted}</span>
                    </div>
                  </div>
                </Link>
                
                {/* Dynamic Action Bar */}
                <div>
                  <CollectionActions id={col.id} isAdmin={isAdmin} />
                </div>
              </div>
              <hr className="border-gray-400" />
            </div>
          );
        })}
        {collections.length === 0 && (
          <div className="py-20 text-center text-gray-500 font-medium bg-gray-50 rounded-xl border border-dashed border-gray-300 my-8">
            No collections created yet. Start importing a spreadsheet!
          </div>
        )}
      </div>
    </div>
    </div>
  );
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
   const resolvedParams = await params;
   const session = await getServerSession(authOptions);
   if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

   try {
       const body = await req.json();
       const val = body.value || "";

       const field = await prisma.fieldDefinition.findUnique({ where: { id: resolvedParams.id } });
       if (!field) return new NextResponse("Field not found", { status: 404 });

       // Regardless of wiping or writing, we always safely wipe the slate clean first globally for this field
       await prisma.value.deleteMany({
          where: { fieldId: resolvedParams.id }
       });

       if (val !== "") {
          // If a specific string is provided, globally apply it structurally across the active records array
          const records = await prisma.record.findMany({
             where: { collectionId: field.collectionId },
             select: { id: true }
          });

          if (records.length > 0) {
             const insertPayloads = records.map((r: {id: string}) => ({
                recordId: r.id,
                fieldId: resolvedParams.id,
                value: val
             }));

             await prisma.value.createMany({
                data: insertPayloads
             });
          }
       }

       return NextResponse.json({ success: true });
   } catch (error) {
       console.error("API Error executing global overwrite:", error);
       return new NextResponse("Internal Server Error", { status: 500 });
   }
}

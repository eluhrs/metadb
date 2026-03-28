import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
   const resolvedParams = await params;
   const session = await getServerSession(authOptions);
   if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

   const body = await req.json();
   if (!body.term) return new NextResponse("Term required", { status: 400 });

   try {
       const field = await prisma.fieldDefinition.findUnique({ where: { id: resolvedParams.id } });
       if (!field || !field.isControlled) return new NextResponse("Field not controlled", { status: 400 });

       const existingList = field.controlledVocabList || "";
       const termList = existingList.split('\n').map((t: string) => t.trim()).filter(Boolean);
       
       if (!termList.includes(body.term.trim())) {
          termList.push(body.term.trim());
          
          await prisma.fieldDefinition.update({
             where: { id: resolvedParams.id },
             data: { controlledVocabList: termList.join('\n') } // Stores cleanly
          });
       }
       
       return NextResponse.json({ success: true, list: termList });
   } catch (error) {
       console.error("API Error updating term:", error);
       return new NextResponse("Internal Server Error", { status: 500 });
   }
}

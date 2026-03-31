import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { recordId, values } = await req.json();

    if (!recordId) {
      return NextResponse.json({ error: "Missing recordId" }, { status: 400 });
    }

    // Determine if any of the submitted values correspond to an 'isFile' configuration
    const fieldDefinitions = await prisma.fieldDefinition.findMany({
      where: { id: { in: Object.keys(values) } }
    });
    
    // Explicitly separate tracking indices for File 1 and File 2 arrays safely
    const fileFieldIds = new Set(fieldDefinitions.filter(f => f.isFile).map(f => f.id));
    const secondaryFileIds = new Set(fieldDefinitions.filter(f => f.isSecondaryFile).map(f => f.id));

    // Upsert values individually since unique composite keys were not strictly forced in schema
    const valuePromises = Object.entries(values).map(async ([fieldId, value]) => {
      if (value === undefined || value === null) return Promise.resolve();
      
      const valStr = value as string;

      // Ensure that if this is the flagged File 1 or File 2 column, SeaDragon recognizes the visual change immediately!
      if ((fileFieldIds.has(fieldId) || secondaryFileIds.has(fieldId)) && valStr.trim() !== "") {
         const existingImg = await prisma.image.findUnique({ where: { recordId } });
         
         const payloadKey = fileFieldIds.has(fieldId) ? "uri" : "secondaryUri";
         
         if (existingImg) {
            await prisma.image.update({ 
               where: { id: existingImg.id }, 
               data: { [payloadKey]: valStr } 
            });
         } else {
            await prisma.image.create({ 
               data: { recordId, [payloadKey]: valStr } 
            });
         }
      }
      
      return prisma.value.findFirst({
        where: { recordId, fieldId }
      }).then((existing: any) => {
        if (existing) {
          return prisma.value.update({
            where: { id: existing.id },
            data: { value: valStr }
          });
        } else {
          return prisma.value.create({
            data: { recordId, fieldId, value: valStr }
          });
        }
      });
    });

    await Promise.all(valuePromises);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error saving record:", error);
    return NextResponse.json({ error: "Failed to save record" }, { status: 500 });
  }
}

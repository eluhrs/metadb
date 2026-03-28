import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { google } from "googleapis";
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { recordId, fieldId } = body;

    if (!recordId || !fieldId) {
      return new NextResponse("Missing recordId or fieldId", { status: 400 });
    }

    const record = await prisma.record.findUnique({
      where: { id: recordId },
      include: { 
        values: true, 
        image: true, 
        collection: { 
          include: { fieldDefinitions: true } 
        } 
      }
    });

    if (!record) return new NextResponse("Record not found", { status: 404 });

    const targetField = record.collection.fieldDefinitions.find((f: any) => f.id === fieldId);
    if (!targetField) return new NextResponse("Target field definition not found", { status: 404 });
    if (!targetField.aiPrompt || !targetField.aiModel) {
      return new NextResponse("Field is not explicitly configured for AI generative automation", { status: 400 });
    }

    let finalPrompt = targetField.aiPrompt;
    const hasImagePlaceholder = finalPrompt.toLowerCase().includes("{{image}}");
    
    // Resolve dynamic text bracket variables: {{Field Name}}
    const fieldRegex = /\{\{([^}]+)\}\}/g;
    const matches = [...finalPrompt.matchAll(fieldRegex)];
    for (const match of matches) {
      const innerText = match[1].trim();
      if (innerText.toLowerCase() === 'image') continue;
      
      const matchedField = record.collection.fieldDefinitions.find((f: any) => f.name.toLowerCase() === innerText.toLowerCase());
      if (matchedField) {
         const val = record.values.find((v: any) => v.fieldId === matchedField.id);
         finalPrompt = finalPrompt.replace(match[0], val ? val.value : '');
      }
    }

    let imageBuffer: Buffer | null = null;

    // Securely acquire the image binary if invoked explicitly
    if (hasImagePlaceholder && record.image?.uri) {
      const targetUrl = record.image.uri;
      const match = targetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/) || targetUrl.match(/id=([a-zA-Z0-9-_]+)/);
      const fileId = match ? match[1] : null;

      if (fileId) {
        const cacheDir = path.join(process.cwd(), '.next', 'cache', 'metadb-images');
        if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
        
        const cachedFilePath = path.join(cacheDir, `${fileId}.blob`);
        if (fs.existsSync(cachedFilePath)) {
          imageBuffer = await fs.promises.readFile(cachedFilePath);
        } else {
          // If not fully cached, we must download using Google Drive proxy permissions natively
          const accessToken = (session as any).accessToken;
          if (accessToken) {
              const auth = new google.auth.OAuth2();
              auth.setCredentials({ access_token: accessToken });
              const drive = google.drive({ version: 'v3', auth });
              
              const response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
              const chunks = [];
              for await (const chunk of response.data as any) chunks.push(chunk);
              imageBuffer = Buffer.concat(chunks);
              
              // Persist silently back to NVMe cache to brutally optimize future batch runs
              fs.promises.writeFile(cachedFilePath, imageBuffer).catch(console.error);
          }
        }
      }
    }

    // Initialize Generative AI SDK payload strictly mapping the .env key
    if (!process.env.GEMINI_API_KEY) {
        return new NextResponse("Google Gemini API is wildly unconfigured in production environment variables", { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // Map strictly standardized REST payloads onto the SDK
    const contents: any[] = [finalPrompt];
    
    if (hasImagePlaceholder && imageBuffer) {
       contents.push({
          inlineData: {
             data: imageBuffer.toString("base64"),
             mimeType: "image/jpeg"
          }
       });
       // Optionally we can physically remove {{image}} text string just to prevent weird AI parsing issues
       finalPrompt = finalPrompt.replace(/\{\{image\}\}/gi, "").trim();
       contents[0] = finalPrompt; // Overwrite string content
    }

    // Submit natively
    const response = await ai.models.generateContent({
        model: targetField.aiModel,
        contents: contents,
    });

    return NextResponse.json({ text: response.text });

  } catch (error: any) {
    console.error("AI Evaluation Pipeline Error:", error);
    return new NextResponse(error.message || "Failed computing Gemini architecture stream", { status: 500 });
  }
}

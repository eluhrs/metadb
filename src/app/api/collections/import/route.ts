import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Enforce LIBRARIAN role constraint at the API boundary
    if (!session || (session.user as any).role !== "LIBRARIAN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const accessToken = (session as any).accessToken;
    if (!accessToken) {
      return NextResponse.json({ error: "Missing Google Access Token. Please re-authenticate." }, { status: 401 });
    }

    const body = await req.json();
    const { sheetUrl } = body;

    if (!sheetUrl) {
      return NextResponse.json({ error: "Missing sheetUrl parameter" }, { status: 400 });
    }

    // Extract sheet ID from standard Google Sheets URL
    const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = match ? match[1] : sheetUrl; // Fallback to raw ID if URL pattern fails

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const sheets = google.sheets({ version: "v4", auth });

    // Fetch the first 6 rows (1 header + 5 preview) to assist the Admin in mapping fields
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: "A1:Z6",
    });

    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      return NextResponse.json({ headers: [], preview: [] });
    }

    const headers = rows[0];
    const preview = rows.slice(1);

    return NextResponse.json({ 
      spreadsheetId,
      headers, 
      preview 
    });

  } catch (error: any) {
    console.error("Error fetching Google Sheet:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch spreadsheet from Google" },
      { status: 500 }
    );
  }
}

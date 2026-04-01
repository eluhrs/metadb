import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
];

export function getGoogleAuth() {
  const credentialsString = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
  if (!credentialsString) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable");
  }

  // Handle newlines if it was stored as a single string
  const credentials = JSON.parse(credentialsString);
  
  const auth = new GoogleAuth({
    credentials,
    scopes: SCOPES,
  });

  return auth;
}

export async function getDriveClient() {
  const auth = getGoogleAuth();
  return google.drive({ version: 'v3', auth });
}

export async function getSheetsClient() {
  const auth = getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
}

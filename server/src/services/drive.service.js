import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import config from '../config/index.js';

let driveClient;

function getAuthClient() {
  const keyPath = resolve(config.googleServiceAccountKey);
  const key = JSON.parse(readFileSync(keyPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  return auth;
}

function getDrive() {
  if (!driveClient) {
    const auth = getAuthClient();
    driveClient = google.drive({ version: 'v3', auth });
  }
  return driveClient;
}

/**
 * List all files in the configured Google Drive folder
 */
export async function listFiles() {
  const drive = getDrive();
  const files = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: `'${config.googleDriveFolderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, modifiedTime, size, webViewLink)',
      pageSize: 100,
      pageToken,
    });

    files.push(...(res.data.files || []));
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return files;
}

/**
 * Download file content as text
 */
export async function downloadFileContent(fileId, mimeType) {
  const drive = getDrive();

  // Google Docs/Sheets/Slides need to be exported
  const googleMimeTypes = {
    'application/vnd.google-apps.document': 'text/plain',
    'application/vnd.google-apps.spreadsheet': 'text/csv',
    'application/vnd.google-apps.presentation': 'text/plain',
  };

  if (googleMimeTypes[mimeType]) {
    const res = await drive.files.export(
      { fileId, mimeType: googleMimeTypes[mimeType] },
      { responseType: 'text' }
    );
    return { content: res.data, exportedMimeType: googleMimeTypes[mimeType] };
  }

  // For binary files (PDF, DOCX), download as buffer
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  return { content: Buffer.from(res.data), exportedMimeType: mimeType };
}

/**
 * Get a specific file's metadata
 */
export async function getFileMetadata(fileId) {
  const drive = getDrive();
  const res = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, modifiedTime, size, webViewLink, description',
  });
  return res.data;
}

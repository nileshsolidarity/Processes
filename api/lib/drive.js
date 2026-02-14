import { google } from 'googleapis';
import { config } from './config.js';

let driveClient;

function getDrive() {
  if (!driveClient) {
    let credentials;
    if (config.googleServiceAccountKey) {
      // Parse from env var (JSON string)
      credentials = JSON.parse(config.googleServiceAccountKey);
    } else {
      throw new Error('Google service account credentials not configured');
    }

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    driveClient = google.drive({ version: 'v3', auth });
  }
  return driveClient;
}

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

export async function downloadFileContent(fileId, mimeType) {
  const drive = getDrive();

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

  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  );

  return { content: Buffer.from(res.data), exportedMimeType: mimeType };
}

// Config values are read directly from process.env at runtime
// This file provides helper functions to avoid Vercel static analysis issues

export function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY;
}

export function getDriveFolderId() {
  return process.env.GOOGLE_DRIVE_FOLDER_ID;
}

export function getServiceAccountCredentials() {
  return process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
}

export function getJwtSecret() {
  return process.env.JWT_SECRET || 'default-secret-change-me';
}

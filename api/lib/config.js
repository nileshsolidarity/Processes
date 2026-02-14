export const config = {
  geminiApiKey: process.env.GEMINI_API_KEY,
  googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
  googleServiceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS,
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',
};

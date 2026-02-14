import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../../.env') });

const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'default-secret-change-me',
  geminiApiKey: process.env.GEMINI_API_KEY,
  googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID,
  googleServiceAccountKey: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || './service-account.json',
  dbPath: resolve(__dirname, '../../data/repository.db'),
};

export default config;

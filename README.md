# Process Repository

A web application that serves as a centralized repository of SOPs & Policies for branch employees. Documents are stored in Google Drive and an AI chatbot powered by **Google Gemini** helps branches find and understand processes.

## Features

- **Process Browser** - Browse, search, and filter all SOPs/Policies by category
- **Document Viewer** - View process document content inline
- **AI Chatbot** - Ask questions about processes and get AI-powered answers with source citations (Gemini 2.0 Flash)
- **Google Drive Sync** - Automatically imports and indexes documents from your Google Drive folder
- **Branch Login** - Simple branch-based authentication
- **RAG Pipeline** - Documents are chunked, embedded, and searched for relevant context

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3)
- **AI**: Google Gemini API (chat + embeddings)
- **Storage**: Google Drive API

## Setup

### 1. Prerequisites

- Node.js 18+
- A Google Cloud project with:
  - Google Drive API enabled
  - A Service Account with a JSON key file
- A Gemini API key (from Google AI Studio)

### 2. Google Drive Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project (or select existing one)
3. Enable **Google Drive API**
4. Create a **Service Account** → download the JSON key file
5. Save the key file as `service-account.json` in the project root
6. Create a folder in Google Drive for your processes
7. **Share that folder** with the service account email (found in the JSON key file as `client_email`)
8. Copy the **folder ID** from the folder URL (the string after `/folders/`)

### 3. Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create an API key
3. Copy it for the `.env` file

### 4. Configure Environment

Edit the `.env` file in the project root:

```env
GEMINI_API_KEY=your_actual_gemini_api_key
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_from_drive
GOOGLE_SERVICE_ACCOUNT_KEY=./service-account.json
PORT=3001
JWT_SECRET=change_this_to_a_random_string
CLIENT_URL=http://localhost:5173
```

### 5. Install & Run

```bash
# Install dependencies
cd process-repository
cd server && npm install
cd ../client && npm install
cd ..

# Seed the database with branch data
cd server && node src/db/seed.js

# Run both server and client
cd ..
npm install
npm run dev
```

The app will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

### 6. First Use

1. Open http://localhost:5173
2. Login with a branch code (e.g., `HO001` for Head Office)
3. Click **"Sync Drive"** in the header to import documents from Google Drive
4. Browse processes or ask the AI chatbot questions

## Branch Codes (Default)

| Branch | Code |
|--------|------|
| Head Office | HO001 |
| Branch Mumbai | MUM001 |
| Branch Delhi | DEL001 |
| Branch Bangalore | BLR001 |
| Branch Chennai | CHN001 |
| Branch Kolkata | KOL001 |
| Branch Hyderabad | HYD001 |
| Branch Pune | PUN001 |

You can add more branches by editing `server/src/db/seed.js` and re-running `node src/db/seed.js`.

## How the AI Works

1. **Sync**: Documents from Google Drive are downloaded and parsed (PDF, DOCX, TXT, Google Docs)
2. **Chunk**: Text is split into ~500-word overlapping chunks
3. **Embed**: Each chunk is embedded using Gemini's `text-embedding-004` model
4. **Store**: Chunks and embeddings are stored in SQLite
5. **Query**: When a user asks a question:
   - The question is embedded
   - Top 5 most relevant chunks are found via cosine similarity + keyword search
   - These chunks are sent as context to Gemini 2.0 Flash
   - The AI generates an answer with source citations

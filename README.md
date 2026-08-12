# youtube-transcriber-backend

Node.js/Express backend that transcribes YouTube videos using [yt-dlp](https://github.com/yt-dlp/yt-dlp) for audio extraction and [AssemblyAI](https://www.assemblyai.com/) for speech-to-text.

## Prerequisites

- Node.js 18+
- An [AssemblyAI](https://www.assemblyai.com/) account and API key

## Setup

```bash
npm install
cp .env.example .env
# Edit .env and fill in your ASSEMBLY_API_KEY
```

## Run

```bash
npm start
```

The server listens on `PORT` (default `3000`).

## API

### `GET /`

Health check — returns `"Backend is alive."`.

### `POST /transcribe`

Transcribes a YouTube video.

**Request body:**
```json
{ "videoId": "dQw4w9WgXcQ" }
```

**Success response:**
```json
{ "transcript": "..." }
```

**Error response:**
```json
{ "error": "..." }
```

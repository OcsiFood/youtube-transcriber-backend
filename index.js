import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';
import ytdlp from 'yt-dlp-exec';

const require = createRequire(import.meta.url);
const ffmpegPath = require('ffmpeg-static');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const ASSEMBLY_API_KEY = 'c738c6aefdd94fb28b936c2d849ebfdf';

app.get("/", (req, res) => res.send("Backend is alive."));

app.post('/transcribe', async (req, res) => {
  const videoId = req.body.videoId;
  if (!videoId) return res.status(400).json({ error: 'No video ID provided' });

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const audioPath = path.join(__dirname, `audio_${videoId}.mp3`);

  try {
    console.log("📥 Running yt-dlp on:", videoUrl);
    await ytdlp(videoUrl, {
      output: audioPath,
      extractAudio: true,
      audioFormat: 'mp3',
      ffmpegLocation: ffmpegPath
    }).catch(err => {
      console.error("❌ yt-dlp-exec failed:", err.message);
      throw new Error("yt-dlp-exec failed");
    });

    console.log("📤 Uploading audio to AssemblyAI...");
    const audioData = fs.readFileSync(audioPath);
    const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
      method: 'POST',
      headers: { authorization: ASSEMBLY_API_KEY },
      body: audioData
    });

    const { upload_url } = await uploadRes.json();
    if (!upload_url) throw new Error("Upload failed");

    console.log("📝 Requesting transcription...");
    const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        authorization: ASSEMBLY_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({ audio_url: upload_url })
    });

    const { id } = await transcriptRes.json();

    let transcript;
    while (!transcript || transcript.status === 'processing') {
      console.log("⌛ Waiting for transcription...");
      await new Promise(r => setTimeout(r, 5000));
      const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${id}`, {
        headers: { authorization: ASSEMBLY_API_KEY }
      });
      transcript = await pollRes.json();
    }

    fs.unlinkSync(audioPath);

    if (transcript.text) {
      console.log("✅ Transcription complete.");
      return res.json({ transcript: transcript.text });
    } else {
      console.error("❌ Transcription failed:", transcript);
      return res.status(500).json({ error: 'Transcription failed' });
    }

  } catch (error) {
    console.error("❌ General error:", error);
    return res.status(500).json({ error: 'Download or transcription failed' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🚀 Server running on port", PORT));

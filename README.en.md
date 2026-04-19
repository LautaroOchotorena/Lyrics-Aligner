# Lyrics Aligner Web App

Complete web app (frontend + backend) to manually sync audio with lyrics.

## Structure

- `backend/` FastAPI API for file uploads and SRT/JSON export.
- `frontend/` React app (Vite) with player and line/timestamp editor.

## Included Features

- Audio upload via drag and drop (mp3, wav, ogg, m4a, aac, flac, webm).
- Lyrics upload from text file.
- Lyrics display split into editable lines.
- Audio playback with play, pause, seek, and time jumps.
- Manual sync with Start and End buttons.
- Keyboard shortcuts: `S` for Start and `E` for End.
- Visual highlight for active and currently playing line.
- Manual timestamp editing per line.
- Play from a specific line and continue syncing in sequence.
- Export to SRT and JSON.
- Error handling for invalid files/formats.
- Optional auto-scroll.
- Responsive interface.

## Requirements

- Python 3.10+
- Node.js 18+ and npm
- Conda (Anaconda or Miniconda)

## Installation

### 1) Backend (FastAPI)

```bash
conda create -n lyrics-aligner python=3.11 -y
conda activate lyrics-aligner
cd backend
pip install -r requirements.txt
```

### 2) Frontend (React + Vite)

```bash
cd frontend
npm install
```

## Run

### Recommended option: one terminal

```bash
conda activate lyrics-aligner
python run_dev.py
```

This command starts backend (port 8000) and frontend (Vite) at the same time in one terminal.
To stop both, press `Ctrl + C`.

### Alternative option: two terminals

### Terminal A: backend

```bash
conda activate lyrics-aligner
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal B: frontend

```bash
cd frontend
npm run dev
```

Open the URL shown by Vite in your browser (usually `http://localhost:5173`).

## Optional API Configuration

If you want to change backend URL, create `frontend/.env`:

```env
VITE_API_BASE=http://localhost:8000
```

## How to Use (Step by Step)

1. Upload audio:
   Drag and drop the file into the audio area, or click to select it.

2. Upload lyrics:
   Provide a text file with one line per row.

3. Start playback:
   Use global Play or "Play active line" to start from a specific point.

4. Sync each line:
   Mark Start and End using buttons or keyboard shortcuts `S` and `E`.

5. Fine-tune timing:
   Adjust timestamps manually from the line list whenever needed.

6. Review playback:
   Re-listen to sections and verify each line appears at the right moment.

7. Export result:
   Download the final subtitle as `SRT` (or `JSON` for editing workflows).

## Audio Duration Recommendation

- This tool is optimized for short audio files, ideally around 3 minutes.
- It works especially well for covers, songs, and short musical demos.

## Main API (backend)

- `GET /api/health`
- `POST /api/upload/audio`
- `GET /api/audio/{audio_id}`
- `POST /api/upload/lyrics`
- `POST /api/export/srt`
- `POST /api/export/json`

## Notes

- Uploaded audio is kept in backend temporary memory (not saved to disk).
- SRT/JSON exports are generated in memory and downloaded directly in the browser.
- Sync progress is automatically persisted in localStorage.

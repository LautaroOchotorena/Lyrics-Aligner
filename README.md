# Lyrics Aligner Web App

<details open>
<summary>Español</summary>

Aplicacion web completa (frontend + backend) para sincronizar manualmente audio con lyrics.

## Estructura

- `backend/` API en FastAPI para carga de archivos y exportacion SRT/JSON.
- `frontend/` app React (Vite) con reproductor y editor de lineas/timestamps.

## Funcionalidades incluidas

- Carga de audio por drag and drop (mp3, wav, ogg, m4a, aac, flac, webm).
- Carga de lyrics desde archivo de texto.
- Visualizacion de lyrics en lineas editables.
- Reproduccion de audio con play, pause, seek y saltos de tiempo.
- Sincronizacion manual con botones Start y End.
- Atajos de teclado: `S` para Start y `E` para End.
- Resaltado visual de linea activa y linea reproduciendose.
- Edicion manual de timestamps por linea.
- Reproducir desde una linea especifica y continuar marcando en secuencia.
- Exportar a SRT y JSON.
- Manejo de errores de formato/archivo invalido.
- Autoscroll opcional.
- Interfaz responsive.

## Requisitos

- Python 3.10+
- Node.js 18+ y npm
- Conda (Anaconda o Miniconda)

## Instalacion

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

## Ejecucion

### Opcion recomendada: una sola terminal

```bash
conda activate lyrics-aligner
python run_dev.py
```

Este comando inicia backend (puerto 8000) y frontend (Vite) al mismo tiempo en la misma terminal.
Para detener ambos, presiona `Ctrl + C`.

### Opcion alternativa: dos terminales

### Terminal A: backend

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal B: frontend

```bash
cd frontend
npm run dev
```

Abrir en navegador la URL que indique Vite (normalmente `http://localhost:5173`).

## Configuracion opcional de API

Si queres cambiar la URL del backend, crea `frontend/.env`:

```env
VITE_API_BASE=http://localhost:8000
```

## Como usar (paso a paso)

1. Carga el audio:
   Arrastra el archivo al bloque de audio o haz click para seleccionarlo.

2. Carga la letra:
   Sube un archivo de texto con una linea por renglon.

3. Inicia reproduccion:
   Usa Play general o "Play linea activa" para comenzar desde un punto concreto.

4. Sincroniza cada linea:
   Marca Inicio y Fin con los botones o con los atajos de teclado `S` y `E`.

5. Ajusta precision:
   Corrige manualmente los timestamps desde la lista de lineas cuando sea necesario.

6. Revisa reproduccion:
   Vuelve a escuchar tramos para validar que cada linea entra y sale en el momento correcto.

7. Exporta resultado:
   Descarga el subtitulo final en formato `SRT` (o `JSON` si lo necesitas para edicion).

## Recomendacion de duracion de audio

- Esta herramienta esta optimizada para audios cortos, idealmente de alrededor de 3 minutos.
- Funciona especialmente bien para covers, canciones y demos musicales.

## API principal (backend)

- `GET /api/health`
- `POST /api/upload/audio`
- `GET /api/audio/{audio_id}`
- `POST /api/upload/lyrics`
- `POST /api/export/srt`
- `POST /api/export/json`

## Notas

- El audio subido se mantiene en memoria temporal del backend (no se guarda en disco).
- Los exports SRT/JSON se generan en memoria y se descargan directamente desde el navegador.
- El progreso de sincronizacion se persiste automaticamente en localStorage.

</details>

<details>
<summary>English</summary>

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

### 1) Backend Setup (FastAPI)

```bash
conda create -n lyrics-aligner python=3.11 -y
conda activate lyrics-aligner
cd backend
pip install -r requirements.txt
```

### 2) Frontend Setup (React + Vite)

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

### Backend Terminal

```bash
cd backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Terminal

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
- For longer recordings, splitting the audio into segments (for example, 3 to 5 minute blocks) helps keep synchronization easier and more precise.

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

</details>

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import List, Optional, TypedDict
from uuid import uuid4

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

ALLOWED_AUDIO_EXTENSIONS = {
    ".mp3",
    ".wav",
    ".ogg",
    ".m4a",
    ".aac",
    ".flac",
    ".webm",
}
ALLOWED_LYRICS_EXTENSIONS = {".txt", ".lrc", ".md"}
CONTENT_TYPE_TO_EXTENSION = {
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/wave": ".wav",
    "audio/ogg": ".ogg",
    "audio/mp4": ".m4a",
    "audio/aac": ".aac",
    "audio/flac": ".flac",
    "audio/webm": ".webm",
}
EXTENSION_TO_CONTENT_TYPE = {
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".m4a": "audio/mp4",
    ".aac": "audio/aac",
    ".flac": "audio/flac",
    ".webm": "audio/webm",
}
MAX_AUDIO_SIZE_BYTES = 250 * 1024 * 1024


class AudioMemoryEntry(TypedDict):
    bytes_data: bytes
    media_type: str
    filename: str


AUDIO_STORE: dict[str, AudioMemoryEntry] = {}


class TimedLine(BaseModel):
    text: str
    start: Optional[float] = None
    end: Optional[float] = None


class ExportPayload(BaseModel):
    lines: List[TimedLine]


app = FastAPI(title="Lyrics Aligner API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _find_audio_entry(audio_id: str) -> Optional[AudioMemoryEntry]:
    return AUDIO_STORE.get(audio_id)


def _format_srt_timestamp(seconds_value: float) -> str:
    total_ms = int(round(seconds_value * 1000))
    hours, remainder = divmod(total_ms, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    seconds, milliseconds = divmod(remainder, 1000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}"


def _decode_text_file(raw_data: bytes) -> str:
    for encoding in ("utf-8-sig", "utf-16", "latin-1"):
        try:
            return raw_data.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise HTTPException(status_code=400, detail="No se pudo decodificar el archivo de lyrics")


def _build_valid_intervals(lines: List[TimedLine]) -> List[TimedLine]:
    valid_lines: List[TimedLine] = []
    for line in lines:
        text = line.text.strip()
        if not text:
            continue
        if line.start is None or line.end is None:
            continue
        if line.start < 0 or line.end < 0:
            raise HTTPException(status_code=400, detail="Los timestamps no pueden ser negativos")
        if line.end <= line.start:
            raise HTTPException(
                status_code=400,
                detail="Cada linea exportada debe tener end mayor que start",
            )
        valid_lines.append(TimedLine(text=text, start=line.start, end=line.end))

    if not valid_lines:
        raise HTTPException(
            status_code=400,
            detail="No hay lineas validas para exportar. Defini start y end para al menos una linea",
        )

    return valid_lines


def _model_to_dict(model: TimedLine) -> dict:
    if hasattr(model, "model_dump"):
        return model.model_dump()
    return model.dict()


def _resolve_frontend_dist_dir() -> Optional[Path]:
    project_root = Path(__file__).resolve().parent.parent
    candidates = [
        project_root / "frontend_dist",
        project_root / "frontend" / "dist",
    ]

    for candidate in candidates:
        if (candidate / "index.html").exists():
            return candidate

    return None


@app.get("/api/health")
def health_check() -> dict:
    return {"status": "ok"}


@app.post("/api/upload/audio")
async def upload_audio(file: UploadFile = File(...)) -> dict:
    original_name = (file.filename or "").strip()
    extension = Path(original_name).suffix.lower()
    content_type = (file.content_type or "").lower()

    if not original_name:
        raise HTTPException(status_code=400, detail="El archivo de audio no tiene nombre")

    if extension not in ALLOWED_AUDIO_EXTENSIONS and not content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Formato de audio invalido")

    if not extension:
        extension = CONTENT_TYPE_TO_EXTENSION.get(content_type, ".bin")

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="El archivo de audio esta vacio")

    if len(audio_bytes) > MAX_AUDIO_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="El archivo de audio supera el limite de 250 MB",
        )

    media_type = (
        content_type
        if content_type.startswith("audio/")
        else EXTENSION_TO_CONTENT_TYPE.get(extension, "application/octet-stream")
    )

    audio_id = uuid4().hex
    AUDIO_STORE[audio_id] = {
        "bytes_data": audio_bytes,
        "media_type": media_type,
        "filename": original_name,
    }

    return {
        "audioId": audio_id,
        "audioUrl": f"/api/audio/{audio_id}",
        "filename": original_name,
    }


@app.get("/api/audio/{audio_id}")
def get_audio(audio_id: str, request: Request):
    audio_entry = _find_audio_entry(audio_id)
    if not audio_entry:
        raise HTTPException(status_code=404, detail="Audio no encontrado")

    safe_filename = Path(audio_entry["filename"]).name.replace('"', "")
    if not safe_filename:
        safe_filename = f"{audio_id}.bin"

    audio_data = audio_entry["bytes_data"]
    total_size = len(audio_data)
    media_type = audio_entry["media_type"]
    range_header = request.headers.get("range")
    base_headers = {
        "Accept-Ranges": "bytes",
        "Content-Disposition": f'inline; filename="{safe_filename}"',
    }

    if not range_header:
        return Response(
            content=audio_data,
            media_type=media_type,
            headers={
                **base_headers,
                "Content-Length": str(total_size),
            },
        )

    try:
        unit, range_spec = range_header.split("=", 1)
        if unit.strip().lower() != "bytes":
            raise ValueError("Unidad de rango invalida")

        start_text, end_text = range_spec.split("-", 1)
        if start_text == "":
            suffix_length = int(end_text)
            if suffix_length <= 0:
                raise ValueError("Sufijo de rango invalido")
            start = max(total_size - suffix_length, 0)
            end = total_size - 1
        else:
            start = int(start_text)
            end = int(end_text) if end_text else total_size - 1

        if start < 0 or end < start or start >= total_size:
            raise ValueError("Limites de rango invalidos")

        end = min(end, total_size - 1)
    except ValueError as error:
        raise HTTPException(status_code=416, detail="Rango de audio invalido") from error

    content_chunk = audio_data[start : end + 1]

    return Response(
        content=content_chunk,
        status_code=206,
        media_type=media_type,
        headers={
            **base_headers,
            "Content-Range": f"bytes {start}-{end}/{total_size}",
            "Content-Length": str(len(content_chunk)),
        },
    )


@app.post("/api/upload/lyrics")
async def upload_lyrics(file: UploadFile = File(...)) -> dict:
    original_name = (file.filename or "").strip()
    extension = Path(original_name).suffix.lower()
    content_type = (file.content_type or "").lower()

    if not original_name:
        raise HTTPException(status_code=400, detail="El archivo de lyrics no tiene nombre")

    is_text_like = content_type.startswith("text/") or extension in ALLOWED_LYRICS_EXTENSIONS
    if not is_text_like and content_type not in {"application/octet-stream", ""}:
        raise HTTPException(status_code=400, detail="Formato de lyrics invalido")

    raw_data = await file.read()
    if not raw_data:
        raise HTTPException(status_code=400, detail="El archivo de lyrics esta vacio")

    lyrics_text = _decode_text_file(raw_data)
    lines = [line.strip() for line in lyrics_text.splitlines() if line.strip()]

    if not lines:
        raise HTTPException(status_code=400, detail="No se encontraron lineas en el archivo")

    return {
        "filename": original_name,
        "lines": lines,
    }


@app.post("/api/export/srt")
def export_srt(payload: ExportPayload):
    lines = _build_valid_intervals(payload.lines)

    chunks = []
    for index, line in enumerate(lines, start=1):
        chunks.append(str(index))
        chunks.append(
            f"{_format_srt_timestamp(line.start or 0)} --> {_format_srt_timestamp(line.end or 0)}"
        )
        chunks.append(line.text)
        chunks.append("")

    srt_content = "\n".join(chunks).strip() + "\n"
    return Response(
        content=srt_content,
        media_type="application/x-subrip",
        headers={
            "Content-Disposition": 'attachment; filename="output.srt"',
        },
    )


@app.post("/api/export/json")
def export_json(payload: ExportPayload):
    lines = _build_valid_intervals(payload.lines)

    export_data = {
        "generatedAt": datetime.now().isoformat(),
        "lines": [_model_to_dict(line) for line in lines],
    }
    json_content = json.dumps(export_data, ensure_ascii=False, indent=2)

    return Response(
        content=json_content,
        media_type="application/json",
        headers={
            "Content-Disposition": 'attachment; filename="output.json"',
        },
    )


FRONTEND_DIST_DIR = _resolve_frontend_dist_dir()

if FRONTEND_DIST_DIR is not None:
    app.mount(
        "/assets",
        StaticFiles(directory=str(FRONTEND_DIST_DIR / "assets")),
        name="frontend-assets",
    )

    @app.get("/", include_in_schema=False)
    def serve_frontend_index() -> FileResponse:
        return FileResponse(FRONTEND_DIST_DIR / "index.html")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend_spa(full_path: str):
        target = FRONTEND_DIST_DIR / full_path
        if target.is_file():
            return FileResponse(target)
        return FileResponse(FRONTEND_DIST_DIR / "index.html")

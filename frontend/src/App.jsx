import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:8000").replace(/\/$/, "");
const STORAGE_KEY = "lyrics-aligner-progress-v1";
const LANGUAGE_STORAGE_KEY = "lyrics-aligner-language-v1";

const TEXTS = {
  es: {
    languageSelectorLabel: "Idioma",
    kicker: "Sincronizacion Manual",
    title: "Alineador de Audio + Lyrics",
    subtitle: "Carga tu audio y letra, marca inicio/fin por linea y exporta a SRT o JSON.",
    sectionUpload: "1) Cargar archivos",
    audioDropTitle: "Audio",
    audioDropDescription: "Arrastra y suelta (mp3, wav, ogg, m4a, aac, flac, webm)",
    fileSelectPrompt: "Click para seleccionar archivo",
    lyricsDropTitle: "Lyrics",
    lyricsDropDescription: "Archivo de texto con una linea por renglon",
    currentTimeLabel: "Tiempo actual",
    sectionSync: "2) Sincronizacion manual",
    activeLineLabel: "Linea activa",
    activeLineEmpty: "Cargar lyrics para iniciar",
    startButton: "Inicio (S)",
    endButton: "Fin (E)",
    shortcutPrefix: "Atajos:",
    shortcutMiddle: "marca inicio y",
    shortcutEnd: "marca final.",
    previousLine: "Linea anterior",
    playActiveLine: "Play linea activa",
    nextLine: "Siguiente linea",
    autoScroll: "Autoscroll",
    exportSrt: "Exportar SRT",
    exportJson: "Exportar JSON",
    clearProject: "Limpiar proyecto",
    sectionLines: "3) Lineas y timestamps",
    linesWord: "lineas",
    emptyLyrics: "Carga un archivo de lyrics para empezar.",
    playLine: "Play",
    syncHere: "Sincronizar aqui",
    startField: "Inicio",
    endField: "Fin",
    playerPlay: "Play",
    playerPause: "Pause",
    statusProgressRecoveryError: "No se pudo recuperar el progreso local",
    statusUploadingAudio: "Subiendo audio...",
    statusAudioLoaded: "Audio cargado",
    statusUploadingLyrics: "Subiendo lyrics...",
    statusLyricsLoaded: "Lyrics cargadas",
    statusStartMarked: (lineNumber) => `Inicio marcado para linea ${lineNumber}`,
    statusEndMarked: (lineNumber) => `Fin marcado para linea ${lineNumber}`,
    statusPlayingFromLine: (lineNumber) => `Reproduciendo desde linea ${lineNumber}`,
    statusExported: (format) => `Archivo ${format} exportado`,
    statusProjectCleared: "Proyecto limpiado",
    errorUploadAudio: "No se pudo cargar el audio",
    errorUploadLyrics: "No se pudo cargar el archivo de lyrics",
    errorNeedAudioFirst: "Primero carga un archivo de audio",
    errorPlaybackControl: "No se pudo controlar la reproduccion",
    errorPlayFromLine: "No se pudo reproducir desde la linea seleccionada",
    errorExport: (format) => `No se pudo exportar ${format}`,
  },
  en: {
    languageSelectorLabel: "Language",
    kicker: "Manual Sync",
    title: "Audio + Lyrics Aligner",
    subtitle: "Upload audio and lyrics, mark start/end per line, and export to SRT or JSON.",
    sectionUpload: "1) Upload Files",
    audioDropTitle: "Audio",
    audioDropDescription: "Drag and drop (mp3, wav, ogg, m4a, aac, flac, webm)",
    fileSelectPrompt: "Click to choose file",
    lyricsDropTitle: "Lyrics",
    lyricsDropDescription: "Text file with one line per row",
    currentTimeLabel: "Current time",
    sectionSync: "2) Manual Sync",
    activeLineLabel: "Active line",
    activeLineEmpty: "Load lyrics to start",
    startButton: "Start (S)",
    endButton: "End (E)",
    shortcutPrefix: "Shortcuts:",
    shortcutMiddle: "marks start and",
    shortcutEnd: "marks end.",
    previousLine: "Previous line",
    playActiveLine: "Play active line",
    nextLine: "Next line",
    autoScroll: "Auto-scroll",
    exportSrt: "Export SRT",
    exportJson: "Export JSON",
    clearProject: "Clear project",
    sectionLines: "3) Lines and Timestamps",
    linesWord: "lines",
    emptyLyrics: "Load a lyrics file to begin.",
    playLine: "Play",
    syncHere: "Sync here",
    startField: "Start",
    endField: "End",
    playerPlay: "Play",
    playerPause: "Pause",
    statusProgressRecoveryError: "Could not restore local progress",
    statusUploadingAudio: "Uploading audio...",
    statusAudioLoaded: "Audio loaded",
    statusUploadingLyrics: "Uploading lyrics...",
    statusLyricsLoaded: "Lyrics loaded",
    statusStartMarked: (lineNumber) => `Start marked for line ${lineNumber}`,
    statusEndMarked: (lineNumber) => `End marked for line ${lineNumber}`,
    statusPlayingFromLine: (lineNumber) => `Playing from line ${lineNumber}`,
    statusExported: (format) => `${format} file exported`,
    statusProjectCleared: "Project cleared",
    errorUploadAudio: "Could not upload audio",
    errorUploadLyrics: "Could not upload lyrics file",
    errorNeedAudioFirst: "Load an audio file first",
    errorPlaybackControl: "Could not control playback",
    errorPlayFromLine: "Could not play from the selected line",
    errorExport: (format) => `Could not export ${format}`,
  },
};

const makeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const toAbsoluteUrl = (value) => {
  if (!value) {
    return "";
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `${API_BASE}${value.startsWith("/") ? value : `/${value}`}`;
};

const round3 = (value) => Math.round(value * 1000) / 1000;

const formatTime = (secondsValue) => {
  if (!Number.isFinite(secondsValue)) {
    return "00:00.000";
  }

  const safeSeconds = Math.max(0, secondsValue);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = Math.floor(safeSeconds % 60);
  const milliseconds = Math.floor((safeSeconds - Math.floor(safeSeconds)) * 1000);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(
    milliseconds
  ).padStart(3, "0")}`;
};

const readErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
    if (typeof payload.message === "string") {
      return payload.message;
    }
  } catch {
    return `Error ${response.status}`;
  }
  return `Error ${response.status}`;
};

const getDownloadName = (response, fallbackName) => {
  const disposition = response.headers.get("content-disposition") || "";

  const utfNameMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfNameMatch?.[1]) {
    return decodeURIComponent(utfNameMatch[1]);
  }

  const plainNameMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (plainNameMatch?.[1]) {
    return plainNameMatch[1];
  }

  return fallbackName;
};

function App() {
  const audioRef = useRef(null);
  const audioInputRef = useRef(null);
  const lyricsInputRef = useRef(null);
  const lineRefs = useRef({});
  const lastAutoScrollTargetRef = useRef(null);

  const [audioUrl, setAudioUrl] = useState("");
  const [audioName, setAudioName] = useState("");
  const [lyricsName, setLyricsName] = useState("");
  const [lines, setLines] = useState([]);
  const [activeLineIndex, setActiveLineIndex] = useState(0);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [followActiveFromLinePlay, setFollowActiveFromLinePlay] = useState(false);

  const [audioDragActive, setAudioDragActive] = useState(false);
  const [lyricsDragActive, setLyricsDragActive] = useState(false);

  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") {
      return "es";
    }

    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return savedLanguage === "en" ? "en" : "es";
  });

  const t = TEXTS[language];

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const saved = JSON.parse(raw);
      if (typeof saved.audioUrl === "string") {
        setAudioUrl(saved.audioUrl);
      }
      if (typeof saved.audioName === "string") {
        setAudioName(saved.audioName);
      }
      if (typeof saved.lyricsName === "string") {
        setLyricsName(saved.lyricsName);
      }
      if (Array.isArray(saved.lines)) {
        const cleanedLines = saved.lines
          .map((line) => ({
            id: typeof line.id === "string" ? line.id : makeId(),
            text: typeof line.text === "string" ? line.text : "",
            start: typeof line.start === "number" ? line.start : null,
            end: typeof line.end === "number" ? line.end : null,
          }))
          .filter((line) => line.text.trim().length > 0);

        setLines(cleanedLines);
      }
      if (typeof saved.autoScroll === "boolean") {
        setAutoScroll(saved.autoScroll);
      }
      if (typeof saved.activeLineIndex === "number") {
        setActiveLineIndex(Math.max(0, saved.activeLineIndex));
      }
    } catch {
      setStatusMessage(t.statusProgressRecoveryError);
    }
  }, []);

  useEffect(() => {
    const payload = {
      audioUrl,
      audioName,
      lyricsName,
      lines,
      activeLineIndex,
      autoScroll,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore local storage write errors.
    }
  }, [audioUrl, audioName, lyricsName, lines, activeLineIndex, autoScroll]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // Ignore local storage write errors.
    }
  }, [language]);

  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) {
      return;
    }

    const onTimeUpdate = () => setCurrentTime(audioElement.currentTime || 0);
    const onLoadedMetadata = () => setDuration(audioElement.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    audioElement.addEventListener("timeupdate", onTimeUpdate);
    audioElement.addEventListener("loadedmetadata", onLoadedMetadata);
    audioElement.addEventListener("play", onPlay);
    audioElement.addEventListener("pause", onPause);
    audioElement.addEventListener("ended", onEnded);

    return () => {
      audioElement.removeEventListener("timeupdate", onTimeUpdate);
      audioElement.removeEventListener("loadedmetadata", onLoadedMetadata);
      audioElement.removeEventListener("play", onPlay);
      audioElement.removeEventListener("pause", onPause);
      audioElement.removeEventListener("ended", onEnded);
    };
  }, [audioUrl]);

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    let frameId = 0;

    const syncTimeSmoothly = () => {
      const audioElement = audioRef.current;
      if (!audioElement) {
        return;
      }

      const nextTime = audioElement.currentTime || 0;
      setCurrentTime((previousTime) =>
        Math.abs(previousTime - nextTime) >= 0.02 ? nextTime : previousTime
      );
      frameId = window.requestAnimationFrame(syncTimeSmoothly);
    };

    frameId = window.requestAnimationFrame(syncTimeSmoothly);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [isPlaying]);

  const playbackLineIndex = useMemo(() => {
    return lines.findIndex((line) => {
      if (line.start === null || line.end === null) {
        return false;
      }
      return currentTime >= line.start && currentTime <= line.end;
    });
  }, [lines, currentTime]);

  const hasExportableLines = useMemo(() => {
    return lines.some(
      (line) => line.start !== null && line.end !== null && Number(line.end) > Number(line.start)
    );
  }, [lines]);

  const autoScrollTargetIndex = useMemo(() => {
    if (!lines.length) {
      return -1;
    }

    if (isPlaying && followActiveFromLinePlay) {
      return activeLineIndex;
    }

    if (playbackLineIndex >= 0) {
      return playbackLineIndex;
    }

    if (!isPlaying) {
      return activeLineIndex;
    }

    let latestStartedIndex = -1;
    let nextStartedIndex = -1;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.start === null) {
        continue;
      }

      if (line.start <= currentTime) {
        latestStartedIndex = index;
      } else if (nextStartedIndex === -1) {
        nextStartedIndex = index;
      }
    }

    if (latestStartedIndex >= 0) {
      return latestStartedIndex;
    }

    if (nextStartedIndex >= 0) {
      return nextStartedIndex;
    }

    return activeLineIndex;
  }, [
    lines,
    playbackLineIndex,
    isPlaying,
    followActiveFromLinePlay,
    activeLineIndex,
    currentTime,
  ]);

  useEffect(() => {
    if (!autoScroll || autoScrollTargetIndex < 0) {
      if (!autoScroll) {
        lastAutoScrollTargetRef.current = null;
      }
      return;
    }

    const targetLine = lines[autoScrollTargetIndex];
    if (!targetLine) {
      return;
    }

    if (lastAutoScrollTargetRef.current === targetLine.id) {
      return;
    }

    const element = lineRefs.current[targetLine.id];
    if (element) {
      lastAutoScrollTargetRef.current = targetLine.id;
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [autoScroll, autoScrollTargetIndex, lines]);

  useEffect(() => {
    if (!isPlaying || !followActiveFromLinePlay || !lines.length) {
      return;
    }

    if (playbackLineIndex >= 0 && playbackLineIndex !== activeLineIndex) {
      setActiveLineIndex(playbackLineIndex);
      return;
    }

    setActiveLineIndex((prevIndex) => {
      let nextIndex = prevIndex;

      while (nextIndex < lines.length - 1) {
        const currentLine = lines[nextIndex];
        if (!currentLine || currentLine.end === null) {
          break;
        }

        if (currentTime <= currentLine.end + 0.005) {
          break;
        }

        nextIndex += 1;
      }

      return nextIndex;
    });
  }, [
    isPlaying,
    followActiveFromLinePlay,
    lines,
    currentTime,
    playbackLineIndex,
    activeLineIndex,
  ]);

  const resetMessages = () => {
    setErrorMessage("");
    setStatusMessage("");
  };

  const uploadAudioFile = async (file) => {
    if (!file) {
      return;
    }

    resetMessages();
    setStatusMessage(t.statusUploadingAudio);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/api/upload/audio`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = await response.json();
      const nextAudioUrl = toAbsoluteUrl(payload.audioUrl);

      setAudioUrl(nextAudioUrl);
      setAudioName(payload.filename || file.name);
      setCurrentTime(0);
      setDuration(0);
      setStatusMessage(t.statusAudioLoaded);
    } catch (error) {
      setErrorMessage(error.message || t.errorUploadAudio);
      setStatusMessage("");
    }
  };

  const uploadLyricsFile = async (file) => {
    if (!file) {
      return;
    }

    resetMessages();
    setStatusMessage(t.statusUploadingLyrics);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE}/api/upload/lyrics`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const payload = await response.json();
      const preparedLines = (payload.lines || []).map((text) => ({
        id: makeId(),
        text,
        start: null,
        end: null,
      }));

      setLyricsName(payload.filename || file.name);
      setLines(preparedLines);
      setActiveLineIndex(0);
      setFollowActiveFromLinePlay(false);
      setStatusMessage(t.statusLyricsLoaded);
    } catch (error) {
      setErrorMessage(error.message || t.errorUploadLyrics);
      setStatusMessage("");
    }
  };

  const onAudioDrop = (event) => {
    event.preventDefault();
    setAudioDragActive(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      uploadAudioFile(droppedFile);
    }
  };

  const onLyricsDrop = (event) => {
    event.preventDefault();
    setLyricsDragActive(false);
    const droppedFile = event.dataTransfer.files?.[0];
    if (droppedFile) {
      uploadLyricsFile(droppedFile);
    }
  };

  const setActiveLineSafe = (nextIndex) => {
    if (!lines.length) {
      return;
    }
    const clamped = Math.max(0, Math.min(nextIndex, lines.length - 1));
    setActiveLineIndex(clamped);
  };

  const markStart = () => {
    if (!lines.length) {
      return;
    }

    const markValue = round3(currentTime);
    setLines((prev) =>
      prev.map((line, index) => {
        if (index !== activeLineIndex) {
          return line;
        }
        const end = line.end !== null && line.end < markValue ? markValue : line.end;
        return {
          ...line,
          start: markValue,
          end,
        };
      })
    );
    setStatusMessage(t.statusStartMarked(activeLineIndex + 1));
  };

  const markEnd = () => {
    if (!lines.length) {
      return;
    }

    const markValue = round3(currentTime);
    setLines((prev) =>
      prev.map((line, index) => {
        if (index !== activeLineIndex) {
          return line;
        }

        const computedStart = line.start === null ? markValue : line.start;
        const computedEnd = markValue <= computedStart ? round3(computedStart + 0.01) : markValue;

        return {
          ...line,
          start: computedStart,
          end: computedEnd,
        };
      })
    );

    setStatusMessage(t.statusEndMarked(activeLineIndex + 1));
    setActiveLineIndex((prev) => Math.min(prev + 1, Math.max(0, lines.length - 1)));
  };

  useEffect(() => {
    const onKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key !== "s" && key !== "e") {
        return;
      }

      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      const isEditableTarget =
        target?.isContentEditable ||
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select";

      if (isEditableTarget || !audioUrl || !lines.length) {
        return;
      }

      event.preventDefault();
      if (key === "s") {
        markStart();
      } else {
        markEnd();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [audioUrl, lines.length, markStart, markEnd]);

  const updateLineText = (index, value) => {
    setLines((prev) =>
      prev.map((line, lineIndex) => {
        if (lineIndex !== index) {
          return line;
        }
        return {
          ...line,
          text: value,
        };
      })
    );
  };

  const updateLineTimestamp = (index, key, value) => {
    setLines((prev) =>
      prev.map((line, lineIndex) => {
        if (lineIndex !== index) {
          return line;
        }

        if (value === "") {
          return {
            ...line,
            [key]: null,
          };
        }

        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
          return line;
        }

        return {
          ...line,
          [key]: round3(parsed),
        };
      })
    );
  };

  const togglePlay = async () => {
    if (!audioRef.current) {
      return;
    }

    if (!audioUrl) {
      setErrorMessage(t.errorNeedAudioFirst);
      return;
    }

    try {
      if (audioRef.current.paused) {
        setFollowActiveFromLinePlay(false);
        await audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    } catch {
      setErrorMessage(t.errorPlaybackControl);
    }
  };

  const seekTo = (value) => {
    if (!audioRef.current) {
      return;
    }

    const nextTime = Number(value);
    if (!Number.isFinite(nextTime)) {
      return;
    }

    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const jumpSeconds = (delta) => {
    if (!audioRef.current) {
      return;
    }

    const maxDuration = Number.isFinite(duration) && duration > 0 ? duration : audioRef.current.duration || 0;
    const nextTime = Math.max(0, Math.min(maxDuration, audioRef.current.currentTime + delta));

    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const playFromLine = async (index) => {
    if (!audioRef.current || !lines[index]) {
      return;
    }

    const currentLine = lines[index];
    let startTime = null;

    if (currentLine.start !== null) {
      startTime = currentLine.start;
    } else {
      for (let backIndex = index - 1; backIndex >= 0; backIndex -= 1) {
        const previousLine = lines[backIndex];
        if (previousLine.end !== null) {
          startTime = previousLine.end;
          break;
        }
        if (previousLine.start !== null) {
          startTime = previousLine.start;
          break;
        }
      }
    }

    const seekTime = Math.max(0, startTime ?? 0);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
    setActiveLineSafe(index);
    setFollowActiveFromLinePlay(true);

    try {
      await audioRef.current.play();
      setStatusMessage(t.statusPlayingFromLine(index + 1));
    } catch {
      setErrorMessage(t.errorPlayFromLine);
    }
  };

  const exportFile = async (type) => {
    resetMessages();

    const endpoint = type === "srt" ? "srt" : "json";
    const fallbackName = endpoint === "srt" ? "output.srt" : "output.json";
    const payload = {
      lines: lines.map((line) => ({
        text: line.text,
        start: line.start,
        end: line.end,
      })),
    };

    try {
      const response = await fetch(`${API_BASE}/api/export/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await readErrorMessage(response));
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = getDownloadName(response, fallbackName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      setStatusMessage(t.statusExported(endpoint.toUpperCase()));
    } catch (error) {
      setErrorMessage(error.message || t.errorExport(endpoint.toUpperCase()));
    }
  };

  const clearProject = () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setAudioUrl("");
    setAudioName("");
    setLyricsName("");
    setLines([]);
    setActiveLineIndex(0);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setFollowActiveFromLinePlay(false);
    setErrorMessage("");
    setStatusMessage(t.statusProjectCleared);
  };

  const activeLine = lines[activeLineIndex];
  const sliderMax = duration > 0 ? duration : 1;

  return (
    <div className="page-shell">
      <div className="orb orb-one" />
      <div className="orb orb-two" />

      <header className="header panel">
        <div className="header-top">
          <p className="kicker">{t.kicker}</p>
          <div className="language-switch" role="group" aria-label={t.languageSelectorLabel}>
            <button
              type="button"
              className={`language-button ${language === "es" ? "is-active" : ""}`}
              onClick={() => setLanguage("es")}
              aria-pressed={language === "es"}
            >
              ES
            </button>
            <button
              type="button"
              className={`language-button ${language === "en" ? "is-active" : ""}`}
              onClick={() => setLanguage("en")}
              aria-pressed={language === "en"}
            >
              EN
            </button>
          </div>
        </div>
        <h1>{t.title}</h1>
        <p className="subtitle">{t.subtitle}</p>
      </header>

      <main className="layout">
        <section className="panel uploader-panel">
          <h2>{t.sectionUpload}</h2>

          <div
            className={`dropzone ${audioDragActive ? "is-dragging" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setAudioDragActive(true);
            }}
            onDragLeave={() => setAudioDragActive(false)}
            onDrop={onAudioDrop}
            onClick={() => audioInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                audioInputRef.current?.click();
              }
            }}
          >
            <h3>{t.audioDropTitle}</h3>
            <p>{t.audioDropDescription}</p>
            <span>{audioName || t.fileSelectPrompt}</span>
          </div>

          <div
            className={`dropzone ${lyricsDragActive ? "is-dragging" : ""}`}
            onDragOver={(event) => {
              event.preventDefault();
              setLyricsDragActive(true);
            }}
            onDragLeave={() => setLyricsDragActive(false)}
            onDrop={onLyricsDrop}
            onClick={() => lyricsInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                lyricsInputRef.current?.click();
              }
            }}
          >
            <h3>{t.lyricsDropTitle}</h3>
            <p>{t.lyricsDropDescription}</p>
            <span>{lyricsName || t.fileSelectPrompt}</span>
          </div>

          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm"
            hidden
            onChange={(event) => uploadAudioFile(event.target.files?.[0])}
          />
          <input
            ref={lyricsInputRef}
            type="file"
            accept="text/plain,.txt,.lrc,.md"
            hidden
            onChange={(event) => uploadLyricsFile(event.target.files?.[0])}
          />

          <div className="player-box">
            <audio ref={audioRef} src={audioUrl} preload="metadata" />

            <div className="time-row">
              <span>{t.currentTimeLabel}</span>
              <strong>{formatTime(currentTime)}</strong>
              <small>/ {formatTime(duration)}</small>
            </div>

            <input
              type="range"
              min="0"
              max={sliderMax}
              step="0.001"
              value={Math.min(currentTime, sliderMax)}
              disabled={!audioUrl}
              onChange={(event) => seekTo(event.target.value)}
            />

            <div className="player-actions">
              <button type="button" onClick={() => jumpSeconds(-5)} disabled={!audioUrl}>
                -5s
              </button>
              <button type="button" className="play-toggle" onClick={togglePlay} disabled={!audioUrl}>
                {isPlaying ? t.playerPause : t.playerPlay}
              </button>
              <button type="button" onClick={() => jumpSeconds(5)} disabled={!audioUrl}>
                +5s
              </button>
            </div>
          </div>
        </section>

        <section className="panel sync-panel">
          <h2>{t.sectionSync}</h2>

          <div className="active-line-card">
            <p>{t.activeLineLabel}</p>
            <h3>
              {activeLine ? `${activeLineIndex + 1}. ${activeLine.text}` : t.activeLineEmpty}
            </h3>
          </div>

          <div className="sync-buttons">
            <button type="button" className="mark-start" onClick={markStart} disabled={!lines.length || !audioUrl}>
              {t.startButton}
            </button>
            <button type="button" className="mark-end" onClick={markEnd} disabled={!lines.length || !audioUrl}>
              {t.endButton}
            </button>
          </div>

          <p className="shortcut-hint">
            {t.shortcutPrefix} <strong>S</strong> {t.shortcutMiddle} <strong>E</strong> {t.shortcutEnd}
          </p>

          <div className="line-navigation">
            <button type="button" onClick={() => setActiveLineSafe(activeLineIndex - 1)} disabled={!lines.length}>
              {t.previousLine}
            </button>
            <button type="button" onClick={() => playFromLine(activeLineIndex)} disabled={!lines.length || !audioUrl}>
              {t.playActiveLine}
            </button>
            <button type="button" onClick={() => setActiveLineSafe(activeLineIndex + 1)} disabled={!lines.length}>
              {t.nextLine}
            </button>
          </div>

          <div className="toggle-row">
            <label>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(event) => setAutoScroll(event.target.checked)}
              />
              {t.autoScroll}
            </label>
          </div>

          <div className="export-actions">
            <button type="button" onClick={() => exportFile("srt")} disabled={!hasExportableLines}>
              {t.exportSrt}
            </button>
            <button type="button" onClick={() => exportFile("json")} disabled={!hasExportableLines}>
              {t.exportJson}
            </button>
            <button type="button" onClick={clearProject}>
              {t.clearProject}
            </button>
          </div>

          {statusMessage && <p className="feedback ok">{statusMessage}</p>}
          {errorMessage && <p className="feedback error">{errorMessage}</p>}
        </section>

        <section className="panel lyrics-panel">
          <div className="lyrics-title-row">
            <h2>{t.sectionLines}</h2>
            <p>{lines.length} {t.linesWord}</p>
          </div>

          <div className="lyrics-list" role="list">
            {lines.length === 0 && <p className="empty-state">{t.emptyLyrics}</p>}

            {lines.map((line, index) => {
              const isActive = index === activeLineIndex;
              const isPlayingLine = index === playbackLineIndex;
              return (
                <article
                  key={line.id}
                  ref={(element) => {
                    lineRefs.current[line.id] = element;
                  }}
                  className={`line-item ${isActive ? "is-active" : ""} ${
                    isPlayingLine ? "is-playing" : ""
                  }`}
                  style={{ "--index": index }}
                  onClick={() => setActiveLineSafe(index)}
                >
                  <button
                    type="button"
                    className="line-play"
                    onClick={(event) => {
                      event.stopPropagation();
                      playFromLine(index);
                    }}
                    disabled={!audioUrl}
                  >
                    {t.playLine}
                  </button>

                  <div className="line-content">
                    <div className="line-meta">
                      <span className="line-number">#{index + 1}</span>
                      <button
                        type="button"
                        className="line-set-active"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveLineSafe(index);
                        }}
                      >
                        {t.syncHere}
                      </button>
                    </div>

                    <input
                      type="text"
                      value={line.text}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateLineText(index, event.target.value)}
                      className="line-text"
                    />

                    <div className="line-times">
                      <label>
                        {t.startField}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.start ?? ""}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => updateLineTimestamp(index, "start", event.target.value)}
                        />
                      </label>

                      <label>
                        {t.endField}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.end ?? ""}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => updateLineTimestamp(index, "end", event.target.value)}
                        />
                      </label>

                      <span className="line-preview-time">
                        {line.start !== null ? formatTime(line.start) : "--:--.---"} -{" "}
                        {line.end !== null ? formatTime(line.end) : "--:--.---"}
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;

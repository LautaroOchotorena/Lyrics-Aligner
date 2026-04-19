from __future__ import annotations

import os
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
NPM_EXECUTABLE = "npm.cmd" if os.name == "nt" else "npm"


def stream_output(name: str, process: subprocess.Popen[str]) -> None:
    if process.stdout is None:
        return

    for line in iter(process.stdout.readline, ""):
        if not line:
            break
        print(f"[{name}] {line}", end="")


def stop_processes(processes: list[subprocess.Popen[str]]) -> None:
    for process in processes:
        if process.poll() is None:
            process.terminate()

    deadline = time.time() + 5
    while time.time() < deadline:
        if all(process.poll() is not None for process in processes):
            return
        time.sleep(0.1)

    for process in processes:
        if process.poll() is None:
            process.kill()


def start_processes() -> tuple[subprocess.Popen[str], subprocess.Popen[str]]:
    backend_command = [
        sys.executable,
        "-m",
        "uvicorn",
        "main:app",
        "--reload",
        "--app-dir",
        str(ROOT_DIR / "backend"),
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
    ]
    frontend_command = [
        NPM_EXECUTABLE,
        "--prefix",
        str(ROOT_DIR / "frontend"),
        "run",
        "dev",
    ]

    backend_process = subprocess.Popen(
        backend_command,
        cwd=str(ROOT_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
    )

    frontend_process = subprocess.Popen(
        frontend_command,
        cwd=str(ROOT_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
    )

    return backend_process, frontend_process


def main() -> int:
    print("Iniciando backend y frontend...")

    try:
        backend_process, frontend_process = start_processes()
    except FileNotFoundError as error:
        print("No se pudo iniciar el entorno de desarrollo:")
        print(error)
        return 1

    processes = [backend_process, frontend_process]

    backend_thread = threading.Thread(
        target=stream_output,
        args=("backend", backend_process),
        daemon=True,
    )
    frontend_thread = threading.Thread(
        target=stream_output,
        args=("frontend", frontend_process),
        daemon=True,
    )
    backend_thread.start()
    frontend_thread.start()

    try:
        while True:
            if backend_process.poll() is not None:
                print(f"\nBackend finalizo con codigo {backend_process.returncode}. Cerrando frontend...")
                stop_processes(processes)
                return int(backend_process.returncode or 0)

            if frontend_process.poll() is not None:
                print(f"\nFrontend finalizo con codigo {frontend_process.returncode}. Cerrando backend...")
                stop_processes(processes)
                return int(frontend_process.returncode or 0)

            time.sleep(0.2)
    except KeyboardInterrupt:
        print("\nInterrupcion detectada. Cerrando procesos...")
        stop_processes(processes)
        return 0


if __name__ == "__main__":
    raise SystemExit(main())

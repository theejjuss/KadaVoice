@echo off
title KadaVoice - Unified Server
echo ========================================================
echo   KadaVoice: Production-Ready Voice Grocery Platform
echo ========================================================
echo.

echo 1. Checking Python Virtual Environment...
if exist ".\KadaVoice\venv\Scripts\python.exe" (
    set PYTHON_EXE=.\KadaVoice\venv\Scripts\python.exe
) else (
    set PYTHON_EXE=python
)

echo 2. Launching Unified Server at http://127.0.0.1:8000 ...
echo    (Serves both the Frontend SPA and FastAPI Backend)
echo.
%PYTHON_EXE% -m uvicorn backend_api:app --host 127.0.0.1 --port 8000
pause

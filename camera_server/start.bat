@echo off
setlocal EnableDelayedExpansion
title UniThrift Camera Server
color 0A

echo.
echo  ============================================================
echo   UniThrift Camera Server — Windows 11 Startup
echo  ============================================================
echo.

:: ── Locate script directory ───────────────────────────────────────────────────
set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: ── Check .env exists ─────────────────────────────────────────────────────────
if not exist ".env" (
    echo  [SETUP] .env not found — copying from .env.example
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo  [SETUP] .env created. Open it and set CAMERA_WS_SECRET before continuing.
        echo.
        echo  Press any key to open .env in Notepad, then re-run start.bat.
        pause >nul
        notepad ".env"
        exit /b 0
    ) else (
        echo  [ERROR] .env.example not found. Cannot continue.
        pause
        exit /b 1
    )
)

:: ── Check Python is installed ─────────────────────────────────────────────────
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Python not found in PATH.
    echo.
    echo  Install Python 3.11+ from https://www.python.org/downloads/
    echo  Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

for /f "tokens=2 delims= " %%v in ('python --version 2^>^&1') do set PY_VER=%%v
echo  [OK] Python %PY_VER% found

:: ── Create virtual environment if needed ──────────────────────────────────────
if not exist "venv\Scripts\activate.bat" (
    echo  [SETUP] Creating virtual environment…
    python -m venv venv
    if %errorlevel% neq 0 (
        echo  [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo  [OK] Virtual environment created
)

:: ── Activate virtual environment ──────────────────────────────────────────────
call "venv\Scripts\activate.bat"
echo  [OK] Virtual environment activated

:: ── Install / upgrade dependencies ───────────────────────────────────────────
echo  [SETUP] Checking dependencies…
python -m pip install --quiet --upgrade pip
python -m pip install --quiet -r requirements.txt
if %errorlevel% neq 0 (
    echo  [ERROR] Failed to install dependencies.
    echo  Try running: pip install -r requirements.txt
    pause
    exit /b 1
)
echo  [OK] Dependencies ready

:: ── Verify OpenCV can import ──────────────────────────────────────────────────
python -c "import cv2; print(f'  [OK] OpenCV {cv2.__version__} ready')"
if %errorlevel% neq 0 (
    echo  [ERROR] OpenCV import failed. Try: pip install opencv-python
    pause
    exit /b 1
)

:: ── Launch camera server ──────────────────────────────────────────────────────
echo.
echo  ============================================================
echo   Starting camera server…  (Press Ctrl+C to stop)
echo  ============================================================
echo.

python main.py

:: ── On exit ───────────────────────────────────────────────────────────────────
echo.
echo  Camera server stopped.
pause

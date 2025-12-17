@echo off
echo Starting MHC-agent Development Environment...
echo.

:: Get the directory where this batch file is located
set "ROOT_DIR=%~dp0"

:: Start Ollama serve in a new terminal
echo Starting Ollama serve...
start "Ollama Server" cmd /k "ollama serve"

:: Wait a moment for Ollama to start
timeout /t 3 /nobreak >nul

:: Start Backend (FastAPI with uvicorn)
echo Starting Backend...
start "Backend Server" cmd /k "cd /d "%ROOT_DIR%backend" && myenv\Scripts\activate && uvicorn app.main:app --reload"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Start Frontend (Next.js)
echo Starting Frontend...
start "Frontend Server" cmd /k "cd /d "%ROOT_DIR%frontend" && npm run dev"

:: Wait for frontend to be ready
echo Waiting for servers to start...
timeout /t 5 /nobreak >nul

:: Open the frontend in default web browser
echo Opening browser...
start "" "http://localhost:3000"

echo.
echo All services started!
echo - Ollama:   Running in separate terminal
echo - Backend:  http://localhost:8000
echo - Frontend: http://localhost:3000
echo.
echo Press any key to exit this window (services will keep running)...
pause >nul

@echo off
echo ========================================================
echo Starting SkyguardAI Atmospheric Intelligence Platform
echo ========================================================
echo.

:: 1. Start Backend in separate window
echo Starting Backend FastAPI Server on http://localhost:8000 ...
if exist .venv\Scripts\python.exe (
    start "SkyguardAI Backend" .venv\Scripts\python.exe -m uvicorn backend.app:app --reload --port 8000 --host 0.0.0.0
) else (
    start "SkyguardAI Backend" python -m uvicorn backend.app:app --reload --port 8000 --host 0.0.0.0
)

:: 2. Start Frontend in separate window
echo Starting Frontend React/Vite App on http://localhost:5173 ...
cd frontend
start "SkyguardAI Frontend" npm run dev

echo.
echo ========================================================
echo SkyguardAI is running!
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:8000 (Swagger docs: http://localhost:8000/docs)
echo ========================================================

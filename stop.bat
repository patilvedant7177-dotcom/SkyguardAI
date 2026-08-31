@echo off
echo ========================================================
echo Stopping SkyguardAI Platform (Backend and Frontend)
echo ========================================================
echo.

echo Terminating processes on Port 8000 (Backend) and Port 5173 (Frontend)...
powershell -Command "Get-NetTCPConnection -LocalPort 8000,5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }"

echo Terminating any dangling uvicorn/node processes...
taskkill /F /IM uvicorn.exe 2>nul
taskkill /F /IM node.exe 2>nul

echo.
echo ========================================================
echo SkyguardAI has been stopped successfully!
echo ========================================================

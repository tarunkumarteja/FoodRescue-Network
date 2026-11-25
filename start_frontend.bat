@echo off
echo ========================================================
echo Starting FoodRescue Network - Vite React Frontend (Port 5173)
echo ========================================================
cd /d "%~dp0frontend"
if not exist node_modules npm ci
if %errorlevel% neq 0 (
    pause
    exit /b 1
)
npm run dev
pause

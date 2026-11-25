@echo off
echo ========================================================
echo Launching FoodRescue Network (Backend + Frontend)
echo ========================================================

set "PYTHON_EXE=python"
where python >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
        set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    )
)

start "FoodRescue Backend [Django REST]" cmd /k ""%~dp0start_backend.bat""
timeout /t 3 /nobreak >nul
start "FoodRescue Frontend [Vite React]" cmd /k ""%~dp0start_frontend.bat""
echo Both servers started!
echo Frontend: http://localhost:5173
echo Backend API: http://127.0.0.1:8000/api/v1/
pause

@echo off
echo ========================================================
echo Starting FoodRescue Network - Django REST Backend (Port 8000)
echo ========================================================
cd /d "%~dp0backend"

set "PYTHON_EXE=python"
where python >nul 2>nul
if %errorlevel% neq 0 (
    if exist "%LOCALAPPDATA%\Programs\Python\Python310\python.exe" (
        set "PYTHON_EXE=%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
    )
)

echo Using Python: %PYTHON_EXE%
"%PYTHON_EXE%" manage.py migrate
if %errorlevel% neq 0 (
    pause
    exit /b 1
)
"%PYTHON_EXE%" manage.py seed_demo
if %errorlevel% neq 0 (
    pause
    exit /b 1
)
"%PYTHON_EXE%" manage.py runserver 127.0.0.1:8000
pause

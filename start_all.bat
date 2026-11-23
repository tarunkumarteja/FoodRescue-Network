@echo off
echo ========================================================
echo Launching FoodRescue Network (Backend + Frontend)
echo ========================================================
start "FoodRescue Backend [Django REST]" cmd /k "cd /d %~dp0backend && py.cmd manage.py runserver 0.0.0.0:8000"
timeout /t 3 /nobreak >nul
start "FoodRescue Frontend [Vite React]" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Both servers started!
echo Frontend: http://localhost:5173
echo Backend API: http://127.0.0.1:8000/api/v1/
pause

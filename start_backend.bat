@echo off
echo ========================================================
echo Starting FoodRescue Network - Django REST Backend (Port 8000)
echo ========================================================
cd /d "%~dp0backend"
call py.cmd manage.py runserver 0.0.0.0:8000
pause

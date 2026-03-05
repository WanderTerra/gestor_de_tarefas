@echo off
cd /d "%~dp0"

if not exist "backend\node_modules" (
  echo Instalando dependencias do backend...
  cd backend && npm install && cd ..
)
if not exist "frontend\node_modules" (
  echo Instalando dependencias do frontend...
  cd frontend && npm install && cd ..
)

start "Backend - Gestor de Tarefas" cmd /k "cd /d "%~dp0backend" && npm run db:generate && npm run dev"
timeout /t 2 /nobreak >nul
start "Frontend - Gestor de Tarefas" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Backend e Frontend iniciados em janelas separadas.
echo Backend:  http://localhost:3001
echo Frontend: http://localhost:5173
echo.
pause

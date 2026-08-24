@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js and npm are required. Install them from https://nodejs.org/ and try again.
  pause
  exit /b 1
)

if not exist "node_modules\vite\package.json" (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

echo Starting HTML Thumbnail Library...
start "" http://localhost:3000
call npm run dev

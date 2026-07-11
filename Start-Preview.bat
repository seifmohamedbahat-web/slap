@echo off
title Keeps It Real Estate - Local Preview Server
cd /d "%~dp0"

echo Starting a local server so the site's animations (which use ES modules)
echo can load correctly. Do not close the black server window that appears -
echo just close it when you're done previewing.
echo.

where python >nul 2>nul
if %errorlevel%==0 (
  start "Keeps It Real Estate - local server (do not close)" cmd /k "python -m http.server 8000"
  timeout /t 2 /nobreak >nul
  start "" http://localhost:8000/index.html
  goto :eof
)

where py >nul 2>nul
if %errorlevel%==0 (
  start "Keeps It Real Estate - local server (do not close)" cmd /k "py -m http.server 8000"
  timeout /t 2 /nobreak >nul
  start "" http://localhost:8000/index.html
  goto :eof
)

where npx >nul 2>nul
if %errorlevel%==0 (
  start "Keeps It Real Estate - local server (do not close)" cmd /k "npx --yes serve -l 8000 ."
  timeout /t 3 /nobreak >nul
  start "" http://localhost:8000/index.html
  goto :eof
)

echo Could not find Python or Node.js on this computer, so a local server
echo could not be started automatically.
echo.
echo Options:
echo   1. Install Python from https://python.org (check "Add to PATH" during
echo      setup), then double-click this file again.
echo   2. Install Node.js from https://nodejs.org, then double-click this
echo      file again.
echo   3. In VS Code, install the "Live Server" extension, then right-click
echo      index.html and choose "Open with Live Server".
echo.
pause

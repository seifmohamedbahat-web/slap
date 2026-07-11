#!/usr/bin/env bash
# Keeps It Real Estate - local preview server (macOS / Linux)
cd "$(dirname "$0")"

echo "Starting a local server so the site's animations (which use ES modules)"
echo "can load correctly. Press Ctrl+C here when you're done previewing."
echo

open_browser() {
  sleep 1
  if command -v open >/dev/null 2>&1; then open "http://localhost:8000/index.html"
  elif command -v xdg-open >/dev/null 2>&1; then xdg-open "http://localhost:8000/index.html"
  fi
}

if command -v python3 >/dev/null 2>&1; then
  open_browser &
  python3 -m http.server 8000
elif command -v python >/dev/null 2>&1; then
  open_browser &
  python -m http.server 8000
elif command -v npx >/dev/null 2>&1; then
  open_browser &
  npx --yes serve -l 8000 .
else
  echo "Could not find Python or Node.js on this computer."
  echo "Install Python (https://python.org) or Node.js (https://nodejs.org), then run this script again."
  echo "Or in VS Code, install the \"Live Server\" extension and right-click index.html to open it."
fi

KEEPS IT REAL ESTATE — LOCAL PREVIEW
=====================================

This site uses modern JavaScript modules to run its Three.js / GSAP
animations. Browsers (Edge, Chrome, etc.) block modules from loading when
you open an HTML file directly by double-clicking it — you'll see a blank
page or broken animations if you try that.

To preview it correctly:

WINDOWS
  Double-click "Start-Preview.bat". It opens a small black server window
  (leave it running) and launches the site in your default browser at
  http://localhost:8000. Close the black window when you're done.

MAC / LINUX
  Double-click "Start-Preview.sh" (or run it from a terminal:
  ./Start-Preview.sh). Press Ctrl+C in that terminal when you're done.

If neither works (no Python or Node.js installed):
  - Install Python from https://python.org (check "Add to PATH" during
    setup) and try again, OR
  - Install Node.js from https://nodejs.org and try again, OR
  - In VS Code, install the "Live Server" extension, then right-click
    index.html and choose "Open with Live Server".

Pages: index.html (Home), listings.html, about.html, contact.html

Note: the 8 listing "photos" are placeholder blueprint-style artwork
generated to match the brand, since no real property photography was
provided — swap these for real photos before launch (see elevations.js
and listings-data.js in assets/js/).

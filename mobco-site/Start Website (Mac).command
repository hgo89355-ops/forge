#!/bin/bash
# Double-click to open the MOBCO website on this Mac (fully interactive, runs locally — nothing is uploaded).
# The site uses modern JavaScript modules, which browsers only run from a web address, so this starts a tiny
# local web server in this folder and opens http://localhost:8080 in your default browser.
# First time only: if macOS says it can't be opened, right-click this file → Open → Open.
cd "$(dirname "$0")" || exit 1
PORT=8080
while lsof -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; do PORT=$((PORT+1)); done
URL="http://localhost:$PORT/index.html"
echo "MOBCO website → $URL"
echo "Keep this window open while browsing. Close it (or press Ctrl+C) to stop."
( sleep 1.5; open "$URL" ) &
if command -v python3 >/dev/null 2>&1 && python3 -c "import sys" >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT" --bind 127.0.0.1
elif command -v ruby >/dev/null 2>&1; then
  exec ruby -run -e httpd . -p "$PORT" -b 127.0.0.1
elif command -v php >/dev/null 2>&1; then
  exec php -S "127.0.0.1:$PORT"
else
  echo "No built-in web server found. Install Python 3 from https://www.python.org/downloads/ and try again."
  read -r -p "Press Enter to close."
fi

#!/bin/bash
set -e

echo "Starting DMX Control Room..."

SCRIPT_PATH="${BASH_SOURCE[0]}"
while [ -L "$SCRIPT_PATH" ]; do
  SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
  LINK_TARGET="$(readlink "$SCRIPT_PATH")"
  case "$LINK_TARGET" in
    /*) SCRIPT_PATH="$LINK_TARGET" ;;
    *) SCRIPT_PATH="$SCRIPT_DIR/$LINK_TARGET" ;;
  esac
done

PROJECT="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
echo "Project: $PROJECT"

cd "$PROJECT"

if [ ! -f "package.json" ]; then
  echo "ERRORE: package.json non trovato in $PROJECT"
  echo "Non avvio nulla."
  exit 1
fi

if [ -d ".venv" ]; then
  source ".venv/bin/activate"
  echo "Python venv activated."
fi

echo "Starting Electron..."
npm run desktop:dev

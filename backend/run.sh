#!/bin/bash
set -e
cd "$(dirname "$0")"

# Use PYTHON env var if set, otherwise auto-detect
PYTHON=${PYTHON:-$(command -v python3 || command -v python)}

# .env file is optional — on Railway env vars come from the platform
if [ ! -f .env ] && [ -z "$OPENAI_API_KEY" ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "Created .env from .env.example — add your OPENAI_API_KEY before starting"
    exit 1
  fi
fi

CHROMA_CHECK="${CHROMA_DIR:-data/chroma}"
if [ ! -d "$CHROMA_CHECK" ] || [ -z "$(ls -A "$CHROMA_CHECK" 2>/dev/null)" ]; then
  echo "Building ingredient index (first run, ~15 min)..."
  $PYTHON scripts/build_index.py
fi

echo "Starting Agnes API on http://0.0.0.0:${PORT:-8000}"
$PYTHON -m uvicorn api.main:app --host 0.0.0.0 --port "${PORT:-8000}"

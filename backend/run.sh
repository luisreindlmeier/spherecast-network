#!/bin/bash
set -e
cd "$(dirname "$0")"

PYTHON=python3.13

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env — please add your ANTHROPIC_API_KEY"
  exit 1
fi

if [ ! -d data/chroma ] || [ -z "$(ls -A data/chroma 2>/dev/null)" ]; then
  echo "Building ingredient index (first run, ~15 min)..."
  $PYTHON scripts/build_index.py
fi

echo "Starting Agnes API on http://localhost:8000 (Swagger: http://localhost:8000/docs)"
$PYTHON -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

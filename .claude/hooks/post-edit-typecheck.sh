#!/bin/bash
cd "$(git rev-parse --show-toplevel)" 2>/dev/null || exit 0

# Auto-format
pnpm prettier --write . --log-level silent 2>/dev/null

# TypeScript check
if [ -f "tsconfig.json" ]; then
  result=$(pnpm tsc --noEmit 2>&1)
  errors=$(echo "$result" | grep -c "error TS" || true)
  if [ "$errors" -gt 0 ]; then
    echo "⚠️  TypeScript: $errors error(s) found"
    echo "$result" | grep "error TS" | head -5
  fi
fi

#!/usr/bin/env bash
set -e

echo "========================================================"
echo "  KadaVoice: Production-Ready Voice Grocery Platform"
echo "========================================================"
echo ""

PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"

echo "Starting Unified KadaVoice Server on http://$HOST:$PORT ..."
exec uvicorn backend_api:app --host "$HOST" --port "$PORT"

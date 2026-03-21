#!/bin/bash
set -e

echo "=== Starting Capacity Navigator Backend ==="
echo "Checking environment variables..."

if [ -z "$DATABASE_URL" ]; then
    echo "ERROR: DATABASE_URL is not set!"
    echo "Available environment variables:"
    env | grep -i database || echo "No DATABASE variables found"
    exit 1
fi

echo "✅ DATABASE_URL is set (length: ${#DATABASE_URL} chars)"
echo "First 50 chars: ${DATABASE_URL:0:50}..."

echo ""
echo "Running database migrations..."
cd /app/backend
alembic upgrade head

echo ""
echo "Seeding EMG workspace data (idempotent)..."
python3 seed_emg_data.py || echo "⚠️  EMG seed skipped (non-critical)"

echo ""
echo "Starting Uvicorn server..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}

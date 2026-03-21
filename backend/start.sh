#!/bin/bash
set -e

echo "🚀 Starting Capacity Navigator Backend..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  WARNING: DATABASE_URL is not set"
    echo "Please configure PostgreSQL database in Railway"
    exit 1
fi

echo "✅ DATABASE_URL is configured"

# Run migrations
echo "📦 Running database migrations..."
alembic upgrade head || {
    echo "❌ Migration failed. Check if database is accessible."
    exit 1
}

echo "✅ Migrations completed successfully"

# Start the server
echo "🌐 Starting Uvicorn server on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"

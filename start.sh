#!/bin/bash

echo "📊 MikroTik Geo VPN - Quick Start"
echo "================================="
echo ""

# Check .env exists
if [ ! -f .env ]; then
    echo "❌ .env not found!"
    echo "   Run ./setup.sh first or copy .env.example to .env"
    exit 1
fi

echo "🐳 Starting services..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

echo ""
echo "📊 Dashboard: http://localhost:${WEB_PORT:-8080}"
echo ""
echo "📝 View logs: docker compose logs -f"

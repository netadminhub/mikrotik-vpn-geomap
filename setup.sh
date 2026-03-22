#!/bin/bash

echo "🚀 MikroTik Geo VPN - Setup Script"
echo "=================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and configure:"
    echo "   - MIKROTIK_HOST (your router IP)"
    echo "   - MIKROTIK_USER"
    echo "   - MIKROTIK_PASSWORD"
    echo ""
    read -p "Press Enter after you've edited .env..."
fi

# Create data directories
echo "📁 Creating data directories..."
mkdir -p data/postgres data/backend
echo "✅ Data directories created"
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker is available"
echo ""

# Start services
echo "🐳 Starting Docker containers..."
docker compose up -d

echo ""
echo "✅ Setup complete!"
echo ""
echo "📊 Access the dashboard at: http://localhost:8080"
echo ""
echo "📝 Useful commands:"
echo "   docker compose logs -f        # View logs"
echo "   docker compose down           # Stop all services"
echo "   docker compose restart        # Restart all services"

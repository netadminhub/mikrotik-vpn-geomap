# 🌍 MikroTik Geo VPN

A real-time visualization dashboard that shows the geographic distribution of active PPP/VPN users on your MikroTik router.

![Status](https://img.shields.io/badge/status-ready-success)
![Docker](https://img.shields.io/badge/docker-compose-ready-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- 🌐 **Real-time World Map** - Visualize active VPN users by country on an interactive world map
- 📊 **Historical Reports** - Daily, monthly, yearly, and custom date range reports
- 🔄 **Auto-refresh** - Polls MikroTik every 60 seconds (configurable)
- 🎨 **Dark Theme** - Clean, modern dark UI easy on the eyes
- 🟢 **Status Indicator** - Live connection status to your MikroTik router
- 💾 **Persistent Data** - PostgreSQL database stores all history
- 🐳 **Docker Ready** - Easy deployment with Docker Compose
- 🔒 **GeoIP Lookup** - Free IP-to-country mapping via ip-api.com

## 📋 Prerequisites

- Docker & Docker Compose installed on your Linux server
- MikroTik router with API access enabled
- Network connectivity between the server and MikroTik router

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/mikrotik-geo-vpn.git
cd mikrotik-geo-vpn
```

### 2. Configure Environment

Copy the example environment file and edit it:

```bash
cp .env.example .env
nano .env
```

**Required Configuration:**

```bash
# MikroTik Router Configuration
MIKROTIK_HOST=192.168.88.1        # Your MikroTik router IP
MIKROTIK_PORT=8728                # API port (default: 8728)
MIKROTIK_USER=admin               # API username
MIKROTIK_PASSWORD=your_password   # API password
MIKROTIK_USE_SSL=false            # Set to true for API-SSL (port 8729)

# Web Server Port
WEB_PORT=8080                     # Port to access the web interface
```

### 3. Enable MikroTik API

On your MikroTik router, enable the API service:

```bash
# Via SSH/Terminal
/ip service enable api
/ip service set api port=8728

# Or via WinBox
# Go to: IP → Services → Enable "api" (port 8728)
```

**Required User Permissions:**

Make sure your API user has read access to PPP active sessions:
- Group: `read` or `full`
- Or create a custom group with `/ppp/active` read permission

### 4. Start the Application

```bash
docker compose up -d
```

### 5. Access the Dashboard

Open your browser and navigate to:

```
http://your-server-ip:8080
```

## 📁 Project Structure

```
mikrotik-geo-vpn/
├── docker-compose.yml       # Docker services configuration
├── .env.example             # Environment variables template
├── .env                     # Your configuration (create from example)
├── data/                    # Persistent data (auto-created)
│   ├── postgres/           # PostgreSQL database files
│   └── backend/            # Backend data
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py             # FastAPI application
│   ├── config.py           # Configuration loader
│   ├── database.py         # SQLAlchemy models
│   ├── mikrotik_client.py  # MikroTik API client
│   ├── geoip.py            # GeoIP lookup service
│   └── scheduler.py        # Background polling scheduler
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── nginx.conf
    ├── index.html
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── WorldMap.tsx    # Map visualization component
        └── ReportTable.tsx # Reports component
```

## 🛠️ Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MIKROTIK_HOST` | MikroTik router IP address | *Required* |
| `MIKROTIK_PORT` | MikroTik API port | `8728` |
| `MIKROTIK_USER` | API username | *Required* |
| `MIKROTIK_PASSWORD` | API password | *Required* |
| `MIKROTIK_USE_SSL` | Use SSL (API-SSL) | `false` |
| `POLL_INTERVAL_SECONDS` | Polling interval | `60` |
| `WEB_PORT` | Web interface port | `8080` |
| `POSTGRES_DB` | Database name | `mikrotik_geo` |
| `POSTGRES_USER` | Database user | `mikrotik_user` |
| `POSTGRES_PASSWORD` | Database password | `mikrotik_pass` |

### MikroTik API Ports

| Service | Port | Environment |
|---------|------|-------------|
| API | 8728 | `MIKROTIK_USE_SSL=false` |
| API-SSL | 8729 | `MIKROTIK_USE_SSL=true` |
| WWW API | 80/443 | Via REST (configure accordingly) |

## 📊 API Endpoints

The backend provides these REST API endpoints:

| Endpoint | Description |
|----------|-------------|
| `GET /api/status` | MikroTik connection status |
| `GET /api/current` | Current online users by country |
| `GET /api/history?days=7` | Historical data (N days) |
| `GET /api/report?period=daily` | Report (daily/monthly/yearly) |
| `GET /api/report?start_date=&end_date=` | Custom date range report |
| `GET /api/sessions?limit=100` | Recent PPP sessions |

## 🔍 Troubleshooting

### Connection Issues

**Problem:** Status shows "Disconnected"

**Solutions:**
1. Verify MikroTik IP and credentials in `.env`
2. Check API service is enabled on MikroTik:
   ```bash
   /ip service print
   ```
3. Ensure firewall allows API connections:
   ```bash
   /ip firewall filter print
   ```
4. Test connectivity from the server:
   ```bash
   docker compose exec backend python -c "from mikrotik_client import mikrotik_client; print(mikrotik_client.connect())"
   ```

### No Data Showing

**Problem:** Map or reports show no data

**Solutions:**
1. Check if PPP sessions are active on MikroTik:
   ```bash
   /ppp active print
   ```
2. Verify `caller-id` contains public IPs (not private IPs)
3. Check backend logs:
   ```bash
   docker compose logs -f backend
   ```

### Database Issues

**Problem:** Database connection errors

**Solutions:**
1. Check PostgreSQL container is running:
   ```bash
   docker compose ps
   ```
2. View database logs:
   ```bash
   docker compose logs postgres
   ```
3. Reset database (⚠️ **deletes all data**):
   ```bash
   rm -rf data/postgres
   docker compose up -d
   ```

## 📦 Backup & Migration

### Backup Data

```bash
# Stop containers
docker compose down

# Backup data directory
tar -czvf mikrotik-geo-backup.tar.gz data/

# Backup .env
cp .env .env.backup
```

### Migrate to New Server

```bash
# On new server:
# 1. Copy project directory
scp -r mikrotik-geo-vpn user@new-server:/path/

# 2. Or restore from backup
tar -xzvf mikrotik-geo-backup.tar.gz -C /path/to/mikrotik-geo-vpn/

# 3. Start services
cd mikrotik-geo-vpn
docker compose up -d
```

## 🔐 Security Considerations

1. **Change default passwords** in `.env`
2. **Use API-SSL** if possible (`MIKROTIK_USE_SSL=true`)
3. **Restrict API access** on MikroTik to trusted IPs only:
   ```bash
   /ip service set api address=192.168.1.0/24
   ```
4. **Use a reverse proxy** with HTTPS for production
5. **Don't expose** the web interface directly to the internet

## 🧮 Resource Usage

- **CPU:** ~50-100m (idle), ~200m (polling)
- **Memory:** ~300-500MB total
- **Disk:** ~100MB (empty), grows with history (~10MB/day)

## 📝 License

MIT License - feel free to use and modify.

## 🤝 Support

For issues or questions:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review backend logs: `docker compose logs backend`
3. Review frontend logs: `docker compose logs frontend`

## 🗺️ GeoIP Data

Country lookup powered by [ip-api.com](http://ip-api.com/) (Free tier, no API key required)

- Rate limit: 45 requests/minute
- Accuracy: ~99% at country level

---

**Built with:** FastAPI + React + ECharts + PostgreSQL + Docker

**Repository:** [github.com/yourusername/mikrotik-geo-vpn](https://github.com/yourusername/mikrotik-geo-vpn)

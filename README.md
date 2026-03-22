# 🌍 MikroTik Geo VPN

> **Real-time VPN User Geographic Visualization Dashboard**
> Track and visualize the geographic distribution of your MikroTik VPN users worldwide.

![Dashboard Preview](https://via.placeholder.com/1200x600/0d1117/58a6ff?text=MikroTik+Geo+VPN+Dashboard)

---

## 📊 What You Get

### **Live World Map**
- 🗺️ **Interactive Map** - Beautiful choropleth world map showing user distribution
- 👥 **User Details** - Hover over any country to see connected users with IPs and uptime
- 🔄 **Auto-refresh** - Updates every 30 seconds automatically
- 📊 **Country Stats** - Real-time count of users per country

### **Historical Reports**
- 📅 **Daily Reports** - See today's user activity
- 📆 **Monthly Reports** - Track monthly trends
- 📈 **Yearly Reports** - Annual statistics
- 🔍 **Custom Range** - Pick any date range for analysis

### **Security Features**
- 🔐 **JWT Authentication** - Secure login system
- 👤 **Admin Panel** - Protected dashboard access
- 🔑 **Configurable Credentials** - Set your own admin user

---

## 🎯 Use Cases

Perfect for:
- **VPN Service Providers** - Monitor client geographic distribution
- **IT Administrators** - Track remote worker locations
- **Security Teams** - Identify unusual connection patterns
- **MSPs** - Manage multiple MikroTik VPN servers
- **Network Engineers** - Analyze VPN usage by region

---

## ⚡ Quick Start

### **Prerequisites**
- Docker & Docker Compose installed
- MikroTik RouterOS device with API enabled
- Linux/macOS/WSL terminal

### **One-Command Setup**

```bash
git clone https://github.com/ramtinrahmani/mikrotik-geo-vpn.git
cd mikrotik-geo-vpn
cp .env.example .env
nano .env  # Configure your settings
docker compose up -d
```

### **Access the Dashboard**

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| Dashboard | http://localhost:8080 | admin / admin123 |

---

## 🔧 Configuration

### **Environment Variables**

Edit `.env` file with your settings:

```bash
# MikroTik Router Configuration
MIKROTIK_HOST=192.168.88.1        # Your MikroTik IP
MIKROTIK_PORT=8728                # API port (default: 8728)
MIKROTIK_USER=admin               # API username
MIKROTIK_PASSWORD=your_password   # API password
MIKROTIK_USE_SSL=false            # Set true for API-SSL

# Authentication
ADMIN_USERNAME=admin              # Dashboard admin username
ADMIN_PASSWORD=secure_password    # Dashboard admin password
JWT_SECRET_KEY=your_secret_key    # JWT signing key

# Web Server
WEB_PORT=8080                     # Dashboard port
```

### **Enable MikroTik API**

```routeros
# Via Terminal
/ip service enable api
/ip service set api port=8728

# Via WinBox
# Go to: IP → Services → Enable "api" (port 8728)
```

**Required Permissions:**
- User needs read access to `/ppp/active`
- Use `read` group or create custom group

---

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────┐
│  Mikrotik   │────▶│   Backend    │────▶│  PostgreSQL │────▶│ Frontend │
│  Router     │ API │   FastAPI    │     │  Database   │     │  React   │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────┘
                           │
                      ┌────▼────┐
                      │ GeoIP   │
                      │  API    │
                      └─────────┘
```

1. **MikroTik** - Provides active PPP session data via API
2. **Backend (FastAPI)** - Polls MikroTik, looks up GeoIP, stores in DB
3. **PostgreSQL** - Stores historical session data
4. **GeoIP Service** - ip-api.com for IP-to-country mapping
5. **Frontend (React)** - Displays map and reports

---

## 📁 Project Structure

```
mikrotik-geo-vpn/
├── docker-compose.yml       # Docker services
├── .env.example             # Environment template
├── .env                     # Your configuration
├── data/                    # Persistent data
│   ├── postgres/           # PostgreSQL database
│   └── backend/            # Backend data
├── backend/
│   ├── Dockerfile
│   ├── main.py             # FastAPI application
│   ├── auth.py             # JWT authentication
│   ├── config.py           # Configuration
│   ├── database.py         # SQLAlchemy models
│   ├── mikrotik_client.py  # MikroTik API client
│   ├── geoip.py            # GeoIP lookup
│   └── scheduler.py        # Background polling
└── frontend/
    ├── Dockerfile
    ├── src/
    │   ├── App.tsx         # Main app component
    │   ├── LoginPage.tsx   # Login page
    │   ├── WorldMap.tsx    # Map visualization
    │   └── ReportTable.tsx # Reports page
    └── public/
        └── world.json      # World map GeoJSON
```

---

## 🔍 API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/login` | POST | ❌ | Login and get JWT token |
| `/api/status` | GET | ❌ | MikroTik connection status |
| `/api/current` | GET | ✅ | Current users by country |
| `/api/history` | GET | ✅ | Historical data |
| `/api/report` | GET | ✅ | Custom reports |
| `/api/sessions` | GET | ✅ | Recent PPP sessions |

---

## 🔐 Security Considerations

### **Authentication**
- Change default admin password immediately
- Use strong JWT secret key
- Token expires after 24 hours (configurable)

### **MikroTik API**
- Use API-SSL (port 8729) in production
- Restrict API access to specific IPs
- Create dedicated read-only API user

```routeros
/user add name=api_monitor password=strong_pass group=read
/ip service set api address=192.168.1.0/24
```

### **Docker Security**
- Don't expose ports publicly without firewall
- Use HTTPS with reverse proxy in production
- Keep containers updated

---

## 📊 Database Schema

### **ppp_sessions**
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| name | VARCHAR | PPP username |
| service | VARCHAR | Service type (ovpn, l2tp, etc.) |
| caller_id | VARCHAR | Public IP address |
| address | VARCHAR | Local IP address |
| uptime | VARCHAR | Session uptime |
| country | VARCHAR | Country name |
| country_code | VARCHAR | ISO country code |
| recorded_at | DATETIME | Timestamp |

### **country_snapshots**
| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| country | VARCHAR | Country name |
| country_code | VARCHAR | ISO country code |
| user_count | INTEGER | User count |
| snapshot_time | DATETIME | Timestamp |

---

## 🔄 Updates

### **Update to Latest Version**

```bash
cd mikrotik-geo-vpn
git pull
docker compose down
docker compose up -d --build
```

---

## 🛠️ Troubleshooting

### **Cannot Login**
1. Check credentials in `.env`
2. Restart backend: `docker compose restart backend`
3. Check logs: `docker compose logs backend`

### **No Data on Map**
1. Verify MikroTik API is enabled
2. Check `MIKROTIK_HOST` in `.env`
3. Test API connectivity:
   ```bash
   docker compose exec backend python -c "from mikrotik_client import mikrotik_client; print(mikrotik_client.connect())"
   ```

### **Turkey Shows 0 Users**
- Fixed! Country name normalization is applied
- Restart backend to apply: `docker compose restart backend`

### **Database Errors**
```bash
# Reset database (⚠️ deletes all data)
docker compose down
rm -rf data/postgres
docker compose up -d
```

---

## 📝 Changelog

### v1.1.0
- ✅ Added JWT authentication
- ✅ Login page with social links
- ✅ Protected API endpoints
- ✅ Hover tooltip with user details
- ✅ 30-second auto-refresh
- ✅ Country name normalization

### v1.0.0
- Initial release

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **GeoIP Data** - [ip-api.com](http://ip-api.com/) (Free tier)
- **World Map** - [Apache ECharts](https://echarts.apache.org/)
- **Icons** - SVG icons from respective brands

---

## 🔗 Links

- **GitHub**: https://github.com/ramtinrahmani
- **LinkedIn**: https://linkedin.com/in/ramtin-rahmani
- **Instagram**: https://instagram.com/ramtin_rahmani
- **X (Twitter)**: https://x.com/ramtin_rahmani

---

## 📧 Contact

- **Issues**: https://github.com/ramtinrahmani/mikrotik-geo-vpn/issues
- **Discussions**: https://github.com/ramtinrahmani/mikrotik-geo-vpn/discussions

---

<div align="center">

**Created by Ramtin Rahmani Nejad**

*Built between pings with ❤️ for the Network & DevOps Community*

⭐ Star this repo if you find it useful!

![GitHub stars](https://img.shields.io/github/stars/ramtinrahmani/mikrotik-geo-vpn?style=social)
![GitHub forks](https://img.shields.io/github/forks/ramtinrahmani/mikrotik-geo-vpn?style=social)

</div>

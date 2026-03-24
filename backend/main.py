from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from datetime import datetime, date, timedelta
from typing import List, Optional
from contextlib import asynccontextmanager
import asyncio
import random
from pydantic import BaseModel

from config import settings
from database import init_db, SessionLocal, PPPSession, CountrySnapshot
from scheduler import start_scheduler, initial_poll
from mikrotik_client import mikrotik_client
from auth import authenticate_user, create_access_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    init_db()
    start_scheduler()
    asyncio.create_task(initial_poll())
    yield
    # Shutdown
    mikrotik_client.disconnect()


app = FastAPI(title="MikroTik Geo Map API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class LoginRequest(BaseModel):
    username: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


@app.post("/api/login", response_model=Token)
def login(request: LoginRequest):
    """Login and get JWT access token"""
    if not authenticate_user(request.username, request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": request.username}
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/status")
def get_status():
    """Get MikroTik connection status"""
    connected = mikrotik_client.is_connected() or mikrotik_client.connect()
    return {"connected": connected, "host": settings.mikrotik_host}


@app.get("/api/current")
def get_current_users(
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get current online users by country (latest snapshot)"""
    # Get the latest snapshot time
    latest = db.query(func.max(CountrySnapshot.snapshot_time)).scalar()
    
    if not latest:
        return {"countries": [], "total_users": 0, "timestamp": None, "users_by_country": {}}
    
    # Get all countries from that time
    snapshots = db.query(CountrySnapshot).filter(
        CountrySnapshot.snapshot_time == latest
    ).all()
    
    # Get latest PPP sessions with user names
    latest_sessions = db.query(PPPSession).filter(
        PPPSession.recorded_at == latest
    ).all()
    
    # Group users by country
    users_by_country = {}
    for session in latest_sessions:
        country = session.country or "Unknown"
        if country not in users_by_country:
            users_by_country[country] = []
        users_by_country[country].append({
            "name": session.name,
            "caller_id": session.caller_id,
            "uptime": session.uptime
        })
    
    countries = [
        {
            "country": s.country,
            "country_code": s.country_code,
            "user_count": s.user_count
        }
        for s in snapshots
    ]
    
    return {
        "countries": countries,
        "total_users": sum(s.user_count for s in snapshots),
        "timestamp": latest.isoformat(),
        "users_by_country": users_by_country
    }


@app.get("/api/history")
def get_history(
    days: int = 7,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get historical data for the past N days"""
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    # Get daily aggregated data
    results = db.query(
        func.date(CountrySnapshot.snapshot_time).label("date"),
        CountrySnapshot.country_code,
        CountrySnapshot.country,
        func.sum(CountrySnapshot.user_count).label("total_users")
    ).filter(
        CountrySnapshot.snapshot_time >= cutoff
    ).group_by(
        func.date(CountrySnapshot.snapshot_time),
        CountrySnapshot.country_code,
        CountrySnapshot.country
    ).order_by(
        func.date(CountrySnapshot.snapshot_time).desc()
    ).all()
    
    return {
        "history": [
            {
                "date": str(r.date),
                "country": r.country,
                "country_code": r.country_code,
                "user_count": r.total_users
            }
            for r in results
        ]
    }


@app.get("/api/report")
def get_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    period: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get custom report with date range"""
    query = db.query(
        CountrySnapshot.country,
        CountrySnapshot.country_code,
        func.max(CountrySnapshot.user_count).label("max_users"),
        func.avg(CountrySnapshot.user_count).label("avg_users"),
        func.count(func.distinct(CountrySnapshot.snapshot_time)).label("sample_count")
    )
    
    if period == "daily":
        query = query.filter(
            extract("day", CountrySnapshot.snapshot_time) == extract("day", datetime.utcnow()),
            extract("month", CountrySnapshot.snapshot_time) == extract("month", datetime.utcnow()),
            extract("year", CountrySnapshot.snapshot_time) == extract("year", datetime.utcnow())
        )
    elif period == "monthly":
        query = query.filter(
            extract("month", CountrySnapshot.snapshot_time) == extract("month", datetime.utcnow()),
            extract("year", CountrySnapshot.snapshot_time) == extract("year", datetime.utcnow())
        )
    elif period == "yearly":
        query = query.filter(
            extract("year", CountrySnapshot.snapshot_time) == extract("year", datetime.utcnow())
        )
    elif start_date and end_date:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
        query = query.filter(
            CountrySnapshot.snapshot_time >= start,
            CountrySnapshot.snapshot_time <= end
        )
    else:
        # Default: last 30 days
        cutoff = datetime.utcnow() - timedelta(days=30)
        query = query.filter(CountrySnapshot.snapshot_time >= cutoff)
    
    results = query.group_by(
        CountrySnapshot.country,
        CountrySnapshot.country_code
    ).order_by(
        func.max(CountrySnapshot.user_count).desc()
    ).all()
    
    return {
        "report": [
            {
                "country": r.country,
                "country_code": r.country_code,
                "max_users": r.max_users,
                "avg_users": float(r.avg_users) if r.avg_users else 0,
                "sample_count": r.sample_count
            }
            for r in results
        ]
    }


@app.get("/api/sessions")
def get_sessions(
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: str = Depends(get_current_user)
):
    """Get recent PPP sessions"""
    sessions = db.query(PPPSession).order_by(
        PPPSession.recorded_at.desc()
    ).limit(limit).all()

    return {
        "sessions": [
            {
                "name": s.name,
                "service": s.service,
                "caller_id": s.caller_id,
                "address": s.address,
                "uptime": s.uptime,
                "country": s.country,
                "country_code": s.country_code,
                "recorded_at": s.recorded_at.isoformat()
            }
            for s in sessions
        ]
    }


# Marketing Map - Public endpoint with fake data
# Countries that will always be shown (core countries with "real" presence)
CORE_COUNTRIES = {
    "IR": {"name": "Iran", "is_core": True},  # Always present, special color
    "US": {"name": "United States", "is_core": True},
    "GB": {"name": "United Kingdom", "is_core": True},
    "DE": {"name": "Germany", "is_core": True},
    "FR": {"name": "France", "is_core": True},
    "CA": {"name": "Canada", "is_core": True},
    "JP": {"name": "Japan", "is_core": True},
    "CN": {"name": "China", "is_core": True},
    "KR": {"name": "South Korea", "is_core": True},
    "AE": {"name": "United Arab Emirates", "is_core": True},
    "SA": {"name": "Saudi Arabia", "is_core": True},
    "TR": {"name": "Turkey", "is_core": True},
    "IT": {"name": "Italy", "is_core": True},
    "ES": {"name": "Spain", "is_core": True},
    "NL": {"name": "Netherlands", "is_core": True},
    "SE": {"name": "Sweden", "is_core": True},
    "NO": {"name": "Norway", "is_core": True},
    "PL": {"name": "Poland", "is_core": True},
    "RU": {"name": "Russia", "is_core": True},
    "BR": {"name": "Brazil", "is_core": True},
    "MX": {"name": "Mexico", "is_core": True},
    "AR": {"name": "Argentina", "is_core": True},
}

# Pool of additional countries to randomly select from (focus regions)
# Europe, North America, East Asia, Middle East, partial South America
ADDITIONAL_COUNTRIES = {
    # Europe (heavy focus)
    "AT": {"name": "Austria"},
    "BE": {"name": "Belgium"},
    "CH": {"name": "Switzerland"},
    "CZ": {"name": "Czech Republic"},
    "DK": {"name": "Denmark"},
    "FI": {"name": "Finland"},
    "GR": {"name": "Greece"},
    "HU": {"name": "Hungary"},
    "IE": {"name": "Ireland"},
    "PT": {"name": "Portugal"},
    "RO": {"name": "Romania"},
    "UA": {"name": "Ukraine"},
    "BG": {"name": "Bulgaria"},
    "HR": {"name": "Croatia"},
    "RS": {"name": "Serbia"},
    "SK": {"name": "Slovakia"},
    "SI": {"name": "Slovenia"},
    "LT": {"name": "Lithuania"},
    "LV": {"name": "Latvia"},
    "EE": {"name": "Estonia"},
    "IS": {"name": "Iceland"},
    "LU": {"name": "Luxembourg"},
    "MT": {"name": "Malta"},
    "CY": {"name": "Cyprus"},
    # North America
    # Already have US, CA
    # East Asia (heavy focus)
    "TW": {"name": "Taiwan"},
    "HK": {"name": "Hong Kong"},
    "SG": {"name": "Singapore"},
    "TH": {"name": "Thailand"},
    "MY": {"name": "Malaysia"},
    "VN": {"name": "Vietnam"},
    "PH": {"name": "Philippines"},
    "ID": {"name": "Indonesia"},
    "IN": {"name": "India"},
    "PK": {"name": "Pakistan"},
    # Middle East (heavy focus)
    "QA": {"name": "Qatar"},
    "KW": {"name": "Kuwait"},
    "BH": {"name": "Bahrain"},
    "OM": {"name": "Oman"},
    "JO": {"name": "Jordan"},
    "LB": {"name": "Lebanon"},
    "IQ": {"name": "Iraq"},
    "IL": {"name": "Israel"},  # Will be filtered out
    "EG": {"name": "Egypt"},
    # South America (partial)
    "CL": {"name": "Chile"},
    "CO": {"name": "Colombia"},
    "PE": {"name": "Peru"},
    "VE": {"name": "Venezuela"},
    "UY": {"name": "Uruguay"},
    # Africa
    "ZA": {"name": "South Africa"},
    "NG": {"name": "Nigeria"},
    "KE": {"name": "Kenya"},
    # Oceania
    "AU": {"name": "Australia"},
    "NZ": {"name": "New Zealand"},
}

# IMPORTANT: Never show Israel
EXCLUDED_COUNTRIES = {"IL"}

# Filter out excluded countries
AVAILABLE_ADDITIONAL = {k: v for k, v in ADDITIONAL_COUNTRIES.items() if k not in EXCLUDED_COUNTRIES}


class MarketingCountryData(BaseModel):
    country: str
    country_code: str
    user_count: int


class MarketingMapData(BaseModel):
    countries: List[MarketingCountryData]
    total_countries: int
    timestamp: str


# In-memory state for marketing map
class MarketingMapState:
    def __init__(self):
        self.active_countries: dict[str, dict] = {}  # country_code -> {added_at, user_count}
        self.last_update = datetime.utcnow()
    
    def get_data(self) -> MarketingMapData:
        """Generate marketing map data with 40-65 countries"""
        now = datetime.utcnow()
        
        # Always include core countries
        result_countries = {}
        for code, info in CORE_COUNTRIES.items():
            if code not in EXCLUDED_COUNTRIES:
                # Core countries stay with varying user counts
                # Iran gets special treatment (dark gold)
                if code == "IR":
                    user_count = random.randint(15, 30)  # Moderate count, will be colored gold
                else:
                    user_count = random.randint(5, 25)
                result_countries[code] = {
                    "name": info["name"],
                    "user_count": user_count,
                    "is_core": info.get("is_core", False)
                }
        
        # Randomly add/remove additional countries for dynamic effect
        # Target: 40-65 total countries
        current_count = len(result_countries) + len(self.active_countries)
        target_min = 40
        target_max = 65
        target_count = random.randint(target_min, target_max)
        
        # Remove some countries that have been active for a while (simulating user disconnect)
        countries_to_remove = []
        for code, data in self.active_countries.items():
            # Countries stay active for 2-8 hours (simulating user sessions)
            time_active = (now - data["added_at"]).total_seconds()
            # 30% chance to disconnect if active for more than 2 hours
            if time_active > 7200 and random.random() < 0.3:
                countries_to_remove.append(code)
            # Always disconnect after 8 hours
            elif time_active > 28800:
                countries_to_remove.append(code)
        
        for code in countries_to_remove:
            del self.active_countries[code]
        
        # Add new countries if below target
        available_slots = target_count - len(result_countries) - len(self.active_countries)
        if available_slots > 0:
            # Get countries not already active
            available_to_add = [
                code for code in AVAILABLE_ADDITIONAL.keys()
                if code not in result_countries and code not in self.active_countries
            ]
            # Randomly select countries to add
            num_to_add = min(available_slots, len(available_to_add), random.randint(1, max(1, available_slots)))
            new_countries = random.sample(available_to_add, num_to_add)
            for code in new_countries:
                self.active_countries[code] = {
                    "added_at": now,
                    "user_count": random.randint(3, 15)
                }
        
        # Merge active countries into result
        for code, data in self.active_countries.items():
            result_countries[code] = {
                "name": AVAILABLE_ADDITIONAL[code]["name"],
                "user_count": data["user_count"],
                "is_core": False
            }
        
        # Convert to list format
        countries_list = [
            MarketingCountryData(
                country=data["name"],
                country_code=code,
                user_count=data["user_count"]
            )
            for code, data in result_countries.items()
        ]
        
        self.last_update = now
        
        return MarketingMapData(
            countries=countries_list,
            total_countries=len(countries_list),
            timestamp=now.isoformat()
        )


marketing_map_state = MarketingMapState()


@app.get("/api/marketing-map")
def get_marketing_map_data():
    """
    Public endpoint for marketing map.
    Returns fake user distribution data showing 40-65 countries.
    - Iran is always shown with dark gold color
    - Israel is never shown
    - Focus on Europe, North America, East Asia, Middle East, partial South America
    - No user details, just country presence
    - Updates smoothly every 2 hours with country changes
    """
    data = marketing_map_state.get_data()
    return data

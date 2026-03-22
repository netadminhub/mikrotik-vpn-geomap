from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, extract
from datetime import datetime, date, timedelta
from typing import List, Optional
from contextlib import asynccontextmanager
import asyncio

from config import settings
from database import init_db, SessionLocal, PPPSession, CountrySnapshot
from scheduler import start_scheduler, initial_poll
from mikrotik_client import mikrotik_client


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


@app.get("/api/status")
def get_status():
    """Get MikroTik connection status"""
    connected = mikrotik_client.is_connected() or mikrotik_client.connect()
    return {"connected": connected, "host": settings.mikrotik_host}


@app.get("/api/current")
def get_current_users(db: Session = Depends(get_db)):
    """Get current online users by country (latest snapshot)"""
    # Get the latest snapshot time
    latest = db.query(func.max(CountrySnapshot.snapshot_time)).scalar()
    
    if not latest:
        return {"countries": [], "total_users": 0, "timestamp": None}
    
    # Get all countries from that time
    snapshots = db.query(CountrySnapshot).filter(
        CountrySnapshot.snapshot_time == latest
    ).all()
    
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
        "timestamp": latest.isoformat()
    }


@app.get("/api/history")
def get_history(
    days: int = 7,
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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
    db: Session = Depends(get_db)
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

import asyncio
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from database import SessionLocal, PPPSession, CountrySnapshot
from mikrotik_client import mikrotik_client
from geoip import geoip_service
from config import settings
from collections import defaultdict


async def poll_and_store():
    """Poll MikroTik and store data in database"""
    print(f"[{datetime.utcnow()}] Starting PPP session poll...")
    
    # Get active sessions from MikroTik
    sessions = mikrotik_client.get_ppp_active()
    
    if not sessions:
        print(f"[{datetime.utcnow()}] No sessions found or connection failed")
        return
    
    # Get unique IPs for GeoIP lookup
    unique_ips = list(set(s["caller_id"] for s in sessions))
    
    # Lookup country for each IP
    ip_to_country = await geoip_service.lookup_batch(unique_ips)
    
    # Store sessions in database
    db = SessionLocal()
    try:
        timestamp = datetime.utcnow()
        
        for session in sessions:
            country_info = ip_to_country.get(session["caller_id"], {})
            
            db_session = PPPSession(
                name=session["name"],
                service=session["service"],
                caller_id=session["caller_id"],
                address=session["address"],
                uptime=session["uptime"],
                session_id=session["session_id"],
                country=country_info.get("country", "Unknown"),
                country_code=country_info.get("country_code", "XX"),
                recorded_at=timestamp
            )
            db.add(db_session)
        
        db.commit()
        
        # Create country snapshot
        country_counts = defaultdict(int)
        for session in sessions:
            country_info = ip_to_country.get(session["caller_id"], {})
            country = country_info.get("country", "Unknown")
            country_code = country_info.get("country_code", "XX")
            country_counts[(country, country_code)] += 1
        
        for (country, country_code), count in country_counts.items():
            snapshot = CountrySnapshot(
                country=country,
                country_code=country_code,
                user_count=count,
                snapshot_time=timestamp
            )
            db.add(snapshot)
        
        db.commit()
        
        print(f"[{datetime.utcnow()}] Stored {len(sessions)} sessions, {len(country_counts)} countries")
    
    except Exception as e:
        db.rollback()
        print(f"[{datetime.utcnow()}] Error storing data: {e}")
    finally:
        db.close()


def start_scheduler():
    """Start the background scheduler"""
    scheduler = AsyncIOScheduler()
    
    scheduler.add_job(
        poll_and_store,
        trigger=IntervalTrigger(seconds=settings.poll_interval_seconds),
        id="poll_mikrotik",
        replace_existing=True
    )
    
    scheduler.start()
    return scheduler


# Run initial poll on startup
async def initial_poll():
    """Run initial poll when app starts"""
    await asyncio.sleep(2)  # Wait for DB to be ready
    await poll_and_store()

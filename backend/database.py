from sqlalchemy import create_engine, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import sessionmaker, declarative_base, relationship
from datetime import datetime

Base = declarative_base()


class PPPSession(Base):
    __tablename__ = "ppp_sessions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    service = Column(String, nullable=False)
    caller_id = Column(String, nullable=False, index=True)
    address = Column(String, nullable=False)
    uptime = Column(String, nullable=False)
    session_id = Column(String, nullable=False)
    country = Column(String, nullable=True)
    country_code = Column(String, nullable=True, index=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    class Config:
        table_args = {"extend_existing": True}


class CountrySnapshot(Base):
    __tablename__ = "country_snapshots"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    country = Column(String, nullable=False)
    country_code = Column(String, nullable=False, index=True)
    user_count = Column(Integer, nullable=False)
    snapshot_time = Column(DateTime, default=datetime.utcnow, index=True)


def get_engine():
    from config import settings
    return create_engine(settings.database_url)


def get_session_local():
    engine = get_engine()
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)


SessionLocal = get_session_local()


def init_db():
    from config import settings
    engine = create_engine(settings.database_url)
    Base.metadata.create_all(bind=engine)

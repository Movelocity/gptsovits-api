from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import Column, String, DateTime, Float, Integer
from datetime import datetime, timezone

from .config import config

engine = create_engine(config.DATABASE_URL)
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class TTSRecord(Base):
    __tablename__ = 'tts_records'
    id = Column(String, primary_key=True)
    text = Column(String)
    lang = Column(String)
    speaker_id = Column(String)
    top_k = Column(Integer)
    top_p = Column(Float)
    temperature = Column(Float)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))

class SpeakerInfo(Base):
    __tablename__ = 'speaker_info'
    speaker_id = Column(String, primary_key=True)
    voicefile = Column(String)
    text = Column(String)
    description = Column(String)

Base.metadata.create_all(engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
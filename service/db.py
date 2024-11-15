from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import Column, String, DateTime, Float, Integer, Sequence
from datetime import datetime, timezone

from service.config import config

engine = create_engine(config.DATABASE_URL)
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
    id = Column(Integer, Sequence('speaker_id_seq'), primary_key=True)  # Auto-incrementing ID
    name = Column(String)
    voicefile = Column(String)
    text = Column(String)
    lang = Column(String)
    description = Column(String)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'voicefile': self.voicefile,
            'text': self.text,
            'lang': self.lang,
            'description': self.description
        }

Base.metadata.create_all(engine)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
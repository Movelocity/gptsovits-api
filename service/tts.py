import os
import uuid
import soundfile as sf
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from service.db import SessionLocal, TTSRecord, SpeakerInfo
from service.config import config
from service.schema import TTSRequest
from service.speaker import SpeakerService

from vits import Speaker as TTS_Speaker

import logging

logger = logging.getLogger(__name__)

speakers: dict = {}

class TTSService:
    @staticmethod
    def get_record(id: str) -> TTSRecord:
        session: Session = SessionLocal()
        speaker = session.query(TTSRecord).filter(TTSRecord.id == id).first()
        session.close()
        return speaker

    @staticmethod
    def create_audio_file(audio_16bit, sample_rate) -> str:
        """生成音频文件"""
        filename = f"{uuid.uuid4()}.mp3"
        filepath = os.path.join(config.GEN_VOICE_DIR, filename)
        sf.write(filepath, audio_16bit, sample_rate)
        return filename

    @classmethod
    def create_tts(cls, req: TTSRequest):
        if len(req.text) == 0:
            return {"msg": "text 字段为空"}
        session = SessionLocal()
        try:
            speaker = SpeakerService.get_speaker(req.speaker_id)
            if not speaker:
                raise ValueError("Invalid speaker ID")

            model_version = req.version if req.version else "default"
            if model_version not in speakers:
                logger.info("加载VITS模型: "+model_version)
                speakers[model_version] = TTS_Speaker(model_version)

            audio_16bit, sample_rate = speakers.get(model_version).get_tts_wav(
                ref_wav_path=os.path.join(config.REF_VOICE_DIR, speaker.voicefile),
                prompt_text=speaker.text,
                prompt_language=speaker.lang,
                text=req.text,
                text_language=req.lang,
                cut_name="none",
                top_k=req.top_k,
                top_p=req.top_p,
                temperature=req.temperature
            )

            filename = cls.create_audio_file(audio_16bit, sample_rate)

            new_record = TTSRecord(
                id=filename,
                text=req.text,
                lang=req.lang,
                speaker_id=req.speaker_id,
                top_k=req.top_k,
                top_p=req.top_p,
                temperature=req.temperature,
                model_version=model_version,
                created_at=datetime.now(timezone.utc) + timedelta(hours=8)
            )
            session.add(new_record)
            session.commit()
            return {"id": filename}
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()

    # Cron job to delete old audio files
    @staticmethod
    def delete_old_files():
        session = SessionLocal()
        two_days_ago = datetime.now(timezone.utc) - timedelta(days=2)
        records: list[TTSRecord] = session.query(TTSRecord).filter(TTSRecord.created_at < two_days_ago)
        for record in records:
            filepath = os.path.join(config.GEN_VOICE_DIR, record.id)
            print("deleting ", filepath)
            if os.path.exists(filepath):
                os.remove(filepath)
            session.query(TTSRecord).filter(TTSRecord.id == record.id).delete()
            session.commit()
        session.close()

    @staticmethod
    def delete_record(id:str):
        session = SessionLocal()
        try:
            record = session.query(TTSRecord).filter(TTSRecord.id == id).first()
            if record:
                filepath = os.path.join(config.GEN_VOICE_DIR, record.id)
                print("deleting ", filepath)
                if os.path.exists(filepath):
                    os.remove(filepath)
                session.query(TTSRecord).filter(TTSRecord.id == record.id).delete()
                session.commit()
            return True
        except Exception as e:
            print(e)
            session.rollback()
            return False
        finally:
            session.close()
    
    @staticmethod
    def get_records(page: int, page_size: int):
        session: Session = SessionLocal()
        records = (
            session
            .query(TTSRecord)
            .order_by(TTSRecord.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        session.close()
        results = [record.to_dict() for record in records]
        return results
    
    @staticmethod
    def get_extended_records(page: int, page_size: int):
        """获取带带部分 speaker 信息的语音记录"""
        session: Session = SessionLocal()
        records = (
            session
            .query(TTSRecord, SpeakerInfo.name, SpeakerInfo.description)
            .join(SpeakerInfo, TTSRecord.speaker_id == SpeakerInfo.id)
            .order_by(TTSRecord.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        results = []
        for record, speaker_name, speaker_desc in records:
            obj = record.to_dict()
            obj['speaker_name'] = speaker_name
            obj['speaker_desc'] = speaker_desc
            results.append(obj)
        
        session.close()
        return results
    
    @staticmethod
    def get_records_count():
        session: Session = SessionLocal()
        count = session.query(TTSRecord).count()
        session.close()
        return count


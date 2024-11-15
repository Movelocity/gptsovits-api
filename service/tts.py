import os
import uuid
import soundfile as sf
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from service.db import SessionLocal, TTSRecord, SpeakerInfo
from service.config import config
from service.schema import TTSRequest

from vits import get_tts_wav

class TTSService:
    @staticmethod
    def get_speaker_info(session: Session, speaker_id: int) -> SpeakerInfo:
        return session.query(SpeakerInfo).filter(SpeakerInfo.id == speaker_id).first()

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
            speaker = cls.get_speaker_info(session, req.speaker_id)
            if not speaker:
                raise ValueError("Invalid speaker ID")

            audio_16bit, sample_rate = get_tts_wav(
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
                temperature=req.temperature
            )
            session.add(new_record)
            session.commit()

            return {"filename": filename}
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
    def get_records(page: int, page_size: int):
        session: Session = SessionLocal()
        results = session.query(SpeakerInfo).offset((page - 1) * page_size).limit(page_size).all()
        session.close()
        return results


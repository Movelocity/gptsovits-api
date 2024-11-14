import os
import uuid
import numpy as np
import soundfile as sf
import aiosqlite
from datetime import datetime, timedelta, timezone

from .db import SessionLocal, TTSRecord, SpeakerInfo
from .config import config
from .schema import TTSRequest

AUDIO_ROOT = "TEMP"

class TTSService:
    def synthesis(text, lang, speaker_id, top_k, top_p, temperature):
        print("[synthesis]", text, lang, speaker_id, top_k, top_p, temperature)
        # Replace with actual TTS synthesis code
        return [np.random.rand(44100)]  # Dummy audio data

    async def create_tts(req: TTSRequest):
        audio_opt = TTSService.synthesis(req.text, req.lang, req.speaker_id, req.top_k, req.top_p, req.temperature)
        audio_16bit = (np.concatenate(audio_opt, 0) * 32768).astype(np.int16)

        filename = f"{uuid.uuid4()}.mp3"
        filepath = os.path.join(AUDIO_ROOT, filename)
        sf.write(filepath, audio_16bit, 22050)

        session = SessionLocal()
        try:
            new_record = TTSRecord(id=filename, text=req.text, lang=req.lang, top_k=req.top_k, top_p=req.top_p, temperature=req.temperature)
            session.add(new_record)
            session.commit()

            # 查询数据库中的speaker_info表，过滤条件为speaker_id等于请求的speaker_id
            speaker_info = session.query(SpeakerInfo).filter(SpeakerInfo.speaker_id == req.speaker_id).first()

            if speaker_info:
                # 如果找到了记录，则获取voicefile和description字段
                voicefile = speaker_info.voicefile
                description = speaker_info.description
            else:
                # 如果没有找到记录，打印提示信息
                print("No speaker information found.")
        finally:
            # 关闭会话以释放资源
            print(f"Voicefile: {voicefile}, Description: {description}")
            session.close()

        return {"filename": filename}

    # Cron job to delete old audio files
    async def delete_old_files():
        session = SessionLocal()
        two_days_ago = datetime.now(timezone.utc)# - timedelta(days=2)
        records: list[TTSRecord] = session.query(TTSRecord).filter(TTSRecord.created_at < two_days_ago)
        for record in records:
            filepath = os.path.join(AUDIO_ROOT, record.id)
            print("deleting ", filepath)
            if os.path.exists(filepath):
                os.remove(filepath)
            session.query(TTSRecord).filter(TTSRecord.id == record.id).delete()
            session.commit()
        session.close()

import os
import uuid
import soundfile as sf
from datetime import datetime, timedelta, timezone

from .db import SessionLocal, TTSRecord, SpeakerInfo
from .config import config
from .schema import TTSRequest

import sys
sys.path.append("..")
from vits import get_tts_wav


class TTSService:
    async def create_tts(req: TTSRequest):
        session = SessionLocal()
        speaker: SpeakerInfo = session.query(SpeakerInfo).filter(SpeakerInfo.speaker_id == req.speaker_id).first()
        session.close()
        # audio_opt = TTSService.synthesis(req.text, req.lang, req.speaker_id, req.top_k, req.top_p, req.temperature)
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
        # audio_16bit = (np.concatenate(audio_opt, 0) * 32768).astype(np.int16)

        filename = f"{uuid.uuid4()}.mp3"
        filepath = os.path.join(config.GEN_VOICE_DIR, filename)
        sf.write(filepath, audio_16bit, sample_rate)

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

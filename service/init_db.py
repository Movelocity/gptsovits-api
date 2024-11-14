import asyncio
from .db import SessionLocal, TTSRecord, SpeakerInfo

async def insert_sample_data():
    session = SessionLocal()
    new_record = TTSRecord(id="128", text="world", lang="en", speaker_id="1", top_k="5", top_p="0.9", temperature="0.7")
    session.add(new_record)
    session.commit()
    session.close()

    speaker = SpeakerInfo(speaker_id="firefly1", voicefile="tmp2.mp3", text="你好", description="流萤")
    session.add(speaker)
    session.commit()
    session.close()

# if __name__ == "__main__":
asyncio.run(insert_sample_data())
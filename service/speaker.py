import os
from fastapi import UploadFile
from sqlalchemy.orm import Session
from service.db import SpeakerInfo, SessionLocal
from service.config import config

import re
def roll_valid_name(filename, exist_names):
    # Split the filename into base name and extension
    base_name, ext = os.path.splitext(filename)
    
    # Regular expression to match the base name and any trailing number
    pattern = re.compile(r'^(.*?)(\d+)?$')
    count = 1
    
    while filename in exist_names:  # Check if the filename already exists
        match = pattern.match(base_name)
        if match:
            # Extract the base name and trailing number
            base = match.group(1)
            num_part = match.group(2)
            if num_part:
                # If there is a number part, increment it
                count = int(num_part) + 1
            # Create a new base name with the incremented number
            base_name = f"{base}{count}"
        else:
            # If no number part, set it to 1
            base_name = f"{base_name}{count}"
        # Reconstruct the filename with the new base name and original extension
        filename = f"{base_name}{ext}"
        count += 1  # Increment the counter for the next iteration
    return filename

class SpeakerService:
    @staticmethod
    def add_speaker(name: str, upload_file: UploadFile, text: str, lang: str, description:str) -> dict:
        session = SessionLocal()
        data = {}
        try:
            file_name = upload_file.filename
            voice_file = roll_valid_name(file_name, os.listdir(config.REF_VOICE_DIR))
            with open(os.path.join(config.REF_VOICE_DIR, voice_file), "wb") as f:
                f.write(upload_file.file.read())

            new_speaker = SpeakerInfo(
                name=name,
                voicefile=voice_file,
                text=text,
                lang=lang,
                description=description
            )
            session.add(new_speaker)
            session.commit()
            data = session.query(SpeakerInfo).filter(SpeakerInfo.voicefile == voice_file).first().to_dict()
        except Exception as e:
            session.rollback()
            print(e)
        finally:
            session.close()
        return data

    @staticmethod
    def update_speaker(speaker_id: str, upload_file: UploadFile=None, text: str=None, lang: str=None, description:str=None):
        session: Session = SessionLocal()
        speaker = session.query(SpeakerInfo).filter(SpeakerInfo.id == speaker_id).first()
        if not speaker:
            raise ValueError("Speaker not found")

        # Replace the old voice file
        if upload_file is not None:
            old_voicefile_path = os.path.join(config.REF_VOICE_DIR, speaker.voicefile)
            if os.path.exists(old_voicefile_path):
                os.remove(old_voicefile_path)
            file_name = upload_file.filename
            new_voicefile = roll_valid_name(file_name, os.listdir(config.REF_VOICE_DIR))
            with open(os.path.join(config.REF_VOICE_DIR, new_voicefile), 'wb') as f:
                f.write(upload_file.file.read())  # Replace with actual file handling logic
        
            speaker.voicefile = new_voicefile
        
        if text is not None:
            speaker.text = text
        if lang is not None:
            speaker.lang = lang 
        if description is not None:
            speaker.description = description

        session.commit()
        session.close()

    @staticmethod
    def get_speakers(page: int, page_size: int):
        session: Session = SessionLocal()
        speakers = (
            session.query(SpeakerInfo)
            .order_by(SpeakerInfo.id.desc())  # Assuming 'id' is the primary key or a suitable column for ordering
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        session.close()
        return [speaker.to_dict() for speaker in speakers]

    @staticmethod
    def get_speaker_count():
        session: Session = SessionLocal()
        count = session.query(SpeakerInfo).count()
        session.close()
        return count

    @staticmethod
    def get_speaker(speaker_id: int) -> SpeakerInfo:
        session: Session = SessionLocal()
        speaker = session.query(SpeakerInfo).filter(SpeakerInfo.id == speaker_id).first()
        session.close()
        return speaker



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

import librosa
import soundfile as sf
import numpy as np

def process_audio(upload_file, target_dir, min_duration=1, max_duration=10, sr=16000):
    file_name = upload_file.filename
    file_path = os.path.join(target_dir, file_name)
    wav, sr = librosa.load(upload_file.file, sr=sr)
    duration = len(wav) / sr

    if duration < min_duration or duration > max_duration:
        raise ValueError("Audio duration must be between 1s and 10s")

    # Adjust audio duration
    if 1 <= duration < 1.4:
        silence = np.zeros(int(sr * 0.2))
        wav = np.concatenate([wav, silence, wav, silence, wav])
    elif duration < 3:
        silence_duration = 3 - duration + 0.1
        silence = np.zeros(int(sr * silence_duration))
        wav = np.concatenate([wav, silence, wav])

    # Save processed audio
    sf.write(file_path, wav, sr)
    return file_name, duration

class SpeakerService:
    @staticmethod
    def process_audio(upload_file: UploadFile) -> tuple:
        """
        Process the uploaded audio file to ensure it meets the required duration.
        Returns the processed audio data and the adjusted text.
        """
        file_name = upload_file.filename
        voice_file = roll_valid_name(file_name, os.listdir(config.REF_VOICE_DIR))
        file_path = os.path.join(config.REF_VOICE_DIR, voice_file)
        wav, sr = librosa.load(upload_file.file, sr=16000)
        duration = len(wav) / sr

        if duration < 1 or duration > 10:
            raise ValueError("音频时长需要 1s ~ 10s")

        text_multiplier = 1
        if 1 <= duration < 1.4:
            silence = np.zeros(int(sr * 0.3))
            wav = np.concatenate([wav, silence, wav, silence, wav])
            text_multiplier = 3
        elif duration < 3:
            silence = np.zeros(int(sr * 0.3))
            wav = np.concatenate([wav, silence, wav])
            text_multiplier = 2

        # Save the processed audio
        sf.write(file_path, wav, sr)

        return wav, text_multiplier

    @staticmethod
    def add_speaker(name: str, upload_file: UploadFile, text: str, lang: str, description: str, model_version:str) -> dict:
        session = SessionLocal()
        data = {}
        try:
            wav, text_multiplier = SpeakerService.process_audio(upload_file)
            processed_text = text * text_multiplier

            new_speaker = SpeakerInfo(
                name=name,
                voicefile=upload_file.filename,  # You can also pass the processed voice_file here
                text=processed_text,
                lang=lang,
                description=description,
                model_version=model_version
            )
            session.add(new_speaker)
            session.commit()
            data = session.query(SpeakerInfo).filter(SpeakerInfo.voicefile == new_speaker.voicefile).first().to_dict()
        except Exception as e:
            session.rollback()
            print(e)
        finally:
            session.close()
        return data

    @staticmethod
    def update_speaker(
        spk_id: str, 
        name: str,
        upload_file: UploadFile = None, 
        text: str = None, 
        lang: str = None, 
        description: str = None,
        model_version: str = None
    ):
        session: Session = SessionLocal()
        try:
            speaker = session.query(SpeakerInfo).filter(SpeakerInfo.id == spk_id).first()
            if not speaker:
                raise ValueError("Speaker not found")

            # Replace the old voice file
            if upload_file is not None:
                old_voicefile_path = os.path.join(config.REF_VOICE_DIR, speaker.voicefile)
                if os.path.exists(old_voicefile_path):
                    os.remove(old_voicefile_path)

                wav, text_multiplier = SpeakerService.process_audio(upload_file)
                processed_text = text * text_multiplier
                new_voicefile = roll_valid_name(upload_file.filename, os.listdir(config.REF_VOICE_DIR))
                speaker.voicefile = new_voicefile  # Update the voicefile name
                sf.write(os.path.join(config.REF_VOICE_DIR, new_voicefile), wav, 16000)

            if name is not None:
                speaker.name = name
            if text is not None:
                speaker.text = processed_text if upload_file else text
            if lang is not None:
                speaker.lang = lang 
            if description is not None:
                speaker.description = description
            if model_version is not None:
                speaker.model_version = model_version
            session.commit()
            return True
        except:
            session.rollback()
            return False
        finally:
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



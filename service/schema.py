from pydantic import BaseModel

# Pydantic model for request
class TTSRequest(BaseModel):
    """
    - text: str
    - lang: str
    - speaker_id: int
    - top_k: int = 10
    - top_p: float = 0.95
    - temperature: float = 0.8
    """
    text: str
    lang: str
    speaker_id: int
    top_k: int = 10
    top_p: float = 0.95
    temperature: float = 0.8

class SpeakerRequest(BaseModel):
    name: str
    voicefile: str
    text: str
    lang: str
    description: str = ""

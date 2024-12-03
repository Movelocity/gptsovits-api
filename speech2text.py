import whisper
from faster_whisper import WhisperModel
from common import timer
import os
from common import shared

whisper_model = None
faster_whisper_model = None

def get_faster_whisper_model():
    global faster_whisper_model
    if faster_whisper_model is None:
        with timer("FasterWhisper 模型加载"):
            if len(shared.proxy) > 0:
                os.environ['HTTPS_PROXY'] = shared.proxy
                os.environ['HTTP_PROXY'] = shared.proxy
            faster_whisper_model = WhisperModel("small", device="cuda", compute_type="float16")
            if len(shared.proxy) > 0:
                os.environ['HTTPS_PROXY'] = ''
                os.environ['HTTP_PROXY'] = ''
    return faster_whisper_model

delimiter = {
    "zh": "，",
    "en": ", ",
    "ja": "、"
}

def speech2text_fast(audio_path):
    if not audio_path:
        return ''
    print(f"reading: {audio_path}")

    faster_whisper_model = get_faster_whisper_model()

    segments, info = faster_whisper_model.transcribe(audio_path, beam_size=5)
    sep = delimiter.get(info.language, ", ")
    return sep.join([segment.text for segment in segments])


def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        with timer("Whisper模型加载"):
            whisper_model = whisper.load_model("small")
    return whisper_model


def speech2text(audio_path):
    if not audio_path:
        return ''
    print(f"reading: {audio_path}")

    whisper_model = get_whisper_model()

    with timer("ASR"):
        result = whisper_model.transcribe(audio_path, language='zh', initial_prompt='以下是普通话：')
    return result['text']
import whisper
from common import timer

whisper_model = None

def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        print('loading whisper model...')
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
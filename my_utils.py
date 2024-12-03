import ffmpeg
import numpy as np
import torch
from module.mel_processing import spectrogram_torch

def load_audio(file, sr):
    try:
        # https://github.com/openai/whisper/blob/main/whisper/audio.py#L26
        # This launches a subprocess to decode audio while down-mixing and resampling as necessary.
        # Requires the ffmpeg CLI and `ffmpeg-python` package to be installed.
        file = (
            file.strip(" ").strip('"').strip("\n").strip('"').strip(" ")
        )  # 防止小白拷路径头尾带了空格和"和回车
        out, _ = (
            ffmpeg.input(file, threads=0)
            .output("-", format="f32le", acodec="pcm_f32le", ac=1, ar=sr)
            .run(cmd=["ffmpeg", "-nostdin"], capture_stdout=True, capture_stderr=True)
        )
    except Exception as e:
        raise RuntimeError(f"Failed to load audio: {e}")

    return np.frombuffer(out, np.float32).flatten()

def get_spec(cfg, filename: str) -> torch.Tensor:
    """获取频谱图"""
    audio = load_audio(filename, int(cfg.sampling_rate))
    audio_norm = torch.FloatTensor(audio)
    audio_norm = audio_norm.unsqueeze(0)
    spec = spectrogram_torch(
        audio_norm,
        cfg.filter_length,
        cfg.sampling_rate,
        cfg.hop_length,
        cfg.win_length,
        center=False,
    )
    return spec
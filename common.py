import logging
logging.getLogger("multipart.multipart").setLevel(logging.ERROR)
logging.getLogger("markdown_it").setLevel(logging.ERROR)
logging.getLogger("urllib3").setLevel(logging.ERROR)
logging.getLogger("httpcore").setLevel(logging.ERROR)
logging.getLogger("httpx").setLevel(logging.ERROR)
logging.getLogger("asyncio").setLevel(logging.ERROR)
logging.getLogger("charset_normalizer").setLevel(logging.ERROR)
logging.getLogger("torchaudio._extension").setLevel(logging.ERROR) 

from contextlib import contextmanager
import time
import os
import yaml
import torch

support_langs = ["all_zh", "en", "all_ja", "zh", "ja", "auto"]

@contextmanager
def timer(log_label: str):
    start_time = time.time()
    print(f"[{log_label}] 开始")
    yield
    end_time = time.time()
    print(f"[{log_label}] 耗时 {end_time - start_time:.2f}s")


class DictToAttrRecursive(dict):
    def __init__(self, input_dict):
        super().__init__(input_dict)
        for key, value in input_dict.items():
            if isinstance(value, dict):
                value = DictToAttrRecursive(value)
            self[key] = value
            setattr(self, key, value)

    def __getattr__(self, item):
        try:
            return self[item]
        except KeyError:
            raise AttributeError(f"Attribute {item} not found")

    def __setattr__(self, key, value):
        if isinstance(value, dict):
            value = DictToAttrRecursive(value)
        super(DictToAttrRecursive, self).__setitem__(key, value)
        super().__setattr__(key, value)

    def __delattr__(self, item):
        try:
            del self[item]
        except KeyError:
            raise AttributeError(f"Attribute {item} not found")


class Shared:
    def __init__(self):
        self.device: torch.device = "cuda" if torch.cuda.is_available() else 'cpu'
        self.is_half: bool = False
        self.bert_path: str = ""
        self.cnhubert_base_path: str = ""
        # self.sovits_path: str = ""
        # self.gpt_path: str = ""
        self.hz:int = 50
        self.max_sec:int = 10
        self.proxy:str = ""
        self.model_root:str = ""
        self.model_config: dict = {}
        self.speaker_dict: dict[str, TTS_SPeaker] = {}
shared = Shared()

def load_yaml(path, encoding="utf-8"):
    if not os.path.exists(path):
        raise ValueError("不存在 yaml 文件: "+path)
    with open(path, 'r', encoding=encoding) as file:
        obj = yaml.safe_load(file)
    return obj

# 加载配置文件
config = load_yaml('runtime_cfg.yaml')

# 从配置文件中读取路径和设置
is_share = eval(os.environ.get("is_share", str(config['settings']['is_share'])))
infer_tts_port = int(os.environ.get("infer_tts_port", config['settings']['infer_tts_port']))

shared.model_root = config['paths']['model_root']
"""
默认配置如下
speakers: "speakers"
bert: "chinese-roberta-wwm-ext-large"
cnhubert_base: "chinese-hubert-base"
"""
shared.model_config = load_yaml(f'{shared.model_root}/config.yaml')

print(shared.model_config)
shared.bert_path = os.path.join(shared.model_root, shared.model_config['bert'])
shared.cnhubert_base_path = os.path.join(shared.model_root, shared.model_config['cnhubert_base'])

shared.is_half = eval(os.environ.get("is_half", str(config['settings']['is_half'])))
shared.device = "cuda" if torch.cuda.is_available() else 'cpu'
shared.proxy = config['proxy']


from vits import Speaker as TTS_SPeaker  
# 由于 vits 模块内也引用了 shared, 所以此文件要先实例化 shared 再引入 vits 模块

def scan_speakers(dir: str) -> dict[str, TTS_SPeaker]:
    speaker_folders = os.listdir(dir)
    results = {}
    for folder in speaker_folders:
        abs_dir = os.path.join(dir, folder)
        if not os.path.isdir(abs_dir): continue

        speaker = TTS_SPeaker(folder)
        if speaker.validated:
            results[folder] = speaker
    return results

speaker_path = os.path.join(shared.model_root, shared.model_config['speakers'])
shared.speaker_dict = scan_speakers(speaker_path)
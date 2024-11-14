from contextlib import contextmanager
import time
import os
import yaml
import torch

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
        self.sovits_path: str = ""
        self.gpt_path: str = ""
        self.hz:int = 50
        self.max_sec:int = 10


shared = Shared()

# 加载配置文件
with open('runtime_cfg.yaml', 'r', encoding='utf-8') as file:
    config = yaml.safe_load(file)

# 从配置文件中读取路径和设置
is_share = eval(os.environ.get("is_share", str(config['settings']['is_share'])))
infer_tts_port = int(os.environ.get("infer_tts_port", config['settings']['infer_tts_port']))

shared.gpt_path = config['paths']['gpt_path']
shared.sovits_path = config['paths']['sovits_path']
shared.bert_path = config['paths']['bert_path']
shared.cnhubert_base_path = config['paths']['cnhubert_base_path']
shared.is_half = eval(os.environ.get("is_half", str(config['settings']['is_half'])))
shared.device = "cuda" if torch.cuda.is_available() else 'cpu'

# import logging
# if False:
#     logging.getLogger("markdown_it").setLevel(logging.ERROR)
#     logging.getLogger("urllib3").setLevel(logging.ERROR)
#     logging.getLogger("httpcore").setLevel(logging.ERROR)
#     logging.getLogger("httpx").setLevel(logging.ERROR)
#     logging.getLogger("asyncio").setLevel(logging.ERROR)
#     logging.getLogger("charset_normalizer").setLevel(logging.ERROR)
#     logging.getLogger("torchaudio._extension").setLevel(logging.ERROR) 
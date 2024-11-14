import os

def get_database_url():
    # 获取当前脚本所在目录
    base_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(base_dir, 'tts_records.db')
    
    # 确保目录存在
    os.makedirs(os.path.dirname(db_path), exist_ok=True)

    return f"sqlite:///{db_path}"


class Config:
    def __init__(self):
        self.DATABASE_URL = get_database_url()
        self.GEN_VOICE_DIR = "TEMP/GEN"
        self.REF_VOICE_DIR = "TEMP/REF"
        os.makedirs(self.GEN_VOICE_DIR, exist_ok=True)
        os.makedirs(self.REF_VOICE_DIR, exist_ok=True)

# 使用Config类
config = Config()
import os
# import platform

class Config:
    def __init__(self):
        self.DATABASE_URL = self.get_database_url()

    # def get_database_url(self):
    #     if platform.system() == "Windows":
    #         # Windows下使用AppData\Roaming
    #         db_path = os.path.join(os.getenv('APPDATA'), 'gptsovits', 'tts_records.db')
    #     else:
    #         # 其他系统使用/var/opt
    #         db_path = os.path.join('/var', 'opt', 'gptsovits', 'tts_records.db')
        
    #     # 确保目录存在
    #     os.makedirs(os.path.dirname(db_path), exist_ok=True)
        
    #     return f"sqlite:///{db_path}"

    def get_database_url(self):
        # 获取当前脚本所在目录
        base_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(base_dir, 'tts_records.db')
        
        # 确保目录存在
        os.makedirs(os.path.dirname(db_path), exist_ok=True)

        return f"sqlite:///{db_path}"

# 使用Config类
config = Config()
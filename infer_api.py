import os
from common import infer_tts_port
from fastapi import FastAPI
from service import TTSService
from service.db import Base, engine
from service.schema import TTSRequest
# from datetime import datetime
# import asyncio

app = FastAPI()

# Create tables
Base.metadata.create_all(bind=engine)


@app.post("/tts/")
async def create_tts(request: TTSRequest):
    return await TTSService.create_tts(request)


# Schedule the cron job
# async def cron_job():
#     while True:
#         now = datetime.now()
#         if now.hour == 4 and now.minute == 0:  # Run at 4 AM
#             await TTSService.delete_old_files()
#         await asyncio.sleep(60)  # Check every minute

# @app.lifespan
# async def lifespan(app):
#     # Startup logic
#     asyncio.create_task(cron_job())
#     yield  # This will keep the lifespan context open
#     # Shutdown logic can go here if needed


if __name__ == "__main__":
    import sys, signal, uvicorn
    def signal_handler(sig, frame):
        print("Received signal to terminate. Shutting down gracefully...")
        sys.exit(0)
    print("程序启动。。。")
    os.makedirs("TEMP", exist_ok=True)  # Create TEMP directory if it doesn't exist

    # Set up signal handler
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        uvicorn.run(app, host="localhost", port=infer_tts_port)
    except KeyboardInterrupt:
        print("Interrupted by user. Shutting down gracefully...")
    finally:
        print("Server has been shut down.")


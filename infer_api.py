import os
print("loading modules...")
from fastapi import FastAPI, Form, UploadFile, File, Query, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from common import infer_tts_port
from service.tts import TTSService
from service.speaker import SpeakerService
from service.schema import TTSRequest
from service.config import config
from service.db import Base, engine
from io import BytesIO
# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.mount("/html", StaticFiles(directory="html"), name="html")
@app.get("/")
async def read_root():
    return {"message": "Welcome to the FastAPI app!"}

# Optional: Create a route to serve the HTML file directly
@app.get("/html")
async def read_index():
    return FileResponse("html/index.html")
import math
@app.get("/records")
async def get_tts_records(page: int, page_size: int):
    """return list of objects in json"""
    records = TTSService.get_extended_records(page, page_size)
    count = TTSService.get_records_count()
    return {
        "items": records,
        "page": page, 
        "pages": math.ceil(count / page_size),
        "total": count
    }

@app.post("/tts")
async def create_tts(request: TTSRequest):
    """response {"filename": filename}, if err there won't be filename field"""
    return TTSService.create_tts(request)

@app.post("/speaker")
async def add_speaker(
    name: str = Form(...),
    voicefile: UploadFile = File(...),
    text: str = Form(...),
    lang: str = Form(...),
    description: str = Form("")
):  
    try:
        new_speaker = SpeakerService.add_speaker(name=name, upload_file=voicefile, text=text, lang=lang, description=description)
        return {"id": new_speaker["id"], "name": new_speaker["name"]}
    except Exception as e:
        print(e)
        return {"id": 0, "name": "failed"}

@app.get("/speaker")
async def get_speaker(
    id: int = Query(alias="id")
):
    speaker = SpeakerService.get_speaker(id)
    return speaker.to_dict()

@app.get("/speakers")
async def get_speakers(
    page: int = Query(1, alias="page"), 
    page_size: int = Query(1, alias="page_size")
):
    speakers = SpeakerService.get_speakers(page=page, page_size=page_size)
    count = SpeakerService.get_speaker_count()
    return {
        "items": speakers,
        "page": page,
        "pages": math.ceil(count / page_size),
        "total": count
    }

@app.get("/voicefile")
async def get_voicefile(
    type: str = Query(alias="type"), 
    id: str = Query(alias="id")
):
    if type == "ref":
        speaker = SpeakerService.get_speaker(int(id))
        file_path = os.path.join(config.REF_VOICE_DIR, speaker.voicefile)  # Change extension as needed
    elif type == "gen":
        # record = TTSService.get_record(id)
        file_path = os.path.join(config.GEN_VOICE_DIR, id)  # Change extension as needed
    else:
        raise HTTPException(status_code=400, detail="Invalid type specified")
    print(file_path)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(file_path)

import uuid
from speech2text import speech2text

@app.post("/asr")
async def asr(
    voicefile: UploadFile = File(...),
    lang: str = Form("zh")
):
    filepath = f"TEMP/{uuid.uuid4()}"
    with open(filepath, 'wb') as f:
        f.write(voicefile.file.read())
    text = speech2text(filepath)
    os.remove(filepath)
    return {"data": text}


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
        uvicorn.run(app, host="0.0.0.0", port=infer_tts_port)
    except KeyboardInterrupt:
        print("Interrupted by user. Shutting down gracefully...")
    finally:
        print("Server has been shut down.")


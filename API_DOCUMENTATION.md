# GPT-SoVITS API Documentation

This document provides detailed information about the available API endpoints in the GPT-SoVITS service.

## Base URL

The API is served at `http://localhost:port/` where port is the configured `infer_tts_port`.

## Endpoints

### Text-to-Speech (TTS)

#### Create TTS Audio
`POST /tts`

Generates speech from text using a specified speaker's voice.

**Request Body:**
```json
{
    "text": "Text to convert to speech",
    "lang": "Language code (e.g., 'zh' for Chinese, 'en' for English)",
    "speaker_id": 1,      // Integer ID of the speaker to use
    "top_k": 10,          // Optional, default: 10
    "top_p": 0.95,        // Optional, default: 0.95
    "temperature": 0.8,   // Optional, default: 0.8
    "version": ""         // Optional, model version to use
}
```

**Response:**
```json
{
    "id": "generated_audio_filename.mp3"
}
```

#### Get TTS Records
`GET /records?page={page}&page_size={page_size}`

Retrieves a paginated list of TTS generation records with speaker information.

**Response:**
```json
{
    "items": [
        {
            "id": "filename.mp3",
            "text": "Generated text",
            "lang": "Language code",
            "speaker_id": 1,
            "top_k": 10,
            "top_p": 0.95,
            "temperature": 0.8,
            "created_at": "ISO timestamp",
            "model_version": "Version string",
            "speaker_name": "Name of the speaker",
            "speaker_desc": "Speaker description"
        }
    ],
    "page": 1,
    "pages": 10,
    "total": 100
}
```

#### Delete TTS Record
`DELETE /record?id={record_id}`

Deletes a specific TTS record and its associated audio file.

**Response:**
```json
{
    "msg": "ok" // or "failed"
}
```

### Speaker Management

#### Add New Speaker
`POST /speaker`

Adds a new speaker to the system. The audio file should be between 1-10 seconds in duration.

**Form Data:**
- `name`: Speaker name
- `voicefile`: Audio file (WAV format recommended)
- `text`: Transcription of the audio
- `lang`: Language code
- `description`: Optional speaker description
- `version`: Optional model version

**Response:**
```jsonc
{
    "id": 0, // Integer ID of the speaker to use
    "name": "speaker_name"
}
```

#### Update Speaker
`POST /speaker-update`

Updates an existing speaker's information.

**Form Data:**
- `spk_id`: Speaker ID to update
- `name`: New speaker name
- `voicefile`: Optional new audio file
- `text`: New transcription text
- `lang`: New language code
- `description`: Optional new description
- `version`: Optional new model version

**Response:**
```json
{
    "success": true // or false
}
```

#### Get Speaker
`GET /speaker?id={speaker_id}`

Retrieves information about a specific speaker.

**Response:**
```json
{
    "id": 1,
    "name": "Speaker Name",
    "voicefile": "filename.wav",
    "text": "Reference text",
    "lang": "Language code",
    "description": "Speaker description",
    "model_version": "Version string"
}
```

#### Get Speakers List
`GET /speakers?page={page}&page_size={page_size}`

Retrieves a paginated list of all speakers.

**Response:**
```json
{
    "items": [
        {
            "id": 1,
            "name": "Speaker Name",
            "voicefile": "filename.wav",
            "text": "Reference text",
            "lang": "Language code",
            "description": "Speaker description",
            "model_version": "Version string"
        }
    ],
    "page": 1,
    "pages": 10,
    "total": 100
}
```

### Audio File Access

#### Get Voice File
`GET /voicefile?type={type}&id={id}`

Retrieves an audio file. Type can be either "ref" (reference audio, speaker audio) or "gen" (generated audio, tts results).

Returns the audio file directly.

### Automatic Speech Recognition (ASR)

#### Perform ASR
`POST /asr`

Performs automatic speech recognition on an audio file.

**Form Data:**
- `voicefile`: Audio file to transcribe
- `lang`: Language code (default: "zh")

**Response:**
```json
{
    "data": "Transcribed text"
}
```

### Model Versions

#### Get Available Versions
`GET /versions`

Retrieves a list of available model versions.

**Response:**
```json
[
    "version1",
    "version2",
    ...
]
```

## File Storage

The service stores files in the following directories:
- Generated audio files: `TEMP/GEN/`
- Reference audio files: `TEMP/REF/`

## Notes

1. Audio files for speakers should be between 1 and 10 seconds in duration.
2. For short audio files (1-1.4s), the system will automatically repeat the audio and text to improve quality.
3. Generated audio files are automatically cleaned up after 48 hours.
4. All timestamps are in UTC+8 timezone. 
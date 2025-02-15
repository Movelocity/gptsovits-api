/**
 * Base configuration for the GPT-SoVITS API
 */

export const API_CONFIG = {
  BASE_URL: 'http://localhost:8082', // Update this with your actual port
  ENDPOINTS: {
    TTS: '/tts',
    RECORDS: '/records',
    RECORD: '/record',
    SPEAKER: '/speaker',
    SPEAKER_UPDATE: '/speaker-update',
    SPEAKERS: '/speakers',
    VOICEFILE: '/voicefile',
    ASR: '/asr',
    VERSIONS: '/versions'
  }
} as const;

export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

export const LANG_MODES = ['all_zh', 'en', 'all_ja', 'zh', 'ja', 'auto']

export const DEFAULT_FORM_HEADERS = {
  // No Content-Type header for multipart/form-data, browser will set it automatically with boundary
}; 
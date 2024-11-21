import {records_sample, speaker_sample, speakers_sample} from './samples.js'

const USE_SAMPLES = false;

const API_BASE_URL = ''; // Replace with your actual API base URL

// Helper function for error handling
const handleError = async (response) => {
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || 'An error occurred');
  }
  return response.json();
};

// Validate text input 
const validateText = (text) => {
  if (typeof text !== 'string' || text.trim() === '') {
    throw new Error('Text must be a non-empty string');
  }
};

// Validate language option
const validateLanguage = (lang) => {
  const validLangs = ['all_zh', 'en', 'all_ja', 'zh', 'ja', 'auto'];
  if (!validLangs.includes(lang)) {
    throw new Error(`Invalid language option: ${lang}`);
  }
};

// Get TTS Records
export const getTTSRecords = async (page = 1, pageSize = 1) => {
  if(USE_SAMPLES){
    return JSON.parse(records_sample);
  }
  try {
    const response = await fetch(`${API_BASE_URL}/records?page=${page}&page_size=${pageSize}`);
    return await handleError(response);
  } catch (error) {
    console.error('Error fetching TTS records:', error);
  }
};

// Create TTS
export const createTTS = async (text, lang, speakerId, topK = 10, topP = 0.95, temperature = 0.8) => {
  try {
    validateText(text);
    validateLanguage(lang);

    const response = await fetch(`${API_BASE_URL}/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, lang, speaker_id: parseInt(speakerId), top_k: topK, top_p: topP, temperature }),
    });
    return await handleError(response);
  } catch (error) {
    console.error('Error creating TTS:', error);
  }
};

// Add Speaker
export const addSpeaker = async (name, voiceFile, text, lang, description) => {
  try {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Speaker name must be a non-empty string');
    }
    validateLanguage(lang);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('voicefile', voiceFile);
    formData.append('text', text);
    formData.append('lang', lang);
    if (description) {
      formData.append('description', description);
    }

    const response = await fetch(`${API_BASE_URL}/speaker`, {
      method: 'POST',
      body: formData,
    });
    return await handleError(response);
  } catch (error) {
    console.error('Error adding speaker:', error);
  }
};

export const asr = async (voiceFile) => {
  try {
    const formData = new FormData();
    formData.append('voicefile', voiceFile);

    const response = await fetch(`${API_BASE_URL}/asr`, {
      method: 'POST',
      body: formData,
    });
    return await handleError(response);
  } catch (error) {
    console.error('Error adding speaker:', error);
  }
}

// Get Speakers
export const getSpeakers = async (page = 1, pageSize = 1) => {
  if(USE_SAMPLES) {
    return JSON.parse(speakers_sample)
  }
  try {
    const response = await fetch(`${API_BASE_URL}/speakers?page=${page}&page_size=${pageSize}`);
    return await handleError(response);
  } catch (error) {
    console.error('Error fetching speakers:', error);
  }
};

export const getSpeaker = async (id) => {
  if(USE_SAMPLES) {
    return JSON.parse(speaker_sample)
  }
  try {
    const response = await fetch(`${API_BASE_URL}/speaker?id=${id}`);
    return await handleError(response);
  } catch (error) {
    console.error('Error fetching speakers:', error);
  }
};

export const updateSpeaker = async (spk_id, name, voiceFile, text, lang, description) => {
  try {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('Speaker name must be a non-empty string');
    }
    validateLanguage(lang);

    const formData = new FormData();
    formData.append("spk_id", spk_id);
    formData.append('name', name);
    if (voiceFile) {
      formData.append('voicefile', voiceFile);
    }
    formData.append('text', text);
    formData.append('lang', lang);
    if (description) {
      formData.append('description', description);
    }

    const response = await fetch(`${API_BASE_URL}/speaker-update`, {
      method: 'POST',
      body: formData,
    });
    return await handleError(response);
  } catch (error) {
    console.error('Error adding speaker:', error);
  }
}

// Get Voice File
export const getVoiceFile = (type, id) => {
  try {
    if (!['ref', 'gen'].includes(type)) {
      throw new Error(`Invalid type specified: ${type}`);
    }
    return `${API_BASE_URL}/voicefile?type=${type}&id=${id}`;
  } catch (error) {
    console.error('Error fetching voice file:', error);
  }
};

// Example usage
// (async () => {
//   try {
//     const records = await getTTSRecords();
//     console.log('TTS Records:', records);

//     const ttsResponse = await createTTS('Hello, world!', 'en', 1);
//     console.log('Created TTS:', ttsResponse);

//     const speakers = await getSpeakers();
//     console.log('Speakers:', speakers);
    
//     // Assuming you have a file input for the voice file
//     const voiceFileInput = document.querySelector('#voicefile-input');
//     const newSpeakerResponse = await addSpeaker('John Doe', voiceFileInput.files[0], 'Sample text.', 'en');
//     console.log('Added Speaker:', newSpeakerResponse);

//     const voiceFile = await getVoiceFile('ref', 'john_doe.wav');
//     console.log('Voice File:', voiceFile);
//   } catch (error) {
//     console.error('Error in operations:', error);
//   }
// })();

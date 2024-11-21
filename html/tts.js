import { createTTS, getVoiceFile } from './api.js';

export function initTTS() {
  document.getElementById('tts-form').addEventListener('submit', handleTTSSubmit);
  M.FormSelect.init(document.getElementById('tts-lang'));
}

async function handleTTSSubmit(event) {
  event.preventDefault();

  const text = document.getElementById('tts-text').value;
  const lang = document.getElementById('tts-lang').value;
  const speakerId = document.getElementById('tts-speaker-id').value;
  const topK = parseInt(document.getElementById('top-k').value);
  const topP = parseFloat(document.getElementById('top-p').value);
  const temperature = parseFloat(document.getElementById('temperature').value);

  try {
    const result = await createTTS(text, lang, speakerId, topK, topP, temperature);
    displayResult(result);
  } catch (error) {
    M.toast({html: `Error: ${error.message}`, classes: 'red'});
  }
}

function displayResult(result) {
  const resultElem = document.getElementById('tts-result');
  resultElem.classList.remove("display-none");
  resultElem.src = getVoiceFile('gen', result.id);
}


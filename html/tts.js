import { createTTS, getVoiceFile, getVersions } from './api.js';
import { updateRecordsView } from "./records.js"

const $ = (selector) => {
  return document.querySelector(selector);
};

export function initTTS() {
  loadVersions()
  document.getElementById('tts-form').addEventListener('submit', handleTTSSubmit);

  M.FormSelect.init(document.getElementById('tts-lang'));
}

async function loadVersions() {
  const versions = await getVersions();
  console.log(versions)

  const versionsSelect = $('#tts-version');
  versionsSelect.innerHTML = '';
  versions.forEach((version, slot_id) => {
    const option = document.createElement('option');
    option.setAttribute("value", version)
    option.innerText = version

    versionsSelect.appendChild(option);
  });
  versionsSelect.selectedIndex = 0
}

async function handleTTSSubmit(event) {
  event.preventDefault();

  const text = $('#tts-text').value;
  const lang = $('#tts-lang').value;
  const speakerId = $('#tts-speaker-id').value;
  const topK = parseInt($('#top-k').value);
  const topP = parseFloat($('#top-p').value);
  const temperature = parseFloat($('#temperature').value);
  const model_version = $('#tts-version').value;
  try {
    $("#tts-progress").classList.remove("hide")
    const result = await createTTS(text, lang, speakerId, topK, topP, temperature, model_version);
    displayResult(result);
  } catch (error) {
    M.toast({html: `Error: ${error.message}`, classes: 'red'});
  }
  $("#tts-progress").classList.add("hide")
}

function displayResult(result) {
  const resultElem = document.getElementById('tts-result');
  resultElem.classList.remove("hide");
  resultElem.src = getVoiceFile('gen', result.id);
  resultElem.play()
  updateRecordsView()
}


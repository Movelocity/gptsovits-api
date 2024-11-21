import { getSpeaker, getSpeakers, updateSpeaker, addSpeaker, asr, getVoiceFile } from './api.js';

let sCurrentPage = 1;
const sPageSize = 4;

export function initSpeakers() {
  loadSpeakers();
  document.getElementById('s-prev-page').addEventListener('click', () => changePageS(-1));
  document.getElementById('s-next-page').addEventListener('click', () => changePageS(1));

  document.getElementById('add-speaker-form').addEventListener('submit', submitNewSpeaker);
  document.getElementById('edit-spk-form').addEventListener('submit', updateOneSpeaker);
  M.FormSelect.init(document.getElementById('speaker-lang'));

  document.querySelector('#speaker-voicefile-input').addEventListener('change', onVoiceFileSelected);

  document.querySelector("#speaker_text_asr").addEventListener("click", performASR)
}

function onVoiceFileSelected(evt) {
  const fileInput = evt.target;
  const files = Array.from(evt.target.files).map(file => file.name);
  const placeholder = fileInput.getAttribute('data-placeholder') || fileInput.placeholder;
  
  // Store original placeholder
  fileInput.setAttribute('data-placeholder', placeholder);
 
  // Update current placeholder
  if (files.length === 1) {
    fileInput.placeholder = files[0].replace(/.*[\/\\]/, '');
    
    // Implement TODO: create blob and put blob url to src of #speaker_uploadfile (audio tag)
    const file = evt.target.files[0];
    if (file) {
      const audioElement = document.getElementById('speaker_uploadfile');
      audioElement.style.display = "inline-block"
      if (audioElement) {
        // Revoke the previous blob URL if it exists
        if (audioElement.src) {
          URL.revokeObjectURL(audioElement.src);
        }
        
        // Create blob URL and set as audio source
        const blobUrl = URL.createObjectURL(file);
        audioElement.src = blobUrl;
      } else {
        console.error('Audio element with id "speaker_uploadfile" not found');
      }
    }
  } else {
    fileInput.placeholder = placeholder;
  }
}

async function applySpeakerOptions(speakers) {
  const speakerId = document.getElementById('tts-speaker-id');
  const speaker = speakers.items[0]
  console.log(speaker)
  speakerId.value = speaker.id
}

async function loadSpeakers() {
  const speakers = await getSpeakers(sCurrentPage, sPageSize);
  console.log(speakers)
  const speakersBody = document.getElementById('speakers-body');
  speakersBody.innerHTML = '';

  speakers.items.forEach(speaker => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="white-text">
        <a href="#!" onclick="selectTTSSpeaker(${speaker.id})">
        ${speaker.name}
        </a>
      </td>
      <td class="white-text">${speaker.description || 'N/A'}</td>
      <td>
        <a href="#!" onclick="playAudio('${speaker.id}', 'ref')">
          <i class="material-icons">play_arrow</i>
        </a>
      </td>
      <td>
        <a href="#!" class="white-text" onclick="editSpeaker(${speaker.id})">
          <i class="material-icons">subject</i>
        </a>
      </td>
    `;
    speakersBody.appendChild(tr);
  });
  applySpeakerOptions(speakers)
  updatePaginationS(speakers.total, speakers.page, speakers.pages);
}

function updatePaginationS(total, currentPage, totalPages) {
  const pageInfo = document.getElementById('s-page-info');
  pageInfo.textContent = `${currentPage} / ${totalPages}`;

  const prevButton = document.getElementById('s-prev-page');
  const nextButton = document.getElementById('s-next-page');

  prevButton.disabled = currentPage === 1;
  nextButton.disabled = currentPage === totalPages;
}

function changePageS(delta) {
  sCurrentPage += delta;
  loadSpeakers();
}

async function submitNewSpeaker(event) {
  event.preventDefault();

  const name = document.getElementById('speaker-name').value.trim();
  const voiceFile = document.getElementById('speaker-voicefile-input').files[0];
  const text = document.getElementById('speaker-text').value.trim();
  const lang = document.getElementById('speaker-lang').value;
  const description = document.getElementById('speaker-description').value.trim();

  try {
    const result = await addSpeaker(name, voiceFile, text, lang, description);
    if(!result) throw new Error("新增speaker失败");
    // Optionally, you can clear the form fields after submission
    document.getElementById('add-speaker-form').reset();
    M.Modal.getInstance(document.getElementById("add-speaker-modal")).close()
    M.toast({html: 'Speaker added successfully!', classes: 'green'});
    
  } catch (error) {
    M.toast({html: `Error: ${error.message}`, classes: 'red'});
  }
}

async function updateOneSpeaker(evt) {
  evt.preventDefault();
  const id = document.getElementById('edit-spk-id').value;
  const name = document.getElementById('edit-spk-name').value.trim();
  const voiceFile = document.getElementById('edit-spk-file').files[0];
  const text = document.getElementById('edit-spk-text').value.trim();
  const lang = document.getElementById('edit-spk-lang').value;
  const description = document.getElementById('edit-spk-desc').value.trim();

  try {
    const result = await updateSpeaker(id, name, voiceFile, text, lang, description);
    if(!result) throw new Error("编辑speaker失败");
    // Optionally, you can clear the form fields after submission
    document.getElementById('add-speaker-form').reset();
    M.Modal.getInstance(document.getElementById("add-speaker-modal")).close()
    M.toast({html: 'Speaker added successfully!', classes: 'green'});
    
  } catch (error) {
    M.toast({html: `Error: ${error.message}`, classes: 'red'});
  }
}

async function performASR(evt) {
  const voiceFile = document.getElementById('speaker-voicefile-input').files[0];
  try {
    const result = await asr(voiceFile);
    console.log(result)

    document.querySelector("#speaker-text").textContent = result.data;
    M.toast({html: 'Speaker added successfully!', classes: 'green'});
  } catch (error) {
    M.toast({html: `Error: ${error.message}`, classes: 'red'});
  }
}

window.playAudio = async function(id, type) {
  const audioElem = document.getElementById("audio-player");
  audioElem.pause()
  audioElem.src = getVoiceFile(type, id);
  audioElem.play()
  // const audioUrl = getVoiceFile(type, id);
  // const audio = new Audio(audioUrl);
  // audio.play();
}

window.selectTTSSpeaker = function(id) {
  document.getElementById("tts-speaker-id").value = id;
}

window.editSpeaker = async function(id) {
  const speaker = await getSpeaker(id)
  console.log(speaker)
  document.getElementById('edit-spk-id').value = speaker.id
  document.getElementById("edit-spk-name").value = speaker.name
  document.getElementById("edit-spk-file").value = ''  //for IE11, latest Chrome/Firefox/Opera...
  document.getElementById("edit-spk-text").value = speaker.name
  document.getElementById("edit-spk-lang").value = speaker.lang
  document.getElementById("edit-spk-desc").value = speaker.description
  M.Modal.getInstance(document.getElementById("edit-spk-modal")).open()
}
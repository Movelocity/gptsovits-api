import { getSpeaker, getSpeakers, updateSpeaker, addSpeaker, asr, getVoiceFile } from './api.js';

let sCurrentPage = 1;
const sPageSize = 5;

const $ = (selector) => {
  return document.querySelector(selector);
};

export function initSpeakers() {
  loadSpeakers();
  $('#s-prev-page').addEventListener('click', () => changePageS(-1));
  $('#s-next-page').addEventListener('click', () => changePageS(1));
  $('#edit-spk-form').addEventListener('submit', submitSpeaker);
  console.log($('#edit-spk-form'))
  // M.FormSelect.init($('#speaker-lang'));

  $('#edit-spk-file').addEventListener('change', onVoiceFileSelected);
  $("#edit_spk_text_asr").addEventListener("click", performASR)

  $("#add-spk-btn").addEventListener("click", ()=>editSpeaker(-1))
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
      const audioElement = $('#edit_spk_audio');
      // audioElement.style.display = "inline-block"
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

window.playAudio = async function(id, type) {
  const audioElem = $("#audio-player");
  audioElem.pause()
  audioElem.src = getVoiceFile(type, id);
  audioElem.play()
}


const selectTTSSpeaker = function(spk_id, slot_id) {
  $("#tts-speaker-id").value = spk_id;
  // M.toast({html: "select id: "+$("#tts-speaker-id").value})

  const listItems = document.querySelectorAll(".speaker-item");
  listItems.forEach((item, index) => {
    if (index === slot_id) {
      item.classList.remove("darken-3");
      item.classList.add("darken-1");
    } else {
      item.classList.remove("darken-1");
      item.classList.add("darken-3");
    }
  });
}
window.selectTTSSpeaker = selectTTSSpeaker

async function loadSpeakers() {
  const speakers = await getSpeakers(sCurrentPage, sPageSize);
  console.log(speakers)
  const speakersBody = $('#speaker-list');
  speakersBody.innerHTML = '';

  speakers.items.forEach((speaker, slot_id) => {
    const li = document.createElement('li');
    li.className = "blue-grey darken-3 white-text speaker-item col s12";
    li.innerHTML = `
    <div class="spk-info-row">
      <span class="spk-leading">
        <a href="#!" class="btn-floating blue" onclick="playAudio('${speaker.id}', 'ref')">
          <i class="material-icons">play_arrow</i>
        </a>
        <span style="cursor:pointer;" onclick="selectTTSSpeaker(${speaker.id}, ${slot_id})">${speaker.name} (${speaker.description || ' '})</span>
      </span>
      <a href="#!" class="btn-flat white-text" onclick="editSpeaker(${speaker.id})">
        <i class="material-icons">subject</i>
      </a>
    </div>
    `;
    speakersBody.appendChild(li);
  });
  selectTTSSpeaker(speakers.items[0].id, 0)
  updatePaginationS(speakers.total, speakers.page, speakers.pages);
}

/** 翻页功能 */
function updatePaginationS(total, currentPage, totalPages) {
  const pageInfo = $('#s-page-info');
  pageInfo.textContent = `${currentPage} / ${totalPages}`;

  const prevButton = $('#s-prev-page');
  const nextButton = $('#s-next-page');

  prevButton.disabled = currentPage === 1;
  nextButton.disabled = currentPage === totalPages;
}
function changePageS(delta) {
  sCurrentPage += delta;
  loadSpeakers();
}

/** 语音识别 */
async function performASR(evt) {
  const voiceFile = $('#edit-spk-file').files[0];
  console.log("voicefile", voiceFile)
  if(!voiceFile) return
  try {
    const result = await asr(voiceFile);
    console.log(result)

    $("#edit-spk-text").value = result.data;
    M.toast({html: 'Speaker added successfully!', classes: 'green'});
  } catch (error) {
    M.toast({html: `Error: ${error.message}`, classes: 'red'});
  }
}

const editSpeaker = async function(id) {  // -1 表示新增 speaker
  // 可以接收字符串类型的的 id，(true: '-1' == -1; false: '-2' == -1)
  let speaker;
  if(id == -1){
    speaker = { id: -1, name: "", voiceFile: "", text: "", lang: "", description: "" }
    $("#edit-spk-file").required = true
  } else {
    speaker = await getSpeaker(id)
    $("#edit-spk-file").required = false
  }
  console.log(speaker)
  $('#edit-spk-id').value = speaker.id
  $("#edit-spk-name").value = speaker.name
  $("#edit-spk-desc").value = speaker.description
  $("#edit-spk-file").value = ""  //for IE11, latest Chrome/Firefox/Opera...
  $("#edit-spk-lang").value = speaker.lang
  $("#edit-spk-text").value = speaker.text
  
  M.updateTextFields();
  M.Modal.getInstance($("#edit-spk-modal")).open()
  $("#edit_spk_audio").src = id==-1? "" : getVoiceFile('ref', id)
}
window.editSpeaker = editSpeaker

async function submitSpeaker(evt) {
  console.log("submit")
  evt.preventDefault();
  const id = parseInt($('#edit-spk-id').value);
  const name = $('#edit-spk-name').value.trim();
  const text = $('#edit-spk-text').value.trim();
  const lang = $('#edit-spk-lang').value;
  const description = $('#edit-spk-desc').value.trim();
  const voiceFile = $('#edit-spk-file').files[0];
  // console.log(voiceFile) 
  // return
  try {
    if (id == -1) {
      const result = await addSpeaker(name, voiceFile, text, lang, description);
      if(!result) throw new Error("新增speaker失败");
    } else {
      const result = await updateSpeaker(id, name, voiceFile, text, lang, description);
      if(!result) throw new Error("编辑speaker失败");
    }
    // Optionally, you can clear the form fields after submission
    setTimeout(()=>{loadSpeakers()}, 2000)
    $('#edit-spk-form').reset();
    M.Modal.getInstance($("#edit-spk-modal")).close()
    M.toast({html: 'Speaker added successfully!', classes: 'green'});
  } catch (error) {
    M.toast({html: `Error: ${error.message}`, classes: 'red'});
  }
  
}

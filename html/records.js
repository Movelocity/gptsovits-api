import { getTTSRecords, deleteRecord } from './api.js';

let page_idx;
const tPageSize = 9

const $ = (selector) => {
  return document.querySelector(selector);
};

window.deleteRecord = function(id, spk, text) {
  $("#del-record-submit").setAttribute("data-target", id)
  M.Modal.getInstance($("#commit-del-record")).open()
  $("#del-record-info").innerHTML = spk+"<br>"+text
}

function commitDeletion() {
  const id = $("#del-record-submit").getAttribute("data-target")
  deleteRecord(id)
  updateRecordsView()
  M.Modal.getInstance($("#commit-del-record")).close()
}

export async function initRecords() {
  const records = await getTTSRecords(1, tPageSize);
  updatePaginationT(1, records.pages)

  $("#del-record-submit").addEventListener("click", commitDeletion);
}

export function updateRecordsView(){
  loadTTSRecords(page_idx)
}

async function loadTTSRecords(currentPage) {
  page_idx = currentPage;
  const records = await getTTSRecords(currentPage, tPageSize);
  const recordsContainer = document.getElementById('tts-records-container');
  recordsContainer.innerHTML = '';

  records.items.forEach((record, idx) => {
    const card = document.createElement('div');
    card.className = 'col s12 m6 l4';
    card.innerHTML = `
      <div class="card blue-grey darken-3 white-text">
        <div class="card-content">
          <p>${record.text}</p>
        </div>
        <div class="card-action" style="display:flex; flex-direction: row; justify-content: space-between;">
          <span class="flex-row">
            <div>
              <span>${record.speaker_id}</span>
              <span>${record.speaker_name}</span>
              <span>${record.speaker_desc}</span>
              <span>${record.lang}</span>
              <div>${new Date(record.created_at).toLocaleString()}</div>
            </div>
            <a class="white-text" href="#!" onclick="deleteRecord('${record.id}', '${record.speaker_name}', '${record.text}')" style="margin: 0 10px;">
              <i class="material-icons">delete_forever</i>
            </a>
          </span>
          <a href="#!" class="btn-floating waves-effect waves-light blue" onclick="playAudio('${record.id}', 'gen')">
            <i class="material-icons">play_arrow</i>
          </a>
        </div>
      </div>
    `;
    recordsContainer.appendChild(card);
  });

  // updatePaginationT(records.page, records.pages);
}


let eventHandlers = {
  prevArrowClick: null,
  nextArrowClick: null,
  pageLinkClicks: []
};

function updatePaginationT(currentPage, totalPages) {
  const paginationContainer = document.querySelector('#records-pagination');
  const prevArrow = document.querySelector('#record-page-prev');
  const nextArrow = document.querySelector('#record-page-next');
  const pageLinks = paginationContainer.querySelectorAll('li a');
  // console.log(currentPage);
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  startPage = Math.max(1, endPage - 4);

  // Remove old event listeners
  if (eventHandlers.prevArrowClick) {
    prevArrow.removeEventListener('click', eventHandlers.prevArrowClick);
  }
  if (eventHandlers.nextArrowClick) {
    nextArrow.removeEventListener('click', eventHandlers.nextArrowClick);
  }
  eventHandlers.pageLinkClicks.forEach((handler, index) => {
    pageLinks[index].removeEventListener('click', handler);
  });

  // Update page numbers and styles
  pageLinks.forEach((link, index) => {
    const pageNum = startPage + index;
    link.textContent = pageNum;
    link.classList.toggle('current', pageNum === currentPage);
    link.parentElement.style.display = pageNum <= totalPages ? '' : 'none';
  });

  // Add new event listeners
  eventHandlers.pageLinkClicks = [];
  pageLinks.forEach((link, index) => {
    const clickHandler = () => updatePaginationT(startPage + index, totalPages);
    eventHandlers.pageLinkClicks.push(clickHandler);
    link.addEventListener('click', clickHandler);
  });

  const prevArrowClickHandler = () => updatePaginationT(Math.max(1, currentPage - 1), totalPages);
  prevArrow.addEventListener('click', prevArrowClickHandler);
  eventHandlers.prevArrowClick = prevArrowClickHandler;

  const nextArrowClickHandler = () => updatePaginationT(Math.min(totalPages, currentPage + 1), totalPages);
  nextArrow.addEventListener('click', nextArrowClickHandler);
  eventHandlers.nextArrowClick = nextArrowClickHandler;

  // Enable/disable prev/next arrows
  prevArrow.classList.toggle('disabled', currentPage === 1);
  nextArrow.classList.toggle('disabled', currentPage === totalPages);

  loadTTSRecords(currentPage);
}





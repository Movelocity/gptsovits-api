import { getTTSRecords } from './api.js';

let tCurrentPage = 1
const tPageSize = 9

export function initRecords() {
  loadTTSRecords();
  document.getElementById('t-prev-page').addEventListener('click', () => changePageT(-1));
  document.getElementById('t-next-page').addEventListener('click', () => changePageT(1));
}

async function loadTTSRecords() {
  const records = await getTTSRecords(tCurrentPage, tPageSize);
  const recordsContainer = document.getElementById('tts-records-container');
  recordsContainer.innerHTML = '';

  records.items.forEach(record => {
    const card = document.createElement('div');
    card.className = 'col s12 m6 l4';
    card.innerHTML = `
      <div class="card blue-grey darken-3 white-text">
        <div class="card-content">
          <p>${record.text}</p>
        </div>
        <div class="card-action" style="display:flex; flex-direction: row; justify-content: space-between;">
          
          <div class="">
            <span>${record.speaker_id}</span>
            <span>${record.lang}</span>
            <span>${record.speaker_name}</span>
            <span>${record.speaker_desc}</span>
            <div>${new Date(record.created_at).toLocaleString()}</div>
          </div>
          <a href="#!" class="btn-floating waves-effect waves-light blue" onclick="playAudio('${record.id}', 'gen')">
            <i class="material-icons">play_arrow</i>
          </a>
        </div>
      </div>
    `;
    recordsContainer.appendChild(card);
  });

  updatePaginationT(records.total, records.page, records.pages);
}

function updatePaginationT(total, currentPage, totalPages) {
  const pageInfo = document.getElementById('t-page-info');
  pageInfo.textContent = `${currentPage} / ${totalPages}`;

  const prevButton = document.getElementById('t-prev-page');
  const nextButton = document.getElementById('t-next-page');

  prevButton.disabled = currentPage === 1;
  nextButton.disabled = currentPage === totalPages;
}

function changePageT(delta) {
  tCurrentPage += delta;
  loadTTSRecords();
}

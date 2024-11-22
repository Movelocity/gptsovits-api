import { getTTSRecords } from './api.js';

let tCurrentPage = 1
const tPageSize = 9

export function initRecords() {
  loadTTSRecords();
  document.getElementById('t-prev-page').addEventListener('click', () => changePageT(-1));
  document.getElementById('t-next-page').addEventListener('click', () => changePageT(1));
}
function changePageT(delta) {
  tCurrentPage += delta;
  loadTTSRecords();
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
          <a href="#!" class="btn-floating waves-effect waves-light blue" onclick="playAudio('${record.id}', 'gen')">
            <i class="material-icons">play_arrow</i>
          </a>
          <div>
            <span>${record.speaker_id}</span>
            <span>${record.speaker_name}</span>
            <span>${record.speaker_desc}</span>
            <span>${record.lang}</span>
            <div>${new Date(record.created_at).toLocaleString()}</div>
          </div>
        </div>
      </div>
    `;
    recordsContainer.appendChild(card);
  });

  updatePaginationT(records.page, records.pages);
}

function updatePaginationT(currentPage, totalPages) {
  const pageInfo = document.getElementById('t-page-info');
  pageInfo.textContent = `${currentPage} / ${totalPages}`;

  const prevButton = document.getElementById('t-prev-page');
  const nextButton = document.getElementById('t-next-page');

  prevButton.disabled = currentPage === 1;
  nextButton.disabled = currentPage === totalPages;
}
// function updatePaginationT(currentPage, totalPages) {
//   const paginationContainer = document.querySelector('.pagination');
//   const pageLinks = paginationContainer.querySelectorAll('li:not(:first-child):not(:last-child) a');
//   const prevArrow = paginationContainer.querySelector('li:first-child a');
//   const nextArrow = paginationContainer.querySelector('li:last-child a');

//   // Enable/disable prev/next arrows
//   prevArrow.classList.toggle('disabled', currentPage === 1);
//   nextArrow.classList.toggle('disabled', currentPage === totalPages);

//   // Calculate the range of page numbers to display
//   let startPage = Math.max(1, currentPage - 2);
//   let endPage = Math.min(totalPages, startPage + 4);
//   startPage = Math.max(1, endPage - 4);

//   // Update page numbers and styles
//   pageLinks.forEach((link, index) => {
//     const pageNum = startPage + index;
//     link.textContent = pageNum;
//     link.classList.toggle('current', pageNum === currentPage);
//     link.parentElement.style.display = pageNum <= totalPages ? '' : 'none';
//   });

//   // Update href attributes for correct navigation
//   prevArrow.setAttribute('href', `#!${Math.max(1, currentPage - 1)}`);
//   nextArrow.setAttribute('href', `#!${Math.min(totalPages, currentPage + 1)}`);
//   pageLinks.forEach((link, index) => {
//     link.setAttribute('href', `#!${startPage + index}`);
//   });
// }




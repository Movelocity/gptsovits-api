import { initSpeakers } from './speakers.js';
import { initTTS } from './tts.js';
import { initRecords } from './records.js';

document.addEventListener('DOMContentLoaded', function() {
  // Initialize Materialize components
  M.Sidenav.init(document.querySelectorAll('.sidenav'));
  M.Modal.init(document.querySelectorAll('.modal'));

  // Initialize modules
  initTTS();
  initSpeakers();
  initRecords();
});
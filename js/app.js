// Registrasi Service Worker PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

let isOpenCvReady = false;
let currentExamConfig = JSON.parse(localStorage.getItem('exam_grid_config')) || {
  title: 'Penilaian Harian',
  qCount: 25,
  rowsPerTable: 10,
  optCount: 5,
  keys: Array(25).fill('A')
};
let scanHistory = JSON.parse(localStorage.getItem('scan_grid_results')) || [];
let currentLastResult = null;

function onOpenCvReady() {
  isOpenCvReady = true;
  const statusBadge = document.getElementById('cv-status');
  statusBadge.innerText = 'OpenCV Siap';
  statusBadge.classList.add('ready');
  initCamera();
}

// Navigasi Tab
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  event.target.classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// Inisialisasi Tampilan awal
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('exam-title').value = currentExamConfig.title;
  document.getElementById('question-count').value = currentExamConfig.qCount;
  document.getElementById('rows-per-table').value = currentExamConfig.rowsPerTable;
  document.getElementById('option-count').value = currentExamConfig.optCount;

  renderKeyInputs();
  renderHistory();
});

// Render Input Kunci Jawaban Dinamis
function renderKeyInputs() {
  const container = document.getElementById('key-inputs-container');
  const count = parseInt(document.getElementById('question-count').value) || 1;
  const optCount = parseInt(document.getElementById('option-count').value) || 4;
  const optionsText = ['A', 'B', 'C', 'D', 'E'];

  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    let opts = '';
    let selectedKey = currentExamConfig.keys[i] || 'A';
    
    for (let o = 0; o < optCount; o++) {
      let isSel = optionsText[o] === selectedKey ? 'selected' : '';
      opts += `${optionsText[o]}`;
    }
    container.innerHTML += `

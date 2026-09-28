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
      opts += `<option value="${optionsText[o]}" ${isSel}>${optionsText[o]}</option>`;
    }
    container.innerHTML += `
      <div class="key-item">
        <span>No. ${i+1}</span>
        <select class="key-select" data-index="${i}">${opts}</select>
      </div>
    `;
  }
}

document.getElementById('question-count').addEventListener('input', renderKeyInputs);
document.getElementById('option-count').addEventListener('change', renderKeyInputs);

function saveExamConfig() {
  const qCount = parseInt(document.getElementById('question-count').value);
  const rowsPerTable = parseInt(document.getElementById('rows-per-table').value);
  const optCount = parseInt(document.getElementById('option-count').value);
  const title = document.getElementById('exam-title').value || 'Penilaian Harian';
  
  let keys = [];
  document.querySelectorAll('.key-select').forEach(sel => keys.push(sel.value));

  currentExamConfig = { title, qCount, rowsPerTable, optCount, keys };
  localStorage.setItem('exam_grid_config', JSON.stringify(currentExamConfig));
  alert('Konfigurasi Ujian & Kunci Jawaban Tersimpan!');
}

// Generator PDF LJK Murni Tabel Grid (Menyesuaikan sampel desain layout)[span_0](start_span)[span_0](end_span)
function generateGridPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const totalQuestions = parseInt(document.getElementById('question-count').value);
  const rowsPerTable = parseInt(document.getElementById('rows-per-table').value); 
  const optionCount = parseInt(document.getElementById('option-count').value); 
  const optionsText = ['A', 'B', 'C', 'D', 'E'];

  let tableCount = Math.ceil(totalQuestions / rowsPerTable);
  let startX = 15;
  let startY = 20;
  let cellWidth = 9;
  let cellHeight = 8;

  let questionNum = 1;

  for (let t = 0; t < tableCount; t++) {
    let currentX = startX + (t * (optionCount + 2.5) * cellWidth);

    for (let r = 0; r < rowsPerTable; r++) {
      if (questionNum > totalQuestions) break;

      let currentY = startY + (r * cellHeight);

      // 1. Kotak Nomor Soal[span_1](start_span)[span_1](end_span)
      doc.rect(currentX, currentY, cellWidth + 3, cellHeight);
      doc.setFontSize(9);
      doc.text(`${questionNum}.`, currentX + 2, currentY + 5.5);

      // 2. Kotak Pilihan (A, B, C, D, E)[span_2](start_span)[span_2](end_span)
      for (let opt = 0; opt < optionCount; opt++) {
        let optX = currentX + cellWidth + 3 + (opt * cellWidth);
        doc.rect(optX, currentY, cellWidth, cellHeight);
        doc.text(optionsText[opt], optX + 3, currentY + 5.5);
      }

      questionNum++;
    }
  }

  doc.save(`LJK_Grid_${totalQuestions}_Soal.pdf`);
}

// Inisialisasi Kamera Belakang HP
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    document.getElementById('webcam').srcObject = stream;
  } catch (err) {
    console.error('Gagal membuka kamera:', err);
  }
}

// Proses Scan LJK
function processScan() {
  const video = document.getElementById('webcam');
  const canvas = document.getElementById('canvas-out');
  const ctx = canvas.getContext('2d');

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const totalQuestions = currentExamConfig.qCount;
  const rowsPerTable = currentExamConfig.rowsPerTable;
  const optionCount = currentExamConfig.optCount;

  currentLastResult = processGridOMR(
    'canvas-out',
    totalQuestions,
    rowsPerTable,
    optionCount,
    currentExamConfig.keys
  );

  if (currentLastResult) {
    document.getElementById('res-score').innerText = currentLastResult.score;
    document.getElementById('res-correct').innerText = currentLastResult.correct;
    document.getElementById('res-wrong').innerText = currentLastResult.wrong;
    document.getElementById('scan-result').style.display = 'block';
  }
}

function saveStudentResult() {
  const studentName = document.getElementById('student-name').value || 'Siswa Tanpa Nama';
  if (!currentLastResult) return;

  const entry = {
    name: studentName,
    score: currentLastResult.score,
    correct: currentLastResult.correct,
    wrong: currentLastResult.wrong,
    date: new Date().toLocaleDateString('id-ID')
  };

  scanHistory.push(entry);
  localStorage.setItem('scan_grid_results', JSON.stringify(scanHistory));
  renderHistory();
  
  document.getElementById('student-name').value = '';
  document.getElementById('scan-result').style.display = 'none';
  alert('Hasil Nilai Berhasil Disimpan!');
}

function renderHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  scanHistory.forEach((item) => {
    list.innerHTML += `<li><span><strong>${item.name}</strong> (${item.date})</span> <span>Nilai: <strong>${item.score}</strong></span></li>`;
  });
}

function exportToExcel() {
  if (scanHistory.length === 0) {
    alert('Belum ada data nilai!');
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(scanHistory);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Nilai");
  XLSX.writeFile(workbook, `Rekap_Nilai_${currentExamConfig.title.replace(/\s+/g, '_')}.xlsx`);
}

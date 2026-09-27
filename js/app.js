// Global State & Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

let isOpenCvReady = false;
let currentExamConfig = JSON.parse(localStorage.getItem('exam_config')) || {
  title: 'Penilaian Harian',
  qCount: 20,
  optCount: 4,
  keys: Array(20).fill('A')
};
let scanHistory = JSON.parse(localStorage.getItem('scan_results')) || [];
let currentLastResult = null;

function onOpenCvReady() {
  isOpenCvReady = true;
  const statusBadge = document.getElementById('cv-status');
  statusBadge.innerText = 'OpenCV Siap';
  statusBadge.classList.add('ready');
  initCamera();
}

// UI Navigation
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

  event.target.classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// 1. Profil Handler
function saveProfile() {
  const schoolName = document.getElementById('school-name').value;
  const teacherName = document.getElementById('teacher-name').value;

  localStorage.setItem('school_name', schoolName);
  localStorage.setItem('teacher_name', teacherName);
  alert('Profil Sekolah & Guru Berhasil Disimpan!');
}

document.getElementById('school-logo-input').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onloadend = function() {
    localStorage.setItem('school_logo', reader.result);
    document.getElementById('logo-preview').src = reader.result;
    document.getElementById('logo-preview').style.display = 'block';
  };
  reader.readAsDataURL(file);
});

// Load Initial Data
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('school-name').value = localStorage.getItem('school_name') || '';
  document.getElementById('teacher-name').value = localStorage.getItem('teacher_name') || '';
  const savedLogo = localStorage.getItem('school_logo');
  if (savedLogo) {
    document.getElementById('logo-preview').src = savedLogo;
    document.getElementById('logo-preview').style.display = 'block';
  }
  renderKeyInputs();
  renderHistory();
});

// 2. Exam & Key Inputs Handler
function renderKeyInputs() {
  const container = document.getElementById('key-inputs-container');
  const count = parseInt(document.getElementById('question-count').value);
  const optCount = parseInt(document.getElementById('option-count').value);
  const optionsText = ['A', 'B', 'C', 'D', 'E'];

  container.innerHTML = '';
  for (let i = 0; i < count; i++) {
    let opts = '';
    for (let o = 0; o < optCount; o++) {
      opts += `<option value="${optionsText[o]}">${optionsText[o]}</option>`;
    }
    container.innerHTML += `
      <div class="key-item">
        <span>No. ${i+1}</span>
        <select class="key-select" data-index="${i}">${opts}</select>
      </div>
    `;
  }
}

document.getElementById('question-count').addEventListener('change', renderKeyInputs);
document.getElementById('option-count').addEventListener('change', renderKeyInputs);

function saveExamConfig() {
  const qCount = parseInt(document.getElementById('question-count').value);
  const optCount = parseInt(document.getElementById('option-count').value);
  const title = document.getElementById('exam-title').value || 'Penilaian Harian';
  
  let keys = [];
  document.querySelectorAll('.key-select').forEach(sel => keys.push(sel.value));

  currentExamConfig = { title, qCount, optCount, keys };
  localStorage.setItem('exam_config', JSON.stringify(currentExamConfig));
  alert('Konfigurasi Ujian Disimpan!');
}

// 3. Generate LJK PDF (With Kop, Logo, & Anchor Markers)
function generateLJKPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const schoolName = localStorage.getItem('school_name') || 'NAMA SEKOLAH BELUM DISET';
  const teacherName = localStorage.getItem('teacher_name') || 'GURU PENGAMPU';
  const logoBase64 = localStorage.getItem('school_logo');
  const examTitle = document.getElementById('exam-title').value || 'UJI PENILAIAN';
  const qCount = parseInt(document.getElementById('question-count').value);

  // KOP SEKOLAH
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', 15, 10, 20, 20);
  }
  doc.setFontSize(14);
  doc.text(schoolName.toUpperCase(), 105, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Mata Pelajaran: ${examTitle} | Guru: ${teacherName}`, 105, 25, { align: 'center' });
  doc.line(15, 32, 195, 32);

  // 4 ANCHOR MARKERS (Sangat Penting untuk OpenCV)
  doc.setFillColor(0, 0, 0);
  doc.rect(15, 35, 8, 8, 'F');   // Top-Left
  doc.rect(187, 35, 8, 8, 'F');  // Top-Right
  doc.rect(15, 265, 8, 8, 'F');  // Bottom-Left
  doc.rect(187, 265, 8, 8, 'F'); // Bottom-Right

  // Identitas Siswa
  doc.text('Nama Siswa : _______________________', 20, 50);
  doc.text('Kelas/Absen : _______________________', 120, 50);

  // Grid Bulatan Jawaban
  let startX = 30;
  let startY = 70;
  doc.setFontSize(9);

  for (let i = 1; i <= qCount; i++) {
    let yPos = startY + ((i - 1) % 20) * 9;
    let xOffset = i > 20 ? 80 : 0; // Pindah kolom jika > 20 soal

    doc.text(`${i}.`, startX + xOffset, yPos);
    ['A', 'B', 'C', 'D', 'E'].forEach((opt, idx) => {
      doc.circle(startX + xOffset + 12 + (idx * 9), yPos - 1, 3);
      doc.text(opt, startX + xOffset + 10.5 + (idx * 9), yPos);
    });
  }

  doc.save(`LJK_${examTitle.replace(/\s+/g, '_')}.pdf`);
}

// 4. Kamera & Scan Logic
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    document.getElementById('webcam').srcObject = stream;
  } catch (err) {
    console.error('Kamera error:', err);
  }
}

function processScan() {
  const video = document.getElementById('webcam');
  const canvas = document.getElementById('canvas-out');
  const ctx = canvas.getContext('2d');

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Jalankan OMR Engine
  currentLastResult = processOMR('canvas-out', currentExamConfig.qCount, currentExamConfig.optCount, currentExamConfig.keys);

  if (currentLastResult) {
    document.getElementById('res-score').innerText = currentLastResult.score;
    document.getElementById('res-correct').innerText = currentLastResult.correct;
    document.getElementById('res-wrong').innerText = currentLastResult.wrong;
    document.getElementById('scan-result').style.display = 'block';
  }
}

function saveStudentResult() {
  const studentName = document.getElementById('student-name').value || 'Tanpa Nama';
  if (!currentLastResult) return;

  const entry = {
    name: studentName,
    score: currentLastResult.score,
    correct: currentLastResult.correct,
    wrong: currentLastResult.wrong,
    date: new Date().toLocaleDateString('id-ID')
  };

  scanHistory.push(entry);
  localStorage.setItem('scan_results', JSON.stringify(scanHistory));
  renderHistory();
  
  document.getElementById('student-name').value = '';
  document.getElementById('scan-result').style.display = 'none';
  alert('Data Siswa Tersimpan!');
}

function renderHistory() {
  const list = document.getElementById('history-list');
  list.innerHTML = '';
  scanHistory.forEach((item) => {
    list.innerHTML += `<li><span><strong>${item.name}</strong> (${item.date})</span> <span>Nilai: ${item.score}</span></li>`;
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
  XLSX.writeFile(workbook, "Rekap_Nilai_LJK.xlsx");
}

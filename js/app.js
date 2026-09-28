// 1. Generator PDF LJK Murni Tabel Grid (Tanpa Header / Kop)
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
  let cellWidth = 8;
  let cellHeight = 7;

  let questionNum = 1;

  for (let t = 0; t < tableCount; t++) {
    let currentX = startX + (t * (optionCount + 2) * cellWidth);

    for (let r = 0; r < rowsPerTable; r++) {
      if (questionNum > totalQuestions) break;

      let currentY = startY + (r * cellHeight);

      // Gambar Kotak Nomor Soal
      doc.rect(currentX, currentY, cellWidth + 2, cellHeight);
      doc.setFontSize(8);
      doc.text(`${questionNum}.`, currentX + 2, currentY + 5);

      // Gambar Kotak Pilihan (A, B, C, D, E)
      for (let opt = 0; opt < optionCount; opt++) {
        let optX = currentX + cellWidth + 2 + (opt * cellWidth);
        doc.rect(optX, currentY, cellWidth, cellHeight);
        doc.text(optionsText[opt], optX + 2.5, currentY + 5);
      }

      questionNum++;
    }
  }

  doc.save(`LJK_Grid_${totalQuestions}_Soal.pdf`);
}

// 2. Handler Panggil OMR Grid saat Tombol Scan Ditekan
function processScan() {
  const video = document.getElementById('webcam');
  const canvas = document.getElementById('canvas-out');
  const ctx = canvas.getContext('2d');

  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const totalQuestions = currentExamConfig.qCount;
  const rowsPerTable = parseInt(document.getElementById('rows-per-table').value) || 10;
  const optionCount = currentExamConfig.optCount;

  // Memanggil fungsi baru di omr-engine.js
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

/**
 * OMR Engine Khusus Format Tabel & Menyilang (X)
 */

function processGridOMR(canvasId, totalQuestions, rowsPerTable, optionCount, answerKeys) {
  if (typeof cv === 'undefined' || !cv.Mat) {
    alert('OpenCV.js belum siap!');
    return null;
  }

  let src = cv.imread(canvasId);
  let gray = new cv.Mat();
  let thresh = new cv.Mat();

  // 1. Ubah ke Grayscale
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

  // 2. Adaptive Thresholding agar peka terhadap silangan pensil/pulpen yang tipis
  cv.adaptiveThreshold(
    gray, thresh, 255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY_INV, 15, 8
  );

  let studentAnswers = [];
  const optionsText = ['A', 'B', 'C', 'D', 'E'];

  // Hitung jumlah tabel/blok berdasarkan total soal dan baris per tabel
  let tableCount = Math.ceil(totalQuestions / rowsPerTable);

  // Koordinat Grid Dinamis (Persentase terhadap ukuran gambar)
  let imgWidth = thresh.cols;
  let imgHeight = thresh.rows;

  let questionIndex = 0;

  for (let t = 0; t < tableCount; t++) {
    // Estimasi posisi X tabel ke-t
    let tableWidthRatio = 1.0 / tableCount;
    let tableX = t * tableWidthRatio * imgWidth;

    for (let r = 0; r < rowsPerTable; r++) {
      if (questionIndex >= totalQuestions) break;

      let cellHeight = (imgHeight * 0.85) / rowsPerTable;
      let cellY = (imgHeight * 0.1) + (r * cellHeight);

      let maxDarkness = -1;
      let selectedOption = -1;

      // Periksa tiap kolom pilihan (A, B, C, D, E)
      for (let opt = 0; opt < optionCount; opt++) {
        let colWidth = (tableWidthRatio * imgWidth * 0.8) / (optionCount + 1);
        let cellX = tableX + (tableWidthRatio * imgWidth * 0.18) + (opt * colWidth);

        // Crop bagian tengah kotak (padding 20% agar garis kotak tidak terhitung)
        let rect = new cv.Rect(
          Math.floor(cellX + colWidth * 0.2),
          Math.floor(cellY + cellHeight * 0.2),
          Math.floor(colWidth * 0.6),
          Math.floor(cellHeight * 0.6)
        );

        // Pastikan rect berada di dalam batas gambar
        if (rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= imgWidth && rect.y + rect.height <= imgHeight) {
          let cellMat = thresh.roi(rect);
          let darkPixels = cv.countNonZero(cellMat); // Hitung piksel silangan
          let totalPixels = rect.width * rect.height;
          let darknessRatio = darkPixels / totalPixels;

          cellMat.delete();

          // Ambang Peka: Jika piksel gelap paling tinggi di antara pilihan lain
          if (darknessRatio > maxDarkness) {
            maxDarkness = darknessRatio;
            selectedOption = opt;
          }
        }
      }

      // Ambang peka minimal (misal > 0.10 / 10% terisi silangan) dianggap diisi
      if (maxDarkness > 0.10 && selectedOption !== -1) {
        studentAnswers.push(optionsText[selectedOption]);
      } else {
        studentAnswers.push('-'); // Tidak diisi / Kosong
      }

      questionIndex++;
    }
  }

  // Hitung Nilai Akhir
  let correctCount = 0;
  for (let i = 0; i < totalQuestions; i++) {
    if (studentAnswers[i] && studentAnswers[i] === answerKeys[i]) {
      correctCount++;
    }
  }

  let finalScore = Math.round((correctCount / totalQuestions) * 100);

  // Clean memory
  src.delete();
  gray.delete();
  thresh.delete();

  return {
    score: finalScore,
    correct: correctCount,
    wrong: totalQuestions - correctCount,
    studentAnswers: studentAnswers
  };
}

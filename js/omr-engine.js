/**
 * OMR Engine Khusus Format Tabel Grid & Menyilang (X)[span_3](start_span)[span_3](end_span)
 */

function processGridOMR(canvasId, totalQuestions, rowsPerTable, optionCount, answerKeys) {
  if (typeof cv === 'undefined' || !cv.Mat) {
    alert('OpenCV.js belum siap!');
    return null;
  }

  let src = cv.imread(canvasId);
  let gray = new cv.Mat();
  let thresh = new cv.Mat();

  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

  // Adaptive Thresholding agar sangat peka membaca goresan silang (X) yang tipis
  cv.adaptiveThreshold(
    gray, thresh, 255,
    cv.ADAPTIVE_THRESH_GAUSSIAN_C,
    cv.THRESH_BINARY_INV, 15, 8
  );

  let studentAnswers = [];
  const optionsText = ['A', 'B', 'C', 'D', 'E'];

  let tableCount = Math.ceil(totalQuestions / rowsPerTable);
  let imgWidth = thresh.cols;
  let imgHeight = thresh.rows;
  let questionIndex = 0;

  for (let t = 0; t < tableCount; t++) {
    let tableWidthRatio = 1.0 / tableCount;
    let tableX = t * tableWidthRatio * imgWidth;

    for (let r = 0; r < rowsPerTable; r++) {
      if (questionIndex >= totalQuestions) break;

      let cellHeight = (imgHeight * 0.85) / rowsPerTable;
      let cellY = (imgHeight * 0.08) + (r * cellHeight);

      let maxDarkness = -1;
      let selectedOption = -1;

      for (let opt = 0; opt < optionCount; opt++) {
        let colWidth = (tableWidthRatio * imgWidth * 0.78) / (optionCount + 1);
        let cellX = tableX + (tableWidthRatio * imgWidth * 0.20) + (opt * colWidth);

        let rect = new cv.Rect(
          Math.floor(cellX + colWidth * 0.20),
          Math.floor(cellY + cellHeight * 0.20),
          Math.floor(colWidth * 0.60),
          Math.floor(cellHeight * 0.60)
        );

        if (rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= imgWidth && rect.y + rect.height <= imgHeight) {
          let cellMat = thresh.roi(rect);
          let darkPixels = cv.countNonZero(cellMat);
          let totalPixels = rect.width * rect.height;
          let darknessRatio = darkPixels / totalPixels;

          cellMat.delete();

          if (darknessRatio > maxDarkness) {
            maxDarkness = darknessRatio;
            selectedOption = opt;
          }
        }
      }

      // Sensitivitas peka (ambang batas 8% piksel gelap)
      if (maxDarkness > 0.08 && selectedOption !== -1) {
        studentAnswers.push(optionsText[selectedOption]);
      } else {
        studentAnswers.push('-'); 
      }

      questionIndex++;
    }
  }

  let correctCount = 0;
  for (let i = 0; i < totalQuestions; i++) {
    if (studentAnswers[i] && studentAnswers[i] === answerKeys[i]) {
      correctCount++;
    }
  }

  let finalScore = Math.round((correctCount / totalQuestions) * 100);

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

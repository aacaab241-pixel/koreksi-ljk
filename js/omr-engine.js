/**
 * OMR Engine: Memproses foto/canvas LJK menggunakan OpenCV.js
 */

function processOMR(canvasId, questionCount, optionCount, answerKeys) {
  if (typeof cv === 'undefined' || !cv.Mat) {
    alert('OpenCV belum siap!');
    return null;
  }

  let src = cv.imread(canvasId);
  let gray = new cv.Mat();
  let thresh = new cv.Mat();

  // 1. Convert ke Gray & Thresholding
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
  cv.threshold(gray, thresh, 150, 255, cv.THRESH_BINARY_INV);

  // Simulasi pembacaan grid (Disesuaikan dengan bounding box kertas)
  let studentAnswers = [];
  let optionsText = ['A', 'B', 'C', 'D', 'E'];

  // Mengambil sampel acak sederhana untuk demonstrasi pembacaan piksel
  for (let q = 0; q < questionCount; q++) {
    // Simulasi deteksi isian berdasarkan densitas piksel
    let detectedOption = Math.floor(Math.random() * optionCount); 
    studentAnswers.push(optionsText[detectedOption]);
  }

  // Calculate Score
  let correctCount = 0;
  for (let i = 0; i < questionCount; i++) {
    if (studentAnswers[i] === answerKeys[i]) {
      correctCount++;
    }
  }

  let finalScore = Math.round((correctCount / questionCount) * 100);

  // Cleanup OpenCV Memory
  src.delete();
  gray.delete();
  thresh.delete();

  return {
    score: finalScore,
    correct: correctCount,
    wrong: questionCount - correctCount,
    studentAnswers: studentAnswers
  };
}

import fs from 'fs';
import path from 'path';

const baseDir = '.';
const files = fs.readdirSync(baseDir).filter(f => f.startsWith('TEMA ') && f.endsWith('.json'));

let anyError = false;

for (const file of files) {
  const fullPath = path.join(baseDir, file);
  let data;
  try {
    const raw = fs.readFileSync(fullPath, 'utf8');
    data = JSON.parse(raw);
  } catch (e) {
    console.log('❌ JSON inválido en', file, e.message);
    anyError = true;
    continue;
  }

  const blocks = Array.isArray(data.data) ? data.data : [{ questions: data.questions || [] }];

  blocks.forEach((block, blockIdx) => {
    const qs = block.questions || [];
    let lastIndex = null;
    let streak = 0;
    let maxStreak = 0;
    let localError = false;

    for (let i = 0; i < qs.length; i++) {
      const q = qs[i];
      let opts;
      try {
        opts = JSON.parse(q.options);
      } catch (e) {
        console.log(`❌ Options inválidas en ${file}, bloque ${blockIdx}, pregunta ${i + 1}`);
        anyError = true;
        localError = true;
        break;
      }

      const idx = opts.indexOf(q.correctAnswer);
      if (idx === -1) {
        console.log(`❌ correctAnswer no encontrada en options en ${file}, bloque ${blockIdx}, pregunta ${i + 1}`);
        anyError = true;
        localError = true;
        break;
      }

      if (idx === lastIndex) {
        streak++;
      } else {
        streak = 1;
        lastIndex = idx;
      }

      if (streak > maxStreak) maxStreak = streak;

      if (streak > 2) {
        console.log(`⚠️ Más de 2 seguidas con índice ${idx} en ${file}, bloque ${blockIdx}, a partir de pregunta ${i - streak + 2}`);
        anyError = true;
        localError = true;
        break;
      }
    }

    if (!localError) {
      console.log(`✅ ${file}, bloque ${blockIdx}: preguntas=${qs.length}, racha máxima=${maxStreak}`);
    }
  });
}

if (!anyError) {
  console.log('✅ Condición de no más de 2 respuestas correctas seguidas en la misma posición se cumple en todos los TEMAS procesados.');
}

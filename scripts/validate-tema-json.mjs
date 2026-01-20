#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

async function validateFile(filePath) {
  try {
    const raw = await fs.readFile(filePath, 'utf8');
    const json = JSON.parse(raw);

    if (typeof json.totalQuestions !== 'number') {
      throw new Error('totalQuestions debe ser un número');
    }
    if (!Array.isArray(json.data) || json.data.length === 0) {
      throw new Error('data debe ser un array no vacío');
    }

    const block = json.data[0];
    if (typeof block.questionnaireId !== 'string' || !block.questionnaireId) {
      throw new Error('data[0].questionnaireId debe ser un string no vacío');
    }
    if (typeof block.questionCount !== 'number') {
      throw new Error('data[0].questionCount debe ser un número');
    }
    if (!Array.isArray(block.questions)) {
      throw new Error('data[0].questions debe ser un array');
    }

    const { questionCount, questions } = block;
    if (questionCount !== questions.length) {
      throw new Error(`questionCount (${questionCount}) != questions.length (${questions.length})`);
    }
    if (json.totalQuestions !== questions.length) {
      throw new Error(`totalQuestions (${json.totalQuestions}) != questions.length (${questions.length})`);
    }

    questions.forEach((q, idx) => {
      const prefix = `Pregunta ${idx + 1}:`;
      if (typeof q.text !== 'string' || !q.text.trim()) {
        throw new Error(`${prefix} campo text vacío o no es string`);
      }
      if (typeof q.options !== 'string') {
        throw new Error(`${prefix} options debe ser un string (JSON.stringify del array)`);
      }
      // Comprobar que options es JSON válido y que incluye la respuesta correcta
      let opts;
      try {
        opts = JSON.parse(q.options);
      } catch {
        throw new Error(`${prefix} options no es JSON válido`);
      }
      if (!Array.isArray(opts) || opts.length < 2) {
        throw new Error(`${prefix} options debe ser array con al menos 2 elementos`);
      }
      if (typeof q.correctAnswer !== 'string' || !q.correctAnswer.trim()) {
        throw new Error(`${prefix} correctAnswer vacío o no es string`);
      }
      if (!opts.includes(q.correctAnswer)) {
        throw new Error(`${prefix} correctAnswer no coincide con ninguna opción`);
      }
    });

    console.log(`OK: ${filePath} -> ${questions.length} preguntas, questionnaireId=${block.questionnaireId}`);
  } catch (err) {
    console.error(`ERROR en ${filePath}:`, err.message || err);
    process.exitCode = 1;
  }
}

async function main() {
  const [, , ...files] = process.argv;
  if (!files.length) {
    console.error('Uso: node scripts/validate-tema-json.mjs <fichero1.json> [fichero2.json ...]');
    process.exit(1);
  }

  for (const f of files) {
    const p = path.resolve(process.cwd(), f);
    await validateFile(p);
  }
}

main();

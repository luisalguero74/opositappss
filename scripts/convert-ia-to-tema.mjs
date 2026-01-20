#!/usr/bin/env node

import fs from 'fs/promises';

async function main() {
  const [,, iaPath, outPath, temaCodigo, temaNumeroStr, temaParte, ...rest] = process.argv;

  if (!iaPath || !outPath || !temaCodigo || !temaNumeroStr || !temaParte || rest.length < 2) {
    console.error('Uso: node scripts/convert-ia-to-tema.mjs <ia-input.json> <tema-output.json> <temaCodigo> <temaNumero> <temaParte> <temaTitulo...> <questionnaireId>');
    process.exit(1);
  }

  const temaNumero = Number(temaNumeroStr);
  if (Number.isNaN(temaNumero)) {
    console.error('temaNumero debe ser un número.');
    process.exit(1);
  }

  const questionnaireId = rest.pop();
  const temaTitulo = rest.join(' ');

  try {
    const raw = await fs.readFile(iaPath, 'utf8');
    const parsed = JSON.parse(raw);

    const iaQuestions = Array.isArray(parsed) ? parsed : Array.isArray(parsed.questions) ? parsed.questions : null;
    if (!iaQuestions) {
      console.error('El JSON de entrada debe ser un array de preguntas o un objeto { "questions": [...] }');
      process.exit(1);
    }

    const letterToIndex = { A: 0, B: 1, C: 2, D: 3 };

    const questions = iaQuestions.map((q, idx) => {
      if (!q || typeof q !== 'object') {
        throw new Error(`Pregunta en posición ${idx} no es un objeto válido`);
      }

      const text = q.text || q.question;
      if (!text || !Array.isArray(q.options) || q.options.length < 2) {
        throw new Error(`Pregunta ${idx + 1}: faltan campos obligatorios (text/question u options[])`);
      }

      const options = q.options.map(String);
      const letter = String(q.correctAnswer || '').trim().toUpperCase();
      const correctIndex = letterToIndex[letter];

      if (correctIndex == null || correctIndex < 0 || correctIndex >= options.length) {
        throw new Error(`Pregunta ${idx + 1}: correctAnswer inválido (debe ser A, B, C o D y existir en options)`);
      }

      const correctAnswer = options[correctIndex];

      return {
        questionnaireId,
        text,
        options: JSON.stringify(options),
        correctAnswer,
        explanation: q.explanation || '',
        temaCodigo,
        temaNumero,
        temaParte,
        temaTitulo,
        difficulty: q.difficulty || 'media'
      };
    });

    const output = {
      totalQuestions: questions.length,
      totalQuestionnaires: 1,
      data: [
        {
          questionnaireId,
          questionCount: questions.length,
          questions
        }
      ]
    };

    await fs.writeFile(outPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
    console.log(`Generado fichero TEMA en: ${outPath} (preguntas: ${questions.length})`);
  } catch (err) {
    console.error('Error al convertir JSON de IA a formato TEMA:', err.message || err);
    process.exit(1);
  }
}

main();

import fs from 'fs';

const SOURCE = 'TEMA 02-ESPECÍFICO.json';
const TARGET = 'TEMA 02-ESPECÍFICO_PARTE 1.json';

const raw = fs.readFileSync(SOURCE, 'utf8');
const base = JSON.parse(raw);

const blocks = Array.isArray(base.data) ? base.data : [{ questions: base.questions || [] }];
if (!blocks.length) {
  throw new Error('No se han encontrado preguntas en ' + SOURCE);
}

const sourceBlock = blocks[0];
const sourceQuestions = sourceBlock.questions || [];

const sliceCount = 100;
const questions = sourceQuestions.slice(0, sliceCount).map(q => ({
  ...q,
  questionnaireId: 'tema02-cuestionario-01-aass-turno-libre-especifico-parte-1',
  temaTitulo: 'Tema 02 - Campo de aplicación del sistema de la Seguridad Social (Parte 1)'
}));

const output = {
  totalQuestions: questions.length,
  totalQuestionnaires: 1,
  data: [
    {
      questionnaireId: 'tema02-cuestionario-01-aass-turno-libre-especifico-parte-1',
      questionCount: questions.length,
      questions
    }
  ]
};

fs.writeFileSync(TARGET, JSON.stringify(output, null, 2), 'utf8');

console.log('✅ Generado', TARGET, 'con', questions.length, 'preguntas.');

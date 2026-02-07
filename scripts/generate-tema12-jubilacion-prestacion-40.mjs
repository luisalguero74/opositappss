#!/usr/bin/env node
/**
 * Generates 40 hard questions from the user-provided excerpt:
 * - RD 357/1991 (PNC invalidez/jubilación): arts. 5, 7, 9
 * - RD 8/2008 (prestación por razón de necesidad, retornados): arts. 1, 2, 3, 25
 * - IMSERSO "Guía resumen ... año 2025" (requirements/amounts/calculation rules)
 *
 * Output (repo root):
 *   TEMA 12_ESPECÍFICO PENSIÓN Y PRESTACIÓN DE JUBILACIÓN.JSON
 */

import fs from 'node:fs';

function fnv1a32(input) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function buildBalancedAnswerSequence(rand, total) {
  const letters = ['A', 'B', 'C', 'D'];
  if (total % letters.length !== 0) throw new Error(`total must be divisible by 4; got ${total}`);
  const per = total / letters.length;
  const counts = { A: per, B: per, C: per, D: per };

  const seq = [];
  function maxRunOk(next) {
    if (seq.length < 2) return true;
    const a = seq[seq.length - 1];
    const b = seq[seq.length - 2];
    return !(a === b && b === next);
  }

  function candidates() {
    const c = letters.filter((L) => counts[L] > 0 && maxRunOk(L));
    c.sort((x, y) => {
      const dx = counts[y] - counts[x];
      if (dx !== 0) return dx;
      return rand() < 0.5 ? -1 : 1;
    });
    return c;
  }

  function backtrack() {
    if (seq.length === total) return true;
    const cand = candidates();
    for (const L of cand) {
      seq.push(L);
      counts[L]--;
      if (backtrack()) return true;
      counts[L]++;
      seq.pop();
    }
    return false;
  }

  if (!backtrack()) throw new Error('Unable to build balanced answer sequence');

  const s = seq.join('');
  for (let p = 1; p <= 8; p++) {
    let ok = false;
    for (let i = p; i < s.length; i++) {
      if (s[i] !== s[i - p]) {
        ok = true;
        break;
      }
    }
    if (!ok) throw new Error(`Answer sequence appears periodic with period ${p}`);
  }

  return seq;
}

function swapToTargetLetter(options, correctIndex, targetLetter) {
  const targetIndex = { A: 0, B: 1, C: 2, D: 3 }[targetLetter];
  if (targetIndex == null) throw new Error(`Unknown targetLetter ${targetLetter}`);
  if (correctIndex === targetIndex) return { options, correctIndex };
  const opts = options.slice();
  [opts[correctIndex], opts[targetIndex]] = [opts[targetIndex], opts[correctIndex]];
  return { options: opts, correctIndex: targetIndex };
}

function validateQuestions(questions, expectedTotal) {
  if (!Array.isArray(questions)) throw new Error('questions must be an array');
  if (questions.length !== expectedTotal) {
    throw new Error(`Expected ${expectedTotal} questions, got ${questions.length}`);
  }

  const dist = { A: 0, B: 0, C: 0, D: 0 };
  const seq = [];

  const seenQuestions = new Set();
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q || typeof q !== 'object') throw new Error(`Question ${i} is not an object`);

    if (typeof q.question !== 'string' || q.question.trim().length < 10) {
      throw new Error(`Question ${i} invalid 'question'`);
    }
    const normalizedQ = q.question.trim().toLowerCase().replace(/\s+/g, ' ');
    if (seenQuestions.has(normalizedQ)) {
      throw new Error(`Question ${i} appears duplicated (same stem)`);
    }
    seenQuestions.add(normalizedQ);

    if (!Array.isArray(q.options) || q.options.length !== 4) {
      throw new Error(`Question ${i} must have 4 options`);
    }
    const optSet = new Set(q.options.map((s) => String(s).trim()));
    if (optSet.size !== 4) {
      throw new Error(`Question ${i} options must be unique`);
    }
    for (const opt of q.options) {
      if (typeof opt !== 'string' || opt.trim().length < 2) {
        throw new Error(`Question ${i} has invalid option`);
      }
    }

    if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
      throw new Error(`Question ${i} invalid correctAnswer ${q.correctAnswer}`);
    }
    dist[q.correctAnswer]++;
    seq.push(q.correctAnswer);

    if (typeof q.explanation !== 'string' || q.explanation.trim().length < 40) {
      throw new Error(`Question ${i} invalid explanation`);
    }

    const hasQuote = q.explanation.includes('"');
    if (!hasQuote) {
      throw new Error(`Question ${i} explanation must include a quoted literal fragment`);
    }

    const hasCitation =
    /\bart\./i.test(q.explanation) ||
      /\bart\u00edculo\b/i.test(q.explanation) ||
      /\bdisposici\u00f3n\b/i.test(q.explanation) ||
      /\bcap\u00edtulo\b/i.test(q.explanation) ||
      /\bapartado\b/i.test(q.explanation) ||
      /\bIMSERSO\b/i.test(q.explanation) ||
      /Gu\u00eda resumen/i.test(q.explanation);
    if (!hasCitation) {
      throw new Error(`Question ${i} explanation must cite an article/disposición`);
    }

    if (q.difficulty !== 'hard') {
      throw new Error(`Question ${i} difficulty must be 'hard'`);
    }
  }

  const per = expectedTotal / 4;
  for (const L of ['A', 'B', 'C', 'D']) {
    if (dist[L] !== per) throw new Error(`Distribution not balanced: ${L}=${dist[L]} (expected ${per})`);
  }

  let maxRun = 1;
  let run = 1;
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] === seq[i - 1]) run++;
    else run = 1;
    maxRun = Math.max(maxRun, run);
  }
  if (maxRun > 2) throw new Error(`Max run too high: ${maxRun}`);

  return { dist, maxRun, seqStart: seq.join('').slice(0, 32) };
}

const OUT_FILE = 'TEMA 12_ESPECÍFICO PENSIÓN Y PRESTACIÓN DE JUBILACIÓN.JSON';
const TOTAL = 40;

const seed = fnv1a32(OUT_FILE);
const rand = mulberry32(seed);

const raw = [];
function add({ question, correct, distractors, explanation, difficulty = 'hard' }) {
  if (!Array.isArray(distractors) || distractors.length !== 3) {
    throw new Error('distractors must have length 3');
  }
  raw.push({
    question,
    options: [correct, ...distractors],
    correctIndex: 0,
    explanation,
    difficulty,
  });
}

add({
  question:
    'Según el art. 3.2 del RD 8/2008, ¿qué bien se exceptúa expresamente del límite del art. 3.1.e)?',
  correct: 'La vivienda habitualmente ocupada por el solicitante.',
  distractors: [
    'Cualquier segunda residencia propiedad del solicitante.',
    'Cualquier inmueble heredado, aunque no se ocupe.',
    'Los bienes muebles de lujo, siempre.',
  ],
  explanation:
    'El art. 3.2 RD 8/2008 exceptúa del apartado e) "la vivienda habitualmente ocupada" por el solicitante. Las otras opciones no aparecen en la excepción.',
});

add({
  question:
    'Conforme al art. 25.1.b) del RD 8/2008, ¿qué requisito de residencia en España se exige a los españoles de origen no nacidos en España para la pensión asistencial por ancianidad para retornados?',
  correct:
    'Acreditar un periodo de residencia en España de 8 años previo a la solicitud, manteniendo la nacionalidad española durante todo ese período.',
  distractors: [
    'Acreditar 10 años de residencia en España con nacionalidad española solo el último año.',
    'Acreditar 5 años de residencia en España, sin necesidad de nacionalidad.',
    'Acreditar 8 años de residencia en cualquier país, sin exigencia de nacionalidad.',
  ],
  explanation:
    'El art. 25.1.b) RD 8/2008 exige "8 años" de residencia previa en España y ostentar "durante todo ese período" la nacionalidad española. Las otras opciones cambian requisitos.',
});

add({
  question:
    'Según el art. 25.4 del RD 8/2008, ¿qué órgano asume la instrucción, reconocimiento y pago de las pensiones asistenciales por ancianidad para retornados?',
  correct: 'La Dirección General de Emigración.',
  distractors: [
    'El Instituto Nacional de la Seguridad Social (INSS).',
    'El IMSERSO, como entidad gestora única.',
    'La Tesorería General de la Seguridad Social (TGSS).',
  ],
  explanation:
    'El art. 25.4 RD 8/2008 dispone que "Corresponde a la Dirección General de Emigración la instrucción, reconocimiento y pago". Las otras opciones citan organismos no designados en ese artículo.',
});

add({
  question:
    'Conforme al art. 25.5 del RD 8/2008, ¿a qué cuantía se equipara la pensión asistencial por ancianidad para retornados?',
  correct:
    'A la que fije la Ley de Presupuestos Generales del Estado para la pensión de jubilación no contributiva del sistema español, en cómputo anual y 12 mensualidades.',
  distractors: [
    'A una cuantía fija establecida en el propio RD 8/2008 para todos los años.',
    'A la cuantía del ingreso mínimo vital para un adulto solo.',
    'A la cuantía de una pensión contributiva mínima con cónyuge a cargo.',
  ],
  explanation:
    'El art. 25.5 RD 8/2008 indica que la cuantía será la que se fije en la Ley de PGE para la pensión de jubilación no contributiva, "referida a 12 mensualidades". Las otras opciones no siguen el mandato del artículo.',
});

add({
  question:
    'Según el art. 25.7 del RD 8/2008, ¿a qué año se refieren los ingresos que deben declarar los solicitantes en la solicitud inicial y en la fe de vida/declaración de ingresos?',
  correct: 'Al año en que se presenten las solicitudes o las renovaciones.',
  distractors: [
    'Al ejercicio anterior al de la solicitud, necesariamente.',
    'A los últimos tres años naturales completos.',
    'Al mes inmediatamente anterior a la solicitud.',
  ],
  explanation:
    'El art. 25.7 RD 8/2008 establece que los ingresos a declarar "se referirán al año en que se presenten" las solicitudes o renovaciones. Las demás opciones cambian el periodo de referencia.',
});

add({
  question:
    'Conforme al art. 25.7 del RD 8/2008, ¿qué ingresos no se considerarán imputables a estos efectos?',
  correct:
    'Los derivados de subsidio de desempleo para retornados, FONAS, ayudas autonómicas y cualquier otra prestación asistencial percibida por el solicitante.',
  distractors: [
    'Las pensiones contributivas de jubilación, siempre.',
    'Los ingresos del trabajo por cuenta ajena, siempre.',
    'Los rendimientos del capital mobiliario, siempre.',
  ],
  explanation:
    'El art. 25.7 RD 8/2008 indica que "no se considerarán ingresos imputables" los derivados de subsidio de desempleo para retornados, "FONAS", ayudas de CCAA y otras prestaciones asistenciales. Las otras opciones no están en esa lista.',
});

add({
  question:
    'Según el art. 25.8.b) del RD 8/2008, ¿cuál es el límite de ausencias de España que puede extinguir el derecho de los retornados, salvo enfermedad justificada?',
  correct: 'Más de noventa días a lo largo de cada año natural.',
  distractors: [
    'Más de treinta días a lo largo de cada año natural.',
    'Más de ciento ochenta días a lo largo de cada año natural.',
    'Cualquier ausencia, aunque sea de un día.',
  ],
  explanation:
    'El art. 25.8.b) RD 8/2008 prevé extinción por traslado fuera de España por tiempo superior a "noventa días" por año natural, salvo enfermedad justificada. Las otras opciones cambian el umbral.',
});

add({
  question:
    'Conforme al art. 25.8.d) del RD 8/2008, ¿qué incumplimiento documental puede extinguir el derecho?',
  correct:
    'No presentar la fe de vida y declaración de rentas o ingresos en el plazo establecido en el art. 13.2 del RD 8/2008.',
  distractors: [
    'No presentar la solicitud en el consulado en un plazo de 10 días.',
    'No aportar un certificado médico anual, en todo caso.',
    'No aportar el padrón municipal español del último año.',
  ],
  explanation:
    'El art. 25.8.d) RD 8/2008 fija como causa la falta de "fe de vida y declaración" en el plazo del "artículo 13.2". Las otras opciones inventan obligaciones distintas.',
});

add({
  question:
    'Según el art. 25.8 (párrafo final) del RD 8/2008, ¿qué consecuencia específica se establece si se comprueba ocultación de datos o falsedad documental?',
  correct: 'El derecho quedará extinguido definitivamente.',
  distractors: [
    'El derecho se suspende por un mes y luego se reanuda automáticamente.',
    'El derecho se reduce al 25% de la cuantía, pero no se extingue.',
    'El derecho se mantiene, pero con obligación de devolución voluntaria.',
  ],
  explanation:
    'El art. 25.8 señala: "Cuando se compruebe fehacientemente ... ocultación de datos o falsedad documental ... el derecho quedará extinguido definitivamente". Las otras opciones no están previstas.',
});

// IMSERSO Guía resumen PNC 2025 (requirements/amounts/calculation) — as included in the prompt
add({
  question:
    'Según la Guía resumen PNC 2025 (IMSERSO), ¿qué requisito de residencia se exige para la pensión no contributiva de invalidez?',
  correct:
    'Residir legalmente en territorio español y haberlo hecho durante 5 años, de los cuales 2 serán inmediatamente anteriores a la solicitud.',
  distractors: [
    'Residir legalmente en territorio español durante 10 años, de los cuales 2 inmediatamente anteriores.',
    'Residir legalmente en territorio español durante 1 año inmediatamente anterior.',
    'Residir en cualquier país de la UE durante 5 años.',
  ],
  explanation:
    'La Guía resumen PNC 2025, apartado "Invalidez – REQUISITOS", exige "Residir legalmente en territorio español" durante "5 años" y que "dos" sean inmediatamente anteriores. Las otras opciones confunden con jubilación (10 años) o reducen el plazo.',
});

add({
  question:
    'Conforme a la Guía resumen PNC 2025, ¿qué requisito de edad se exige para la pensión no contributiva de jubilación?',
  correct: 'Ser mayor de 65 años en la fecha de la solicitud.',
  distractors: ['Ser mayor de 60 años en la fecha de la solicitud.', 'Ser mayor de 18 años y menor de 65.', 'No existe requisito de edad.'],
  explanation:
    'La Guía resumen PNC 2025, apartado "Jubilación – REQUISITOS", establece: "Ser mayor de 65 años" en la fecha de solicitud. Las demás opciones no coinciden con el requisito.',
});

add({
  question:
    'Según la Guía resumen PNC 2025, ¿cuál es la cuantía íntegra anual de la pensión no contributiva (jubilación e invalidez) en 2025?',
  correct: '7.905,80 € anuales.',
  distractors: ['5.538,00 € anuales.', '15.105,80 € anuales.', '1.976,45 € anuales.'],
  explanation:
    'La Guía resumen PNC 2025, cuadro "Cuantías Anual Mensual", fija la cuantía "ÍNTEGRA 7.905,80". Las demás cifras corresponden a otros conceptos (p. ej., 1.976,45 es el mínimo del 25%).',
});

add({
  question:
    'Conforme a la Guía resumen PNC 2025, ¿qué porcentaje del importe anual de la pensión representa el mínimo garantizado tras reducciones por rentas?',
  correct: 'El 25 por 100 del importe anual fijado (mínimo del 25%).',
  distractors: ['El 10 por 100.', 'El 35 por 100.', 'El 70 por 100.'],
  explanation:
    'En la Guía resumen PNC 2025, apartado "CÁLCULO DE LAS CUANTÍAS", se indica que si el resultado fuera inferior al "25 por 100", la pensión a reconocer es como mínimo "el 25 por 100". Las otras opciones son porcentajes utilizados en reglas distintas o inexistentes.',
});

add({
  question:
    'Según la Guía resumen PNC 2025, ¿qué umbral de ingresos personales activa la reducción por rentas (beneficiario no integrado en unidad económica)?',
  correct: 'Ingresos personales anuales superiores al 35% del importe anual fijado (2.767,03 €).',
  distractors: [
    'Ingresos personales superiores al 25% del importe anual fijado (1.976,45 €).',
    'Ingresos personales superiores al 70% del importe anual fijado (5.534,06 €).',
    'Cualquier ingreso personal, aunque sea 1 euro.',
  ],
  explanation:
    'La Guía resumen PNC 2025, apartado "CÁLCULO DE LAS CUANTÍAS", dice que si dispone de rentas superiores al "35 por 100" ("2.767,03 €"), se reduce en el exceso. Las otras opciones confunden mínimos o factores de cálculo.',
});

add({
  question:
    'Conforme a la Guía resumen PNC 2025, ¿cuál es la cuantía anual del complemento por necesidad de otra persona en invalidez no contributiva?',
  correct: '3.952,90 € anuales.',
  distractors: ['1.976,45 € anuales.', '5.805,60 € anuales.', '7.905,80 € anuales.'],
  explanation:
    'La Guía resumen PNC 2025, cuadro "Cuantías Anual Mensual", incluye "COMPLEMENTO NECESIDAD OTRA PERSONA 3.952,90". Las otras cifras corresponden a mínimos o a otras prestaciones.',
});

add({
  question:
    'Según la Guía resumen PNC 2025, ¿en qué supuesto se presume un grado de discapacidad igual al 65% solo a efectos de la pensión de invalidez no contributiva?',
  correct:
    'Entre otros, quienes tengan reconocida una incapacidad permanente absoluta (además de otros supuestos listados).',
  distractors: [
    'Cualquier persona con incapacidad permanente total.',
    'Cualquier persona con una discapacidad inferior al 33%.',
    'Cualquier persona mayor de 65 años.',
  ],
  explanation:
    'La Guía resumen PNC 2025, apartado "(*)", señala que se presume el 65% a quienes tengan reconocida "Una incapacidad permanente absoluta" (y otros casos). Las otras opciones no figuran en la lista.',
});

add({
  question:
    'Conforme a la Guía resumen PNC 2025, ¿qué condición se presume para un grado de discapacidad igual al 75% y necesidad de concurso de otra persona?',
  correct: 'Tener reconocida una incapacidad permanente en grado de gran invalidez.',
  distractors: [
    'Tener reconocida una incapacidad permanente parcial.',
    'Tener reconocida una incapacidad permanente total.',
    'Tener reconocida una incapacidad permanente absoluta sin más.',
  ],
  explanation:
    'La Guía resumen PNC 2025 indica que se presume 75% y necesidad de concurso "a quienes tuvieran reconocida ... gran invalidez". Las otras opciones no equivalen a esa presunción en el texto.',
});

add({
  question:
    'Según la Guía resumen PNC 2025 (carencia de rentas), ¿cuándo se entiende cumplido el requisito de carencia si el solicitante está integrado en una unidad económica?',
  correct:
    'Solo si la suma anual de rentas/ingresos de todos los miembros de la unidad económica no supera el límite de acumulación aplicable según número de convivientes.',
  distractors: [
    'Siempre que el solicitante no supere el límite personal, sin atender a la unidad.',
    'Siempre que la unidad económica supere el límite, para demostrar necesidad.',
    'Solo si existe parentesco hasta cuarto grado.',
  ],
  explanation:
    'La Guía resumen PNC 2025, apartado "CARENCIA DE RENTAS O INGRESOS", exige que la suma anual de la unidad "no supera el límite de acumulación" aplicable. Las otras opciones ignoran el cómputo conjunto o inventan parentescos.',
});

add({
  question:
    'Conforme a la Guía resumen PNC 2025, ¿qué parentesco delimita la “unidad económica” cuando hay convivencia del beneficiario con otras personas?',
  correct: 'Matrimonio o parentesco por consanguinidad o adopción hasta el segundo grado.',
  distractors: [
    'Solo convivencia con cónyuge, excluyendo parentesco.',
    'Parentesco por consanguinidad hasta el cuarto grado.',
    'Cualquier convivencia sin parentesco ni vínculo.',
  ],
  explanation:
    'La Guía resumen PNC 2025 define unidad económica en convivencia por matrimonio o parentesco "hasta el segundo grado" (consanguinidad o adopción). Las otras opciones amplían o restringen indebidamente.',
});

add({
  question:
    'Según la Guía resumen PNC 2025 (límite de acumulación), ¿cómo se expresa la regla de cálculo base para la unidad económica?',
  correct: 'C + [0,7·C·(m−1)], donde C es la cuantía anual y m el número de personas en la unidad.',
  distractors: [
    'C + [0,35·C·(m−1)].',
    'C + [2,5·C·(m−1)].',
    '0,7·C + (m−1).',
  ],
  explanation:
    'En la Guía resumen PNC 2025 aparece la regla "C+[0,7 C(m−1)]" para límites de acumulación. Las otras fórmulas cambian el coeficiente o la estructura.',
});

add({
  question:
    'Conforme a la Guía resumen PNC 2025, ¿qué incremento se aplica al límite de acumulación cuando conviven solicitante y descendientes o ascendientes en primer grado?',
  correct: 'Se incrementa en dos veces y media (×2,5).',
  distractors: ['Se incrementa en 0,7 (×0,7).', 'Se incrementa en 1,5 (×1,5).', 'No se incrementa: se mantiene igual.'],
  explanation:
    'La Guía resumen PNC 2025 indica que si la convivencia es con ascendientes/descendientes de primer grado, el límite "se incrementa en dos veces y media" ("x 2,5"). Las otras opciones no coinciden con el texto.',
});

add({
  question:
    'Según la Guía resumen PNC 2025, ¿qué ocurre con el límite de acumulación de recursos cuando el solicitante de invalidez no contributiva reúne requisitos para el complemento de tercera persona?',
  correct:
    'Se toma como C la cuantía anual incrementada con el 50% de esa cuantía (C incrementada con el 50 por 100).',
  distractors: [
    'Se reduce C al 25% para calcular el límite.',
    'Se sustituye C por el IPREM anual.',
    'Se elimina cualquier límite de acumulación.',
  ],
  explanation:
    'La Guía resumen PNC 2025 señala que, para el complemento, "C" es la cuantía anual "incrementada con el 50 por 100 de esa cuantía". Las otras opciones no figuran en el apartado.',
});

add({
  question:
    'Conforme a la Guía resumen PNC 2025, ¿cuál es la condición para compatibilizar pensión de invalidez no contributiva con actividad laboral durante un plazo máximo?',
  correct:
    'Que, durante un máximo de cuatro años, la suma anual de la pensión reconocida y los ingresos anuales de la actividad no superen 15.105,80 €.',
  distractors: [
    'Que la suma anual no supere 7.905,80 €.',
    'Que la compatibilidad sea indefinida sin límite temporal.',
    'Que la suma anual no supere 5.538,00 €.',
  ],
  explanation:
    'La Guía resumen PNC 2025, apartado "Beneficiario de pensión de invalidez que inicie una actividad laboral", permite compatibilizar "durante un plazo máximo de cuatro años" si no superan "15.105,80 €". Las otras opciones cambian el límite o el plazo.',
});

add({
  question:
    'Según la Guía resumen PNC 2025, ¿en qué supuesto se suspende el derecho a la pensión de invalidez no contributiva por razón de la actividad laboral iniciada?',
  correct: 'Cuando los ingresos derivados de la actividad laboral sean iguales o superiores a 15.105,80 € (en 2025).',
  distractors: [
    'Cuando los ingresos sean inferiores a 15.105,80 €.',
    'Cuando los ingresos sean inferiores al 35% de la pensión anual.',
    'Cuando el beneficiario sea mayor de 65 años.',
  ],
  explanation:
    'La Guía resumen PNC 2025 indica: "No podrá compatibilizarse y el derecho a la pensión se suspenderá" cuando los ingresos de la actividad sean "iguales o superiores a 15.105,80 euros". Las otras opciones no activan esa suspensión según el texto.',
});

add({
  question:
    'Conforme a la Guía resumen PNC 2025, ¿qué efecto tiene el cese en la actividad laboral sobre el derecho a la pensión de invalidez no contributiva cuando se venía compatibilizando?',
  correct:
    'El pensionista recuperará el derecho a la pensión y no se tendrán en cuenta los ingresos de la actividad para acreditar el mantenimiento de la carencia de rentas.',
  distractors: [
    'El pensionista pierde definitivamente el derecho por haber trabajado.',
    'El pensionista solo recupera el derecho si transcurren cinco años.',
    'El pensionista recupera el derecho pero se computan siempre los ingresos laborales para carencia de rentas.',
  ],
  explanation:
    'La Guía resumen PNC 2025 dice: "El pensionista recuperará el derecho" al cesar, y "sin que se tengan en cuenta" los ingresos de la actividad para el mantenimiento de carencia. Las otras opciones contradicen literalmente el apartado.',
});

// Fill to 40 with additional hard cross-text questions
add({
  question:
    'Comparando el art. 7.a) y el art. 9.a) del RD 357/1991, ¿qué elemento común aparece como causa de extinción tanto en invalidez como en jubilación no contributivas?',
  correct:
    'La pérdida de la condición de residente legal o el traslado de la residencia fuera de territorio español por tiempo superior al límite del art. 10.2 del RD 357/1991.',
  distractors: [
    'La mejoría del grado de minusvalía por debajo del 65% en ambos casos.',
    'La no presentación de fe de vida en plazo del art. 13.2 del RD 357/1991.',
    'La pertenencia a institutos u órdenes obligados a prestar asistencia.',
  ],
  explanation:
    'Tanto el art. 7.a) como el art. 9.a) RD 357/1991 incluyen la "pérdida de su condición de residente legal" o traslado fuera de España por tiempo superior al límite del "artículo 10". Las otras opciones o no están en ambos artículos o pertenecen a otro real decreto.',
});

add({
  question:
    'Según el art. 3.1.f) del RD 8/2008, ¿qué requisito se establece respecto de donaciones previas a la solicitud?',
  correct:
    'No haber donado bienes en los cinco años anteriores por un valor patrimonial superior al de la base cálculo correspondiente al país de residencia.',
  distractors: [
    'No haber donado bienes en los dos años anteriores, en cualquier cuantía.',
    'No haber donado bienes en los diez años anteriores por cualquier valor.',
    'No haber vendido bienes en los cinco años anteriores, en cualquier caso.',
  ],
  explanation:
    'El art. 3.1.f) RD 8/2008 exige "No haber donado bienes en los cinco años anteriores" por valor superior a la base cálculo. Las otras opciones cambian plazo o confunden donación con venta.',
});

add({
  question:
    'Conforme al art. 3.2 del RD 8/2008, ¿qué excepción se establece respecto de la donación de la vivienda habitualmente ocupada?',
  correct:
    'No se aplica la prohibición del art. 3.1.f) si la vivienda habitual fue donada con reserva de usufructo total y vitalicio y es el único bien inmueble que posee.',
  distractors: [
    'Se exceptúa cualquier donación de vivienda, aunque no sea habitual ni exista usufructo.',
    'Se exceptúa la donación de cualquier inmueble si hay menores a cargo.',
    'No existe ninguna excepción para la vivienda habitual donada.',
  ],
  explanation:
    'El art. 3.2 RD 8/2008 exceptúa del apartado f) la vivienda habitual "donada con reserva de usufructo total y vitalicio" si es el "único" inmueble. Las otras opciones amplían o niegan la excepción.',
});

add({
  question:
    'Según el art. 25.2 del RD 8/2008, ¿qué requisitos se exigen para reconocer la pensión asistencial por ancianidad a retornados, además de los propios del real decreto?',
  correct:
    'Acreditar los requisitos del art. 167 del TRLGSS 1994 para la jubilación no contributiva, salvo los periodos de residencia en territorio español.',
  distractors: [
    'Acreditar los requisitos del art. 41 de la Constitución Española.',
    'Acreditar los requisitos del art. 129 de la LGSS sobre efectos económicos.',
    'Acreditar los requisitos del art. 44 LGSS sobre embargos.',
  ],
  explanation:
    'El art. 25.2 RD 8/2008 remite al "artículo 167" del TRLGSS 1994 para la jubilación no contributiva, "salvo" el requisito de residencia en España. Las otras referencias no son las citadas en ese apartado.',
});

add({
  question:
    'Conforme a la Guía resumen PNC 2025 (jubilación), ¿qué requisito de residencia se exige entre los 16 años y la edad de devengo?',
  correct:
    'Residir legalmente en España durante 10 años entre los 16 y la edad de devengo, y que 2 años sean consecutivos e inmediatamente anteriores a la solicitud.',
  distractors: [
    'Residir 5 años en España, y 2 inmediatamente anteriores.',
    'Residir 10 años en España, sin necesidad de que 2 sean consecutivos e inmediatos.',
    'Residir 8 años en España, y 2 inmediatamente anteriores.',
  ],
  explanation:
    'La Guía resumen PNC 2025, apartado "Jubilación – REQUISITOS", exige "10 años" entre los 16 y devengo, y que "dos" sean "consecutivos e inmediatamente anteriores". Las otras opciones alteran el texto.',
});

add({
  question:
    'Según la Guía resumen PNC 2025, ¿qué ocurre si, tras aplicar reducciones por rentas (y, en su caso, por límite de acumulación), el resultado de la pensión queda por debajo del mínimo legal?',
  correct:
    'Se reconoce como mínimo el 25% del importe anual fijado para la pensión no contributiva.',
  distractors: [
    'Se extingue el derecho automáticamente.',
    'Se reconoce un mínimo del 35% del importe anual.',
    'Se reconoce un mínimo del 70% del importe anual.',
  ],
  explanation:
    'La Guía resumen PNC 2025 repite la garantía: si el resultado es inferior al "25 por 100", se reconoce como mínimo ese "25 por 100". Las otras opciones no se contemplan en el apartado.',
});

add({
  question:
    'Conforme a la Guía resumen PNC 2025 (más de un beneficiario), ¿qué variable representa el número de beneficiarios con derecho a pensión en la fórmula Cn = [C + (0,7·C·(m−1))] / n?',
  correct: 'n (número de beneficiarios con derecho a pensión en la unidad económica).',
  distractors: [
    'm (número total de personas convivientes, con o sin derecho).',
    'C (importe mensual de la pensión).',
    'Cn (límite de acumulación total de recursos).',
  ],
  explanation:
    'La Guía resumen PNC 2025 define: "Cn = Cuantía Individual; C = Importe anual de la pensión; n = Número de beneficiarios". Las otras opciones confunden variables del propio cuadro.',
});

add({
  question:
    'Según el art. 25.3 del RD 8/2008, ¿dónde pueden presentarse las solicitudes de estas pensiones asistenciales por ancianidad para retornados?',
  correct:
    'En la Dirección General de Emigración y en cualquiera de los registros u oficinas a que se refiere el art. 38 de la Ley 30/1992.',
  distractors: [
    'Solo en el INSS del domicilio del interesado.',
    'Solo en la consejería autonómica competente en servicios sociales.',
    'Exclusivamente en el consulado español del país de residencia.',
  ],
  explanation:
    'El art. 25.3 RD 8/2008 permite presentar solicitudes en la "Dirección General de Emigración" y en registros del "artículo 38" de la Ley 30/1992. Las otras opciones restringen indebidamente el lugar de presentación.',
});

add({
  question:
    'Conforme al art. 25.8.e) del RD 8/2008, ¿qué concurrencia de protección pública puede extinguir el derecho a la pensión asistencial de retornados?',
  correct:
    'Reunir los requisitos para alcanzar derecho a una pensión del sistema de Seguridad Social u otra pensión pública, prestación o subsidio de cualquier Administración Pública.',
  distractors: [
    'Percibir cualquier ayuda asistencial autonómica, en todo caso.',
    'Percibir el subsidio de desempleo para retornados.',
    'Percibir FONAS.',
  ],
  explanation:
    'El art. 25.8.e) RD 8/2008 prevé extinción si se reúnen requisitos para pensión del sistema u "otra pensión pública, prestación o subsidio". El art. 25.7, además, dice que subsidio retornados/FONAS no se consideran ingresos imputables, por lo que no son causa automática como en los distractores.',
});

add({
  question:
    'Según el art. 7.d) y el art. 9.c) del RD 357/1991, ¿qué causa de extinción aparece en ambos regímenes no contributivos?',
  correct: 'El fallecimiento del beneficiario.',
  distractors: [
    'La variación de factores sociales complementarios.',
    'El error de diagnóstico o baremo.',
    'La no presentación de fe de vida y declaración de ingresos.',
  ],
  explanation:
    'El art. 7.d) y el art. 9.c) RD 357/1991 incluyen expresamente el "Fallecimiento del beneficiario". Las otras opciones corresponden a revisiones (art. 5) o a RD 8/2008, no a estas causas de extinción.',
});

add({
  question:
    'Conforme a la Guía resumen PNC 2025, ¿cuál es la cuantía mensual íntegra de la pensión no contributiva (jubilación e invalidez) en 2025?',
  correct: '564,70 € mensuales.',
  distractors: ['658,81 € mensuales.', '141,18 € mensuales.', '847,05 € mensuales.'],
  explanation:
    'La Guía resumen PNC 2025 indica "ÍNTEGRA 564,70" mensual. 658,81 corresponde al IMV de un adulto solo en el cuadro; 141,18 es el mínimo del 25%; 847,05 es la íntegra incrementada con complemento de tercera persona. ',
});

add({
  question:
    'Según la Guía resumen PNC 2025, ¿qué cuantía mensual corresponde al mínimo del 25% de la pensión no contributiva en 2025?',
  correct: '141,18 € mensuales.',
  distractors: ['282,35 € mensuales.', '480,00 € mensuales.', '525,00 € mensuales.'],
  explanation:
    'En la Guía resumen PNC 2025, el cuadro de cuantías fija "MÍNIMO DEL 25% ... 141,18" mensual. 282,35 es el complemento de tercera persona mensual; 480,00 es una cuantía individual de ejemplo con 2 beneficiarios; 525,00 es el complemento por alquiler de PNC (otra línea).',
});

add({
  question:
    'Conforme a la Guía resumen PNC 2025, ¿cuál es el criterio para reducir la cuantía anual cuando los ingresos personales exceden el umbral del 35%?',
  correct:
    'Se reduce en un importe igual a la cantidad en que los ingresos personales anuales excedan de dicho porcentaje.',
  distractors: [
    'Se reduce siempre al 25% con independencia del exceso.',
    'Se reduce en el 35% exacto de la pensión anual, automáticamente.',
    'Se reduce en el 70% de los ingresos personales.',
  ],
  explanation:
    'La Guía resumen PNC 2025, en "CÁLCULO DE LAS CUANTÍAS", indica que la pensión "se reduce en un importe igual a la cantidad" en que los ingresos excedan del umbral del 35%. Las otras opciones aplican reducciones fijas o fórmulas no previstas.',
});

add({
  question:
    'Según el art. 1 del RD 8/2008, ¿qué doble anclaje normativo se menciona para la prestación por razón de necesidad (además de regularse por el real decreto)?',
  correct:
    'Que está contemplada en el art. 19 de la Ley 40/2006 y amparada en el apartado 4 del art. 7 del TRLGSS 1994 (RDL 1/1994).',
  distractors: [
    'Que está contemplada en el art. 41 de la Constitución y amparada en el art. 129 LGSS.',
    'Que está contemplada en la Ley 26/1990 y amparada en el art. 44 LGSS.',
    'Que está contemplada en la Ley 30/1992 y amparada en el art. 38 de dicha ley.',
  ],
  explanation:
    'El art. 1 RD 8/2008 menciona el "artículo 19 de la Ley 40/2006" y que está amparada en el "apartado 4 del artículo 7" del TRLGSS 1994 (RDL 1/1994). Las otras opciones mezclan normas ajenas o artículos no citados.',
});

add({
  question:
    'Conforme al art. 25.6 del RD 8/2008, ¿cómo se determinan los efectos económicos de las pensiones asistenciales reguladas en el art. 25?',
  correct: 'Se producen en los términos establecidos en el art. 10 del RD 8/2008.',
  distractors: [
    'Se producen desde el día siguiente a la solicitud, sin remisión.',
    'Se producen desde el 1 de enero del año siguiente a la solicitud.',
    'Se producen conforme al art. 5.5 del RD 357/1991.',
  ],
  explanation:
    'El art. 25.6 RD 8/2008 dice que los efectos económicos "se producirán en los términos establecidos en el artículo 10" del propio real decreto. Las otras opciones introducen reglas o remisiones incorrectas.',
});

if (raw.length !== TOTAL) {
  throw new Error(`Internal error: expected raw length ${TOTAL}, got ${raw.length}`);
}

shuffleInPlace(raw, rand);
const targetSeq = buildBalancedAnswerSequence(rand, TOTAL);

const questions = raw.map((q, idx) => {
  const targetLetter = targetSeq[idx];
  const swapped = swapToTargetLetter(q.options, q.correctIndex, targetLetter);
  return {
    question: q.question,
    options: swapped.options,
    correctAnswer: targetLetter,
    explanation: q.explanation,
    difficulty: q.difficulty,
  };
});

const { dist, maxRun, seqStart } = validateQuestions(questions, TOTAL);
fs.writeFileSync(OUT_FILE, JSON.stringify({ questions }, null, 2) + '\n', 'utf8');
console.log(`OK ${OUT_FILE} count=${questions.length} dist=${JSON.stringify(dist)} maxRun=${maxRun} seqStart=${seqStart}`);

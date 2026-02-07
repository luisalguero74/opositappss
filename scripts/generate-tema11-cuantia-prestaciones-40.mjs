#!/usr/bin/env node
/**
 * Generates 40 hard test questions strictly from the provided legal text:
 * Decreto 3158/1966 (cuantía prestaciones). Output:
 *   TEMA 11_CUANTÍA PRESTACIONES.JSON
 */

import fs from "node:fs";
import path from "node:path";

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

function buildBalancedAnswerSequence(rand, total = 40) {
  const letters = ["A", "B", "C", "D"];
  const per = total / letters.length;
  const counts = { A: per, B: per, C: per, D: per };

  /**
   * Greedy build with backtracking if needed. Hard constraints:
   * - exact counts
   * - max run length <= 2
   */
  const seq = [];
  function maxRunOk(next) {
    if (seq.length < 2) return true;
    const a = seq[seq.length - 1];
    const b = seq[seq.length - 2];
    return !(a === b && b === next);
  }

  function candidates() {
    const c = letters.filter((L) => counts[L] > 0 && maxRunOk(L));
    // Weighted by remaining count + random tie-break
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

  if (!backtrack()) {
    throw new Error("Unable to build balanced A/B/C/D sequence with maxRun<=2");
  }

  // Anti-periodic sanity: avoid simple repeating patterns (period 1..8)
  const s = seq.join("");
  for (let p = 1; p <= 8; p++) {
    let ok = false;
    for (let i = p; i < s.length; i++) {
      if (s[i] !== s[i - p]) {
        ok = true;
        break;
      }
    }
    if (!ok) {
      throw new Error(`Answer sequence appears periodic with period ${p}`);
    }
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

function validateQuestions(questions) {
  if (!Array.isArray(questions)) throw new Error("questions must be an array");
  if (questions.length !== 40) throw new Error(`Expected 40 questions, got ${questions.length}`);

  const dist = { A: 0, B: 0, C: 0, D: 0 };
  const seq = [];

  const seenQuestions = new Set();
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q || typeof q !== "object") throw new Error(`Question ${i} is not an object`);

    if (typeof q.question !== "string" || q.question.trim().length < 10) {
      throw new Error(`Question ${i} invalid 'question'`);
    }
    const normalizedQ = q.question.trim().toLowerCase().replace(/\s+/g, " ");
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
      if (typeof opt !== "string" || opt.trim().length < 2) {
        throw new Error(`Question ${i} has invalid option`);
      }
    }

    if (!["A", "B", "C", "D"].includes(q.correctAnswer)) {
      throw new Error(`Question ${i} invalid correctAnswer ${q.correctAnswer}`);
    }
    dist[q.correctAnswer]++;
    seq.push(q.correctAnswer);

    if (typeof q.explanation !== "string" || q.explanation.trim().length < 40) {
      throw new Error(`Question ${i} invalid explanation`);
    }

    const hasQuote = q.explanation.includes('"');
    if (!hasQuote) {
      throw new Error(`Question ${i} explanation must include a quoted literal fragment`);
    }

    const hasCitation = /\bart\./i.test(q.explanation) || /\bdisposici\u00f3n\b/i.test(q.explanation) || /\bdisp\./i.test(q.explanation);
    if (!hasCitation) {
      throw new Error(`Question ${i} explanation must cite an article or disposición`);
    }

    if (q.difficulty !== "hard") {
      throw new Error(`Question ${i} difficulty must be 'hard'`);
    }
  }

  // Balanced distribution: 10 each
  for (const L of ["A", "B", "C", "D"]) {
    if (dist[L] !== 10) throw new Error(`Distribution not balanced: ${L}=${dist[L]}`);
  }

  // Max run <= 2
  let maxRun = 1;
  let run = 1;
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] === seq[i - 1]) run++;
    else run = 1;
    maxRun = Math.max(maxRun, run);
  }
  if (maxRun > 2) throw new Error(`Max run too high: ${maxRun}`);

  return { dist, maxRun, seqStart: seq.join("").slice(0, 24) };
}

const OUT_FILE = "TEMA 11_CUANTÍA PRESTACIONES.JSON";
const seed = fnv1a32(OUT_FILE);
const rand = mulberry32(seed);

/**
 * Build question bank (each item starts with a correct option at index 0, then re-key later).
 */
const raw = [];
function add({ question, correct, distractors, explanation, difficulty = "hard" }) {
  if (!Array.isArray(distractors) || distractors.length !== 3) {
    throw new Error("distractors must have length 3");
  }
  raw.push({
    question,
    options: [correct, ...distractors],
    correctIndex: 0,
    explanation,
    difficulty,
  });
}

// 1
add({
  question:
    "Según el art. 1.1, ¿qué determina la cuantía de las prestaciones económicas del Régimen General para cada contingencia y situación protegida?",
  correct:
    "La que se fija en la Ley de la Seguridad Social de 21/04/1966 y en el propio Reglamento.",
  distractors: [
    "La que se fije exclusivamente en disposiciones de aplicación y desarrollo posteriores.",
    "La que resulte de la negociación colectiva de cada sector, sin remisión a Ley o Reglamento.",
    "La que determine el Ministerio de Trabajo caso por caso mediante resoluciones individuales.",
  ],
  explanation:
    "El art. 1.1 establece como norma general que \"la cuantía de las prestaciones económicas del Régimen General será la que se fija en la citada Ley y en el presente Reglamento\". Las otras opciones contradicen esa doble fuente (Ley + Reglamento) o inventan vías no previstas.",
});

// 2
add({
  question:
    "Conforme al art. 2.1, ¿en qué consiste la prestación económica por incapacidad laboral transitoria y sobre qué base se calcula?",
  correct:
    "En un subsidio equivalente al 75% de la base de cotización del trabajador en la fecha de inicio legal de la incapacidad.",
  distractors: [
    "En un subsidio del 100% del salario real del mes anterior, siempre.",
    "En un subsidio del 55% de la base reguladora, calculado sobre los últimos 12 meses.",
    "En una cantidad a tanto alzado equivalente a 18 mensualidades de su base de cotización.",
  ],
  explanation:
    "El art. 2.1 dice literalmente que la prestación \"consistirá en un subsidio equivalente al setenta y cinco por ciento de la base de cotización del trabajador\" en la fecha de inicio legal de la incapacidad. Las demás opciones mezclan reglas de otras prestaciones (art. 12) o inventan porcentajes/base.",
});

// 3
add({
  question:
    "Según el art. 2.1, si durante la incapacidad laboral transitoria se modifican las bases tarifadas de cotización, ¿cómo se recalcula la cuantía?",
  correct: "Se calcula sobre la nueva base que le corresponda al trabajador.",
  distractors: [
    "Se mantiene siempre sobre la base existente en la fecha inicial, sin cambios.",
    "Se recalcula promediando las bases de los últimos 24 meses.",
    "Se recalcula sobre el salario real, en todo caso.",
  ],
  explanation:
    "El art. 2.1 prevé expresamente que \"si... se produjese una modificación de las bases tarifadas de cotización, la cuantía de la prestación se calculará sobre la nueva base\". Las otras respuestas niegan esta regla o traen métodos del cap. VIII (art. 49-50) sin base aquí.",
});

// 4
add({
  question:
    "En el art. 3, ¿qué ocurre con la acción protectora por incapacidad laboral transitoria NO derivada de accidente de trabajo o enfermedad profesional para ciertos trabajadores del Régimen General?",
  correct:
    "Quedan exceptuados si están excluidos de asistencia sanitaria según el art. 83.a) a') de la Ley; y los padres de familia numerosa que ejerciten la opción indicada gozarán también de esa cobertura.",
  distractors: [
    "Quedan protegidos siempre, con independencia de estar o no excluidos de asistencia sanitaria.",
    "Quedan exceptuados únicamente si la incapacidad deriva de accidente de trabajo.",
    "Quedan exceptuados todos los trabajadores en excedencia forzosa.",
  ],
  explanation:
    "El art. 3 indica que \"quedarán exceptuados\" de esta acción protectora quienes estén excluidos de asistencia sanitaria y añade que \"los padres de familia numerosa que hagan uso de la opción\" gozarán también de la cobertura. Las demás opciones alteran el supuesto (AT/EP) o introducen figuras del art. 28.2.",
});

// 5
add({
  question:
    "De acuerdo con el art. 4, ¿qué exigencia específica se impone en caso de maternidad para ser beneficiaria del subsidio por incapacidad laboral transitoria?",
  correct:
    "Abstenerse de todo trabajo lucrativo por cuenta ajena o propia durante los periodos de descanso obligatorio y voluntario.",
  distractors: [
    "Realizar un trabajo a tiempo parcial compatible con el subsidio.",
    "Suspender únicamente el trabajo por cuenta ajena, pero no el trabajo por cuenta propia.",
    "Solicitar autorización previa del Servicio Común para trabajar durante el descanso.",
  ],
  explanation:
    "El art. 4 dispone que \"en caso de maternidad\" las beneficiarias \"deberán abstenerse de todo trabajo lucrativo\" por cuenta ajena o propia durante los periodos de descanso. Las otras opciones contradicen el \"todo trabajo\" o traen la autorización del art. 24 (enfermedad profesional), que aquí no aplica.",
});

// 6
add({
  question:
    "Según el art. 5, ¿quién asume el pago del subsidio correspondiente al día del alta cuando el trabajador es dado de alta sin invalidez?",
  correct:
    "La Entidad Gestora, Mutua Patronal o Empresa autorizada que venía abonando el subsidio hasta ese día.",
  distractors: [
    "Siempre la Empresa, con independencia de quién pagara antes.",
    "Siempre el Instituto Nacional de Previsión, sin excepciones.",
    "Siempre el trabajador, mediante reintegro posterior.",
  ],
  explanation:
    "El art. 5 establece que \"el pago del subsidio del día de alta correrá a cargo\" de la Entidad Gestora, Mutua Patronal o Empresa autorizada que lo venía abonando. Las demás opciones asignan el pago sin base en el texto.",
});

// 7
add({
  question:
    "Conforme al art. 5, si el día del alta fuera víspera de festivo (o festivos), ¿qué derecho mantiene el trabajador respecto del subsidio?",
  correct:
    "Tiene derecho a percibir subsidio por los días no laborales (festivos), con cargo a las mismas Entidades o Empresas.",
  distractors: [
    "Pierde el derecho al subsidio desde el día del alta, incluso en festivos.",
    "Percibe subsidio solo si el festivo es domingo, no en otros festivos.",
    "Percibe subsidio únicamente si lo autoriza expresamente el Ministerio de Trabajo.",
  ],
  explanation:
    "El art. 5 añade: \"Si el día del alta fuera víspera de festivo, o festivos, el trabajador tendrá derecho a percibir subsidio por tales días no laborales\". Las otras opciones introducen restricciones inexistentes.",
});

// 8
add({
  question:
    "Según el art. 9.1, ¿cuál es la duración máxima del periodo de observación en enfermedad profesional y quién puede prorrogarlo?",
  correct:
    "Máximo 6 meses, prorrogables por igual plazo por la Comisión Técnica Calificadora Central a propuesta de la Provincial.",
  distractors: [
    "Máximo 12 meses, prorrogables indefinidamente por la Empresa.",
    "Máximo 24 meses, prorrogables por el Juzgado de lo Social.",
    "Máximo 3 meses, prorrogables solo por el Instituto Nacional de Previsión.",
  ],
  explanation:
    "El art. 9.1 fija \"una duración máxima de seis meses\" y permite prórroga \"por igual plazo\" por la Comisión Técnica Calificadora Central a propuesta de la Provincial. Las demás opciones inventan plazos/órganos.",
});

// 9
add({
  question:
    "En el art. 10, ¿qué cuantía tiene el subsidio por invalidez provisional y qué base se toma como referencia?",
  correct:
    "Equivale al 75% de la misma base de cotización usada para calcular la incapacidad laboral transitoria de la que derive.",
  distractors: [
    "Equivale al 52% de la base reguladora de viudedad.",
    "Equivale al 35% del salario real del inválido.",
    "Equivale a una cantidad a tanto alzado de 18 mensualidades.",
  ],
  explanation:
    "El art. 10 dispone que la invalidez provisional da derecho \"a un subsidio equivalente al setenta y cinco por ciento\" de la misma base de cotización usada para la incapacidad laboral transitoria de la que deriva. Las demás confunden con viudedad (art. 31) o con subsidios/pagos únicos del art. 12.",
});

// 10
add({
  question:
    "Según el art. 11.1, en caso de enfermedad común o accidente no laboral que haya dado lugar a incapacidad laboral transitoria, ¿qué período de cotización debe estar cubierto para ser beneficiario del subsidio por invalidez provisional?",
  correct: "500 días dentro de los 5 años inmediatamente anteriores a la fecha de inicio de dicha incapacidad.",
  distractors: [
    "365 días dentro del año inmediatamente anterior al fallecimiento.",
    "24 meses ininterrumpidos de baja en la Empresa, sin exigencia adicional.",
    "7 años de cotización dentro de los 10 años anteriores.",
  ],
  explanation:
    "El art. 11.1 exige \"un periodo de cotización de quinientos días dentro de los cinco años inmediatamente anteriores\" a la fecha en que se inició la incapacidad laboral transitoria. Las otras opciones mezclan reglas de viudedad (art. 32.1) o requisitos distintos.",
});

// 11
add({
  question:
    "Conforme al art. 11.2, para trabajadores excluidos de asistencia sanitaria e incapacidad laboral transitoria debidas a enfermedad común o accidente no laboral, ¿qué condición temporal adicional se exige antes de poder ser beneficiarios del subsidio por invalidez provisional?",
  correct: "Haber permanecido de baja en su Empresa por esas contingencias durante 24 meses ininterrumpidos.",
  distractors: [
    "Haber estado en desempleo total y subsidiado durante 6 meses.",
    "Haber realizado reconocimientos periódicos cada 6 meses durante 2 años.",
    "Haber agotado las prestaciones por desempleo en todo caso.",
  ],
  explanation:
    "El art. 11.2 prevé el supuesto de excluidos y exige, además, haber permanecido de baja \"durante un plazo ininterrumpido de veinticuatro meses\". Las otras respuestas confunden con el art. 25 (reconocimientos) o con el art. 28.2 (asimiladas).",
});

// 12
add({
  question:
    "Según el art. 12.1.a), ¿qué porcentajes se aplican al subsidio de espera en incapacidad permanente parcial y total, y sobre qué base se calculan?",
  correct:
    "35% (parcial) y 55% (total), calculados sobre la misma base de cotización que sirvió para la incapacidad laboral transitoria de la que derive.",
  distractors: [
    "52% (parcial) y 70% (total), calculados sobre la base reguladora de viudedad.",
    "75% (parcial) y 100% (total), calculados sobre el salario real.",
    "20% (parcial) y 52% (total), calculados sobre la base reguladora del causante.",
  ],
  explanation:
    "El art. 12.1.a) fija que el subsidio de espera es del \"treinta y cinco por ciento\" (incapacidad permanente parcial) y \"cincuenta y cinco por ciento\" (incapacidad permanente total), ambos calculados sobre \"la misma base de cotización\" usada para la incapacidad laboral transitoria. Las demás opciones mezclan viudedad/orfandad o inventan porcentajes.",
});

// 13
add({
  question:
    "De acuerdo con el art. 12.1.b), ¿cómo se determina la cuantía del subsidio de asistencia en incapacidad permanente?",
  correct: "Es igual a la del subsidio de espera que corresponda al trabajador.",
  distractors: [
    "Es siempre el 75% de la base de cotización.",
    "Es una cantidad fija de 5.000 pesetas.",
    "Depende de si el trabajador tiene cargas familiares.",
  ],
  explanation:
    "El art. 12.1.b) dispone que el subsidio de asistencia \"cuya cuantía será igual a la del subsidio de espera\". Las otras opciones corresponden a otros artículos: 75% (art. 2/10), 5.000 pesetas (art. 30) o cargas familiares (art. 31.2).",
});

// 14
add({
  question:
    "Según el art. 12.1.c), si tras readaptación/rehabilitación se reconoce incapacidad permanente total para la profesión habitual, ¿a cuántas mensualidades de la base de cotización equivale la cantidad a tanto alzado?",
  correct: "A 40 mensualidades de su base de cotización.",
  distractors: [
    "A 18 mensualidades de su base de cotización.",
    "A 6 mensualidades de la base reguladora.",
    "A 12 mensualidades del salario real.",
  ],
  explanation:
    "El art. 12.1.c) señala que el pago único será \"de cuarenta mensualidades\" si se trata de incapacidad permanente total (y \"dieciocho mensualidades\" si fuese incapacidad permanente parcial para la profesión habitual). Las demás cifras corresponden a otros supuestos (art. 35: 6 mensualidades) o no aparecen.",
});

// 15
add({
  question:
    "Conforme al art. 12.2, si un trabajador declarado con incapacidad permanente total para su profesión habitual opta por pensión vitalicia, ¿qué cuantía se reconoce y en qué plazo debe ejercitarse la opción (si procede)?",
  correct:
    "Una pensión vitalicia del 55% de su base de cotización; la opción debe ejercitarse dentro de los 30 días siguientes a la declaración (si está en el supuesto del art. 136.2).",
  distractors: [
    "Una pensión vitalicia del 70% de la base reguladora, con opción en 24 mensualidades.",
    "Una pensión vitalicia del 52% de la base reguladora, con opción dentro de los 30 días desde el fallecimiento.",
    "Una pensión vitalicia del 100% del salario real, con opción en 2 años desde la declaración.",
  ],
  explanation:
    "El art. 12.2 establece que, si el trabajador opta, \"la cuantía de ésta será equivalente al cincuenta y cinco por ciento de su base de cotización\" y que la opción debe ejercitarse \"dentro de los treinta días siguientes\" a la declaración (en el supuesto legal previsto). Las demás opciones mezclan porcentajes de viudedad (art. 31) o la incapacidad permanente absoluta (art. 12.4).",
});

// 16
add({
  question:
    "Según el art. 12.2, ¿qué ocurre si transcurre el plazo para optar por la pensión vitalicia sin ejercitar la opción, y qué regla especial se aplica si el trabajador tuviera 60 o más años en la fecha de declaración de incapacidad?",
  correct:
    "Se entiende efectuada la opción a favor de la pensión vitalicia; y si tenía 60 o más años, la opción se entiende realizada en todo caso a favor de la pensión vitalicia.",
  distractors: [
    "Se entiende ejercitada la opción a favor del pago a tanto alzado; y con 60 o más años se exige ratificación expresa.",
    "Se pierde definitivamente el derecho; y con 60 o más años se abre un nuevo plazo de 30 días.",
    "Se prorroga automáticamente el plazo de opción; y con 60 o más años se aplica el 70%.",
  ],
  explanation:
    "El art. 12.2 dispone: \"Transcurrido el mencionado plazo sin ejercitar el derecho de opción se entenderá efectuado a favor de la pensión vitalicia\" y añade: \"si el trabajador tuviese sesenta o más años... el derecho de opción se entenderá realizado en favor de la pensión vitalicia\". Las otras respuestas inventan efectos y porcentajes.",
});

// 17
add({
  question:
    "A efectos del art. 12.3, ¿cómo se determina la 'profesión habitual' en caso de accidente y en caso de enfermedad común o profesional?",
  correct:
    "En accidente (sea o no de trabajo), la desempeñada normalmente al tiempo de sufrirlo; en enfermedad, la actividad fundamental durante los 12 meses anteriores al inicio de la incapacidad laboral transitoria.",
  distractors: [
    "En accidente, la actividad del último año; en enfermedad, la actividad del último mes.",
    "En accidente, la profesión indicada por la Empresa; en enfermedad, la que elija el trabajador.",
    "En accidente, siempre la profesión de afiliación; en enfermedad, siempre la profesión del contrato vigente.",
  ],
  explanation:
    "El art. 12.3 dice: \"en caso de accidente, sea o no de trabajo, la desempeñada normalmente... al tiempo de sufrirlo\" y, \"en caso de enfermedad común o profesional\", la actividad fundamental en los \"doce meses anteriores\" al inicio de la incapacidad laboral transitoria. Las demás opciones alteran criterios y plazos.",
});

// 18
add({
  question:
    "Conforme al art. 12.5, ¿qué incremento corresponde al gran inválido sobre la pensión y qué alternativa puede autorizar la Entidad Gestora a petición del interesado?",
  correct:
    "Un incremento del 50% destinado a remunerar a la persona que le atienda; y puede autorizar su sustitución por alojamiento y cuidado en régimen de internado en una institución asistencial.",
  distractors: [
    "Un incremento del 20%; y puede sustituirse por una indemnización a tanto alzado de 6 mensualidades.",
    "Un incremento del 70%; y puede sustituirse por becas y salarios de estímulo.",
    "Un incremento del 35%; y puede sustituirse por reducción del salario por la Empresa.",
  ],
  explanation:
    "El art. 12.5 establece que, si fuese gran inválido, la pensión se incrementa \"en un cincuenta por ciento\", destinado a remunerar al cuidador, y que la Entidad Gestora puede autorizar \"la sustitución del incremento\" por \"su alojamiento y cuidado... en régimen de internado\". Las demás opciones mezclan otros artículos (art. 36/35/15).",
});

// 19
add({
  question:
    "Según el art. 14.3, ¿en qué momentos debe satisfacerse la cantidad a tanto alzado del art. 12.1.c)?",
  correct:
    "Al finalizar el tratamiento/proceso y previa revisión si procediera; o de forma inmediata si la invalidez se declara sin posibilidad razonable de recuperación por resolución definitiva de la Comisión competente.",
  distractors: [
    "Siempre al cumplir 24 mensualidades de subsidio de espera.",
    "Solo cuando el trabajador solicite revisión a los 2 años.",
    "Únicamente al inicio del tratamiento, como anticipo.",
  ],
  explanation:
    "El art. 14.3 indica dos momentos: \"al dar por finalizado el... tratamiento\" (con revisión si procede) y, si se declara \"sin posibilidad razonable de recuperación\" por resolución definitiva, \"con carácter inmediato\". Las demás opciones no están en el texto.",
});

// 20
add({
  question:
    "De acuerdo con el art. 15, ¿cuándo son compatibles los subsidios de espera y asistencia con la percepción de un salario y qué puede hacer la Empresa si la suma supera la retribución anterior?",
  correct:
    "Son compatibles si la suma es igual o inferior a la retribución previa; si es superior, la Empresa puede reducir el salario hasta el importe anterior (o el superior que lo haya sustituido con carácter general).",
  distractors: [
    "Son siempre incompatibles con cualquier salario.",
    "Son compatibles siempre, aunque la suma exceda de la retribución previa.",
    "Solo son compatibles si el salario es de un cargo público en excedencia forzosa.",
  ],
  explanation:
    "El art. 15 dispone que los subsidios \"serán compatibles\" con salario si la suma es \"igual o inferior\" a la retribución previa; si fuese superior, el salario \"podrá reducirse\" por la Empresa hasta el límite indicado. Las otras opciones contradicen literalmente el precepto.",
});

// 21
add({
  question:
    "Según el art. 16.2, ¿cuál es la regla general de incompatibilidad de las indemnizaciones por lesiones permanentes no invalidantes y cuál es la excepción de compatibilidad que se contempla?",
  correct:
    "Son incompatibles con las prestaciones económicas de invalidez permanente; pero son compatibles si las lesiones indemnizadas son totalmente independientes de las tomadas en consideración para declarar la invalidez permanente.",
  distractors: [
    "Son compatibles siempre, porque las lesiones no son invalidantes.",
    "Son incompatibles incluso si las lesiones son independientes.",
    "Solo son compatibles si el causante era pensionista de vejez.",
  ],
  explanation:
    "El art. 16.2 declara que las cantidades a tanto alzado \"serán incompatibles\" con las prestaciones de invalidez permanente, \"sin embargo\" admite compatibilidad cuando las lesiones son \"totalmente independientes\" de las consideradas para declarar la invalidez. Las otras opciones eliminan o deforman la excepción.",
});

// 22
add({
  question:
    "Conforme al art. 17, ¿hasta cuándo son revisables las declaraciones de incapacidad y cuáles son las causas de revisión previstas?",
  correct:
    "Son revisables en todo tiempo mientras el incapacitado no haya cumplido la edad mínima para la pensión de vejez, por agravación/mejoría o por error de diagnóstico.",
  distractors: [
    "Solo son revisables durante los 6 meses del período de observación.",
    "Son revisables únicamente por muerte, y solo una vez.",
    "Son revisables siempre, incluso después de cumplir la edad mínima de vejez, pero solo por error de diagnóstico.",
  ],
  explanation:
    "El art. 17 dice que las declaraciones serán revisables \"en todo tiempo\" \"en tanto que el incapacitado no haya cumplido la edad mínima\" para vejez, por \"agravación o mejoría\" o \"error de diagnóstico\". Las demás opciones introducen límites distintos.",
});

// 23
add({
  question:
    "Según el art. 19, ¿cuándo puede solicitarse la primera revisión y las posteriores, y qué excepción se establece?",
  correct:
    "La primera solo tras 2 años desde la declaración de incapacidad; las posteriores tras 1 año desde el acuerdo firme anterior; y esos plazos no se aplican en caso de revisión por muerte.",
  distractors: [
    "La primera tras 6 meses; las posteriores cada 6 meses; sin excepciones.",
    "La primera tras 24 meses y las posteriores cada 2 años; y se aplican también en caso de muerte.",
    "La revisión es libre en cualquier momento sin plazos.",
  ],
  explanation:
    "El art. 19 establece que \"la primera revisión sólo se podrá solicitar después de transcurridos dos años\" y las posteriores \"después de transcurridos un año\" desde el acuerdo firme anterior, y añade: \"Los plazos precedentes no serán aplicables en el caso de revisión por muerte\". Las otras opciones no coinciden con el texto.",
});

// 24
add({
  question:
    "De acuerdo con el art. 21.a), si tras una revisión se reconoce otro grado que da derecho a una pensión de cuantía diferente, ¿desde cuándo se percibe la nueva pensión?",
  correct:
    "Desde el día siguiente a la fecha de la resolución definitiva en que se haya declarado el nuevo grado.",
  distractors: [
    "Desde la fecha de solicitud de revisión.",
    "Desde el primer día del mes siguiente a la revisión médica.",
    "Desde el mismo día de la resolución definitiva, sin esperar al día siguiente.",
  ],
  explanation:
    "El art. 21.a) ordena que \"pasará a percibir la nueva pensión a partir del día siguiente a la fecha de la resolución definitiva\". Las demás opciones adelantan o alteran el dies a quo sin respaldo en el texto.",
});

// 25
add({
  question:
    "Conforme al art. 21.e), si un trabajador que había percibido una cantidad a tanto alzado pasa, tras revisión, a un grado que da derecho a pensión, ¿cuándo se devenga y cuándo empieza a percibirse la pensión?",
  correct:
    "Se devenga desde el día siguiente a la resolución definitiva, pero no se empieza a percibir hasta deducir el importe correspondiente a las mensualidades del alzado que excedan de las transcurridas desde que se reconoció el derecho.",
  distractors: [
    "Se devenga y se percibe íntegramente desde el día siguiente, sin deducciones.",
    "Se devenga desde el primer día del mes siguiente, y se percibe desde el año siguiente.",
    "Se devenga desde la solicitud y se percibe solo si devuelve íntegramente el alzado.",
  ],
  explanation:
    "El art. 21.e) establece que la pensión \"se devengará a partir del día siguiente\" a la resolución definitiva, pero \"no comenzará a percibirse hasta\" que se deduzca el importe de las mensualidades del alzado que \"excedan\" de las transcurridas desde el reconocimiento. Las otras opciones suprimen o deforman la regla de deducción.",
});

// 26
add({
  question:
    "Según el art. 23.a), en invalidez permanente derivada de enfermedad profesional, si el trabajador está al servicio de una Empresa en el momento del reconocimiento médico y cesa en el trabajo por la declaración de invalidez, ¿cuál es la fecha inicial del devengo de la pensión?",
  correct: "El día siguiente al cese en el trabajo.",
  distractors: [
    "El mismo día del reconocimiento médico.",
    "El día primero del mes siguiente al cese.",
    "El día siguiente al inicio del período de observación, necesariamente.",
  ],
  explanation:
    "El art. 23.a) fija que, si está al servicio de una Empresa y cesa por la declaración, la fecha será \"la del día siguiente al cese\". Las otras opciones no coinciden con la regla prevista.",
});

// 27
add({
  question:
    "Conforme al art. 24, ¿qué requisito previo debe cumplir un pensionista por enfermedad profesional para trabajar por cuenta ajena y qué deber específico se impone al empresario?",
  correct:
    "El trabajador debe obtener previamente autorización del Servicio Común; y el empresario debe comprobar, antes de admitirle, que dicha autorización existe.",
  distractors: [
    "El trabajador solo debe comunicarlo en 30 días; y el empresario no tiene deber alguno.",
    "El trabajador puede trabajar libremente; y el empresario debe reducirle el salario si supera la retribución anterior.",
    "El trabajador necesita autorización judicial; y el empresario debe cotizar por bases tarifadas especiales.",
  ],
  explanation:
    "El art. 24.1 exige \"autorización\" previa del Servicio Común para trabajar; y el art. 24.2 obliga al empresario a \"comprobar... que han obtenido la autorización\" antes de admitirles. Las demás opciones confunden con art. 31.4 (30 días), art. 15 (reducción salarial) o inventan requisitos.",
});

// 28
add({
  question:
    "Según el art. 25, cuando se disponen reconocimientos médicos periódicos a inválidos por enfermedad profesional, ¿qué regla mínima se fija entre reconocimientos sucesivos y qué particularidad se establece sobre los plazos generales de revisión?",
  correct:
    "Entre reconocimientos sucesivos deben transcurrir al menos 6 meses, y no rigen los plazos generales de revisión.",
  distractors: [
    "Entre reconocimientos deben transcurrir 2 años, y rigen siempre los plazos generales.",
    "Entre reconocimientos deben transcurrir 1 mes, y se aplican los plazos del art. 19.",
    "No existe regla mínima, y las revisiones quedan prohibidas.",
  ],
  explanation:
    "El art. 25 prevé que \"no regirán los plazos\" generales para revisiones en estos casos, pero exige que \"entre los reconocimientos sucesivos deberán transcurrir, al menos, seis meses\". Las otras opciones contradicen literalmente el precepto.",
});

// 29
add({
  question:
    "Conforme al art. 26.1, ¿cómo se consideran el segundo y tercer grado de silicosis a efectos de invalidez y a qué grados se equiparan?",
  correct:
    "Se consideran situaciones constitutivas de invalidez permanente y se equiparan, respectivamente, a incapacidad total para la profesión habitual y a incapacidad absoluta para todo trabajo.",
  distractors: [
    "Se consideran lesiones no invalidantes y se equiparan a indemnización por baremo.",
    "Solo el tercer grado se considera invalidez permanente; el segundo es incapacidad laboral transitoria.",
    "Se equiparan a viudedad y orfandad, respectivamente.",
  ],
  explanation:
    "El art. 26.1 dispone que el segundo y tercer grado \"tendrán la consideración de situaciones constitutivas de invalidez permanente\" y se equiparan \"respectivamente\" a incapacidad total y absoluta. Las demás opciones mezclan figuras ajenas (art. 16 o cap. V).",
});

// 30
add({
  question:
    "Según el art. 26.2, ¿en qué supuesto el primer grado de silicosis se equipara al segundo grado, aunque por sí solo no origine disminución de capacidad funcional?",
  correct:
    "Mientras coexista con bronconeumopatía crónica (con o sin síndromes asmáticos), o con cardiopatía orgánica aunque compensada, o con un cuadro de tuberculosis sospechoso de actividad o lesiones residuales.",
  distractors: [
    "Cuando coexista con cargas familiares y falta de ingresos.",
    "Cuando el trabajador tenga 60 o más años.",
    "Cuando coexista con desempleo total y subsidiado.",
  ],
  explanation:
    "El art. 26.2 indica que el primer grado \"se equiparará... al segundo\" \"mientras coexista\" con alguna de las enfermedades listadas (a, b o c), incluyendo \"bronconeumopatía crónica\" y \"cardiopatía orgánica\". Las demás opciones son ajenas a la silicosis.",
});

// 31
add({
  question:
    "De acuerdo con el art. 26.3, ¿qué caracteriza al tercer grado de silicosis y en qué supuesto se equiparan el primero y segundo grado al tercero?",
  correct:
    "El tercer grado se manifiesta al menor esfuerzo físico y es incompatible con todo trabajo; y el primero y segundo grado se equiparan al tercero mientras concurran con afecciones tuberculosas activas.",
  distractors: [
    "El tercer grado implica siempre una indemnización a tanto alzado; y el primero y segundo se equiparan al tercero solo por error de diagnóstico.",
    "El tercer grado exige 500 días de cotización; y el primero y segundo se equiparan al tercero si hay bronconeumopatía crónica.",
    "El tercer grado se define por 24 meses de baja; y el primero y segundo se equiparan al tercero si hay cargas familiares.",
  ],
  explanation:
    "El art. 26.3 define el tercer grado: \"la enfermedad se manifieste al menor esfuerzo físico\" y resulte \"incompatible con todo trabajo\"; y añade que el primero y segundo se equipararán al tercero \"mientras\" concurra con tuberculosis \"activa\". Las demás opciones mezclan requisitos de otros artículos.",
});

// 32
add({
  question:
    "Según el art. 26.4, ¿qué particularidad tiene el derecho a pensión del trabajador declarado silicótico de segundo grado y qué percibe si se acoge a medidas de recuperación?",
  correct:
    "Tiene derecho a pensión cualquiera que sea su edad; y si se acoge a medidas de recuperación, además de la pensión percibirá solo las becas y salarios de estímulo que puedan corresponderle.",
  distractors: [
    "Tiene derecho a pensión solo si es menor de 18 años; y si se acoge a recuperación percibe una indemnización por baremo.",
    "Tiene derecho a pensión solo si acredita cargas familiares; y si se acoge a recuperación se suspende la pensión.",
    "Tiene derecho a pensión solo tras 2 años desde la declaración; y si se acoge a recuperación percibe el 70% de la base reguladora.",
  ],
  explanation:
    "El art. 26.4 indica que el silicótico de segundo grado tendrá derecho a pensión \"cualquiera que fuese su edad\" y que, si se acoge a recuperación, \"además de la pensión\" percibirá \"sólo las becas y salarios de estímulo\". Las demás opciones inventan condiciones.",
});

// 33
add({
  question:
    "Conforme al art. 29.2, además de las situaciones asimiladas del art. 28.2, ¿qué situación se considera asimilada al alta para causar prestaciones de muerte y supervivencia?",
  correct:
    "La permanencia en filas para el cumplimiento del servicio militar, obligatorio o voluntario para anticiparlo.",
  distractors: [
    "La realización de trabajos por cuenta ajena sin autorización previa del Servicio Común.",
    "La permanencia en incapacidad laboral transitoria por enfermedad común durante 6 meses.",
    "La percepción de becas y salarios de estímulo en procesos de recuperación.",
  ],
  explanation:
    "El art. 29.2 dice que se considerará situación asimilada al alta, a estos efectos, \"la de permanencia en filas para el cumplimiento del servicio militar\", obligatorio o voluntario para anticiparlo. Las otras opciones no están previstas como asimiladas.",
});

// 34
add({
  question:
    "Según el art. 30, ¿cuál es la cuantía del subsidio de defunción cuando el beneficiario es un familiar del fallecido y cuál cuando lo percibe otra persona que acredita haber pagado el sepelio?",
  correct:
    "5.000 pesetas si el beneficiario es un familiar; y si lo cobra otra persona, el importe de los gastos del sepelio con el límite máximo de 5.000 pesetas.",
  distractors: [
    "250 pesetas si es familiar; y si lo cobra otra persona, siempre 5.000 pesetas sin necesidad de acreditar gastos.",
    "6 mensualidades de la base reguladora si es familiar; y si lo cobra otra persona, 18 mensualidades de la base.",
    "El 20% de la base reguladora si es familiar; y si lo cobra otra persona, el 52% de la base reguladora.",
  ],
  explanation:
    "El art. 30 establece que el subsidio consiste en \"cinco mil pesetas\" si el beneficiario es familiar; y, si lo cobra otra persona, \"el importe de los gastos\" del sepelio \"sin que pueda rebasarse\" esa cantidad. Las demás opciones confunden mínimos o porcentajes de otros artículos (art. 36, art. 35, art. 31).",
});

// 35
add({
  question:
    "Conforme al art. 31.1, ¿qué porcentaje se aplica con carácter general a la base reguladora para calcular la pensión de viudedad?",
  correct: "El 52%.",
  distractors: [
    "El 75%.",
    "El 55%.",
    "El 20%.",
  ],
  explanation:
    "El art. 31.1 indica: \"El porcentaje... para la determinación de la cuantía de la pensión de viudedad será del 52 por ciento\". Las demás cifras pertenecen a otras prestaciones (art. 2/10, art. 12.2, art. 36.1).",
});

// 36
add({
  question:
    "Según el art. 31.2, ¿cuándo se entiende que la pensión de viudedad constituye la principal o única fuente de ingresos del pensionista a efectos de aplicar el 70%?",
  correct:
    "Cuando el importe anual de la pensión represente, como mínimo, el 50% del total de los ingresos del pensionista, en cómputo anual.",
  distractors: [
    "Cuando la pensión supere el 75% del salario mínimo interprofesional.",
    "Cuando existan cargas familiares, sin necesidad de valorar ingresos.",
    "Cuando el pensionista haya comunicado variaciones en 30 días.",
  ],
  explanation:
    "El art. 31.2 precisa que se entiende principal o única fuente cuando \"el importe anual de la misma represente, como mínimo, el 50 por 100 del total de los ingresos\". Las otras opciones toman conceptos del propio art. 31.2 (75% SMI para cargas familiares) pero no definen la principal fuente, o mezclan obligaciones del art. 31.4.",
});

// 37
add({
  question:
    "De acuerdo con el art. 31.4, ¿qué dos obligaciones formales se imponen a los beneficiarios del porcentaje del 70% en viudedad respecto a variaciones y declaración de rendimientos?",
  correct:
    "Comunicar variaciones familiares/económicas en 30 días y presentar declaración de rendimientos (propios y de la unidad familiar) antes del 1 de marzo de cada año.",
  distractors: [
    "Comunicar variaciones en 6 meses y declarar rendimientos antes del 31 de diciembre.",
    "Comunicar variaciones solo si lo requiere la Empresa y declarar rendimientos solo si hay hijos menores.",
    "No existe obligación de comunicación ni de declaración anual.",
  ],
  explanation:
    "El art. 31.4 establece la obligación de comunicar en \"el plazo de treinta días\" las variaciones relevantes y, además, presentar \"declaración\" de rendimientos \"antes del 1 de marzo de cada año\". Las otras opciones alteran plazos o suprimen obligaciones.",
});

// 38
add({
  question:
    "Según el art. 32.1, respecto al requisito del apartado b) del art. 160 de la Ley (para viudas), ¿qué periodo de cotización se exige en este Reglamento?",
  correct: "500 días dentro de los 5 años anteriores al fallecimiento del causante.",
  distractors: [
    "500 días dentro de los 7 años anteriores al fallecimiento.",
    "24 meses ininterrumpidos de baja en la Empresa.",
    "6 meses de observación en enfermedad profesional.",
  ],
  explanation:
    "El art. 32.1 fija expresamente que \"el período de cotización requerido será el de quinientos días dentro de los cinco años anteriores\" al fallecimiento del causante. Las otras opciones mezclan plazos y figuras de otros artículos (art. 11.2, art. 9.1).",
});

// 39
add({
  question:
    "Conforme al art. 49.1, ¿cómo se calcula la base reguladora para determinar la pensión de invalidez del art. 12.2 (pensión vitalicia) y qué margen de elección se concede al interesado?",
  correct:
    "Es el cociente de dividir por 28 la suma de bases de cotización de 24 meses ininterrumpidos; esos 24 meses se eligen dentro de los 7 años anteriores a la fecha en que se cause el derecho.",
  distractors: [
    "Es el promedio de 12 meses dividido por 12; se elige dentro de los 2 años anteriores.",
    "Es el salario real del último mes; se elige libremente cualquier periodo.",
    "Es la base de cotización del día del alta; se elige dentro de los 5 años anteriores.",
  ],
  explanation:
    "El art. 49.1 define la base reguladora como el \"cociente\" de dividir \"por veintiocho\" la suma de bases de 24 meses, y permite elegir esos 24 meses dentro de los \"siete años\" anteriores al hecho causante. Las demás opciones alteran divisor, periodo o concepto.",
});

// 40
add({
  question:
    "Según el art. 36.1, ¿cuál es la cuantía de la pensión temporal de orfandad para cada huérfano y qué mínimo se garantiza?",
  correct:
    "El 20% de la base reguladora del causante (calculada según el art. 31), con un mínimo de 250 pesetas.",
  distractors: [
    "El 52% de la base reguladora, con un mínimo de 5.000 pesetas.",
    "El 55% de la base de cotización, con un mínimo de 250 pesetas.",
    "El 35% de la base reguladora, con un mínimo de 18 mensualidades.",
  ],
  explanation:
    "El art. 36.1 dispone que la pensión de orfandad será \"equivalente al veinte por ciento\" de la base reguladora y fija \"con un mínimo de doscientas cincuenta pesetas\". Las demás opciones mezclan porcentajes y cuantías de viudedad (art. 31), invalidez (art. 12) o pagos únicos.",
});

// Deterministic shuffle of question order
shuffleInPlace(raw, rand);

// Build a balanced answer sequence and re-key each question to match it
const targetSeq = buildBalancedAnswerSequence(rand, 40);
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

const { dist, maxRun, seqStart } = validateQuestions(questions);
const outPath = path.join(process.cwd(), OUT_FILE);
fs.writeFileSync(outPath, JSON.stringify({ questions }, null, 2) + "\n", "utf8");
console.log(
  `OK ${OUT_FILE} count=${questions.length} dist=${JSON.stringify(dist)} maxRun=${maxRun} seqStart=${seqStart}`
);
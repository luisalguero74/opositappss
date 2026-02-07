#!/usr/bin/env node
/**
 * Generates 80 hard test questions strictly from the provided legal text (user prompt):
 * - Orden de 22 de febrero de 1996 (desarrollo del RD 1391/1995)
 * - RD 1221/1992, de 9 de octubre, sobre el patrimonio de la Seguridad Social
 * - RD 696/2018, de 29 de junio, Reglamento general de la gestión financiera
 *
 * Output (repo root):
 *   tema 13_ESPECÍFICO_Recursos generales del sistema de la Seguridad Social. El patrimonio único de la seguridad social: titularidad, adscripción, administración y custodia.JSON
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

    if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
      throw new Error(`Question ${i} invalid correctAnswer ${q.correctAnswer}`);
    }
    dist[q.correctAnswer]++;
    seq.push(q.correctAnswer);

    if (typeof q.explanation !== 'string' || q.explanation.trim().length < 60) {
      throw new Error(`Question ${i} invalid explanation`);
    }

    if (!q.explanation.includes('"')) {
      throw new Error(`Question ${i} explanation must include a quoted literal fragment`);
    }

    const hasCitation =
      /\bart\./i.test(q.explanation) ||
      /\bart\u00edculo\b/i.test(q.explanation) ||
      /\bdisposici\u00f3n\b/i.test(q.explanation) ||
      /\bcap\u00edtulo\b/i.test(q.explanation) ||
      /\bsecci\u00f3n\b/i.test(q.explanation);
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

const OUT_FILE =
  'tema 13_ESPECÍFICO_Recursos generales del sistema de la Seguridad Social. El patrimonio único de la seguridad social: titularidad, adscripción, administración y custodia.JSON';
const TOTAL = 80;

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

// -------------------- Orden de 22 de febrero de 1996 --------------------

add({
  question:
    'Según el art. 1.1 de la Orden de 22/02/1996, ¿con qué marco normativo se desarrollan las funciones de cobros, pagos y demás actos de gestión financiera atribuidas a la TGSS?',
  correct:
    'Con arreglo a las normas del Reglamento General de la Gestión Financiera (RD 1391/1995), a las establecidas en la Orden y a las disposiciones complementarias.',
  distractors: [
    'Exclusivamente con arreglo al Real Decreto 1314/1984, sin otras disposiciones.',
    'Solo con arreglo a la Ley 19/1985, Cambiaria y del Cheque.',
    'Únicamente con arreglo a instrucciones internas sin rango normativo.',
  ],
  explanation:
    'El art. 1.1 de la Orden de 22/02/1996 dispone que se desarrollarán conforme a "las normas contenidas en dicho Reglamento", "a las establecidas en esta Orden" y "a las demás disposiciones complementarias". Las otras opciones eliminan fuentes expresas del precepto o citan normas que no regulan este marco general.',
});

add({
  question:
    'Conforme al art. 1.2 de la Orden de 22/02/1996, ¿bajo qué control y por qué órganos se ejercen las funciones de gestión financiera de la TGSS?',
  correct:
    'Bajo la dirección, vigilancia y tutela del Ministerio, por los órganos centrales y provinciales de la TGSS.',
  distractors: [
    'Bajo la dirección exclusiva de las entidades financieras colaboradoras, por sus oficinas principales.',
    'Bajo la tutela del Ministerio de Economía y Hacienda, por los órganos de la Delegación de Hacienda.',
    'Sin dirección ni tutela ministerial, por órganos autonómicos exclusivamente.',
  ],
  explanation:
    'El art. 1.2 indica que se ejercerán "bajo la dirección, vigilancia y tutela" del Ministerio por "los órganos centrales y provinciales" de la TGSS. Las demás respuestas atribuyen el control a sujetos no citados o niegan la tutela ministerial expresamente prevista.',
});

add({
  question:
    'Según el art. 15.1 de la Orden de 22/02/1996, ¿qué rasgo operativo caracteriza el sistema de primeros pagos de pensiones y otras prestaciones periódicas no delegadas?',
  correct: 'La emisión diaria de nóminas de primeros pagos por el sistema de pagos por relación.',
  distractors: [
    'La emisión exclusivamente mensual de nóminas de primeros pagos.',
    'El pago siempre por ventanilla, prohibiéndose la transferencia.',
    'La gestión exclusiva por las empresas mediante pago delegado.',
  ],
  explanation:
    'El art. 15.1 establece que el sistema "contemplará la emisión diaria de tales nóminas" para primeros pagos no sujetos a pago delegado. Las otras opciones contradicen la literalidad (mensual en vez de diaria, o afirman prohibiciones/obligaciones no previstas).',
});

add({
  question:
    'Conforme al art. 15.1.1 de la Orden de 22/02/1996, ¿qué triple contenido deben remitir diariamente las Direcciones Provinciales de las entidades gestoras a la TGSS?',
  correct:
    'Relación nominal de perceptores, notificaciones para los interesados y la elección del medio de pago (transferencia o cheque).',
  distractors: [
    'Únicamente el importe global de la nómina, sin relación nominal.',
    'Solo las notificaciones y la entidad financiera, pero no el medio de pago.',
    'Exclusivamente el listado de impagos del mes anterior.',
  ],
  explanation:
    'El art. 15.1.1 exige remitir "la relación nominal de perceptores", "las notificaciones" y "la elección entre transferencia o cheque". Las otras respuestas omiten elementos exigidos o sustituyen por información distinta.',
});

add({
  question:
    'Según el art. 15.1.2 de la Orden de 22/02/1996, si el medio elegido para el primer pago es cheque, ¿qué debe constar necesariamente como fecha de presentación al pago?',
  correct:
    'La que corresponda entre las fijadas en el art. 135 de la Ley 19/1985, Cambiaria y del Cheque.',
  distractors: [
    'La fecha de reconocimiento de la prestación por la entidad gestora.',
    'El último día natural del mes en curso, siempre.',
    'La fecha que libremente elija la entidad financiera sin referencia legal.',
  ],
  explanation:
    'El art. 15.1.2 ordena que se haga constar "necesariamente" como fecha de presentación la que corresponda entre las fijadas en el "artículo 135 de la Ley 19/1985". Las otras opciones inventan criterios no contemplados.',
});

add({
  question:
    'De acuerdo con el art. 15.1.3 de la Orden de 22/02/1996, ¿quién determina los procedimientos para el conocimiento y control de pagos por entidades financieras y de los impagos?',
  correct: 'La Tesorería General de la Seguridad Social.',
  distractors: [
    'El Instituto Nacional de Empleo.',
    'La entidad gestora que reconoció la prestación.',
    'El Banco de España.',
  ],
  explanation:
    'El art. 15.1.3 dice literalmente: "La Tesorería General de la Seguridad Social determinará los procedimientos y mecanismos" para control de pagos e impagos. Las otras instituciones no son las citadas en el precepto.',
});

add({
  question:
    'Según el art. 16.1 de la Orden de 22/02/1996, ¿qué doble elección pueden realizar los titulares de pensiones y prestaciones periódicas cuyo pago está encomendado a la TGSS?',
  correct:
    'Elegir el medio de pago y la entidad colaboradora en el pago entre las entidades financieras previstas.',
  distractors: [
    'Elegir únicamente el medio de pago, pero nunca la entidad colaboradora.',
    'Elegir únicamente la entidad colaboradora, pero no el medio de pago.',
    'No pueden elegir nada: el medio y la entidad se asignan de oficio.',
  ],
  explanation:
    'El art. 16.1 reconoce que podrán elegir "tanto el medio de pago" como "la entidad colaboradora". Las respuestas alternativas suprimen una de las elecciones o la niegan.',
});

add({
  question:
    'Conforme al art. 16.1 de la Orden de 22/02/1996, ¿qué requisito registral deben cumplir las entidades financieras (y sus agrupaciones/asociaciones) para colaborar en el pago?',
  correct:
    'Figurar inscritas en el Registro de Colaboradores regulado en el art. 19 del Reglamento general de la gestión financiera y en el art. 32 de la Orden.',
  distractors: [
    'Figurar inscritas únicamente en el Registro Mercantil.',
    'Estar autorizadas por el Banco de España, sin registro específico.',
    'Inscribirse en un registro autonómico de entidades pagadoras.',
  ],
  explanation:
    'El art. 16.1 exige que "deberán figurar inscritas en el Registro de Colaboradores" (art. 19 del Reglamento general de gestión financiera y art. 32 de la Orden). Las demás opciones citan registros o autorizaciones no previstas como condición suficiente.',
});

add({
  question:
    'Según el art. 16.2 de la Orden de 22/02/1996, en pagos por giro postal, ¿qué documento de pago acompaña a las libranzas y relación de giros postales?',
  correct: 'Cheque contra la cuenta del fondo de maniobra que se determine.',
  distractors: [
    'Transferencia inmediata desde la cuenta personal del beneficiario.',
    'Talón nominativo contra la cuenta del Banco de España del beneficiario.',
    'Orden de pago presupuestaria con cargo directo al presupuesto del Estado.',
  ],
  explanation:
    'El art. 16.2 señala que se entregarán libranzas y relación "acompañando cheque contra la cuenta del fondo de maniobra". Las otras respuestas no aparecen en el texto y cambian el circuito descrito.',
});

add({
  question:
    'Conforme al art. 16.3 de la Orden de 22/02/1996, ¿en qué circunstancia puede la TGSS autorizar otros medios de pago?',
  correct: 'Cuando existan razones de interés general que así lo aconsejen.',
  distractors: [
    'Solo cuando lo solicite la entidad financiera pagadora.',
    'Únicamente cuando el beneficiario resida fuera del territorio nacional.',
    'Siempre, sin necesidad de motivación ni condición alguna.',
  ],
  explanation:
    'El art. 16.3 establece: "La Tesorería General ... podrá autorizar otros medios de pago cuando existan razones de interés general". Las otras opciones añaden condiciones no contempladas o eliminan la necesidad de razón.',
});

add({
  question:
    'Según el art. 16.4.2 de la Orden de 22/02/1996, ¿desde cuándo se efectúa el pago a través del nuevo medio o nueva entidad elegidos tras solicitar un cambio?',
  correct:
    'A partir del primer día hábil del segundo mes siguiente a aquel en que se formuló la solicitud de cambio.',
  distractors: [
    'Desde el mismo día de la solicitud de cambio.',
    'Desde el primer día hábil del mes siguiente al de la solicitud.',
    'Desde el día 20 del mismo mes en que se solicita, con carácter general.',
  ],
  explanation:
    'El art. 16.4.2 fija literalmente que el cambio se aplicará "a partir del primer día hábil del segundo mes siguiente" al de la solicitud. Las otras opciones acortan el plazo sin base en el texto.',
});

add({
  question:
    'De acuerdo con el art. 17.1.a) de la Orden de 22/02/1996, ¿qué rasgo es obligatorio en la cuenta “restringida” destinada al abono de la pensión?',
  correct:
    'Ser de titularidad del perceptor y necesariamente individual, con la única finalidad del abono de la pensión.',
  distractors: [
    'Ser conjunta para facilitar la disposición por terceros.',
    'Permitir ingresos de cualquier naturaleza como cuenta ordinaria.',
    'Ser siempre una cuenta a nombre de la entidad gestora.',
  ],
  explanation:
    'El art. 17.1.a) describe una "cuenta ... restringidas" "necesariamente individual" y "con la única finalidad del abono" de la pensión. Las otras opciones contradicen la exigencia de individualidad/finalidad o cambian la titularidad.',
});

add({
  question:
    'Según el art. 17.1.b) de la Orden de 22/02/1996, ¿qué obligación asume la entidad financiera cuando la cuenta es ordinaria (posible conjunta) y fallece el titular del derecho?',
  correct:
    'Devolver a la TGSS las mensualidades abonadas correspondientes al mes o meses siguientes al de la fecha de extinción por fallecimiento.',
  distractors: [
    'Mantener los abonos hasta que un juez ordene lo contrario, sin devolución.',
    'Devolver únicamente la mensualidad del mes del fallecimiento, nunca las posteriores.',
    'No asumir ninguna responsabilidad, porque la devolución corresponde siempre al heredero.',
  ],
  explanation:
    'El art. 17.1.b) indica que la entidad financiera "deberá hacerse responsable de la devolución ... de las mensualidades" del mes o meses siguientes al de la extinción por fallecimiento. Las otras respuestas niegan o alteran esa responsabilidad.',
});

add({
  question:
    'Conforme al art. 17.2 de la Orden de 22/02/1996, ¿desde cuándo es total la disponibilidad de los abonos en cuenta por pensiones o prestaciones periódicas?',
  correct: 'Desde el primer día hábil del mes en que se realiza el pago.',
  distractors: [
    'Desde el día 10 del mes en que se realiza el pago.',
    'Desde el día 20 del mes en que se realiza el pago.',
    'Desde el cuarto día natural del mes siguiente.',
  ],
  explanation:
    'El art. 17.2 señala que la disponibilidad será "total desde el primer día hábil del mes" del pago. Las demás fechas no aparecen y contradicen el criterio expreso.',
});

add({
  question:
    'Según el art. 17.3 de la Orden de 22/02/1996, ¿qué garantía se ofrece respecto de gastos e intereses en el abono en cuenta?',
  correct:
    'No generará gasto alguno para el perceptor ni ocasionará intereses negativos por aplicación de fechas de valor.',
  distractors: [
    'Puede generar comisiones si la entidad lo prevé en su política interna.',
    'Puede ocasionar intereses negativos si la cuenta está en descubierto.',
    'Siempre generará un coste fijo por gestión de nómina.',
  ],
  explanation:
    'El art. 17.3 establece que los abonos "en ningún caso generarán gasto alguno" ni por fechas de valor "ocasionarán intereses negativos". Las otras opciones son incompatibles con esa prohibición.',
});

add({
  question:
    'Conforme al art. 19.1 de la Orden de 22/02/1996, ¿a partir de qué hito temporal se remiten los recibos impagados de prestaciones no domiciliadas para cobro por recibo?',
  correct: 'Transcurrido el día 20 de cada mes.',
  distractors: ['Antes del día 5 de cada mes.', 'El último día hábil de cada mes.', 'En cualquier momento del mes sin referencia al día 20.'],
  explanation:
    'El art. 19.1 condiciona la remisión a que haya "transcurrido el día 20 de cada mes". Las otras opciones inventan plazos distintos.',
});

add({
  question:
    'Según el art. 19.1 de la Orden de 22/02/1996, ¿qué remiten las entidades financieras junto a los recibos impagados?',
  correct: 'Nota del abono de las mismas en la cuenta única centralizada de cada entidad financiera.',
  distractors: [
    'Nota del cargo en la cuenta personal del beneficiario.',
    'Certificación de la Intervención General de la Seguridad Social.',
    'Relación de bienes inmuebles del patrimonio de la Seguridad Social.',
  ],
  explanation:
    'El art. 19.1 indica que remitirán los impagados "así como nota del abono" en la "cuenta única centralizada". Las otras opciones no corresponden con el procedimiento descrito.',
});

add({
  question:
    'De acuerdo con el art. 20.2 de la Orden de 22/02/1996, ¿qué vía tiene el sujeto responsable para resarcirse si no pudo compensar en plazo las prestaciones pagadas en régimen de pago delegado?',
  correct:
    'Solicitar la devolución del importe ante la entidad gestora o colaboradora correspondiente.',
  distractors: [
    'Solicitar el reintegro directamente al Banco de España.',
    'Compensar fuera de plazo en cualquier momento sin trámite adicional.',
    'Repercutirlo al trabajador beneficiario como descuento salarial obligatorio.',
  ],
  explanation:
    'El art. 20.2 prevé que, de lo no compensado en plazo, "podrá resarcirse solicitando la devolución" ante la entidad gestora o colaboradora. Las otras opciones no están recogidas en el precepto.',
});

add({
  question:
    'Según el art. 21.1 de la Orden de 22/02/1996, ¿quién elabora mensualmente la relación de pensionistas de pensiones no contributivas y con qué finalidad inmediata?',
  correct:
    'El Instituto Nacional de Servicios Sociales o la Comunidad Autónoma gestora, para indicar importes a satisfacer y cuentas a través de las cuales transferir las cantidades.',
  distractors: [
    'La entidad financiera pagadora, para fijar comisiones y gastos del perceptor.',
    'El Ministerio de Economía y Hacienda, para autorizar la adscripción de inmuebles.',
    'El INEM, para ordenar el pago material entre los días 10 y 15.',
  ],
  explanation:
    'El art. 21.1 dispone que el INSERSO o la Comunidad Autónoma "elaborarán mensualmente" la relación "con indicación de los importes" y de "las cuentas" a través de las cuales transferir. Las otras opciones confunden sujetos y materias.',
});

add({
  question:
    'Conforme al art. 22 de la Orden de 22/02/1996, si el beneficiario de una pensión extraordinaria por terrorismo no tenía derecho a pensión ordinaria, ¿cómo se financia el coste íntegro?',
  correct: 'Con cargo a los Presupuestos del Estado.',
  distractors: [
    'Con cargo exclusivo al fondo de maniobra de la TGSS.',
    'Con cargo a los presupuestos de la Mutua correspondiente.',
    'Con cargo a la cuenta corriente del beneficiario mediante cargo retroactivo.',
  ],
  explanation:
    'El art. 22 indica que si "no tuviere derecho" a la ordinaria, el coste íntegro "será financiado con cargo a los Presupuestos del Estado". Las otras opciones no están en el texto.',
});

add({
  question:
    'Según el art. 23.1.2 de la Orden de 22/02/1996, cuando el perceptor en el extranjero solicita materialización por trimestres o semestres naturales vencidos, ¿qué límite se impone sobre intereses?',
  correct: 'Que en ningún caso se generen intereses a favor del beneficiario.',
  distractors: [
    'Que se generen intereses legales desde el devengo.',
    'Que se genere interés compuesto trimestralmente.',
    'Que se aplique el tipo de interés del Banco de España.',
  ],
  explanation:
    'El art. 23.1.2 permite pagos por "trimestres o semestres naturales vencidos" "sin que en ningún caso se generen intereses". Las otras opciones contradicen esa prohibición expresa.',
});

add({
  question:
    'Conforme al art. 24.1 de la Orden de 22/02/1996, ¿a quién se abonan las pensiones o subsidios devengados y no percibidos cuando fallece un beneficiario, con carácter general?',
  correct: 'A sus herederos por derecho civil, a instancia de parte legítima.',
  distractors: [
    'Siempre al cónyuge supérstite, con exclusión de los demás.',
    'Siempre a la entidad financiera pagadora.',
    'Siempre a la Tesorería General sin posibilidad de abono a herederos.',
  ],
  explanation:
    'El art. 24.1 indica que se abonarán "a sus herederos por derecho civil, a instancia de parte legítima". Las otras respuestas introducen reglas exclusivas no previstas.',
});

add({
  question:
    'Según el art. 24.1 de la Orden de 22/02/1996, ¿en qué supuesto NO se aplica el abono a herederos por derecho civil cuando el causante cobraba por abono en cuenta?',
  correct:
    'Cuando la cuenta corriente o libreta de ahorro no estuvieran canceladas en el momento de efectuarse el pago (salvo que ya estuvieran canceladas).',
  distractors: [
    'Cuando existan herederos forzosos acreditados.',
    'Cuando el causante hubiera fallecido el último día del mes.',
    'Cuando el beneficiario fuera pensionista no contributivo.',
  ],
  explanation:
    'El art. 24.1 precisa que lo anterior "no será de aplicación" a prestaciones que "deban ser abonadas ... mediante ... abono en cuenta" salvo que la cuenta "estuvieran ya canceladas". Las otras opciones no son el criterio de excepción señalado.',
});

add({
  question:
    'De acuerdo con el art. 24.1 de la Orden de 22/02/1996, en caso de fallecimiento, ¿hasta cuándo se devenga la pensión y cuándo se abona?',
  correct:
    'Se devenga hasta el último día del mes del fallecimiento y se abona el primer día hábil del mes siguiente.',
  distractors: [
    'Se devenga solo hasta el día del fallecimiento y se abona el mismo día.',
    'Se devenga hasta el último día del trimestre y se abona al cierre del año.',
    'Se devenga hasta el día 15 del mes y se abona el día 20.',
  ],
  explanation:
    'El art. 24.1 establece: "la pensión se devengará hasta el último día del mes" del fallecimiento y "se abonará el primer día hábil del mes siguiente". Las otras fechas no aparecen en el texto.',
});

add({
  question:
    'Conforme al art. 24.5 de la Orden de 22/02/1996, ¿qué efecto tiene la existencia de controversias entre herederos sobre el cobro durante la tramitación?',
  correct: 'Se suspende la tramitación del expediente a resultas de lo que resuelvan los órganos judiciales competentes.',
  distractors: [
    'Se paga automáticamente al primer solicitante, sin suspensión.',
    'Se archiva definitivamente el expediente sin posibilidad de reanudación.',
    'Se transfiere el asunto al Banco de España para arbitraje.',
  ],
  explanation:
    'El art. 24.5 dispone que, cuando surjan "controversias entre los herederos", "se suspenderá la tramitación" a resultas de lo que resuelvan los órganos judiciales. Las demás respuestas contradicen esa suspensión.',
});

add({
  question:
    'Según el art. 24.6 de la Orden de 22/02/1996, si la efectividad económica del abono está condicionada al Impuesto sobre Sucesiones y Donaciones, ¿cuándo se realizan las operaciones de materialización del abono?',
  correct: 'Solo a partir del momento en que quede acreditado el pago o la exención de dicho impuesto.',
  distractors: [
    'Siempre antes de acreditar el impuesto, para evitar demoras.',
    'Solo cuando se haya acreditado el pago del IRPF del causante.',
    'Únicamente cuando el Banco de España certifique el fallecimiento.',
  ],
  explanation:
    'El art. 24.6 establece que, si está condicionada al impuesto, las operaciones "solamente se realizarán a partir del momento" en que se acredite "el pago o la exención". Las otras opciones sustituyen ese requisito por otros no citados.',
});

add({
  question:
    'Conforme al art. 25 de la Orden de 22/02/1996, ¿qué supuestos se incluyen en la regla residual de pagos especiales que abonará la TGSS por los medios que determine?',
  correct:
    'Primeros pagos de pensiones y prestaciones periódicas, pagos de cuantía única y pagos no hechos efectivos en 15 días tras su presentación al cobro si no hay otra forma especial.',
  distractors: [
    'Solo pagos en el extranjero y prestaciones extranjeras en España.',
    'Solo pagos delegados por empresarios.',
    'Exclusivamente pagos de pensiones no contributivas.',
  ],
  explanation:
    'El art. 25 incluye "primeros pagos", "prestaciones de cuantía única" y "importes" no hechos efectivos en "quince días" tras presentación al cobro si no hay forma especial, que se abonarán por medios que la TGSS determine. Las otras opciones recortan indebidamente el ámbito descrito.',
});

add({
  question:
    'Según el art. 27.1.2 de la Orden de 22/02/1996, ¿en qué ventana temporal mensual se efectúa el pago material de prestaciones y subsidios por desempleo?',
  correct: 'Entre los días 10 y 15 de cada mes, ambos inclusive.',
  distractors: ['Entre los días 1 y 5 de cada mes.', 'Entre los días 20 y 25 de cada mes.', 'Solo el último día hábil del mes.'],
  explanation:
    'El art. 27.1.2 fija el periodo: "entre los días 10 y 15 de cada mes, ambos inclusive" (con prórroga si no hay cuatro días hábiles). Las otras opciones no coinciden con el texto.',
});

add({
  question:
    'Conforme al art. 27.2 de la Orden de 22/02/1996, ¿cuándo tiene lugar el pago delegado en desempleo parcial por reducción temporal de jornada?',
  correct:
    'Cuando la reducción se refiere al número de horas diarias, simultaneándose trabajo y prestación.',
  distractors: [
    'Cuando la reducción se efectúa por días completos de trabajo (desempleo total).',
    'Cuando la reducción es inferior a un tercio de la jornada ordinaria.',
    'Siempre que la empresa lo solicite, sin atender a la modalidad de reducción.',
  ],
  explanation:
    'El art. 27.2 precisa que el pago delegado procede cuando la reducción se refiera a "número de horas diarias", "simultaneándose trabajo y prestación", y que "no" se aplica cuando la reducción sea por "días completos" (desempleo total). Las otras opciones contradicen esas reglas.',
});

add({
  question:
    'Según el art. 28.1.2 de la Orden de 22/02/1996, ¿qué tipo de órdenes se utilizan para pagar prestaciones del síndrome tóxico y cómo deben presentarse los documentos a la TGSS?',
  correct:
    'Órdenes de pagos no presupuestarios; los documentos deben presentarse en las Direcciones Provinciales de la TGSS con al menos seis días hábiles de antelación.',
  distractors: [
    'Órdenes de pago presupuestarias; se presentan sin antelación mínima.',
    'Mandamientos judiciales; se presentan solo tras la ejecución material.',
    'Pagos en efectivo; se realizan sin documentación previa.',
  ],
  explanation:
    'El art. 28.1.2 indica que se realizarán "a través de órdenes de pagos no presupuestarios" y que los documentos "deberán ser presentados" en DPs TGSS "al menos con seis días hábiles de antelación". Las otras opciones sustituyen el régimen descrito.',
});

add({
  question:
    'Conforme al art. 29.1 de la Orden de 22/02/1996, ¿sobre qué base se determina la cantidad a cuenta que la TGSS transfiere periódicamente a cada Mutua?',
  correct: 'En base a la recaudación obtenida en el mismo período del ejercicio anterior.',
  distractors: [
    'En base al presupuesto de gastos del Ministerio de Economía y Hacienda.',
    'En base al IPC del ejercicio en curso.',
    'En base a la suma de las pensiones no contributivas impagadas.',
  ],
  explanation:
    'El art. 29.1 prevé que se transfiera a cuenta "una cantidad determinada en base a la recaudación obtenida" en el mismo periodo del "ejercicio anterior". Las otras bases no figuran en el precepto.',
});

add({
  question:
    'Según el art. 30 de la Orden de 22/02/1996, ¿qué se deduce en todo caso antes de transferir a terceros los fondos ingresados en TGSS por su cuenta?',
  correct:
    'Los premios de cobranza y demás gastos de gestión, así como el importe de cualquier crédito de la TGSS frente a tales entidades u organismos.',
  distractors: [
    'Únicamente los gastos notariales y registrales.',
    'Solo el 15% del tipo de licitación de una subasta.',
    'Exclusivamente las mejoras y accesiones de inmuebles adscritos.',
  ],
  explanation:
    'El art. 30 indica que se transferirán "una vez deducidos" los "premios de cobranza y demás gastos de gestión" y "cualquier otro crédito" de la TGSS frente a esas entidades. Las demás opciones mezclan conceptos ajenos al artículo.',
});

add({
  question:
    'De acuerdo con el art. 31.1 de la Orden de 22/02/1996, ¿qué documentación debe remitir la entidad gestora a la TGSS para pagos relativos a servicios transferidos a CCAA financiados con fondos de la Seguridad Social?',
  correct: 'Los documentos contables correspondientes con cargo a los créditos presupuestarios aprobados.',
  distractors: [
    'Un acta de adscripción firmada por representantes de la dirección provincial.',
    'Una declaración judicial de herederos ab intestato.',
    'Una certificación de la pervivencia anual de pensionistas.',
  ],
  explanation:
    'El art. 31.1 prevé que la entidad gestora remitirá "los documentos contables correspondientes" con cargo a créditos aprobados. Las otras opciones se refieren a procedimientos distintos (adscripción, herencia, pervivencia).',
});

// -------------------- RD 696/2018 (gestión financiera) --------------------

add({
  question:
    'Según el art. 1 del RD 696/2018, ¿qué materia desarrolla y ejecuta este reglamento y a qué operaciones se aplica?',
  correct:
    'Desarrolla y ejecuta el TRLGSS (RDL 8/2015) en gestión de recursos financieros; se aplica a ingresos en su circuito financiero, ordenación de pagos, presupuesto monetario y colaboración de entidades financieras.',
  distractors: [
    'Regula únicamente el patrimonio inmobiliario y su enajenación por subasta.',
    'Se aplica solo a los regímenes especiales de funcionarios civiles y fuerzas armadas.',
    'Regula exclusivamente el pago por cheque de primeros pagos de pensiones.',
  ],
  explanation:
    'El art. 1 RD 696/2018 indica que su objeto es el desarrollo del TRLGSS en "gestión de los recursos financieros" y que es de aplicación a "operaciones" de ingresos, ordenación de pagos, "presupuesto monetario" y "colaboración" de entidades financieras. Las otras opciones reducen o desvían el ámbito descrito.',
});

add({
  question:
    'Conforme al art. 1 del RD 696/2018, ¿a qué regímenes NO se aplica este reglamento?',
  correct:
    'A los Regímenes Especiales de Funcionarios Civiles del Estado, Fuerzas Armadas y Personal al servicio de la Administración de Justicia.',
  distractors: [
    'A las Mutuas colaboradoras con la Seguridad Social.',
    'A las entidades gestoras y servicios comunes de la Seguridad Social.',
    'A la Tesorería General de la Seguridad Social.',
  ],
  explanation:
    'El art. 1 indica expresamente que "no será de aplicación" a los Regímenes Especiales de "Funcionarios Civiles", "Fuerzas Armadas" y "Administración de Justicia". Las otras opciones son sujetos a los que sí se aplica según el propio articulado.',
});

add({
  question:
    'Según el art. 2.1 del RD 696/2018, ¿qué condición institucional se atribuye a la TGSS y qué implica sobre el alcance de su gestión?',
  correct:
    'Actúa como "caja única" del sistema y gestiona todos los recursos financieros del mismo.',
  distractors: [
    'Actúa como órgano de fiscalización externa del sistema y gestiona solo recursos presupuestarios.',
    'Actúa como entidad gestora de prestaciones sanitarias y gestiona solo fondos de maniobra.',
    'Actúa como registro público de inventario patrimonial y gestiona solo bienes inmuebles.',
  ],
  explanation:
    'El art. 2.1 RD 696/2018 define a la TGSS "en su condición de caja única" y le atribuye "la gestión de todos los recursos financieros". Las otras opciones atribuyen roles distintos (fiscalización, sanidad, inventario) no previstos en ese artículo.',
});

add({
  question:
    'Conforme al art. 24.2 del RD 696/2018, tras el primer pago de una pensión, ¿cuál es el plazo máximo para que el importe figure en la cuenta del perceptor o a su disposición en la entidad colaboradora?',
  correct: 'Como máximo, el cuarto día natural del mes en que se realice el pago.',
  distractors: [
    'Como máximo, el décimo día natural del mes.',
    'Como máximo, el día 20 de cada mes.',
    'Sin plazo máximo: depende de la entidad financiera.',
  ],
  explanation:
    'El art. 24.2 dispone que deben figurar "el primer día hábil" y, "como máximo, el cuarto día natural" del mes del pago. Las otras opciones inventan plazos o eliminan el límite expreso.',
});

add({
  question:
    'Según el art. 24.4 del RD 696/2018, ¿qué principio se garantiza al beneficiario respecto de la entidad pagadora en territorio nacional?',
  correct:
    'El principio de libre elección de la entidad pagadora entre las figuradas en el Registro de Colaboradores (art. 29).',
  distractors: [
    'La asignación automática de una entidad pagadora sin posibilidad de cambio.',
    'La obligación de elegir siempre el Banco de España como entidad pagadora.',
    'La libre elección solo entre entidades no inscritas en ningún registro.',
  ],
  explanation:
    'El art. 24.4 establece que se garantiza la "libre elección" de la entidad pagadora "entre las figuradas en el Registro de Colaboradores" (art. 29). Las otras opciones niegan o invierten esa garantía.',
});

// -------------------- RD 1221/1992 (patrimonio de la Seguridad Social) --------------------

add({
  question:
    'Conforme al art. 1 del RD 1221/1992, ¿qué régimen supletorio se aplica cuando el real decreto y sus disposiciones complementarias no prevén una cuestión?',
  correct:
    'Se aplica la legislación reguladora del Patrimonio del Estado, con sustitución de referencias (Ministro de Economía y Hacienda, etc.) por los órganos equivalentes indicados.',
  distractors: [
    'Se aplica automáticamente el Código Penal.',
    'Se aplica únicamente la Ley 19/1985, Cambiaria y del Cheque.',
    'No se aplica ninguna norma supletoria: rige el vacío legal.',
  ],
  explanation:
    'El art. 1 RD 1221/1992 dispone que, "en lo que ... no se halle previsto", "se aplicará la legislación reguladora del Patrimonio del Estado", precisando la sustitución de referencias ("se entenderán hechas" al Ministro de Trabajo y Seguridad Social, DG TGSS, Direcciones Provinciales, etc.). Las demás opciones no se sostienen en el texto.',
});

add({
  question:
    'Según el art. 2 del RD 1221/1992, ¿a qué sujetos se aplica la regulación del real decreto en las cuestiones que afecten al patrimonio único?',
  correct:
    'A Entidades Gestoras y Servicios Comunes de la Seguridad Social, así como a las Mutuas de Accidentes de Trabajo y Enfermedades Profesionales.',
  distractors: [
    'Solo a los Regímenes Especiales de funcionarios civiles y fuerzas armadas.',
    'Exclusivamente al Banco de España y entidades financieras privadas.',
    'Únicamente a los tribunales y autoridades administrativas que dicten embargos.',
  ],
  explanation:
    'El art. 2 RD 1221/1992 afirma que es de aplicación a "Entidades Gestoras y Servicios Comunes" y a "Mutuas" en lo que afecte a bienes y recursos del patrimonio único. Las demás opciones citan sujetos no indicados en el artículo.',
});

add({
  question:
    'Conforme al art. 3.1 del RD 1221/1992, ¿a nombre de quién se titularán los bienes, derechos y demás recursos del patrimonio de la Seguridad Social?',
  correct: 'A nombre de la Tesorería General de la Seguridad Social.',
  distractors: [
    'A nombre del Ministerio de Economía y Hacienda.',
    'A nombre de la entidad gestora que use el bien en cada caso.',
    'A nombre del Banco de España.',
  ],
  explanation:
    'El art. 3.1 establece que "se titularán a nombre de la Tesorería General de la Seguridad Social". Las otras opciones contradicen la regla básica de titularidad del precepto.',
});

add({
  question:
    'Según el art. 3.2 del RD 1221/1992, ¿qué trámite consultivo es obligatorio en los expedientes de inscripción registral de bienes y derechos de la Seguridad Social?',
  correct:
    'Oír a la Asesoría Jurídica de la TGSS antes de presentar los títulos en los registros públicos.',
  distractors: [
    'Oír al Registro Mercantil antes de presentar títulos en el Registro de la Propiedad.',
    'Oír al Consejo de Ministros antes de cualquier inscripción registral.',
    'Oír a las entidades financieras colaboradoras antes de cada asiento.',
  ],
  explanation:
    'El art. 3.2 indica que "deberá ser oída la Asesoría Jurídica" "antes de la presentación de los títulos" en los "Registros Públicos". Las otras opciones añaden trámites no contemplados.',
});

add({
  question:
    'Conforme al art. 4 del RD 1221/1992, ¿a quién corresponde la representación legal para realizar los actos necesarios en relación con el patrimonio de la Seguridad Social?',
  correct: 'Al Director general de la Tesorería General de la Seguridad Social.',
  distractors: [
    'Al Interventor General de la Seguridad Social.',
    'A la dirección provincial de la entidad gestora usuaria.',
    'A las Mutuas de Accidentes de Trabajo y Enfermedades Profesionales, siempre.',
  ],
  explanation:
    'El art. 4 atribuye al "Director general" de la TGSS la realización de actos necesarios "para el desempeño de las funciones" sobre el patrimonio. Las demás opciones no están atribuidas así en el artículo.',
});

add({
  question:
    'Según el art. 5.2 del RD 1221/1992, ¿qué eficacia frente a terceros tienen los datos del Inventario general y sus resultados estadísticos?',
  correct:
    'No surten efectos frente a terceros ni pueden usarse para hacer valer derechos frente a la TGSS.',
  distractors: [
    'Tienen efectos constitutivos de propiedad frente a terceros.',
    'Equivalen a un registro público con fe pública.',
    'Otorgan automáticamente derechos de uso al organismo consultante.',
  ],
  explanation:
    'El art. 5.2 declara que los datos "no surtirán efectos frente a terceros" ni podrán utilizarse "para hacer valer derechos" frente a la TGSS. Las otras opciones atribuyen efectos que el artículo niega.',
});

add({
  question:
    'Conforme al art. 5.3 del RD 1221/1992, ¿qué requisito del Inventario garantiza el acceso a los documentos de los que resulte la información registrada?',
  correct: 'El requisito "Documental".',
  distractors: ['El requisito "Público".', 'El requisito "Histórico".', 'El requisito "Interoperable".'],
  explanation:
    'El art. 5.3 enumera requisitos y dice que el Inventario será "Documental" y que "garantizará el acceso a los documentos". Los otros requisitos se refieren a accesibilidad, conservación de cambios o interoperabilidad, pero no a ese acceso documental.',
});

add({
  question:
    'Según el art. 6.1 del RD 1221/1992, ¿qué prohibición se impone a Tribunales y Autoridades Administrativas respecto del patrimonio de la Seguridad Social?',
  correct:
    'No pueden dictar providencia de embargo ni despachar mandamientos de ejecución contra bienes y derechos del patrimonio, ni contra sus rentas, frutos o productos.',
  distractors: [
    'Solo pueden embargar rentas, pero no bienes.',
    'Pueden embargar si el valor del bien excede de 20 millones de euros.',
    'Pueden embargar si existe autorización del Consejo de Ministros.',
  ],
  explanation:
    'El art. 6.1 establece la inembargabilidad: "Ningún Tribunal ni Autoridad Administrativa podrá dictar providencia de embargo" ni "despachar mandamientos de ejecución" contra bienes y derechos ni contra "rentas, frutos o productos". Las otras opciones inventan excepciones no previstas.',
});

add({
  question:
    'Conforme al art. 6.2 del RD 1221/1992, si para pagar una obligación derivada de resolución judicial se requiere crédito extraordinario o suplemento y el crédito no es ampliable, ¿en qué plazo debe solicitarse?',
  correct: 'Dentro de los tres meses siguientes al día de la notificación de la resolución judicial.',
  distractors: [
    'Dentro de los quince días siguientes a la presentación al cobro.',
    'Dentro de los diez días máximos para manifestar interés en adscripción.',
    'Dentro de los noventa días desde la entrada en vigor del real decreto.',
  ],
  explanation:
    'El art. 6.2 indica que, si fuese necesario un crédito extraordinario o suplemento, "deberá solicitarse ... dentro de los tres meses siguientes" a la notificación. Las otras opciones mezclan plazos de otros artículos o inventados.',
});

add({
  question:
    'Según el art. 7.1 del RD 1221/1992, ¿qué órgano tiene atribuida la adquisición, disposición y administración de los bienes del patrimonio de la Seguridad Social, bajo tutela ministerial?',
  correct: 'La Tesorería General de la Seguridad Social.',
  distractors: ['Las Direcciones Provinciales de las entidades gestoras.', 'Las entidades financieras colaboradoras.', 'Las Comunidades Autónomas, en todo caso.'],
  explanation:
    'El art. 7.1 atribuye a la TGSS "la adquisición, disposición y administración" bajo "dirección, vigilancia y tutela" del Ministerio. Las otras opciones no reflejan la atribución principal del artículo.',
});

add({
  question:
    'Conforme al art. 8.1 del RD 1221/1992, ¿cuál de las siguientes NO es una forma de adquisición mencionada expresamente para bienes inmuebles por la TGSS?',
  correct: 'A través de subasta electrónica obligatoria en todo caso.',
  distractors: [
    'Por herencia, legado o donación.',
    'Por prescripción.',
    'Por atribución de la Ley o a título oneroso.',
  ],
  explanation:
    'El art. 8.1 enumera modos: "atribución de la Ley", "a título oneroso", "herencia, legado o donación", "prescripción" u otros admitidos. No menciona "subasta electrónica obligatoria" como modo de adquisición. Las otras opciones sí aparecen en el listado del artículo.',
});

add({
  question:
    'Según el art. 8.3 del RD 1221/1992, ¿qué garantía se impone en la aceptación de herencias a favor de la Seguridad Social?',
  correct: 'La aceptación de la herencia se entiende siempre hecha a beneficio de inventario.',
  distractors: [
    'La aceptación de la herencia se entiende siempre pura y simple.',
    'La aceptación se realiza siempre por las Comunidades Autónomas.',
    'La aceptación se condiciona a la subasta previa del bien heredado.',
  ],
  explanation:
    'El art. 8.3 afirma: "La aceptación de la herencia se entenderá siempre hecha a beneficio de inventario". Las otras opciones contradicen o añaden condicionantes no previstos.',
});

add({
  question:
    'Conforme al art. 9.2 del RD 1221/1992, ¿qué regla general se establece para adquisiciones de inmuebles a título oneroso y por qué procedimiento?',
  correct: 'Las realiza la TGSS cualquiera que sea el valor y tienen lugar mediante concurso público.',
  distractors: [
    'Las realiza la entidad gestora interesada y se adjudican por sorteo.',
    'Las realiza el Ministerio de Hacienda y se formalizan por adjudicación directa siempre.',
    'Las realiza la Comunidad Autónoma y se aprueban por decreto autonómico.',
  ],
  explanation:
    'El art. 9.2 fija que las adquisiciones onerosas "se efectuarán por la Tesorería General" "cualquiera que sea el valor" y "mediante concurso público". Las demás opciones contradicen el órgano y procedimiento previstos.',
});

add({
  question:
    'Según el art. 9.4 del RD 1221/1992, ¿qué condición previa (además de autorización ministerial) se exige para que la TGSS pueda adquirir directamente inmuebles en ciertos casos?',
  correct: 'Informe de la Intervención General de la Seguridad Social.',
  distractors: ['Informe del Registro Mercantil.', 'Informe del Banco de España.', 'Informe de la entidad financiera pagadora.'],
  explanation:
    'El art. 9.4 permite adquisición directa "previo informe de la Intervención General de la Seguridad Social" y "previa autorización". Las otras opciones no aparecen en el artículo.',
});

add({
  question:
    'Conforme al art. 12.1 del RD 1221/1992, ¿qué acto patrimonial realiza la TGSS respecto de inmuebles necesarios para entidades gestoras y servicios comunes?',
  correct: 'Los adscribe a dichas entidades y servicios comunes para el desenvolvimiento de sus servicios.',
  distractors: [
    'Los enajena automáticamente por subasta pública.',
    'Los embarga para garantizar obligaciones judiciales.',
    'Los transfiere a título gratuito a entidades financieras.',
  ],
  explanation:
    'El art. 12.1 indica que compete a la TGSS "adscribir" los inmuebles necesarios "a las entidades gestoras y a los servicios comunes". Las otras opciones se refieren a actos distintos y no previstos.',
});

add({
  question:
    'Según el art. 12.3 del RD 1221/1992, ¿qué documento se suscribe para formalizar la adscripción de un inmueble y dónde se conserva el original?',
  correct:
    'Se suscribe un acta de adscripción; el original queda en poder de la TGSS y una copia en la entidad destinataria.',
  distractors: [
    'Se suscribe una sentencia judicial; el original queda en el Registro Civil.',
    'Se suscribe un contrato mercantil; el original queda en la entidad financiera.',
    'Se suscribe un convenio colectivo; el original queda en la empresa.',
  ],
  explanation:
    'El art. 12.3 prevé "un acta de adscripción" y señala que el "original" quedará en poder de la TGSS y "una copia" en la entidad destinataria. Las demás respuestas describen documentos ajenos a la adscripción patrimonial.',
});

add({
  question:
    'Conforme al art. 12 bis.1 del RD 1221/1992, ¿quién es competente para adscribir bienes inmuebles del patrimonio de la Seguridad Social a otras administraciones públicas distintas de entidades gestoras y servicios comunes?',
  correct: 'La persona titular del Ministerio de Inclusión, Seguridad Social y Migraciones.',
  distractors: ['El Director general de la TGSS, sin intervención ministerial.', 'El Consejo de Ministros en todo caso.', 'La Dirección General del Patrimonio del Estado.'],
  explanation:
    'El art. 12 bis.1 atribuye la competencia de adscripción a "la persona titular del Ministerio de Inclusión, Seguridad Social y Migraciones". Las otras opciones no coinciden con la atribución expresa.',
});

add({
  question:
    'Según el art. 12 bis.7 del RD 1221/1992, ¿cuál de las siguientes NO es una causa de desadscripción de oficio de bienes inmuebles adscritos a otras administraciones?',
  correct: 'Que el inmueble haya sido mejorado energéticamente durante el periodo de adscripción.',
  distractors: ['Transcurso del plazo señalado en el acuerdo de adscripción.', 'No uso del bien inmueble.', 'Incumplimiento de las obligaciones del art. 12 bis.5.'],
  explanation:
    'El art. 12 bis.7 lista causas: "cumplimiento del fin", "transcurso del plazo", "no uso", "cambio de destino", "incumplimiento" del apartado 5, etc. No figura como causa que se haya "mejorado" el inmueble; al contrario, las mejoras se integran sin indemnización (mismo artículo).',
});

add({
  question:
    'Conforme al art. 15.1 del RD 1221/1992 (enajenación), ¿qué órgano autoriza la enajenación de un inmueble cuyo valor según tasación pericial no exceda de 20 millones de euros?',
  correct: 'El Ministerio de Inclusión, Seguridad Social y Migraciones.',
  distractors: ['El Consejo de Ministros en todo caso.', 'La Dirección Provincial de la TGSS sin autorización externa.', 'La Comunidad Autónoma en cuyo territorio radique el inmueble.'],
  explanation:
    'El art. 15.1 exige autorización del "Ministerio de Inclusión, Seguridad Social y Migraciones" cuando el valor "no exceda de 20 millones de euros", reservando al Consejo de Ministros los demás casos. Las otras opciones contradicen la regla de competencia.',
});

add({
  question:
    'Según el art. 15.2 del RD 1221/1992, ¿durante cuánto tiempo mantiene su validez la tasación pericial desde su aprobación por la Dirección General de la TGSS?',
  correct: 'Durante un año, contado desde su aprobación.',
  distractors: ['Durante tres meses.', 'Durante cinco años.', 'No tiene plazo de validez: es indefinida.'],
  explanation:
    'El art. 15.2 dispone que "La tasación mantendrá su validez durante el plazo de un año" desde su aprobación. Las otras duraciones no aparecen en el texto.',
});

add({
  question:
    'Conforme al art. 16.1 del RD 1221/1992 (permuta), ¿qué límite se impone a la diferencia de valor entre los bienes a permutar según tasación?',
  correct:
    'No puede ser superior al 50% del que tenga mayor valor; si fuera mayor, se tramita como enajenación con pago parcial en especie.',
  distractors: [
    'No puede superar el 15% del valor del bien.',
    'No hay límite de diferencia de valor.',
    'Debe ser exactamente del 50% para ser válida.',
  ],
  explanation:
    'El art. 16.1 establece que la diferencia "no sea superior al 50 por ciento" del de mayor valor; si es mayor, "el expediente se tramitará como enajenación" con parte del precio en especie. Las otras opciones alteran o eliminan ese límite.',
});

add({
  question:
    'Según el art. 8.4 del RD 1221/1992, ¿qué afirmación describe correctamente la usucapión (prescripción adquisitiva) respecto de bienes inmuebles de la Seguridad Social?',
  correct:
    'Se rige por las leyes comunes; además, los particulares pueden usucapir a su favor bienes de la Seguridad Social conforme a dichas leyes.',
  distractors: [
    'Está prohibida en todo caso: los particulares nunca pueden usucapir bienes de la Seguridad Social.',
    'Solo puede operar a favor de la TGSS, pero nunca a favor de particulares.',
    'Se rige por un procedimiento administrativo especial distinto de las leyes comunes.',
  ],
  explanation:
    'El art. 8.4 dispone que la prescripción adquisitiva "se regirá por las leyes comunes" y añade que "Los particulares podrán usucapir" bienes de la Seguridad Social "de acuerdo con las leyes comunes". Las demás opciones contradicen literalmente este inciso.',
});

add({
  question:
    'Conforme al art. 9.1 del RD 1221/1992, ¿quién inicia y sigue el expediente administrativo para una adquisición onerosa de inmuebles que un organismo de la Seguridad Social precisa para sus fines?',
  correct:
    'La Entidad Gestora o Servicio Común interesados en la adquisición, tras acordarlo el organismo correspondiente y dar traslado a la TGSS.',
  distractors: [
    'La Intervención General de la Seguridad Social, con carácter exclusivo.',
    'La entidad financiera colaboradora encargada del pago de prestaciones.',
    'El Registro de la Propiedad, mediante expediente registral de oficio.',
  ],
  explanation:
    'El art. 9.1 indica que el acuerdo lo adopta el organismo y se da traslado a la TGSS, pero el expediente "lo iniciará y seguirá la Entidad Gestora o Servicio Común interesados". Las otras opciones atribuyen la instrucción a órganos no previstos.',
});

add({
  question:
    'Según el art. 9.1 del RD 1221/1992, ¿qué debe acreditarse y describirse en el expediente de adquisición onerosa de un inmueble?',
  correct:
    'La necesidad del inmueble para el cumplimiento de fines, sus características fundamentales y los informes técnicos/administrativos que procedan.',
  distractors: [
    'Únicamente la identidad del arrendatario y el importe de la renta mensual.',
    'Solo la autorización del Consejo de Ministros, sin justificar necesidad.',
    'Exclusivamente el informe del Banco de España y el tipo de interés aplicable.',
  ],
  explanation:
    'El art. 9.1 exige que "se acreditará la necesidad", se "describirán las características fundamentales" y se acompañarán "informes técnicos, administrativos". Las otras opciones cambian el contenido por extremos no citados.',
});

add({
  question:
    'Conforme al art. 9.3.a) del RD 1221/1992, ¿dónde debe publicarse la resolución de convocatoria del concurso para adquirir inmuebles y qué debe contener el anuncio, entre otros extremos?',
  correct:
    'En el "Boletín Oficial del Estado"; debe constar expresamente el presupuesto de adquisición, la fianza provisional (en su caso), plazos/lugares de ofertas y fecha/lugar de apertura.',
  distractors: [
    'En el tablón interno del organismo; solo debe constar el presupuesto, sin más.',
    'En el Registro de la Propiedad; debe constar únicamente la descripción registral.',
    'En un diario privado; debe constar solo el tipo de licitación y el adjudicatario.',
  ],
  explanation:
    'El art. 9.3.a) exige publicación en el "Boletín Oficial del Estado" y detalla el contenido del anuncio ("presupuesto", "fianza provisional", plazos/lugares de ofertas y apertura). Las otras opciones no se ajustan a esa forma y contenido.',
});

add({
  question:
    'Según el art. 9.3.b) del RD 1221/1992, en la Mesa del concurso para adquisición de inmuebles, ¿qué miembro actúa como secretario y con qué particularidad respecto del voto?',
  correct: 'Un funcionario de la entidad actúa como Secretario, sin voto.',
  distractors: [
    'El Interventor Delegado actúa como Secretario, sin voto.',
    'El Jefe del Servicio Jurídico actúa como Secretario, con voto de calidad.',
    'El Subdirector general de la TGSS actúa como Secretario, con voto.',
  ],
  explanation:
    'El art. 9.3.b) incluye "Un funcionario de la Entidad que actuará como Secretario, sin voto". Las otras opciones asignan el rol a otros miembros o alteran la regla de "sin voto".',
});

add({
  question:
    'Conforme al art. 9.3 del RD 1221/1992, ¿cómo se decide un empate en la adjudicación provisional del concurso de adquisición y qué posibilidad tienen los vocales disidentes?',
  correct:
    'El empate lo decide el voto del Presidente; los vocales disidentes pueden formular por escrito voto reservado expresando sus razones.',
  distractors: [
    'El empate se resuelve por sorteo y los disidentes no pueden dejar constancia.',
    'El empate lo decide el Interventor Delegado y el disenso se comunica oralmente.',
    'El empate se resuelve por orden de llegada y el disenso se eleva al BOE.',
  ],
  explanation:
    'El art. 9.3 establece que en caso de empate decide "el del Presidente" y que los vocales que disientan podrán formular "voto reservado" por escrito. Las otras opciones inventan criterios no previstos.',
});

add({
  question:
    'Conforme al art. 9.4 del RD 1221/1992, ¿en cuál de estos supuestos puede la TGSS adquirir directamente bienes inmuebles (previo informe y autorización) sin concurso público?',
  correct:
    'Cuando el propietario sea otra Administración pública o, en general, una persona del sector público.',
  distractors: [
    'Cuando el inmueble sea de uso sanitario, sin más requisitos.',
    'Siempre que el bien esté en Madrid.',
    'Cuando lo pida el adjudicatario de una subasta fallida sin justificar nada.',
  ],
  explanation:
    'El art. 9.4.a) prevé adquisición directa cuando el propietario sea "otra Administración pública" o una persona del "sector público" (con definición adicional). Las otras opciones no constituyen supuestos del artículo.',
});

add({
  question:
    'Según el art. 9.4 del RD 1221/1992, además de la adquisición directa de inmuebles, ¿qué otro derecho real puede acordarse, a título oneroso o gratuito, sobre terrenos de terceros?',
  correct: 'La constitución de derechos de superficie.',
  distractors: ['La constitución de hipotecas a favor de particulares.', 'La transferencia automática del dominio pleno.', 'La expropiación forzosa sin expediente.'],
  explanation:
    'El art. 9.4 añade que la Entidad interesada podrá proponer y la TGSS acordar la "constitución ... de derechos de superficie" sobre terrenos de terceros. Las otras opciones no aparecen y no equivalen a ese derecho específico.',
});

add({
  question:
    'Conforme al art. 10.1 del RD 1221/1992, ¿quién autoriza los contratos de adquisición de inmuebles que precise el Instituto Nacional de la Salud y qué requisito previo se exige?',
  correct:
    'El Director general del Instituto Nacional de la Salud, previo informe de la TGSS.',
  distractors: [
    'El Director general de la TGSS, sin informe previo.',
    'El Consejo de Ministros, siempre.',
    'La dirección provincial competente del Registro de la Propiedad.',
  ],
  explanation:
    'El art. 10.1 indica que corresponde al "Director general del Instituto Nacional de la Salud" autorizar, "previo informe" de la TGSS. Las demás opciones alteran el órgano competente o eliminan el informe.',
});

add({
  question:
    'Según el art. 10.1 del RD 1221/1992, ¿qué autorización adicional es necesaria cuando el contrato de adquisición del INSALUD supera 100.000.000 de pesetas?',
  correct: 'La autorización del Ministro de Sanidad y Consumo.',
  distractors: ['La autorización del Ministro de Trabajo y Asuntos Sociales.', 'La autorización del Consejo de Ministros en todo caso.', 'No se requiere autorización adicional por cuantía.'],
  explanation:
    'El art. 10.1 establece que si la cuantía es superior a "100.000.000 de pesetas" será necesaria la autorización del "Ministro de Sanidad y Consumo". Las otras opciones no coinciden con el texto.',
});

add({
  question:
    'Conforme al art. 10.2 del RD 1221/1992, ¿quién puede autorizar la adquisición directa de inmuebles por el INSALUD por peculiaridades o urgencia y con qué informes previos?',
  correct:
    'El Ministro de Sanidad y Consumo, previo informe de la TGSS y de la Intervención General de la Seguridad Social.',
  distractors: [
    'El Director general del INSALUD, sin informes previos.',
    'La entidad financiera colaboradora, con informe del Registro Mercantil.',
    'El Ministro de Inclusión, Seguridad Social y Migraciones, sin informe de IGSS.',
  ],
  explanation:
    'El art. 10.2 permite la adquisición directa cuando el Ministro "apreciando las peculiaridades" o "urgencia" y "previo informe" de la TGSS y la IGSS la autorice. Las otras opciones cambian autoridad e informes exigidos.',
});

add({
  question:
    'Conforme al art. 11 del RD 1221/1992, ¿qué conjunto de actuaciones realiza la TGSS tras la adquisición de un inmueble, además de la formalización administrativa o notarial?',
  correct:
    'La inscripción en el Registro de la Propiedad, la adscripción al órgano que acordó la adquisición y la inclusión en el Inventario de Bienes y Derechos.',
  distractors: [
    'El pago material de prestaciones y subsidios por desempleo.',
    'La cancelación de cuentas bancarias de pensionistas fallecidos.',
    'La determinación de la secuencia equilibrada A/B/C/D de exámenes.',
  ],
  explanation:
    'El art. 11 atribuye a la TGSS trámites para "inscripción" registral, "adscripción" al órgano adquirente y "inclusión" en el Inventario. Las otras opciones son materias ajenas al artículo.',
});

add({
  question:
    'Según el bloque inmediatamente anterior al art. 15 del RD 1221/1992 (regla previa de disposición), ¿qué condición debe cumplirse para poder disponer de un inmueble tras comunicarlo a entidades gestoras/servicios comunes y mutuas?',
  correct:
    'Que en un plazo máximo de diez días ninguna entidad haya manifestado de forma expresa y justificada su interés en la adscripción del bien o derecho.',
  distractors: [
    'Que todas las entidades manifiesten su desinterés de forma tácita en 48 horas.',
    'Que exista siempre informe favorable del Banco de España.',
    'Que se haya celebrado una subasta electrónica obligatoria antes de la comunicación.',
  ],
  explanation:
    'El texto previo al art. 15 establece que, para que la disposición se lleve a cabo, será necesario que "en el plazo máximo de diez días" ninguna entidad haya manifestado "de forma expresa y justificada" interés en la adscripción. Las otras respuestas no aparecen en ese párrafo.',
});

add({
  question:
    'Conforme al art. 15.4 del RD 1221/1992, si la primera subasta queda desierta, ¿cuántas subastas sucesivas más pueden celebrarse y qué margen de reducción del tipo puede aplicarse en cada nueva subasta?',
  correct:
    'Hasta tres subastas sucesivas más; el tipo puede reducirse hasta un 15% en cada nueva subasta por resolución motivada.',
  distractors: [
    'Solo una subasta adicional; el tipo se reduce exactamente un 50%.',
    'Hasta cinco subastas adicionales; el tipo se reduce sin límite.',
    'No se permiten nuevas subastas: debe acudirse siempre a adjudicación directa.',
  ],
  explanation:
    'El art. 15.4 prevé que, si queda desierta la primera subasta, podrán celebrarse "hasta tres subastas sucesivas más" y que el tipo podrá "reducirse hasta en un 15 por ciento" en cada nueva subasta mediante "resolución motivada". Las otras opciones contradicen estos límites.',
});

add({
  question:
    'Según el art. 15.4 del RD 1221/1992, ¿a quién corresponde la resolución motivada de reducción del tipo de licitación en subastas sucesivas y qué autorización previa exige?',
  correct:
    'A la persona titular de la dirección provincial de la TGSS donde radique el inmueble, previa autorización de la persona titular de la Dirección General de la TGSS.',
  distractors: [
    'Al Consejo de Ministros, sin necesidad de autorización previa.',
    'Al Jefe del Servicio Jurídico de la entidad interesada, con autorización del BOE.',
    'A la entidad financiera colaboradora, previa autorización del Banco de España.',
  ],
  explanation:
    'El art. 15.4 indica que la resolución corresponde a la "persona titular de la dirección provincial" donde radique el inmueble, "previa autorización" de la persona titular de la "Dirección General" de la TGSS. Las demás opciones no se ajustan al texto.',
});

add({
  question:
    'Conforme al art. 15.5 del RD 1221/1992, cuando varios interesados se encuentran en un mismo supuesto de adjudicación directa, ¿cómo se resuelve la adjudicación?',
  correct: 'A favor de quien ofrezca el precio más alto.',
  distractors: [
    'A favor del primero que presentara solicitud.',
    'A favor de la entidad sin ánimo de lucro, siempre.',
    'Mediante sorteo ante notario.',
  ],
  explanation:
    'El art. 15.5 establece que, si varios interesados están en el mismo supuesto, "se resolverá a favor de quién ofrezca el precio más alto". Las otras opciones introducen criterios no previstos.',
});

add({
  question:
    'Según el art. 15.6 del RD 1221/1992, la comunicación al solicitante del propósito de vender un inmueble (con precio y términos) ¿qué efecto tiene sobre un eventual derecho del solicitante a la enajenación?',
  correct: 'Ninguno: en ningún caso genera derecho alguno a la enajenación en su favor.',
  distractors: [
    'Genera un derecho preferente automático de adquisición.',
    'Constituye por sí sola un contrato perfecto de compraventa.',
    'Obliga a la TGSS a adjudicarle el bien aunque no deposite garantía.',
  ],
  explanation:
    'El art. 15.6 indica expresamente que la comunicación y su cumplimiento "en ningún caso generan derecho alguno" a la enajenación en favor del solicitante. Las otras opciones afirman efectos que el artículo niega.',
});

add({
  question:
    'Conforme al art. 15.6 del RD 1221/1992, para continuar el procedimiento de enajenación tras esa comunicación, ¿qué debe hacer el interesado y qué consecuencia se prevé si incumple sus obligaciones tras acordarse la venta?',
  correct:
    'Aceptar el precio y términos y efectuar el depósito en plazo; si no atiende sus obligaciones, se resuelve la venta con pérdida del depósito constituido como garantía.',
  distractors: [
    'Pagar solo el 15% del precio y, si incumple, conserva el depósito.',
    'No es necesario depósito; el incumplimiento se subsana sin consecuencias.',
    'Basta con manifestar interés verbal; si incumple, se adjudica automáticamente a su favor.',
  ],
  explanation:
    'El art. 15.6 exige "aceptar el precio" y "efectuar ... el depósito"; y prevé que, si el adquirente no atiende sus obligaciones, "se resolverá" con "pérdida del depósito". Las otras opciones contradicen estos requisitos y consecuencias.',
});

add({
  question:
    'Según el art. 16.2 del RD 1221/1992 (permuta), ¿qué informes deben constar en el expediente y en qué caso se exige informe de la Intervención General de la Seguridad Social?',
  correct:
    'Debe constar el informe del Servicio Jurídico; y si el valor del bien supera 1 millón de euros, también el informe de la Intervención General de la Seguridad Social.',
  distractors: [
    'Solo es necesario informe de la entidad financiera colaboradora.',
    'Solo es necesario informe de la Dirección Provincial del Registro de la Propiedad.',
    'Siempre es obligatorio informe de la IGSS, aunque el valor sea inferior a 1 millón.',
  ],
  explanation:
    'El art. 16.2 exige "informe del Servicio Jurídico" y, cuando el valor supere "1 millón de euros", el informe de la "Intervención General". Las otras opciones sustituyen informes o alteran el umbral previsto.',
});

add({
  question:
    'Según el art. 16 quater.5 del RD 1221/1992, ¿cuál es el plazo máximo inicial de una cesión de uso y cuál es el límite absoluto incluyendo prórrogas?',
  correct:
    'Plazo máximo inicial de 20 años; incluidas prórrogas, no puede superar 30 años.',
  distractors: [
    'Plazo máximo inicial de 30 años; incluidas prórrogas, 40 años.',
    'Plazo máximo inicial de 10 años; no se permiten prórrogas.',
    'Plazo máximo inicial indefinido; las prórrogas son ilimitadas.',
  ],
  explanation:
    'El art. 16 quater.5 indica: "El plazo máximo ... será de veinte años" y que "en ningún caso" las prórrogas podrán suponer un plazo "superior a treinta años". Las otras opciones contradicen esos límites.',
});

add({
  question:
    'Conforme a la disposición adicional cuarta del RD 1221/1992, ¿en qué plazo deben las Mutuas remitir certificación detallada y valorada de bienes inventariables?',
  correct: 'En el plazo de noventa días hábiles, contados a partir del siguiente al de la entrada en vigor del real decreto.',
  distractors: ['En el plazo de diez días naturales.', 'En el plazo de un año desde su constitución.', 'No existe obligación temporal de remisión.'],
  explanation:
    'La disposición adicional cuarta establece que remitirán "en el plazo de noventa días hábiles" desde el día siguiente a la entrada en vigor una certificación con relación detallada y valorada. Las otras opciones no se ajustan al texto.',
});

// -------------------- Final assembly --------------------

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
console.log(
  `OK ${OUT_FILE} count=${questions.length} dist=${JSON.stringify(dist)} maxRun=${maxRun} seqStart=${seqStart}`,
);

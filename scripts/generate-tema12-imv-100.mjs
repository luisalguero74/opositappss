#!/usr/bin/env node
/**
 * Generates 100 hard test questions strictly from the provided legal text:
 * Ley 19/2021, de 20 de diciembre, por la que se establece el ingreso mínimo vital.
 * Output (repo root):
 *   TEMA 12_ESPECÍFICO_Prestaciones no contributivas y asistenciales El ingreso mínimo vital.JSON
 *
 * NOTE: This script encodes questions manually (high-quality, text-anchored), then:
 * - deterministically shuffles
 * - re-keys correct options to a balanced A/B/C/D sequence (25 each; maxRun<=2)
 * - validates schema + quotes + citations
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
  if (total % letters.length !== 0) {
    throw new Error(`total must be divisible by 4; got ${total}`);
  }
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

  if (!backtrack()) {
    throw new Error('Unable to build balanced A/B/C/D sequence with maxRun<=2');
  }

  // Anti-periodic sanity: avoid simple repeating patterns (period 1..8)
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
      /\bdisposici\u00f3n\b/i.test(q.explanation) ||
      /\bdisp\./i.test(q.explanation);
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

const OUT_FILE = 'TEMA 12_ESPECÍFICO_Prestaciones no contributivas y asistenciales El ingreso mínimo vital.JSON';
const TOTAL = 120;

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

// 1
add({
  question:
    'Según el art. 1, ¿cuál es el objeto de la Ley 19/2021 respecto del ingreso mínimo vital?',
  correct:
    'Crear y regular el IMV como prestación para prevenir el riesgo de pobreza y exclusión social en situación de vulnerabilidad.',
  distractors: [
    'Regular exclusivamente un programa autonómico de rentas mínimas, sin intervención del sistema de la Seguridad Social.',
    'Establecer una ayuda de pago único para situaciones de emergencia social, sin periodicidad mensual.',
    'Crear una prestación contributiva vinculada únicamente a cotizaciones previas del solicitante.',
  ],
  explanation:
    'El art. 1 indica que la Ley tiene por objeto la "creación y regulación del ingreso mínimo vital" como prestación dirigida a prevenir el riesgo de pobreza y exclusión social cuando exista "situación de vulnerabilidad". Las otras opciones contradicen la naturaleza (no contributiva) y el objeto descrito.',
});

// 2
add({
  question:
    'Conforme al art. 2.1, ¿cómo se configura el ingreso mínimo vital en términos de derecho y finalidad?',
  correct:
    'Como derecho subjetivo a una prestación económica que garantiza un nivel mínimo de renta para mejorar oportunidades de inclusión social y laboral.',
  distractors: [
    'Como una subvención discrecional condicionada a disponibilidad presupuestaria anual sin reconocimiento de derecho subjetivo.',
    'Como una prestación en especie destinada exclusivamente a servicios sociales municipales.',
    'Como una prestación económica contributiva ligada a la base de cotización del solicitante.',
  ],
  explanation:
    'El art. 2.1 lo define como "derecho subjetivo a una prestación de naturaleza económica" que "garantiza un nivel mínimo de renta" y busca "mejora de oportunidades reales de inclusión social y laboral". Las demás opciones niegan el derecho subjetivo o alteran la naturaleza económica/no contributiva.',
});

// 3
add({
  question:
    'Según el art. 2.2, ¿en qué marco se integra el ingreso mínimo vital dentro del sistema de Seguridad Social?',
  correct:
    'Forma parte de la acción protectora como prestación económica en su modalidad no contributiva, en desarrollo del art. 41 de la Constitución.',
  distractors: [
    'Es una prestación contributiva integrada únicamente en la protección por desempleo del título III de la LGSS.',
    'Queda fuera de la acción protectora y se articula solo como ayuda asistencial de entidades locales.',
    'Se integra como prestación sanitaria, no económica, del sistema público de salud.',
  ],
  explanation:
    'El art. 2.2 afirma que el IMV "forma parte de la acción protectora del sistema de la Seguridad Social como prestación económica en su modalidad no contributiva" y lo vincula al "artículo 41 de la Constitución Española". Las otras opciones cambian modalidad o naturaleza.',
});

// 4
add({
  question:
    'Conforme al art. 3.a), ¿qué garantiza el ingreso mínimo vital y cómo lo hace?',
  correct:
    'Garantiza un nivel mínimo de renta cubriendo la diferencia entre recursos disponibles y la renta garantizada (art. 13).',
  distractors: [
    'Garantiza una renta fija igual para todos los hogares, con independencia de sus ingresos y composición.',
    'Garantiza exclusivamente la gratuidad de determinados servicios públicos, sin prestación económica.',
    'Garantiza la sustitución total de los recursos del hogar por una cuantía única mensual.',
  ],
  explanation:
    'El art. 3.a) dice que "garantiza un nivel mínimo de renta" mediante la cobertura de "la diferencia" entre recursos y la "cuantía de renta garantizada" del art. 13. Las otras opciones contradicen que sea una prestación diferencial y dependiente de ingresos/composición.',
});

// 5
add({
  question:
    'Según el art. 3.b), ¿cómo se articula la acción protectora del IMV respecto del destinatario?',
  correct:
    'Diferencia si va a beneficiario individual o a unidad de convivencia, atendiendo a su estructura y características.',
  distractors: [
    'Se aplica solo a unidades de convivencia y nunca a beneficiarios individuales.',
    'Se aplica solo a beneficiarios individuales y excluye cualquier unidad de convivencia.',
    'Se articula exclusivamente por tramos de edad, sin atender a la unidad de convivencia.',
  ],
  explanation:
    'El art. 3.b) indica que se diferencia "según se dirija a un beneficiario individual o a una unidad de convivencia" y atiende a su "estructura y características". Las otras opciones eliminan una de las dos modalidades previstas.',
});

// 6
add({
  question:
    'Conforme al art. 3.c), ¿cuál es la regla general sobre la duración del ingreso mínimo vital?',
  correct:
    'Se prolonga mientras persista la vulnerabilidad económica y se mantengan los requisitos que originaron el derecho.',
  distractors: [
    'Tiene una duración máxima fija de 12 meses, prorrogable solo una vez.',
    'Se concede siempre por un periodo de 6 meses y requiere nueva solicitud al finalizar.',
    'Se concede indefinidamente sin necesidad de mantener requisitos ni causas.',
  ],
  explanation:
    'El art. 3.c) establece que su duración "se prolongará mientras persista la situación de vulnerabilidad económica" y se mantengan los requisitos del derecho. Las otras opciones inventan plazos o eliminan el control de requisitos.',
});

// 7
add({
  question:
    'Según el art. 3.d), ¿qué finalidad de “tránsito” se atribuye al ingreso mínimo vital?',
  correct:
    'Permitir el tránsito desde exclusión a participación en la sociedad, incorporando incentivos al empleo y a la inclusión mediante cooperación entre administraciones.',
  distractors: [
    'Sustituir de forma permanente cualquier política de inclusión social autonómica o local.',
    'Garantizar únicamente el acceso a vivienda pública como medida principal.',
    'Financiar exclusivamente programas de formación laboral privados, sin cooperación pública.',
  ],
  explanation:
    'El art. 3.d) lo define como "red de protección" para el "tránsito desde una situación de exclusión" e incluye "incentivos al empleo y a la inclusión" mediante "fórmulas de cooperación". Las demás opciones atribuyen fines no previstos o excluyen la cooperación.',
});

// 8
add({
  question:
    'Conforme al art. 3.e), ¿qué limitación de disposición patrimonial se establece sobre el ingreso mínimo vital?',
  correct:
    'Es intransferible y no puede ofrecerse en garantía ni ser objeto de cesión, compensación, descuento, retención o embargo salvo supuestos del art. 44 LGSS.',
  distractors: [
    'Puede ser cedido libremente a terceros mediante contrato privado sin límites.',
    'Puede embargarse siempre en su totalidad para cualquier deuda, sin excepción.',
    'Puede ofrecerse en garantía de obligaciones de forma ordinaria, como cualquier crédito.',
  ],
  explanation:
    'El art. 3.e) declara que el IMV "es intransferible" y no podrá ser "objeto de cesión" ni "retención o embargo" salvo límites del art. 44 LGSS. Las otras opciones contradicen literalmente esa regla.',
});

// 9
add({
  question:
    'Según el art. 4.1.a), ¿quiénes pueden ser beneficiarias del ingreso mínimo vital?',
  correct:
    'Las personas integrantes de una unidad de convivencia en los términos de la ley.',
  distractors: [
    'Solo las personas que vivan solas y no formen parte de ninguna unidad de convivencia.',
    'Únicamente quienes tengan un grado de discapacidad igual o superior al 65%.',
    'Exclusivamente las personas desempleadas inscritas como demandantes de empleo.',
  ],
  explanation:
    'El art. 4.1.a) incluye como beneficiarias a "las personas integrantes de una unidad de convivencia". Las otras opciones introducen requisitos no establecidos en ese precepto.',
});

// 10
add({
  question:
    'Conforme al art. 4.1.b), ¿qué requisito de edad se exige, con carácter general, a quienes no se integren en una unidad de convivencia?',
  correct:
    'Tener al menos veintitrés años.',
  distractors: [
    'Tener al menos dieciocho años sin excepción alguna.',
    'Tener al menos treinta años en todo caso.',
    'No existe requisito de edad para beneficiario individual.',
  ],
  explanation:
    'El art. 4.1.b) contempla como beneficiarias a "las personas de al menos veintitrés años" que no se integren en una unidad de convivencia. Las demás opciones alteran el umbral general.',
});

// 11
add({
  question:
    'Según el art. 4.1.b), ¿qué excepciones se prevén respecto del cumplimiento del requisito de edad o trámites de separación/divorcio?',
  correct:
    'No se exige el requisito de edad ni el de haber iniciado trámites de separación o divorcio a mujeres víctimas de violencia de género o de trata y explotación sexual.',
  distractors: [
    'No se exige el requisito de edad a cualquier solicitante que aporte certificado de empadronamiento.',
    'No se exige el requisito de edad únicamente a mayores de 65 años.',
    'No se exige el requisito de edad a cualquier persona con hijos a cargo, sin más condiciones.',
  ],
  explanation:
    'El art. 4.1.b) establece: "No se exigirá el cumplimiento del requisito de edad" (ni el de trámites) en los supuestos de "mujeres víctimas de violencia de género o de trata". Las otras opciones generalizan sin soporte en el texto.',
});

// 12
add({
  question:
    'Conforme al art. 4.1.b) (supuestos 18-22 años), ¿qué supuesto permite ser beneficiario sin integrarse en unidad de convivencia?',
  correct:
    'Provenir de centros residenciales de protección de menores habiendo estado bajo tutela en los tres años anteriores a la mayoría de edad, o ser huérfano absoluto, y vivir solo.',
  distractors: [
    'Provenir de cualquier centro educativo público, con independencia de tutela o edad.',
    'Ser menor de 23 años y estar inscrito en el padrón municipal, sin más.',
    'Ser de 18 a 22 años y convivir con los progenitores en el mismo domicilio.',
  ],
  explanation:
    'El art. 4.1.b) prevé para 18-22 años el supuesto de quienes "provengan de centros residenciales de protección de menores" (tutela en los tres años anteriores) o sean "huérfanos absolutos", "siempre que vivan solos". Las demás opciones no encajan en el texto.',
});

// 13
add({
  question:
    'Según el art. 4.1.b) (supuesto de 18 a 22 años), ¿qué condición se exige a quienes provengan de un centro penitenciario?',
  correct:
    'Que hayan sido liberados de prisión y la privación de libertad haya sido por tiempo superior a seis meses.',
  distractors: [
    'Que la privación de libertad haya sido por tiempo inferior a seis meses.',
    'Que sigan en prisión en el momento de la solicitud.',
    'Que provengan de un centro penitenciario, sin importar la duración de la privación de libertad.',
  ],
  explanation:
    'El art. 4.1.b) exige que provengan de un centro penitenciario por haber sido "liberados de prisión" y que la privación haya sido "por tiempo superior a seis meses". El resto contradice esa literalidad.',
});

// 14
add({
  question:
    'Conforme al art. 4.2, ¿pueden ser beneficiarias del IMV las personas usuarias de una prestación de servicio residencial?',
  correct:
    'Sí, temporalmente; y puede ser permanente en supuestos de mujeres víctimas de violencia de género o trata/explotación sexual y otras excepciones reglamentarias.',
  distractors: [
    'No, la residencia en un servicio residencial impide siempre ser beneficiario.',
    'Sí, pero solo si la prestación residencial es permanente en todo caso.',
    'Sí, pero solo si el servicio residencial es de carácter exclusivamente sanitario.',
  ],
  explanation:
    'El art. 4.2 permite beneficiarios que "temporalmente sean usuarias" de un servicio residencial; y añade que "podrá ser permanente" para víctimas de violencia de género o trata/explotación sexual. Las otras opciones niegan o restringen fuera del texto.',
});

// 15
add({
  question:
    'Según el art. 4.3, ¿qué doble referencia normativa se impone a las personas beneficiarias?',
  correct:
    'Cumplir requisitos de acceso del art. 10 y obligaciones de mantenimiento del art. 36.',
  distractors: [
    'Cumplir únicamente las obligaciones del art. 37, sin requisitos de acceso.',
    'Cumplir solo los requisitos de identidad del art. 21, sin obligaciones posteriores.',
    'Cumplir requisitos del art. 13 exclusivamente, sin remisión al art. 10.',
  ],
  explanation:
    'El art. 4.3 indica que deben cumplir "los requisitos de acceso" del art. 10 y "las obligaciones" del art. 36 para el mantenimiento. Las demás opciones omiten una de las dos referencias.',
});

// 16
add({
  question:
    'Conforme al art. 5.1, ¿quiénes son titulares del ingreso mínimo vital?',
  correct:
    'Las personas con capacidad jurídica que lo soliciten y perciban, en nombre propio o en nombre de una unidad de convivencia, asumiendo su representación.',
  distractors: [
    'Únicamente el Instituto Nacional de la Seguridad Social en nombre del beneficiario.',
    'Cualquier miembro de la unidad de convivencia, aunque no lo solicite ni lo perciba.',
    'Solo los servicios sociales municipales que tramiten la solicitud.',
  ],
  explanation:
    'El art. 5.1 define como titulares a "las personas con capacidad jurídica" que lo "soliciten y la perciban"; si es unidad, "asumirá la representación". Las otras opciones no se ajustan al texto.',
});

// 17
add({
  question:
    'Según el art. 5.1, ¿qué debe incluir la solicitud cuando la persona titular está integrada en una unidad de convivencia?',
  correct:
    'Firma del solicitante e incluir una declaración responsable sobre el consentimiento de los integrantes mayores de edad.',
  distractors: [
    'Firma obligatoria de todos los integrantes, incluidos menores, sin excepción.',
    'Solo un certificado de los servicios sociales, sin declaración responsable de consentimiento.',
    'Únicamente la certificación de la Agencia Tributaria sobre ingresos y patrimonio.',
  ],
  explanation:
    'El art. 5.1 exige que la solicitud "deberá ir firmada" por la persona solicitante e incluir "declaración responsable" sobre el consentimiento de integrantes mayores de edad. Las otras opciones añaden requisitos distintos.',
});

// 18
add({
  question:
    'Conforme al art. 5.2 (unidad de convivencia), ¿qué edad mínima se exige a las personas titulares, con carácter general?',
  correct:
    'Tener una edad mínima de 23 años.',
  distractors: [
    'Tener una edad mínima de 18 años.',
    'No se exige edad mínima si existen menores en la unidad.',
    'Tener una edad mínima de 30 años.',
  ],
  explanation:
    'El art. 5.2 señala que las personas titulares, cuando estén en unidad de convivencia, "deberán tener una edad mínima de 23 años". Las otras opciones cambian el umbral.',
});

// 19
add({
  question:
    'Según el art. 5.2 (unidad de convivencia), ¿qué excepción permite ser titular sin alcanzar los 23 años?',
  correct:
    'Ser mayor de edad o menor emancipado si tiene hijos o menores en guarda con fines de adopción/acogimiento permanente, u huérfanos absolutos en ciertos casos.',
  distractors: [
    'Ser menor de edad no emancipado con autorización de los progenitores.',
    'Basta con estar empadronado en el domicilio desde hace seis meses.',
    'Cualquier persona de 18 a 22 años que viva sola, sin otros requisitos.',
  ],
  explanation:
    'El art. 5.2 prevé como excepción que sea "mayor de edad o menor emancipado" con hijos o menores en guarda/acogimiento, o casos de "huérfanos absolutos". Las demás opciones no aparecen en el artículo.',
});

// 20
add({
  question:
    'Conforme al art. 5.3, si en una unidad de convivencia varias personas pudieran ostentar la titularidad, ¿quién será considerada titular?',
  correct:
    'La persona a la que se le reconozca la prestación solicitada en nombre de la unidad de convivencia.',
  distractors: [
    'Siempre la persona de mayor edad de la unidad de convivencia.',
    'Siempre la persona con mayores ingresos del ejercicio anterior.',
    'La persona designada por los servicios sociales del ayuntamiento.',
  ],
  explanation:
    'El art. 5.3 establece que será titular "la persona a la que se le reconozca la prestación solicitada" en nombre de la unidad. Las demás opciones inventan criterios no previstos.',
});

// 21
add({
  question:
    'Según el art. 5.4, ¿qué posibilidad se prevé respecto del pago de la prestación?',
  correct:
    'La entidad gestora puede acordar el pago a otro miembro de la unidad distinto del titular, en términos reglamentarios.',
  distractors: [
    'El pago siempre debe realizarse a una cuenta conjunta de todos los miembros.',
    'El pago puede realizarse a cualquier tercero sin vínculo con el titular, libremente.',
    'El pago solo puede realizarse mediante cheque nominativo entregado en oficina.',
  ],
  explanation:
    'El art. 5.4 dice que "la entidad gestora podrá acordar el pago" a otro miembro distinto del titular "en los términos" reglamentarios. Las otras opciones no se recogen en la ley.',
});

// 22
add({
  question:
    'Conforme al art. 6.1, ¿qué constituye una unidad de convivencia, con carácter general?',
  correct:
    'Personas que residan en un mismo domicilio unidas por matrimonio, pareja de hecho o vínculo hasta segundo grado, adopción, y personas en guarda/acogimiento.',
  distractors: [
    'Personas que residan en domicilios distintos pero empadronadas en el mismo municipio.',
    'Solo las personas unidas por matrimonio, excluyendo parentesco y acogimientos.',
    'Cualquier grupo de personas que conviva sin límite de parentesco ni requisitos.',
  ],
  explanation:
    'El art. 6.1 define la unidad por residencia en "un mismo domicilio" y vínculos (matrimonio, pareja de hecho, hasta segundo grado, adopción) y guarda/acogimiento. Las demás opciones alteran elementos esenciales del precepto.',
});

// 23
add({
  question:
    'Según el art. 6.1, ¿cómo se define “pareja de hecho” a efectos de esta ley?',
  correct:
    'Constituida con análoga relación de afectividad a la conyugal por quienes no están impedidos, no tienen vínculo matrimonial ni otra pareja de hecho, y acrediten su constitución.',
  distractors: [
    'Cualquier convivencia de dos personas durante al menos seis meses, sin necesidad de acreditación.',
    'Únicamente la convivencia entre dos personas con hijos comunes, sin más requisitos.',
    'Una relación afectiva sin convivencia y sin necesidad de acreditar constitución.',
  ],
  explanation:
    'El art. 6.1 indica que se considerará pareja de hecho la "constituida" con relación análoga, sin impedimentos, sin vínculo matrimonial ni otra pareja de hecho, y que "acredite" su constitución. Las otras opciones simplifican o eliminan requisitos del texto.',
});

// 24
add({
  question:
    'Conforme al art. 6.1, ¿qué efecto tiene el fallecimiento de alguno de los integrantes sobre la consideración de la unidad de convivencia?',
  correct:
    'No altera la consideración de unidad, aunque suponga pérdida de vínculos entre supérstites.',
  distractors: [
    'Rompe automáticamente la unidad de convivencia, extinguiéndola en todo caso.',
    'Solo se mantiene si quedan al menos dos adultos convivientes.',
    'Obliga a crear una nueva unidad de convivencia desde cero a efectos del IMV.',
  ],
  explanation:
    'El art. 6.1 es explícito: "El fallecimiento ... no alterará la consideración" de unidad de convivencia, aunque se pierdan vínculos. Las demás opciones contradicen esa regla.',
});

// 25
add({
  question:
    'Según el art. 6.2, ¿qué se considera respecto de la separación transitoria por estudios o trabajo?',
  correct:
    'Que no rompe la convivencia si es transitoria por estudios, trabajo, tratamiento médico, rehabilitación u otras causas similares.',
  distractors: [
    'Que rompe siempre la convivencia aunque sea por estudios o tratamiento médico.',
    'Que solo se admite por estudios y nunca por trabajo.',
    'Que se admite únicamente si la separación no supera 15 días.',
  ],
  explanation:
    'El art. 6.2 establece que "no rompe la convivencia" la separación transitoria por "estudios, trabajo, tratamiento médico, rehabilitación u otras causas similares". Las demás opciones introducen límites no previstos.',
});

// 26
add({
  question:
    'Conforme al art. 6.2, ¿qué requisito se señala para considerar a una persona integrante de la unidad de convivencia?',
  correct:
    'La residencia efectiva, legal y continuada en España.',
  distractors: [
    'La residencia en cualquier país de la Unión Europea.',
    'La residencia únicamente durante el último mes.',
    'La residencia exclusiva en el domicilio ficticio del padrón.',
  ],
  explanation:
    'El art. 6.2 indica que es requisito la "residencia efectiva, legal y continuada en España". Las otras opciones no se corresponden con esa formulación.',
});

// 27
add({
  question:
    'Según el art. 6.3, ¿qué limitación se impone respecto de pertenecer a unidades de convivencia?',
  correct:
    'En ningún caso una misma persona puede formar parte de dos o más unidades de convivencia.',
  distractors: [
    'Una misma persona puede formar parte de dos unidades si son del mismo municipio.',
    'Una misma persona puede formar parte de dos unidades si hay custodia compartida.',
    'No existe ninguna limitación al respecto.',
  ],
  explanation:
    'El art. 6.3 dice: "En ningún caso una misma persona podrá formar parte de dos o más unidades de convivencia". Las otras opciones contradicen literalmente el precepto.',
});

// 28
add({
  question:
    'Conforme al art. 7.a), ¿qué situación especial permite considerar beneficiaria a una mujer que convive en el mismo domicilio con otras personas con vínculos del art. 6.1?',
  correct:
    'Que, siendo víctima de violencia de género, haya abandonado su domicilio familiar habitual acompañada o no de sus hijos o menores en guarda/acogimiento.',
  distractors: [
    'Que haya cambiado de domicilio por razones de ocio o vacaciones.',
    'Que haya abandonado su domicilio familiar por motivos laborales sin más.',
    'Que haya dejado el domicilio por estudios, sin acompañamiento de menores.',
  ],
  explanation:
    'El art. 7.a) contempla el supuesto de "una mujer, víctima de violencia de género" que haya "abandonado su domicilio familiar habitual" con o sin hijos/menores. Las otras opciones no se recogen en el artículo.',
});

// 29
add({
  question:
    'Según el art. 7.b), ¿qué supuesto se incluye como situación especial relacionada con separación, nulidad o divorcio?',
  correct:
    'Que, con motivo del inicio de trámites de separación/nulidad/divorcio o disolución de pareja formal, una persona haya abandonado el domicilio familiar habitual con o sin menores.',
  distractors: [
    'Que la pareja formal siga conviviendo en el domicilio familiar habitual.',
    'Que se haya producido una separación de hecho sin inicio de trámite y sin acreditar nada adicional.',
    'Que se haya iniciado un procedimiento penal sin relación con la convivencia.',
  ],
  explanation:
    'El art. 7.b) se refiere al "inicio de los trámites" de separación/nulidad/divorcio o disolución de pareja formal y al abandono del domicilio familiar. Las otras opciones no responden a ese supuesto.',
});

// 30
add({
  question:
    'Conforme al art. 7.c), ¿qué supuestos se citan expresamente como causas de abandono del domicilio que generan situación especial?',
  correct:
    'Desahucio o que el domicilio quede inhabitable por accidente o fuerza mayor (y otros reglamentarios).',
  distractors: [
    'Cambio voluntario a una segunda residencia por razones de comodidad.',
    'Traslado temporal por vacaciones superiores a 15 días.',
    'Mudanza por reforma estética del domicilio sin inhabitabilidad.',
  ],
  explanation:
    'El art. 7.c) menciona expresamente "desahucio" y que el domicilio quede "inhabitable" por accidente o fuerza mayor. Las demás opciones no figuran en el texto.',
});

// 31
add({
  question:
    'Según el art. 7 (párrafo final), ¿qué límite temporal se establece para la consideración como unidad independiente en los supuestos de los párrafos b) y c)?',
  correct:
    'Solo cabe durante los tres años siguientes a la fecha en que se produjeron los hechos indicados.',
  distractors: [
    'Solo cabe durante el año siguiente a la fecha de los hechos.',
    'No existe ningún límite temporal para esa consideración.',
    'Solo cabe durante seis meses desde los hechos.',
  ],
  explanation:
    'El art. 7 indica que en los supuestos b) y c) "únicamente cabrá" la consideración como unidad independiente "durante los tres años siguientes". Las otras opciones reducen o eliminan ese plazo.',
});

// 32
add({
  question:
    'Conforme al art. 8.1, en los supuestos del párrafo cuarto del art. 6.1 (empadronamiento especial), ¿cómo se configura la unidad de convivencia?',
  correct:
    'Por personas unidas por matrimonio o pareja de hecho y, en su caso, sus descendientes menores hasta primer grado (o hasta segundo grado en ciertos casos).',
  distractors: [
    'Por todas las personas empadronadas en el establecimiento colectivo, sin distinción.',
    'Solo por el titular solicitante, excluyendo descendientes menores.',
    'Únicamente por descendientes hasta tercer grado de consanguinidad.',
  ],
  explanation:
    'El art. 8.1 establece que la unidad se constituye por matrimonio/pareja y "sus descendientes menores" hasta primer grado, pudiendo ser hasta segundo grado si no están empadronados con ascendientes de primer grado. Las otras opciones no coinciden con esa regla.',
});

// 33
add({
  question:
    'Según el art. 8.2, ¿cuándo se considera “domicilio” a efectos de esta ley una habitación en un establecimiento hotelero o similar?',
  correct:
    'Cuando un contrato acredite el uso individualizado de una habitación por una persona sola o por una unidad de convivencia.',
  distractors: [
    'Siempre que se pague en efectivo la estancia, sin necesidad de contrato.',
    'Solo si el establecimiento es de carácter sanitario o sociosanitario.',
    'Solo si la habitación se comparte por más de dos unidades de convivencia.',
  ],
  explanation:
    'El art. 8.2 dispone que, si "en virtud de un contrato" se acredita el "uso individualizado" de una habitación, será considerado domicilio. Las demás opciones añaden condiciones no previstas.',
});

// 34
add({
  question:
    'Conforme al art. 8.3, ¿qué se considera domicilio cuando existe uso exclusivo de una zona del domicilio por una persona o unidad de convivencia?',
  correct:
    'La zona de uso exclusivo acreditada mediante título jurídico se considera domicilio a efectos de la ley.',
  distractors: [
    'Nunca se considera domicilio: solo se admite el domicilio completo.',
    'Se considera domicilio únicamente si la zona de uso exclusivo es superior a 50 m².',
    'Se considera domicilio solo si el uso exclusivo se acredita por declaración jurada, sin título jurídico.',
  ],
  explanation:
    'El art. 8.3 indica que si se acredita mediante "título jurídico" el "uso exclusivo" de una zona, esa zona será el domicilio. Las otras opciones inventan requisitos adicionales o lo niegan.',
});

// 35
add({
  question:
    'Según el art. 9, cuando conviven en un mismo domicilio personas sin vínculos del art. 6, ¿quién puede ser titular del IMV?',
  correct:
    'Aquella o aquellas que se encuentren en riesgo de exclusión conforme al art. 21.10.',
  distractors: [
    'Cualquiera de los convivientes, aunque no se acredite riesgo de exclusión.',
    'Solo el conviviente con mayores ingresos del ejercicio anterior.',
    'Solo quien tenga 65 años o más.',
  ],
  explanation:
    'El art. 9 permite titulares cuando no hay vínculos si están "en riesgo de exclusión" según art. 21.10. Las otras opciones omiten esa condición o agregan requisitos no citados.',
});

// 36
add({
  question:
    'Conforme al art. 10.1.a), ¿qué exige la ley sobre la residencia para acceder al IMV (regla general)?',
  correct:
    'Tener residencia legal y efectiva en España y haberla tenido de forma continuada e ininterrumpida durante al menos el año anterior a la solicitud.',
  distractors: [
    'Tener residencia legal y efectiva en España durante al menos seis meses anteriores a la solicitud.',
    'Tener nacionalidad española como único requisito de residencia.',
    'Tener residencia en cualquier Estado de la UE durante al menos un año, sin necesidad de residencia en España.',
  ],
  explanation:
    'El art. 10.1.a) exige "residencia legal y efectiva en España" y haberla tenido "durante al menos el año inmediatamente anterior". Las demás opciones reducen el plazo o cambian el país/requisito.',
});

// 37
add({
  question:
    'Según el art. 10.1.a), ¿en qué supuestos NO se exige el plazo de un año inmediatamente anterior de residencia?',
  correct:
    'En menores incorporados por nacimiento/adopción/reagrupación/guarda/acogimiento; víctimas de trata/explotación sexual; y mujeres víctimas de violencia de género.',
  distractors: [
    'En cualquier solicitante que presente declaración responsable de ingresos.',
    'En personas mayores de 52 años que perciban subsidio de desempleo.',
    'En cualquier ciudadano de la Unión Europea sin más requisitos.',
  ],
  explanation:
    'El art. 10.1.a) enumera excepciones: menores incorporados por "nacimiento" o "adopción" (etc.), víctimas de "trata" y mujeres víctimas de "violencia de género". Las otras opciones no están en la lista legal.',
});

// 38
add({
  question:
    'Conforme al art. 10.1.a) (mantenimiento del derecho), ¿qué se considera respecto de estancias en el extranjero?',
  correct:
    'Se mantiene residencia habitual si las estancias no superan 90 días naturales por año o si la ausencia se debe a enfermedad debidamente justificada.',
  distractors: [
    'Se mantiene siempre, aunque las estancias en el extranjero superen 180 días naturales al año.',
    'Se mantiene solo si no hay ninguna estancia en el extranjero en el año natural.',
    'Se pierde automáticamente con cualquier estancia en el extranjero, aunque sea de 1 día.',
  ],
  explanation:
    'El art. 10.1.a) dice que se entiende residencia habitual aun con estancias en el extranjero "siempre que estas no superen los noventa días naturales" o por enfermedad justificada. Las demás opciones contradicen ese límite.',
});

// 39
add({
  question:
    'Según el art. 10.1.b), ¿qué condición material se exige además de la residencia?',
  correct:
    'Encontrarse en situación de vulnerabilidad económica por carecer de rentas, ingresos o patrimonio suficientes, según el art. 11.',
  distractors: [
    'Acreditar exclusivamente ser demandante de empleo.',
    'Aportar un contrato de alquiler vigente como condición principal.',
    'Acreditar haber cotizado al menos 15 años al sistema.',
  ],
  explanation:
    'El art. 10.1.b) exige la "situación de vulnerabilidad económica" por falta de recursos "en los términos" del art. 11. Las otras opciones introducen requisitos ajenos al texto.',
});

// 40
add({
  question:
    'Conforme al art. 10.2, ¿qué deben acreditar las personas beneficiarias del art. 4.1.b) menores de 30 años?',
  correct:
    'Haber vivido de forma independiente en España durante al menos dos años inmediatamente anteriores a la solicitud.',
  distractors: [
    'Haber vivido de forma independiente durante al menos seis meses anteriores a la solicitud.',
    'Haber vivido con sus progenitores durante al menos dos años previos.',
    'No se exige acreditación de vida independiente a menores de 30 años.',
  ],
  explanation:
    'El art. 10.2 establece que los menores de 30 deben acreditar vida independiente "durante al menos los dos años inmediatamente anteriores". Las demás opciones contradicen el plazo o la exigencia.',
});

// 41
add({
  question:
    'Según el art. 10.2, ¿cómo define la ley “haber vivido de forma independiente” (parte 1)?',
  correct:
    'Que el domicilio sea distinto al de progenitores/tutores/acogedores durante los dos años anteriores a la solicitud.',
  distractors: [
    'Que el domicilio sea el mismo que el de los progenitores durante los dos años anteriores.',
    'Que el domicilio sea distinto solo durante los últimos tres meses.',
    'Que el domicilio sea un domicilio ficticio siempre.',
  ],
  explanation:
    'El art. 10.2 indica que se entenderá vida independiente cuando acredite que el domicilio "ha sido distinto" al de progenitores/tutores/acogedores durante dos años. Las otras opciones invierten o deforman el criterio.',
});

// 42
add({
  question:
    'Conforme al art. 10.2, ¿qué requisito adicional de alta en regímenes se exige para acreditar vida independiente (parte 2)?',
  correct:
    'Haber permanecido al menos doce meses (continuados o no) en alta en algún régimen del sistema, Clases Pasivas o mutualidad alternativa al RETA.',
  distractors: [
    'Haber permanecido al menos un mes en alta exclusivamente en el Régimen General.',
    'Haber permanecido al menos doce meses en alta solo si se es mayor de 30 años.',
    'No se exige ninguna condición de alta: basta el empadronamiento.',
  ],
  explanation:
    'El art. 10.2 exige que, en ese periodo, haya estado "durante al menos doce meses, continuados o no, en situación de alta" en regímenes del sistema, Clases Pasivas o mutualidad alternativa. Las otras opciones reducen o eliminan el requisito.',
});

// 43
add({
  question:
    'Según el art. 10.2, ¿qué deben acreditar las personas beneficiarias del art. 4.1.b) mayores de 30 años?',
  correct:
    'Que durante el año anterior a la solicitud su domicilio en España ha sido distinto al de progenitores/tutores/acogedores.',
  distractors: [
    'Que durante los dos años anteriores su domicilio en España ha sido distinto al de progenitores.',
    'Que durante el último mes su domicilio en España ha sido distinto al de progenitores.',
    'Nada relativo al domicilio: solo ingresos.',
  ],
  explanation:
    'El art. 10.2 prevé que mayores de 30 acrediten que, durante "el año inmediatamente anterior", su domicilio ha sido distinto al de progenitores/tutores/acogedores. Las otras opciones alteran el plazo o eliminan el requisito.',
});

// 44
add({
  question:
    'Conforme al art. 10.2, ¿en qué casos NO se exigen los requisitos de vida independiente?',
  correct:
    'Entre otros, por fallecimiento de progenitores, víctimas de violencia de género, personas sin hogar, trámites de separación/divorcio, víctimas de trata y quienes provengan de prisión (>6 meses), u otros reglamentarios.',
  distractors: [
    'En cualquier caso si la cuantía solicitada es inferior a 100 euros.',
    'En cualquier caso si se presenta solicitud entre abril y diciembre.',
    'Solo en caso de ser estudiante menor de 28 años.',
  ],
  explanation:
    'El art. 10.2 enumera excepciones: fallecimiento, "víctimas de violencia de género", "personas sin hogar", "trámites de separación o divorcio", víctimas de "trata" y salida de prisión >6 meses, entre otras. Las demás opciones no están en el texto.',
});

// 45
add({
  question:
    'Según el art. 10.3, ¿qué requisito temporal se exige sobre la constitución de la unidad de convivencia (regla general)?',
  correct:
    'Que esté constituida durante al menos los seis meses anteriores a la solicitud, de forma continuada.',
  distractors: [
    'Que esté constituida durante al menos dos años anteriores a la solicitud.',
    'Que esté constituida solo el día de la solicitud, sin requisito previo.',
    'Que esté constituida durante al menos un mes anterior a la solicitud.',
  ],
  explanation:
    'El art. 10.3 exige que la unidad esté constituida "durante al menos los seis meses anteriores" de forma continuada. Las otras opciones cambian el periodo o lo eliminan.',
});

// 46
add({
  question:
    'Conforme al art. 10.3, ¿qué supuestos eximen del requisito de seis meses de constitución de la unidad de convivencia?',
  correct:
    'Nacimiento, adopción, guarda con fines de adopción o acogimiento de menores, reagrupación familiar de menores, violencia de género, trata/explotación sexual u otros supuestos reglamentarios.',
  distractors: [
    'Ser mayor de 65 años.',
    'Estar inscrito en el padrón municipal durante 30 días.',
    'Percibir una pensión contributiva.',
  ],
  explanation:
    'El art. 10.3 lista excepciones: "nacimiento", "adopción", guarda/acogimiento, reagrupación de menores, víctimas de violencia de género o trata, etc. Las otras opciones no figuran en el texto.',
});

// 47
add({
  question:
    'Según el art. 10.4, ¿cuándo deben cumplirse y mantenerse los requisitos de los apartados anteriores?',
  correct:
    'Deben cumplirse al presentar la solicitud o pedir revisión, mantenerse al dictarse la resolución y durante la percepción del IMV.',
  distractors: [
    'Solo deben cumplirse el día de la solicitud; después no es relevante.',
    'Solo deben cumplirse después de la resolución; antes no es necesario.',
    'Solo deben cumplirse durante el primer mes de percepción.',
  ],
  explanation:
    'El art. 10.4 dice que los requisitos deben "cumplirse" al presentar la solicitud y "mantenerse" al dictarse la resolución y durante el tiempo de percepción. Las otras opciones eliminan fases expresas del texto.',
});

// 48
add({
  question:
    'Conforme al art. 11.1, ¿qué se toma en consideración para determinar la vulnerabilidad económica?',
  correct:
    'La capacidad económica del solicitante individual o de la unidad de convivencia, computando los recursos de todos sus miembros.',
  distractors: [
    'Solo la capacidad económica del titular, sin considerar a los demás miembros de la unidad.',
    'Solo los ingresos del mes anterior a la solicitud.',
    'Únicamente el patrimonio inmobiliario del solicitante.',
  ],
  explanation:
    'El art. 11.1 indica que se considera la capacidad económica del solicitante o unidad y se computan "los recursos de todos sus miembros". Las otras opciones contradicen ese cómputo conjunto.',
});

// 49
add({
  question:
    'Según el art. 11.2, ¿cuándo se aprecia el requisito de vulnerabilidad económica por ingresos?',
  correct:
    'Cuando el promedio mensual de ingresos/rentas anuales computables del ejercicio anterior sea al menos 10 euros inferior a la renta garantizada mensual aplicable.',
  distractors: [
    'Cuando los ingresos del mes anterior sean 10 euros inferiores a la renta garantizada mensual.',
    'Cuando el promedio mensual sea igual o superior a la renta garantizada mensual.',
    'Cuando el promedio mensual sea al menos 50 euros inferior a la renta garantizada mensual.',
  ],
  explanation:
    'El art. 11.2 exige que el promedio mensual del ejercicio anterior sea inferior "al menos en 10 euros" a la renta garantizada mensual. Las otras opciones cambian el periodo (mes anterior) o el umbral.',
});

// 50
add({
  question:
    'Conforme al art. 11.3, ¿cuándo NO se aprecia vulnerabilidad por patrimonio en el caso de beneficiario individual?',
  correct:
    'Cuando sea titular de un patrimonio neto valorado igual o superior a tres veces la cuantía de renta garantizada correspondiente.',
  distractors: [
    'Cuando tenga cualquier patrimonio, aunque sea mínimo.',
    'Cuando su patrimonio neto sea inferior a tres veces la renta garantizada correspondiente.',
    'Solo cuando su patrimonio neto sea superior a diez veces la renta garantizada.',
  ],
  explanation:
    'El art. 11.3 indica que no concurre si el patrimonio neto es "igual o superior a tres veces" la renta garantizada del beneficiario individual. Las demás opciones alteran el umbral.',
});

// 51
add({
  question:
    'Según el art. 11.3, ¿qué regla se aplica al patrimonio neto de las unidades de convivencia para no apreciar vulnerabilidad?',
  correct:
    'No concurre si son titulares de un patrimonio neto valorado igual o superior a la cuantía resultante de aplicar la escala del anexo II.',
  distractors: [
    'No concurre si el patrimonio neto supera cualquier cantidad, sin escala.',
    'No concurre solo si el patrimonio neto supera el doble de la renta garantizada individual.',
    'No concurre si el patrimonio neto es inferior al anexo II.',
  ],
  explanation:
    'El art. 11.3 remite para unidades a la "escala de incrementos" del "anexo II". Las otras opciones ignoran esa remisión o la invierten.',
});

// 52
add({
  question:
    'Conforme al art. 11.3, ¿qué exclusión opera “independientemente de la valoración del patrimonio neto” (test de activos)?',
  correct:
    'Quedan excluidas las personas o unidades que posean activos no societarios sin vivienda habitual por un valor superior al del anexo III.',
  distractors: [
    'Quedan excluidas todas las unidades que tengan vivienda habitual en propiedad, sin excepción.',
    'Quedan excluidas todas las unidades que tengan cuentas bancarias, sin importar su valor.',
    'Quedan excluidos solo quienes superen el anexo I en renta garantizada.',
  ],
  explanation:
    'El art. 11.3 dice: "independientemente de la valoración del patrimonio neto" quedan excluidos quienes posean "activos no societarios" (sin vivienda habitual) por valor superior al "anexo III". Las otras opciones no están en el texto.',
});

// 53
add({
  question:
    'Según el art. 11.3, ¿qué otra exclusión se prevé independientemente del patrimonio neto por razón de sociedades mercantiles?',
  correct:
    'Quedan excluidas personas individuales o unidades si cualquiera de sus miembros es administrador de derecho de una sociedad mercantil que no haya cesado en su actividad.',
  distractors: [
    'Quedan excluidas solo si el solicitante es accionista minoritario de una sociedad.',
    'Quedan excluidas únicamente si la sociedad ha cesado en su actividad.',
    'Quedan excluidas si cualquier miembro es trabajador por cuenta ajena.',
  ],
  explanation:
    'El art. 11.3 excluye cuando cualquiera sea "administrador de derecho" de una sociedad mercantil "que no haya cesado en su actividad". Las demás opciones no coinciden con esa condición.',
});

// 54
add({
  question:
    'Conforme al art. 11.4, ¿qué principio se declara sobre la compatibilidad del IMV con rentas del trabajo o actividad por cuenta propia?',
  correct:
    'Que será compatible en los términos y límites reglamentarios para no desincentivar la participación en el mercado laboral.',
  distractors: [
    'Que es siempre incompatible con cualquier renta del trabajo.',
    'Que es compatible sin límites, sin posibilidad de desarrollo reglamentario.',
    'Que solo es compatible con rentas del trabajo por cuenta ajena, nunca por cuenta propia.',
  ],
  explanation:
    'El art. 11.4 afirma que, para no desincentivar el empleo, "será compatible" con rentas del trabajo o actividad por cuenta propia "en los términos y con los límites que reglamentariamente se establezcan". Las otras opciones contradicen esa regla.',
});

// 55
add({
  question:
    'Según el art. 11.5, ¿en qué ventana temporal puede solicitarse el reconocimiento del IMV si la vulnerabilidad sobrevino durante el año en curso?',
  correct:
    'Desde el 1 de abril hasta el 31 de diciembre del año en curso.',
  distractors: [
    'Desde el 1 de enero hasta el 31 de marzo del año en curso.',
    'Solo durante el mes de diciembre del año en curso.',
    'En cualquier momento del año, sin ventana temporal específica.',
  ],
  explanation:
    'El art. 11.5 permite solicitar "desde el 1 de abril hasta el 31 de diciembre" cuando la vulnerabilidad haya sobrevenido. Las otras opciones inventan ventanas distintas.',
});

// 56
add({
  question:
    'Conforme al art. 11.5, ¿qué se toma en cuenta para acreditar la vulnerabilidad económica producida durante el año en curso?',
  correct:
    'Exclusivamente el requisito de ingresos del art. 11.2, considerando la parte proporcional de ingresos del año en curso (con datos SS o declaración responsable).',
  distractors: [
    'Se exige exclusivamente el requisito de patrimonio del art. 11.3.',
    'Se exige acreditar ingresos y patrimonio completos del año en curso con declaración del IRPF ya presentada.',
    'No se tiene en cuenta ningún dato del año en curso: solo el ejercicio anterior.',
  ],
  explanation:
    'El art. 11.5 dice que se atenderá "exclusivamente" al cumplimiento del requisito de ingresos del apartado 2, con parte proporcional del año en curso (datos SS o declaración responsable). Las otras opciones contradicen esa exclusividad.',
});

// 57
add({
  question:
    'Según el art. 11.5, ¿qué prestaciones NO se tendrán en cuenta para el cómputo de rentas del año en curso en ciertos supuestos?',
  correct:
    'Prestaciones o subsidios por desempleo (incluida RAI) y prestación por cese de actividad, si el derecho se ha extinguido por agotamiento/renuncia/superar límite y no hay derecho a otra.',
  distractors: [
    'Las pensiones contributivas o no contributivas del sistema de Seguridad Social, en todo caso.',
    'Cualquier renta del trabajo por cuenta ajena obtenida en el año en curso.',
    'Las ayudas para el estudio y vivienda del art. 20.1.f) solo si se cobran en efectivo.',
  ],
  explanation:
    'El art. 11.5 indica que para el cómputo de rentas del año en curso "no se tendrán en cuenta" ciertas prestaciones por desempleo (incluida "renta activa de inserción") ni "cese de actividad" cuando el derecho se haya "extinguido" y no exista derecho a otra. Las otras opciones no reflejan lo previsto.',
});

// 58
add({
  question:
    'Conforme al art. 11.5, ¿qué condición adicional se exige respecto del ejercicio inmediatamente anterior al de la solicitud (límites de anexo IV)?',
  correct:
    'Que no se hayan superado los límites de renta y patrimonio establecidos en el anexo IV, según información tributaria.',
  distractors: [
    'Que se hayan superado los límites del anexo IV para demostrar necesidad.',
    'Que solo se compruebe el anexo I y nunca el anexo IV.',
    'Que se acredite únicamente el padrón municipal del año anterior.',
  ],
  explanation:
    'El art. 11.5 exige que en el ejercicio anterior "no haya superado" los límites de renta y patrimonio del "anexo IV" con información de AEAT/haciendas forales. Las demás opciones contradicen el texto.',
});

// 59
add({
  question:
    'Según el art. 11.5, ¿qué ocurre en el año siguiente al reconocimiento del IMV al amparo del apartado 5?',
  correct:
    'Se procederá a la regularización de cuantías abonadas con los datos del ejercicio en que se reconoció, pudiendo dar lugar a actuaciones del art. 19.',
  distractors: [
    'No se realiza ninguna regularización posterior en ningún caso.',
    'Se regulariza únicamente el patrimonio, nunca los ingresos.',
    'Se regulariza solo si el beneficiario lo solicita expresamente.',
  ],
  explanation:
    'El art. 11.5 prevé que al año siguiente se hará "regularización" conforme a información tributaria, pudiendo dar lugar a actuaciones del "artículo 19". Las otras opciones niegan o limitan esa previsión.',
});

// 60
add({
  question:
    'Conforme al art. 11.6, ¿cuándo existe complemento de ayuda para la infancia?',
  correct:
    'Para unidades de convivencia con menores si ingresos del ejercicio anterior son <300% umbrales del anexo I y patrimonio <150% límites del anexo II, cumpliendo test de activos del anexo III.',
  distractors: [
    'Para cualquier beneficiario individual aunque no haya menores.',
    'Solo si el patrimonio supera el 150% de los límites del anexo II.',
    'Solo si los ingresos del ejercicio anterior superan el 300% del anexo I.',
  ],
  explanation:
    'El art. 11.6 exige unidad con menores y umbrales: "ingresos ... inferiores al 300%" del anexo I y "patrimonio ... inferior al 150%" del anexo II, cumpliendo el "anexo III". Las otras opciones invierten o eliminan requisitos.',
});

// 61
add({
  question:
    'Según el art. 12, ¿qué naturaleza y periodicidad tiene la prestación del ingreso mínimo vital?',
  correct:
    'Es una prestación económica que se fijará y hará efectiva mensualmente en los términos de la ley y su desarrollo.',
  distractors: [
    'Es una prestación en especie que se concede trimestralmente.',
    'Es una ayuda de pago único a tanto alzado.',
    'Es una prestación contributiva calculada sobre bases de cotización.',
  ],
  explanation:
    'El art. 12 establece que el IMV "consistirá en una prestación económica" y que se hará efectiva "mensualmente". Las demás opciones cambian periodicidad o naturaleza.',
});

// 62
add({
  question:
    'Conforme al art. 13.1, ¿cómo se determina la cuantía mensual de la prestación del IMV?',
  correct:
    'Por la diferencia entre la renta garantizada aplicable y el conjunto de rentas e ingresos del ejercicio anterior, si la cuantía resultante es al menos 10 euros mensuales.',
  distractors: [
    'Por la suma de la renta garantizada y los ingresos del ejercicio anterior, siempre.',
    'Por la renta garantizada fija, sin considerar ingresos del ejercicio anterior.',
    'Por la diferencia entre ingresos del ejercicio anterior y renta garantizada, aunque el resultado sea inferior a 10 euros.',
  ],
  explanation:
    'El art. 13.1 dice que viene determinada por la "diferencia" entre renta garantizada y rentas/ingresos del ejercicio anterior, "siempre que" la cuantía sea "igual o superior a 10 euros mensuales". Las otras opciones alteran el cálculo o el umbral.',
});

// 63
add({
  question:
    'Según el art. 13.2.a), ¿cómo se define la renta garantizada para una persona beneficiaria individual?',
  correct:
    'Es el 100% del importe anual de las pensiones no contributivas fijadas anualmente, dividido por doce.',
  distractors: [
    'Es el 75% del salario mínimo interprofesional anual, dividido por doce.',
    'Es el 100% de la base de cotización del solicitante, dividido por doce.',
    'Es el 50% del importe anual de las pensiones contributivas, dividido por doce.',
  ],
  explanation:
    'El art. 13.2.a) indica que la renta garantizada individual es el "100 por ciento" del importe anual de pensiones no contributivas, "dividido por doce". Las demás opciones cambian la referencia legal.',
});

// 64
add({
  question:
    'Conforme al art. 13.2.a), ¿qué complemento se suma a la renta garantizada individual en caso de discapacidad?',
  correct:
    'Un complemento equivalente al 22% si el beneficiario individual tiene discapacidad reconocida igual o superior al 65%.',
  distractors: [
    'Un complemento equivalente al 30% si hay cualquier discapacidad reconocida.',
    'Un complemento equivalente al 22% si la discapacidad es igual o superior al 33%.',
    'No existe ningún complemento por discapacidad para beneficiario individual.',
  ],
  explanation:
    'El art. 13.2.a) añade un complemento "equivalente a un 22 por ciento" cuando haya discapacidad "igual o superior al sesenta y cinco por ciento". Las demás opciones cambian porcentaje o umbral.',
});

// 65
add({
  question:
    'Según el art. 13.2.b), ¿cómo se incrementa la renta garantizada en caso de unidad de convivencia?',
  correct:
    'Se incrementa en un 30% por miembro adicional a partir del segundo, hasta un máximo del 220%.',
  distractors: [
    'Se incrementa en un 22% por cada miembro adicional, sin máximo.',
    'Se incrementa en un 50% por cada miembro adicional a partir del primero.',
    'No se incrementa: la cuantía es la misma que para un beneficiario individual.',
  ],
  explanation:
    'El art. 13.2.b) establece incremento del "30 por ciento" por miembro adicional desde el segundo, con máximo del "220 por ciento". Las otras opciones modifican porcentajes o eliminan máximos.',
});

// 66
add({
  question:
    'Conforme al art. 13.2.c), ¿qué es el complemento de monoparentalidad y a qué cuantía se refiere?',
  correct:
    'Un complemento del 22% de la cuantía de la letra a) cuando la unidad de convivencia sea monoparental.',
  distractors: [
    'Un complemento del 30% de la cuantía de la letra b) para cualquier unidad con menores.',
    'Un complemento del 22% de la cuantía de la letra b) para cualquier unidad.',
    'Un complemento fijo de 100 euros mensuales para unidades monoparentales.',
  ],
  explanation:
    'El art. 13.2.c) habla de "complemento de monoparentalidad equivalente a un 22 por ciento" de la cuantía de la "letra a)" si la unidad es monoparental. Las otras opciones alteran base o forma.',
});

// 67
add({
  question:
    'Según el art. 13.2.c), ¿cuándo se entiende por unidad de convivencia monoparental (regla principal)?',
  correct:
    'Cuando hay un solo adulto con uno o más descendientes menores (hasta 2º grado) con guarda y custodia exclusiva, o con menores en acogimiento/guarda cuando es único acogedor/guardador, o el otro progenitor está en prisión u hospital ≥1 año.',
  distractors: [
    'Cuando conviven dos adultos con menores, aunque ambos tengan guarda compartida.',
    'Cuando hay un solo adulto con descendientes mayores de edad únicamente.',
    'Cuando el otro progenitor está de viaje al extranjero menos de 90 días.',
  ],
  explanation:
    'El art. 13.2.c) define monoparentalidad con "un solo adulto" y descendientes menores con "guarda y custodia exclusiva" (o acogimiento/guarda) o cuando el otro progenitor está "ingresado en prisión" o "centro hospitalario" ≥1 año. Las otras opciones no cumplen los supuestos descritos.',
});

// 68
add({
  question:
    'Conforme al art. 13.2.c), ¿qué supuesto adicional reconoce el mismo complemento cuando los menores conviven exclusivamente con progenitores/abuelos/guardadores?',
  correct:
    'Cuando uno de ellos tenga reconocido grado 3 de dependencia, incapacidad permanente absoluta o gran invalidez.',
  distractors: [
    'Cuando uno de ellos tenga cualquier grado de discapacidad, sin umbral.',
    'Cuando uno de ellos sea demandante de empleo.',
    'Cuando uno de ellos tenga ingresos inferiores al SMI.',
  ],
  explanation:
    'El art. 13.2.c) prevé el complemento si uno tiene "grado 3 de dependencia", "incapacidad permanente absoluta" o "gran invalidez". Las otras opciones no se recogen en ese párrafo.',
});

// 69
add({
  question:
    'Según el art. 13.2.c), ¿qué supuesto específico se equipara a monoparentalidad a efectos del complemento?',
  correct:
    'La unidad formada exclusivamente por una mujer que ha sufrido violencia de género y uno o más descendientes menores sobre los que tenga guarda/custodia o menores en acogimiento/guarda.',
  distractors: [
    'Cualquier unidad formada por una mujer y cualquier conviviente sin parentesco.',
    'Cualquier unidad formada por un hombre víctima de violencia de género y descendientes, sin más.',
    'Una unidad con dos adultos y menores siempre que uno esté desempleado.',
  ],
  explanation:
    'El art. 13.2.c) incluye como monoparental la unidad "formada exclusivamente por una mujer que ha sufrido violencia de género" y descendientes menores bajo guarda/custodia o acogimiento/guarda. Las demás opciones no coinciden con esa definición.',
});

// 70
add({
  question:
    'Conforme al art. 13.2.d), ¿cuándo se suma un complemento adicional por discapacidad en la unidad de convivencia?',
  correct:
    'Cuando en la unidad esté incluida alguna persona con discapacidad reconocida igual o superior al 65%, sumando un 22% de la cuantía de la letra a).',
  distractors: [
    'Cuando cualquier miembro tenga discapacidad igual o superior al 33%, sumando un 30%.',
    'Solo cuando la persona titular tenga discapacidad, nunca otros miembros.',
    'No existe complemento por discapacidad en unidades de convivencia.',
  ],
  explanation:
    'El art. 13.2.d) añade un complemento "equivalente a un 22 por ciento" cuando la unidad incluya alguna persona con discapacidad "igual o superior al sesenta y cinco por ciento". Las otras opciones cambian umbrales o niegan el complemento.',
});

// 71
add({
  question:
    'Según el art. 13.2.e), ¿qué cuantía mensual corresponde por cada menor de tres años en el complemento de ayuda para la infancia?',
  correct:
    '100 euros mensuales.',
  distractors: ['70 euros mensuales.', '50 euros mensuales.', '22 euros mensuales.'],
  explanation:
    'El art. 13.2.e) fija para "Menores de tres años" la cuantía de "100 euros". Las otras cuantías corresponden a otros tramos o no figuran en el artículo.',
});

// 72
add({
  question:
    'Conforme al art. 13.2.e), ¿qué cuantía mensual corresponde por cada menor mayor de tres años y menor de seis años?',
  correct:
    '70 euros mensuales.',
  distractors: ['100 euros mensuales.', '50 euros mensuales.', '30 euros mensuales.'],
  explanation:
    'El art. 13.2.e) establece: "Mayores de tres años y menores de seis años: 70 euros". Las demás opciones son de otros tramos o no están en la ley.',
});

// 73
add({
  question:
    'Según el art. 13.2.e), ¿qué cuantía mensual corresponde por cada menor mayor de seis años y menor de 18 años?',
  correct:
    '50 euros mensuales.',
  distractors: ['100 euros mensuales.', '70 euros mensuales.', '22 euros mensuales.'],
  explanation:
    'El art. 13.2.e) fija: "Mayores de seis años y menores de 18 años: 50 euros". Las otras opciones no corresponden a ese tramo.',
});

// 74
add({
  question:
    'Conforme al art. 13.3, ¿qué criterio habilita un posible incremento reglamentario de las cuantías del IMV por alquiler?',
  correct:
    'Que se acrediten gastos de alquiler de vivienda habitual superiores al 10% de la renta garantizada anual correspondiente.',
  distractors: [
    'Que se acrediten gastos de alquiler superiores al 50% de la renta garantizada mensual.',
    'Que existan gastos de hipoteca, no de alquiler, superiores al 10%.',
    'Que el alquiler sea inferior al 10% para poder incrementar la cuantía.',
  ],
  explanation:
    'El art. 13.3 prevé incremento si hay "gastos de alquiler ... superiores al 10 por ciento de la renta garantizada" en su cuantía anual. Las demás opciones cambian porcentaje, mensualidad o tipo de gasto.',
});

// 75
add({
  question:
    'Según el art. 13.4, en supuestos de custodia compartida judicial, ¿dónde se consideran los mismos hijos/menores a efectos de cuantía?',
  correct:
    'En la unidad donde se encuentren domiciliados.',
  distractors: [
    'En todas las unidades en las que figure uno de los progenitores, duplicando su cómputo.',
    'Siempre en la unidad del progenitor con mayores ingresos.',
    'Siempre en la unidad del progenitor de mayor edad.',
  ],
  explanation:
    'El art. 13.4 indica que, en custodia compartida, se considerará que forman parte de la unidad "donde se encuentren domiciliados". Las demás opciones no figuran en el texto.',
});

// 76
add({
  question:
    'Conforme al art. 13.5, ¿cuál es la cuantía anual de renta garantizada para una persona beneficiaria individual en el ejercicio 2020?',
  correct:
    '5.538 euros.',
  distractors: ['16.614 euros.', '500.000.000 euros.', '10 euros.'],
  explanation:
    'El art. 13.5 dice: "Para el ejercicio 2020 ... asciende a 5.538 euros". Las otras cifras pertenecen a anexos u otros conceptos (p. ej., 16.614 € aparece en anexo II).',
});

// 77
add({
  question:
    'Según el art. 13.6, si el solicitante o miembros tienen reconocidas pensiones (contributivas o no) o subsidio para mayores de 52 años por importe mensual conjunto inferior a la renta garantizada, ¿qué límite se impone al IMV?',
  correct:
    'El IMV no puede ser superior a la diferencia entre la renta garantizada aplicable y el importe mensual de esas pensiones/subsidio.',
  distractors: [
    'El IMV se suma íntegramente a las pensiones, sin límite.',
    'El IMV queda automáticamente extinguido aunque las pensiones sean inferiores a la renta garantizada.',
    'El IMV será siempre igual a la renta garantizada, sin considerar pensiones.',
  ],
  explanation:
    'El art. 13.6 establece que el IMV "no podrá ser superior a la diferencia" entre renta garantizada y el importe mensual conjunto de pensiones/subsidio. Las demás opciones contradicen ese tope.',
});

// 78
add({
  question:
    'Conforme al art. 13.6, ¿qué ocurre si el importe mensual conjunto de pensiones/subsidio para mayores de 52 años es igual o superior a la renta garantizada aplicable?',
  correct:
    'No procede reconocer el derecho al ingreso mínimo vital.',
  distractors: [
    'Se reconoce el IMV íntegro y además se mantiene la pensión completa.',
    'Se reconoce el IMV, pero solo si existe complemento de monoparentalidad.',
    'Se reconoce el IMV únicamente durante tres meses.',
  ],
  explanation:
    'El art. 13.6 indica que si ese importe es "igual o superior" a la renta garantizada, "no procederá reconocer" el IMV. Las demás opciones inventan excepciones no contenidas en el texto.',
});

// 79
add({
  question:
    'Según el art. 14.1, ¿desde cuándo nace el derecho a la prestación del IMV tras presentar la solicitud?',
  correct:
    'Desde el primer día del mes siguiente al de la fecha de presentación de la solicitud.',
  distractors: [
    'Desde el mismo día de presentación de la solicitud.',
    'Desde el primer día del mes en curso, aunque se presente a final de mes.',
    'Desde seis meses después de la solicitud, por silencio administrativo.',
  ],
  explanation:
    'El art. 14.1 señala que el derecho nacerá "a partir del primer día del mes siguiente" al de la presentación. Las otras opciones contradicen esa regla temporal.',
});

// 80
add({
  question:
    'Conforme al art. 14.2, ¿cómo se realiza el pago del ingreso mínimo vital?',
  correct:
    'Mensualmente, mediante transferencia bancaria a una cuenta del titular, conforme a los plazos/procedimientos del Reglamento general de gestión financiera (RD 696/2018).',
  distractors: [
    'Mensualmente, en efectivo en ventanilla del ayuntamiento.',
    'Trimestralmente, mediante cheque bancario.',
    'Mensualmente, mediante ingreso en una tarjeta prepago obligatoria.',
  ],
  explanation:
    'El art. 14.2 dice que el pago será "mensual" y mediante "transferencia bancaria" a una cuenta del titular, según RD 696/2018. Las otras opciones no aparecen en el texto.',
});

// 81
add({
  question:
    'Según el art. 15.1, ¿cuándo se mantiene el derecho a percibir el IMV?',
  correct:
    'Mientras subsistan los motivos de concesión y se cumplan los requisitos y obligaciones previstos en la Ley.',
  distractors: [
    'Solo durante el primer año, aunque persistan los motivos.',
    'Mientras exista empadronamiento, aunque se incumplan obligaciones.',
    'Indefinidamente sin necesidad de cumplir requisitos tras la concesión.',
  ],
  explanation:
    'El art. 15.1 indica que se mantendrá mientras "subsistan los motivos" y se cumplan "requisitos y obligaciones". Las demás opciones introducen límites o eliminan condiciones.',
});

// 82
add({
  question:
    'Conforme al art. 15.2, ¿qué plazo se establece para comunicar circunstancias que afecten al cumplimiento de requisitos u obligaciones?',
  correct:
    'Treinta días naturales.',
  distractors: ['Diez días naturales.', 'Seis meses.', 'Noventa días naturales.'],
  explanation:
    'El art. 15.2 obliga a comunicar "en el plazo de treinta días naturales" las circunstancias relevantes. Las demás opciones no se recogen en el artículo.',
});

// 83
add({
  question:
    'Según el art. 16.1, ¿qué puede comportar el cambio en circunstancias personales del beneficiario o miembros de la unidad de convivencia?',
  correct:
    'La disminución o aumento de la prestación económica mediante la revisión correspondiente por la entidad gestora.',
  distractors: [
    'La imposibilidad absoluta de modificar la cuantía una vez reconocida.',
    'Solo la extinción del derecho, nunca la modificación de cuantía.',
    'Únicamente el aumento de la prestación, nunca la disminución.',
  ],
  explanation:
    'El art. 16.1 establece que el cambio puede comportar "disminución" o "aumento" mediante revisión. Las otras opciones contradicen esa previsión.',
});

// 84
add({
  question:
    'Conforme al art. 16.2, ¿desde cuándo tienen efectos las modificaciones por cambio de circunstancias personales?',
  correct:
    'Desde el día primero del mes siguiente al de la fecha en que se produjo el hecho causante, aplicando el art. 129 LGSS.',
  distractors: [
    'Desde el mismo día del hecho causante, sin regla mensual.',
    'Desde el día primero del año siguiente al cambio.',
    'Desde seis meses después del cambio, por caducidad del procedimiento.',
  ],
  explanation:
    'El art. 16.2 dice que la modificación tendrá efectos "a partir del día primero del mes siguiente" al hecho causante y aplica el "artículo 129" de la LGSS. Las otras opciones no corresponden.',
});

// 85
add({
  question:
    'Según el art. 16.3, ¿cuándo y con qué referencia se actualiza la cuantía del IMV?',
  correct:
    'Se actualiza con efectos de 1 de enero de cada año, tomando como referencia los ingresos anuales computables del ejercicio anterior.',
  distractors: [
    'Se actualiza con efectos de 1 de abril de cada año, tomando como referencia los ingresos del año en curso.',
    'Se actualiza solo a petición del beneficiario y nunca de oficio.',
    'Se actualiza mensualmente con referencia al mes anterior.',
  ],
  explanation:
    'El art. 16.3 establece actualización "con efectos del día 1 de enero" y referencia a ingresos del "ejercicio anterior". Las demás opciones cambian fecha o referencia.',
});

// 86
add({
  question:
    'Conforme al art. 17.1.a), ¿cuál es una causa de suspensión del derecho al IMV?',
  correct:
    'Pérdida temporal de alguno de los requisitos exigidos para su reconocimiento.',
  distractors: [
    'Cualquier discusión familiar sin impacto en requisitos.',
    'Cumplir puntualmente todas las obligaciones.',
    'Tener ingresos inferiores al umbral, con requisitos mantenidos.',
  ],
  explanation:
    'El art. 17.1.a) prevé suspensión por "pérdida temporal" de requisitos. Las otras opciones no son causas legales.',
});

// 87
add({
  question:
    'Según el art. 17.1.b), ¿qué conducta puede dar lugar a suspensión?',
  correct:
    'Incumplimiento temporal de obligaciones por parte del beneficiario, titular o miembro de la unidad de convivencia.',
  distractors: [
    'Cumplimiento temporal de obligaciones.',
    'Solicitar revisión de la prestación.',
    'Cambiar de domicilio comunicándolo en plazo.',
  ],
  explanation:
    'El art. 17.1.b) contempla suspensión por "incumplimiento temporal" de obligaciones. Las demás opciones no encajan en el precepto.',
});

// 88
add({
  question:
    'Conforme al art. 17.1.c), ¿cuándo puede acordarse la suspensión cautelar?',
  correct:
    'En caso de indicios de incumplimiento de requisitos u obligaciones, cuando así lo resuelva la entidad gestora.',
  distractors: [
    'Siempre que el beneficiario cambie de domicilio, aunque lo comunique.',
    'Solo si existe una sentencia penal firme.',
    'Únicamente si hay disminución de ingresos del ejercicio anterior.',
  ],
  explanation:
    'El art. 17.1.c) prevé suspensión cautelar por "indicios" de incumplimiento "cuando así se resuelva". Las otras opciones no se corresponden con el texto.',
});

// 89
add({
  question:
    'Según el art. 17.1 (párrafo sobre extranjero), ¿en qué caso se procederá “en todo caso” a la suspensión cautelar por traslado al extranjero?',
  correct:
    'Si el traslado al extranjero es por un periodo, continuado o no, superior a 90 días naturales al año sin haberlo comunicado con antelación ni estar debidamente justificado.',
  distractors: [
    'Si el traslado al extranjero es por cualquier periodo, aunque sea de 1 día y se comunique.',
    'Si el traslado al extranjero es por un periodo inferior a 90 días al año sin comunicarlo.',
    'Solo si el traslado al extranjero supera 180 días al año.',
  ],
  explanation:
    'El art. 17.1 indica: "En todo caso" suspensión cautelar por traslado al extranjero "superior a noventa días naturales al año" sin comunicación previa ni justificación. Las otras opciones cambian el umbral.',
});

// 90
add({
  question:
    'Conforme al art. 17.1.f), ¿qué condición sobre la declaración del IRPF puede provocar suspensión?',
  correct:
    'Si los obligados tributarios incumplen durante dos ejercicios fiscales seguidos la obligación de presentar la declaración del IRPF en los plazos previstos.',
  distractors: [
    'Si se presenta la declaración del IRPF fuera de plazo un solo ejercicio, sin más.',
    'Si se presenta la declaración del IRPF correctamente en plazo.',
    'Si no se presenta la declaración del IRPF en un solo ejercicio fiscal, necesariamente.',
  ],
  explanation:
    'El art. 17.1.f) establece suspensión cuando los obligados tributarios incumplen "durante dos ejercicios fiscales seguidos" la obligación de presentar IRPF. Las otras opciones cambian el requisito temporal.',
});

// 91
add({
  question:
    'Según el art. 17.2, ¿desde cuándo se suspende el pago del IMV cuando concurre una causa de suspensión?',
  correct:
    'Desde el primer día del mes siguiente a aquel en que se produzcan las causas o a aquel en que se tenga conocimiento por la entidad gestora.',
  distractors: [
    'Desde el mismo día en que se produce la causa, sin regla mensual.',
    'Desde el primer día del año siguiente a la causa.',
    'Desde seis meses después, por el plazo máximo de resolución.',
  ],
  explanation:
    'El art. 17.2 indica suspensión del pago "a partir del primer día del mes siguiente" al de la causa o conocimiento por la entidad. Las otras opciones no corresponden.',
});

// 92
add({
  question:
    'Conforme al art. 17.2, ¿qué efecto tiene mantener la suspensión durante un año?',
  correct:
    'El derecho a la prestación queda extinguido.',
  distractors: [
    'El derecho se renueva automáticamente por otro año.',
    'La suspensión se convierte en una reducción del 50% sin extinción.',
    'No ocurre nada adicional: la suspensión puede mantenerse indefinidamente sin efectos.',
  ],
  explanation:
    'El art. 17.2 establece: "Si la suspensión se mantiene durante un año, el derecho ... quedará extinguido". Las demás opciones contradicen esa consecuencia.',
});

// 93
add({
  question:
    'Según el art. 17.3, ¿cómo se reanuda el derecho tras desaparecer las causas de suspensión?',
  correct:
    'Se reanuda de oficio o a instancia de parte, siempre que se mantengan los requisitos que dieron lugar al reconocimiento; si no, se modifica o extingue.',
  distractors: [
    'Se reanuda solo si el beneficiario presenta nueva solicitud completa, en todo caso.',
    'Se reanuda automáticamente aunque no se mantengan los requisitos.',
    'Nunca se reanuda: toda suspensión implica extinción definitiva.',
  ],
  explanation:
    'El art. 17.3 dice que se reanuda "de oficio o a instancia de parte" si se mantienen requisitos; si no, procede "modificación o extinción". Las otras opciones contradicen el texto.',
});

// 94
add({
  question:
    'Conforme al art. 18.1.a), ¿qué efecto tiene el fallecimiento de la persona titular sobre el derecho al IMV?',
  correct:
    'Extingue el derecho; pero en unidades de convivencia otro miembro que cumpla requisitos puede presentar nueva solicitud en 3 meses para un nuevo derecho.',
  distractors: [
    'No tiene ningún efecto: el derecho se mantiene automáticamente a favor de la unidad sin trámite.',
    'Solo suspende el derecho durante un mes y luego se reanuda automáticamente.',
    'Extingue el derecho y prohíbe cualquier nueva solicitud por parte de la unidad durante un año.',
  ],
  explanation:
    'El art. 18.1.a) prevé extinción por "fallecimiento" del titular, pero permite nueva solicitud por otro miembro en "plazo de tres meses". Las demás opciones no se corresponden con el texto.',
});

// 95
add({
  question:
    'Según el art. 18.1.d), ¿qué conducta es causa de extinción del derecho al IMV?',
  correct:
    'Salida del territorio nacional sin comunicación ni justificación durante un periodo, continuado o no, superior a 90 días naturales al año.',
  distractors: [
    'Salida del territorio nacional por un periodo inferior a 30 días, aunque se comunique.',
    'Cualquier salida del territorio nacional, aunque esté comunicada y justificada.',
    'Solo la salida del territorio nacional superior a 180 días.',
  ],
  explanation:
    'El art. 18.1.d) incluye extinción por salida "superior a noventa días naturales al año" sin comunicación ni justificación. Las otras opciones alteran el umbral o ignoran la comunicación/justificación.',
});

// 96
add({
  question:
    'Conforme al art. 19.1, ¿qué plazo máximo se establece para la revisión de oficio en perjuicio de los beneficiarios de actos relativos al IMV?',
  correct:
    'Cuatro años desde que se dictó la resolución administrativa no impugnada.',
  distractors: ['Un año.', 'Diez años.', 'No existe plazo máximo.'],
  explanation:
    'El art. 19.1 establece revisión "dentro del plazo máximo de cuatro años" desde la resolución no impugnada. Las demás opciones no coinciden con el plazo legal.',
});

// 97
add({
  question:
    'Según el art. 19.2, ¿qué normativa se cita para el procedimiento de reintegro de prestaciones indebidamente percibidas cuando se extingue o modifica y no hay derecho o el importe a percibir es inferior?',
  correct:
    'Real Decreto 148/1996 y el Reglamento General de Recaudación de la Seguridad Social (Real Decreto 1415/2004).',
  distractors: [
    'Ley Orgánica 6/2013 (AIReF) y Real Decreto 706/1997.',
    'Real Decreto-ley 20/2020 y Ley 39/2015.',
    'Ley 7/1985 y Real Decreto 928/1998.',
  ],
  explanation:
    'El art. 19.2 remite al "Real Decreto 148/1996" y al Reglamento General de Recaudación aprobado por "Real Decreto 1415/2004". Las otras referencias pertenecen a materias distintas del reintegro.',
});

// 98
add({
  question:
    'Conforme al art. 19.3, ¿qué regla limita la exigibilidad de cantidades indebidamente percibidas cuando hay menores en la unidad de convivencia?',
  correct:
    'En cada ejercicio no serán exigibles las cantidades que no superen el 65% de la cuantía mensual de las pensiones no contributivas si en la unidad hay al menos un menor.',
  distractors: [
    'No serán exigibles las cantidades que no superen el 10% de la renta garantizada anual.',
    'No será exigible ninguna cantidad indebida si hay menores, en ningún caso.',
    'Serán exigibles siempre todas las cantidades indebidas, aunque haya menores.',
  ],
  explanation:
    'El art. 19.3 indica que "no serán exigibles" las cantidades que no superen el "65 por ciento" de la cuantía mensual de PNC cuando la unidad integre "al menos un beneficiario menor de edad". Las otras opciones contradicen o inventan reglas.',
});

// 99
add({
  question:
    'Según el art. 38.2, ¿qué conducta constituye una infracción leve?',
  correct:
    'No proporcionar documentación e información precisa para acreditar requisitos y conservar la prestación, cuando no se haya derivado percepción o conservación indebida.',
  distractors: [
    'No comunicar cambios que dan lugar a percepción indebida superior al 50% de la cuantía mensual.',
    'Desplazarse al extranjero más de 90 días al año sin comunicar, en todo caso.',
    'Actuar fraudulentamente aportando datos o documentos falsos para obtener prestaciones indebidas.',
  ],
  explanation:
    'El art. 38.2 define como leves "no proporcionar la documentación e información precisa" cuando de ello "no se haya derivado" percepción o conservación indebida. Las otras opciones son supuestos de infracción grave o muy grave (art. 38.3 y 38.4).',
});

// 100
add({
  question:
    'Conforme a la disposición adicional undécima.1, ¿en cuál de estas circunstancias los Servicios Públicos de Empleo NO procederán a la inscripción de oficio como demandantes de empleo de beneficiarios del IMV?',
  correct:
    'Cuando estén trabajando por cuenta ajena o desarrollando una actividad por cuenta propia.',
  distractors: [
    'Cuando sean mayores de 18 y menores de 65 años y no trabajen.',
    'Cuando no figuren como beneficiarios del ingreso mínimo vital.',
    'Cuando vivan en una unidad de convivencia monoparental.',
  ],
  explanation:
    'La disposición adicional undécima.1 establece que los Servicios Públicos de Empleo "no procederán a la inscripción de oficio" si la persona está "trabajando por cuenta ajena o desarrollando una actividad por cuenta propia". Las otras opciones no aparecen como excepciones en esa disposición.',
});

// 101
add({
  question:
    'Según el art. 3.e), ¿qué alcance tiene la inembargabilidad/indisponibilidad del ingreso mínimo vital respecto a compensaciones o descuentos?',
  correct:
    'No puede ser objeto de compensación o descuento, ni de retención o embargo, salvo en los supuestos y con los límites del art. 44 LGSS.',
  distractors: [
    'Puede ser objeto de compensación y descuento por cualquier deuda, sin límite alguno.',
    'Solo es inembargable si el beneficiario es una unidad monoparental.',
    'Solo es inembargable frente a deudas privadas, pero no frente a deudas públicas.',
  ],
  explanation:
    'El art. 3.e) declara que no podrá ser objeto de "compensación o descuento" ni de "retención o embargo" salvo supuestos y límites del "art. 44" de la LGSS. Las otras opciones introducen excepciones que el precepto no contiene.',
});

// 102
add({
  question:
    'Conforme al art. 4.2, ¿qué matiz introduce la ley cuando la usuaria del servicio residencial es víctima de violencia de género o de trata/explotación sexual?',
  correct:
    'Que el carácter temporal del uso residencial puede ser permanente en esos supuestos, sin impedir el acceso al IMV.',
  distractors: [
    'Que siempre se prohíbe el acceso al IMV si hay residencia en un servicio residencial, sin excepción.',
    'Que solo se permite si la usuaria lleva menos de 30 días en el servicio residencial.',
    'Que únicamente se permite si la residencia es sanitaria, no social.',
  ],
  explanation:
    'El art. 4.2 permite a beneficiarias que "temporalmente" sean usuarias de un servicio residencial, y añade que "podrá ser permanente" para mujeres víctimas de violencia de género o de trata/explotación sexual. Las otras opciones niegan o restringen sin base.',
});

// 103
add({
  question:
    'Según el art. 5.4, ¿quién puede recibir el pago del IMV cuando la entidad gestora no lo abona al titular?',
  correct:
    'Otro miembro de la unidad de convivencia distinto del titular, en los términos que se establezcan reglamentariamente.',
  distractors: [
    'Cualquier tercero ajeno a la unidad de convivencia, por simple autorización verbal.',
    'Solo el ayuntamiento del domicilio, como intermediario obligatorio.',
    'Siempre el cónyuge del titular, aunque no forme parte de la unidad de convivencia.',
  ],
  explanation:
    'El art. 5.4 prevé que la entidad gestora "podrá acordar el pago" a "otro miembro" de la unidad "distinto del titular" en términos reglamentarios. Las otras opciones no aparecen en el precepto.',
});

// 104
add({
  question:
    'Conforme al art. 6.2, ¿qué tipo de separación transitoria se equipara expresamente a las de estudios o trabajo para no romper la convivencia?',
  correct:
    'La separación por tratamiento médico o rehabilitación (u otras causas similares).',
  distractors: [
    'La separación por vacaciones o turismo, en cualquier caso.',
    'La separación por cambio de domicilio voluntario y definitivo.',
    'La separación por traslado permanente al extranjero.',
  ],
  explanation:
    'El art. 6.2 incluye como supuestos de separación transitoria que "no rompe la convivencia" el "tratamiento médico" o la "rehabilitación" (además de estudios o trabajo). Las demás opciones no están amparadas por esa cláusula.',
});

// 105
add({
  question:
    'Según el art. 7 (párrafo final), ¿qué consecuencia tiene superar el límite temporal de tres años en los supuestos b) y c) para ser unidad independiente?',
  correct:
    'Que ya no cabe la consideración como unidad de convivencia independiente por esos supuestos, al haber expirado el plazo legal.',
  distractors: [
    'Que se mantiene indefinidamente la consideración como unidad independiente.',
    'Que se convierte automáticamente en beneficiario individual sin más requisitos.',
    'Que el plazo se amplía automáticamente si existen menores.',
  ],
  explanation:
    'El art. 7 señala que en los supuestos b) y c) "únicamente cabrá" esa consideración "durante los tres años siguientes"; superado ese plazo, deja de operar. Las otras opciones inventan prórrogas o conversiones automáticas.',
});

// 106
add({
  question:
    'Conforme al art. 10.1.a), ¿qué se entiende por residencia habitual a efectos del mantenimiento del derecho en relación con estancias en el extranjero?',
  correct:
    'Que la residencia habitual se mantiene si las estancias en el extranjero no superan 90 días naturales por año o si la ausencia se debe a enfermedad debidamente justificada.',
  distractors: [
    'Que basta con mantener el empadronamiento aunque se esté fuera más de 180 días.',
    'Que cualquier estancia en el extranjero implica pérdida automática de la residencia habitual.',
    'Que el límite es siempre de 30 días naturales por año.',
  ],
  explanation:
    'El art. 10.1.a) precisa que se entiende residencia habitual aun con estancias en el extranjero "siempre que" no superen "noventa días naturales" al año, o por enfermedad justificada. Las otras opciones cambian el límite o lo eliminan.',
});

// 107
add({
  question:
    'Según el art. 10.4, ¿qué diferencia práctica implica que los requisitos deban mantenerse durante el tiempo de percepción?',
  correct:
    'Que el incumplimiento sobrevenido puede afectar al mantenimiento del derecho, dando lugar a revisión, suspensión o extinción según proceda.',
  distractors: [
    'Que el cumplimiento solo se verifica antes de la resolución y luego no puede revisarse.',
    'Que una vez reconocido el derecho, queda blindado aunque cambien ingresos o patrimonio.',
    'Que los requisitos solo se exigen para el complemento de ayuda para la infancia, no para el IMV.',
  ],
  explanation:
    'El art. 10.4 exige que los requisitos se "mantengan" durante la percepción, lo que conecta con la posibilidad de revisión y con regímenes de "suspensión" o "extinción" (arts. 17 y 18). Las otras opciones contradicen ese carácter continuado.',
});

// 108
add({
  question:
    'Conforme al art. 11.2, ¿qué mínimo diferencial exige la ley entre ingresos promedio mensual computable y renta garantizada mensual para apreciar vulnerabilidad?',
  correct:
    'Que el promedio mensual sea inferior al menos en 10 euros a la renta garantizada mensual aplicable.',
  distractors: [
    'Que el promedio mensual sea inferior al menos en 1 euro.',
    'Que el promedio mensual sea inferior al menos en 100 euros.',
    'Que el promedio mensual sea exactamente igual a la renta garantizada.',
  ],
  explanation:
    'El art. 11.2 fija el umbral: inferior "al menos en 10 euros". Las otras opciones modifican el diferencial o anulan la comparación.',
});

// 109
add({
  question:
    'Según el art. 11.5, ¿qué dos fuentes de acreditación menciona la ley para la parte proporcional de ingresos del año en curso?',
  correct:
    'Los datos obrantes en la Seguridad Social o, en su defecto, una declaración responsable del solicitante o titular.',
  distractors: [
    'Solo la declaración del IRPF ya presentada del año en curso.',
    'Exclusivamente un certificado bancario de saldos a 31 de diciembre.',
    'Únicamente un informe de los servicios sociales del ayuntamiento.',
  ],
  explanation:
    'El art. 11.5 indica que se computará con los "datos" que obren en la Seguridad Social o, "en su defecto", mediante "declaración responsable". Las otras opciones no aparecen en el texto.',
});

// 110
add({
  question:
    'Conforme al art. 13.1, ¿qué requisito adicional evita el reconocimiento de cuantías testimoniales del IMV?',
  correct:
    'Que la cuantía resultante de la diferencia sea igual o superior a 10 euros mensuales.',
  distractors: [
    'Que la cuantía resultante sea superior a 100 euros mensuales.',
    'Que la cuantía resultante sea superior a 1 euro mensual.',
    'No hay umbral mínimo: se reconoce aunque resulte 0 euros.',
  ],
  explanation:
    'El art. 13.1 condiciona el reconocimiento a que la cuantía sea "igual o superior a 10 euros mensuales". Las demás opciones inventan umbrales distintos o niegan el mínimo.',
});

// 111
add({
  question:
    'Según el art. 13.2.b), ¿desde qué miembro empieza a aplicarse el incremento del 30% en la unidad de convivencia?',
  correct:
    'A partir del segundo miembro de la unidad de convivencia.',
  distractors: [
    'A partir del primer miembro.',
    'Solo a partir del tercer miembro.',
    'Solo a partir del cuarto miembro.',
  ],
  explanation:
    'El art. 13.2.b) es claro: incremento del 30% "por miembro adicional a partir del segundo". Las otras opciones alteran el punto de inicio.',
});

// 112
add({
  question:
    'Conforme al art. 13.2.c), ¿qué requisito se exige sobre la guarda y custodia para considerar monoparental una unidad con un solo progenitor conviviente?',
  correct:
    'Que tenga la guarda y custodia exclusiva de los descendientes menores hasta el segundo grado.',
  distractors: [
    'Que exista custodia compartida sin necesidad de domicilio común de los menores.',
    'Que exista un convenio verbal entre progenitores, sin resolución.',
    'Que los descendientes sean mayores de edad.',
  ],
  explanation:
    'El art. 13.2.c) define monoparentalidad con un solo adulto y descendientes menores con "guarda y custodia exclusiva". Las otras opciones no cumplen el requisito literal.',
});

// 113
add({
  question:
    'Según el art. 14.1, ¿qué impacto tiene presentar la solicitud el último día del mes respecto del nacimiento del derecho?',
  correct:
    'El derecho nace igualmente el primer día del mes siguiente, no el mismo mes de la solicitud.',
  distractors: [
    'El derecho nace el mismo día de la solicitud, por ser el último del mes.',
    'El derecho nace el primer día del mes en curso si la solicitud se presenta antes de las 14:00.',
    'El derecho nace al cabo de 90 días, por aplicación del límite de estancias en el extranjero.',
  ],
  explanation:
    'El art. 14.1 fija una regla objetiva: el derecho nace "a partir del primer día del mes siguiente" a la presentación, sin excepciones por fecha dentro del mes. Las demás opciones inventan criterios no previstos.',
});

// 114
add({
  question:
    'Conforme al art. 16.2, ¿qué relación se establece entre el hecho causante del cambio y el momento de efectos de la modificación?',
  correct:
    'La modificación produce efectos el primer día del mes siguiente al del hecho causante, no desde el propio hecho.',
  distractors: [
    'La modificación produce efectos retroactivos desde el hecho causante siempre.',
    'La modificación produce efectos solo desde el año siguiente al hecho.',
    'La modificación no puede tener efectos: solo cabe extinción.',
  ],
  explanation:
    'El art. 16.2 establece efectos "a partir del día primero del mes siguiente" al hecho causante (y remite al "artículo 129" LGSS). Las otras opciones contradicen esa regla.',
});

// 115
add({
  question:
    'Según el art. 17.1 (párrafo sobre extranjero), ¿qué dos elementos adicionales al exceso de 90 días activan “en todo caso” la suspensión cautelar?',
  correct:
    'No haberlo comunicado con antelación a la entidad gestora y no estar debidamente justificado.',
  distractors: [
    'Tener menores a cargo y estar empadronado.',
    'Haber iniciado trámites de separación o divorcio.',
    'Ser beneficiario individual y no unidad de convivencia.',
  ],
  explanation:
    'El art. 17.1 dispone suspensión cautelar "en todo caso" si el traslado supera 90 días al año "sin haberlo comunicado" y "sin estar debidamente justificado". Las otras opciones no son condiciones del párrafo.',
});

// 116
add({
  question:
    'Conforme al art. 17.2, ¿qué sucede si la entidad gestora tiene conocimiento de una causa de suspensión en un mes posterior a aquel en que se produjo?',
  correct:
    'La suspensión del pago se produce desde el primer día del mes siguiente a aquel en que la entidad gestora tenga conocimiento.',
  distractors: [
    'La suspensión siempre se retrotrae al mes del hecho, aunque no se conociera.',
    'La suspensión solo puede producirse desde el 1 de enero del año siguiente.',
    'No puede suspenderse si la entidad gestora no lo conoció en el mismo mes.',
  ],
  explanation:
    'El art. 17.2 contempla dos referencias: mes de producción de la causa o mes de "conocimiento" por la entidad, y fija efectos desde el "primer día del mes siguiente" al que corresponda. Las demás opciones contradicen la literalidad.',
});

// 117
add({
  question:
    'Según el art. 18.1.a), ¿qué efecto tiene presentar la nueva solicitud por un miembro de la unidad de convivencia fuera del plazo de tres meses tras fallecimiento del titular?',
  correct:
    'No se aplica la regla especial del precepto, al haberse incumplido el plazo de "tres meses" para la nueva solicitud.',
  distractors: [
    'La prestación se mantiene automáticamente sin necesidad de solicitud.',
    'La prestación se reanuda retroactivamente desde el fallecimiento en todo caso.',
    'La ley prevé un plazo de un año, no de tres meses.',
  ],
  explanation:
    'El art. 18.1.a) permite que otro miembro "podrá presentar una nueva solicitud" en el "plazo de tres meses". Si se presenta fuera, no opera esa previsión especial. Las otras opciones niegan el requisito temporal o lo alteran.',
});

// 118
add({
  question:
    'Conforme al art. 19.1, ¿qué condición previa debe existir para que el INSS revise de oficio un acto en perjuicio del beneficiario dentro del plazo de cuatro años?',
  correct:
    'Que el acto haya tenido carácter declarativo de derechos y no haya sido impugnado, y que la revisión responda a omisiones o inexactitudes en declaraciones del beneficiario.',
  distractors: [
    'Que exista siempre una sentencia penal firme por fraude.',
    'Que el acto haya sido impugnado y esté recurrido, y por eso se revise de oficio.',
    'Que haya transcurrido más de cuatro años, porque entonces se amplía el plazo.',
  ],
  explanation:
    'El art. 19.1 se refiere a actos "declarativos de derechos" "no impugnados" y a revisión por "omisiones o inexactitudes" en declaraciones. Las otras opciones introducen requisitos inexistentes o invierten el plazo.',
});

// 119
add({
  question:
    'Según el art. 38.3, ¿qué conducta se tipifica expresamente como infracción grave cuando se omite comunicación de cambios?',
  correct:
    'No comunicar cambios o situaciones determinantes de suspensión/modificación/extinción cuando derive percepción indebida de cuantía mensual superior al 50% y hasta el 100% del importe mensual a que se tuviera derecho.',
  distractors: [
    'No comunicar cambios aunque no exista percepción indebida alguna, en todo caso.',
    'No comunicar cambios cuando derive percepción indebida siempre superior al 200% del importe mensual.',
    'No comunicar cambios únicamente cuando se trate de cambios de domicilio dentro del mismo municipio.',
  ],
  explanation:
    'El art. 38.3.a) tipifica como grave no comunicar cuando derive percepción indebida "superior al 50 por ciento" y "hasta el 100 por ciento" del importe mensual debido. Las otras opciones cambian el umbral o eliminan el requisito de percepción indebida.',
});

// 120
add({
  question:
    'Conforme al art. 38.4, ¿cuál es una conducta tipificada como infracción muy grave vinculada al fraude en la obtención de la prestación?',
  correct:
    'Actuar fraudulentamente para obtener o conservar prestaciones indebidas, mediante cualquier conducta dolosa.',
  distractors: [
    'No aportar un documento cuando no se ha producido percepción indebida.',
    'Comunicar fuera de plazo un cambio que no afecta a requisitos.',
    'Solicitar revisión de la cuantía con datos correctos.',
  ],
  explanation:
    'El art. 38.4 tipifica como muy grave "actuar fraudulentamente" para obtener o conservar prestaciones indebidas (conducta dolosa). Las otras opciones encajan, en su caso, en leves (art. 38.2) o no son infracciones.',
});

if (raw.length !== TOTAL) {
  throw new Error(`Internal error: expected raw length ${TOTAL}, got ${raw.length}`);
}

// Deterministic shuffle then re-key to balanced answer sequence
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

const payload = { questions };
fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`OK ${OUT_FILE} count=${questions.length} dist=${JSON.stringify(dist)} maxRun=${maxRun} seqStart=${seqStart}`);

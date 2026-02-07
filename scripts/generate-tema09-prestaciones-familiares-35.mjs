import fs from "node:fs";

const outPath = "TEMA 09_ESPECÍFICO_PRESTACIONES FAMILIARES.JSON";

const questions = [];
const push = (q) => questions.push({ ...q, difficulty: "hard" });

function hashStringToUInt32(str) {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function maxRun(seq) {
  let max = 0;
  let run = 0;
  let last = null;
  for (const ch of seq) {
    if (ch === last) run += 1;
    else {
      run = 1;
      last = ch;
    }
    if (run > max) max = run;
  }
  return max;
}

function isPeriodic(seq, period) {
  for (let i = 0; i < seq.length; i++) {
    if (seq[i] !== seq[i % period]) return false;
  }
  return true;
}

function hasTooPredictablePattern(seq) {
  for (let p = 1; p <= 8; p++) {
    if (seq.length >= p * 4 && isPeriodic(seq, p)) return true;
  }
  return false;
}

function validateQuestions(list) {
  if (!Array.isArray(list)) throw new Error("questions must be an array");
  if (list.length !== 35) throw new Error(`Expected 35 questions, got ${list.length}`);

  const letters = new Set(["A", "B", "C", "D"]);
  const dist = { A: 0, B: 0, C: 0, D: 0 };

  for (const [i, q] of list.entries()) {
    if (!q || typeof q !== "object") throw new Error(`Question ${i} not an object`);
    if (typeof q.question !== "string" || !q.question.trim())
      throw new Error(`Question ${i} missing question text`);
    if (!Array.isArray(q.options) || q.options.length !== 4)
      throw new Error(`Question ${i} must have 4 options`);
    if (![0, 1, 2, 3].every((k) => typeof q.options[k] === "string" && q.options[k].trim()))
      throw new Error(`Question ${i} has empty options`);
    if (new Set(q.options).size !== 4) throw new Error(`Question ${i} has duplicated options`);
    if (!letters.has(q.correctAnswer))
      throw new Error(`Question ${i} invalid correctAnswer: ${q.correctAnswer}`);
    if (typeof q.explanation !== "string" || !q.explanation.trim())
      throw new Error(`Question ${i} missing explanation`);
    if (!q.explanation.includes("art."))
      throw new Error(`Question ${i} explanation must cite art.`);
    if (!q.explanation.includes('"'))
      throw new Error(`Question ${i} explanation must include a quoted literal fragment`);
    if (q.difficulty !== "hard") throw new Error(`Question ${i} difficulty must be hard`);
    dist[q.correctAnswer] += 1;
  }

  const seq = list.map((q) => q.correctAnswer).join("");
  const run = maxRun(seq);
  if (run > 2) throw new Error(`Max run of same correctAnswer is ${run} (>2)`);
  if (hasTooPredictablePattern(seq))
    throw new Error(`CorrectAnswer sequence looks periodic/predictable: ${seq.slice(0, 32)}...`);

  const values = Object.values(dist);
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min > 1) throw new Error(`Distribution too imbalanced: ${JSON.stringify(dist)}`);

  return { dist, seqStart: seq.slice(0, 24) };
}

function makeTargetCounts(total, rand) {
  const letters = ["A", "B", "C", "D"];
  const base = Math.floor(total / 4);
  const rem = total % 4;
  const counts = { A: base, B: base, C: base, D: base };
  shuffleInPlace(letters, rand);
  for (let i = 0; i < rem; i++) counts[letters[i]] += 1;
  return counts;
}

function buildNonRepeatingSequence(counts, rand) {
  const letters = ["A", "B", "C", "D"];
  const remaining = { ...counts };
  const total = Object.values(remaining).reduce((a, b) => a + b, 0);
  const seq = [];

  for (let i = 0; i < total; i++) {
    const candidates = letters.filter((l) => {
      if (remaining[l] <= 0) return false;
      const n = seq.length;
      if (n >= 2 && seq[n - 1] === l && seq[n - 2] === l) return false;
      return true;
    });

    if (candidates.length === 0) return null;

    const weightSum = candidates.reduce((acc, l) => acc + remaining[l], 0);
    let r = rand() * weightSum;
    let picked = candidates[candidates.length - 1];
    for (const l of candidates) {
      r -= remaining[l];
      if (r <= 0) {
        picked = l;
        break;
      }
    }

    seq.push(picked);
    remaining[picked] -= 1;
  }

  return seq;
}

function applyBalancedAnswerKey(list, rand) {
  const idxByLetter = { A: 0, B: 1, C: 2, D: 3 };

  function rekeyQuestion(q, desiredLetter) {
    const currentIdx = idxByLetter[q.correctAnswer];
    const desiredIdx = idxByLetter[desiredLetter];
    const options = q.options.slice();
    if (currentIdx !== desiredIdx) {
      [options[currentIdx], options[desiredIdx]] = [options[desiredIdx], options[currentIdx]];
    }
    return { ...q, options, correctAnswer: desiredLetter };
  }

  const counts = makeTargetCounts(list.length, rand);

  for (let attempt = 0; attempt < 8000; attempt++) {
    const seq = buildNonRepeatingSequence(counts, rand);
    if (!seq) continue;
    const seqStr = seq.join("");
    if (maxRun(seqStr) > 2) continue;
    if (hasTooPredictablePattern(seqStr)) continue;

    return { rekeyed: list.map((q, i) => rekeyQuestion(q, seq[i])), seq };
  }

  throw new Error("Could not build a balanced, non-predictable answer key.");
}

// ---------------------------------------------------------------------------
// TEMA 09 - Prestaciones familiares (ESPECÍFICO)
// ÚNICA FUENTE: RD 1335/2005 (texto pegado)
// ---------------------------------------------------------------------------

// Art. 1-3 (disposiciones generales)

push({
  question:
    "Según el art. 1 del RD 1335/2005, ¿qué parte concreta del TRLGSS desarrolla reglamentariamente este real decreto?",
  options: [
    "El capítulo IX del título II del texto refundido de la Ley General de la Seguridad Social, relativo a las prestaciones familiares.",
    "El capítulo VIII del título I del TRLGSS, relativo a la incapacidad temporal.",
    "El título III completo del TRLGSS, relativo a la recaudación.",
    "La disposición adicional vigésima quinta del TRLGSS, sobre procedimientos administrativos.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 1 indica que el objeto es el desarrollo reglamentario del "capítulo IX del título II" del TRLGSS "relativo a las prestaciones familiares". B, C y D se refieren a materias distintas o a una disposición citada en art. 27, no al objeto del art. 1.',
});

push({
  question:
    "Conforme al art. 2 del RD 1335/2005, ¿qué periodo de excedencia con reserva de puesto se considera como periodo de cotización efectiva con carácter general?",
  options: [
    "El primer año de excedencia con reserva del puesto de trabajo.",
    "Los primeros dos años de excedencia con reserva del puesto.",
    "Los primeros seis meses de excedencia con reserva del puesto.",
    "Todo el periodo de excedencia, cualquiera que sea su duración.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 2 dispone que tendrá la consideración de periodo de cotización efectiva "el primer año de excedencia con reserva del puesto de trabajo". B, C y D no coinciden con la literalidad.',
});

push({
  question:
    "Según el art. 2 del RD 1335/2005, además del cuidado de hijos o menores acogidos, ¿hasta qué grado de consanguinidad o afinidad se incluye el cuidado de un familiar para el reconocimiento de periodo cotizado?",
  options: [
    "Hasta el segundo grado de consanguinidad o afinidad.",
    "Hasta el primer grado de consanguinidad o afinidad.",
    "Hasta el tercer grado de consanguinidad o afinidad.",
    "Sin límite de grado.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 2 incluye el cuidado de un familiar "hasta el segundo grado de consanguinidad o afinidad". B y C alteran el grado; D no está previsto.',
});

push({
  question:
    "Conforme al art. 2 (párrafo segundo) del RD 1335/2005, si la excedencia es por cuidado de un menor y la unidad familiar es familia numerosa de categoría especial, ¿cuánto dura el periodo considerado como cotización efectiva?",
  options: [
    "18 meses.",
    "15 meses.",
    "12 meses.",
    "24 meses.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 2 prevé 15 meses para familia numerosa general, "o de 18 meses" cuando sea "categoría especial". B, C y D no se ajustan.',
});

push({
  question:
    "Según el art. 3 del RD 1335/2005, ¿cuál de las siguientes NO figura como prestación familiar en modalidad no contributiva?",
  options: [
    "Asignación económica por hijo a cargo (menor de 18 o mayor con minusvalía ≥65%), y por menores acogidos permanentes o preadoptivos.",
    "Prestación económica de pago único a tanto alzado por nacimiento o adopción del tercer o sucesivos hijos.",
    "Prestación económica de pago único por parto o adopción múltiples.",
    "Subsidio diario equivalente al 100% de la base reguladora por reducción de jornada.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 3 enumera en a), b) y c) las tres prestaciones familiares no contributivas. La opción D describe otra figura no mencionada en el art. 3. A, B y C sí están literalmente en el art. 3.',
});

// Capítulo II: art. 4-8 (excedencia como cotizada)

push({
  question:
    "Conforme al art. 4 del RD 1335/2005, ¿a qué colectivo se aplica lo previsto en el art. 2?",
  options: [
    "A todos los trabajadores por cuenta ajena que disfruten excedencia con reserva del puesto en los supuestos previstos.",
    "Solo a trabajadores autónomos.",
    "Solo a empleados públicos incluidos en el EBEP.",
    "Solo a trabajadores a tiempo parcial.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 4 dice: "Será de aplicación (...) a todos los trabajadores por cuenta ajena" que disfruten los periodos de excedencia con reserva. B, C y D restringen sin apoyo en el texto.',
});

push({
  question:
    "Según el art. 5.1 del RD 1335/2005, ¿qué periodo se computa como efectivamente cotizado?",
  options: [
    "El correspondiente al primer año de excedencia para cuidado de hijo, menor acogido u otros familiares.",
    "El correspondiente a los dos primeros años de excedencia.",
    "Solo el tiempo mínimo legal de excedencia, pero no el disfrutado.",
    "Ningún periodo se computa como cotizado.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 5.1 fija como computable "el correspondiente al primer año" de excedencia para los supuestos citados. B, C y D no se ajustan.',
});

push({
  question:
    "Conforme al art. 5.3 del RD 1335/2005, si no se completan los periodos máximos computables, ¿qué se computa como cotizado?",
  options: [
    "El periodo efectivamente disfrutado.",
    "Solo el periodo mínimo legal.",
    "El periodo solicitado inicialmente aunque no se disfrute.",
    "No se computa nada si no se completa.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 5.3 señala: "se computará como cotizado el período efectivamente disfrutado". B, C y D contradicen esa regla.',
});

push({
  question:
    "Según el art. 5.4 del RD 1335/2005, ¿cuándo se inicia el cómputo de un nuevo periodo de cotización efectiva?",
  options: [
    "Por cada disfrute de excedencia laboral a que puedan dar lugar los sucesivos hijos, menores u otros familiares.",
    "Solo una vez por trabajador en toda su vida laboral.",
    "Solo cuando la excedencia sea por cuidado de un hijo natural.",
    "Únicamente cuando la empresa lo comunique a la TGSS.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 5.4 dispone: "Se iniciará el cómputo de un nuevo período (...) por cada disfrute" que pueda darse por sucesivos hijos/menores/otros familiares. B, C y D no figuran.',
});

push({
  question:
    "Conforme al art. 6.1 del RD 1335/2005, ¿para qué aspectos del cálculo y acceso a prestaciones surte efectos el periodo considerado como cotización efectiva?",
  options: [
    "Para cobertura del periodo mínimo, determinación de base reguladora y porcentaje aplicable, y se considera al beneficiario en alta.",
    "Solo para la cobertura del periodo mínimo de cotización.",
    "Solo para asistencia sanitaria.",
    "Solo para calcular la base mínima, sin afectar a porcentajes.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 6.1 indica efectos "tanto" para periodo mínimo como para "base reguladora" y "porcentaje aplicable" y considera al beneficiario "en situación de alta". B, C y D son incompletas o incorrectas.',
});

push({
  question:
    "Según el art. 6.2 del RD 1335/2005, durante el periodo considerado como cotizado, ¿qué derecho se mantiene?",
  options: [
    "El derecho a la prestación de asistencia sanitaria de la Seguridad Social.",
    "El derecho al desempleo contributivo.",
    "El derecho a prestaciones familiares en modalidad contributiva.",
    "El derecho a un complemento por mínimos del 95%.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 6.2 establece: "mantendrán el derecho a la prestación de asistencia sanitaria". B, C y D no aparecen en el art. 6.',
});

push({
  question:
    "Conforme al art. 7 del RD 1335/2005, ¿cómo se determina la base de cotización a considerar para los efectos del art. 6?",
  options: [
    "Por el promedio de las bases de cotización de los seis meses inmediatamente anteriores al inicio de la excedencia.",
    "Por la última base de cotización del mes anterior.",
    "Por la base mínima del grupo de cotización.",
    "Por un promedio de doce meses posteriores al inicio de la excedencia.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 7 fija la base como "promedio" de los "seis meses inmediatamente anteriores" al inicio de la excedencia. B, C y D no se ajustan.',
});

push({
  question:
    "Según el art. 7 (párrafo segundo) del RD 1335/2005, si el beneficiario no acredita seis meses de cotización, ¿qué promedio se computa?",
  options: [
    "El promedio de las bases correspondientes al periodo inmediatamente anterior al inicio de la excedencia que resulten acreditadas.",
    "El promedio de las bases del mismo periodo del año anterior.",
    "La base mínima interprofesional vigente.",
    "No se puede computar ninguna base.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 7 dice que si no hay seis meses, se computa el promedio del "período inmediatamente anterior" al inicio de la excedencia "que resulten acreditadas". B, C y D no figuran.',
});

push({
  question:
    "Conforme al art. 8 del RD 1335/2005, ¿en qué plazo deben comunicar las empresas a la TGSS el inicio y finalización de la excedencia con reserva de puesto?",
  options: [
    "En el plazo de 15 días, a partir de que se produzca.",
    "En el plazo de 30 días, a partir del inicio.",
    "En el plazo de 10 días desde la solicitud del trabajador.",
    "Antes del 1 de abril de cada año.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8 establece un plazo de "15 días" desde que se produzca para comunicar inicio y finalización. B, C y D no son el plazo del art. 8 (el 1 de abril aparece en art. 16.2 para ingresos).',
});

push({
  question:
    "Según el art. 8 (párrafo segundo) del RD 1335/2005, ¿qué consecuencia se prevé por la omisión de la comunicación empresarial a la TGSS?",
  options: [
    "Puede ser objeto de la sanción correspondiente, conforme a la gravedad de la infracción, según el texto refundido de la Ley sobre infracciones y sanciones en el orden social (RDL 5/2000).",
    "Extinción automática del derecho del trabajador a las prestaciones.",
    "Suspensión obligatoria del procedimiento administrativo por 90 días.",
    "Conversión de la excedencia en despido.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8 dice que la omisión "podrá ser objeto de la sanción correspondiente" según la gravedad, conforme al RDL 5/2000. B, C y D no están en el texto.',
});

// Capítulo III Sección 1ª: art. 9-18 (asignación por hijo/minor acogido)

push({
  question:
    "Conforme al art. 9.1 del RD 1335/2005, ¿cuándo se considera que el hijo o menor acogido está a cargo?",
  options: [
    "Cuando conviva y dependa económicamente del beneficiario.",
    "Cuando conviva con el beneficiario, aunque no dependa económicamente.",
    "Cuando dependa económicamente, aunque no conviva.",
    "Siempre que sea menor de 18 años.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 9.1 define a cargo cuando "conviva y dependa económicamente". B y C eliminan uno de los dos requisitos; D añade un criterio de edad que no es definición del art. 9.1.',
});

push({
  question:
    "Según el art. 9.2 del RD 1335/2005, ¿qué regla de presunción se establece sobre la dependencia económica?",
  options: [
    "Se presume dependencia económica cuando convive con el beneficiario, salvo prueba en contrario.",
    "Se presume dependencia económica cuando no convive con el beneficiario.",
    "No existe ninguna presunción; siempre debe probarse.",
    "Se presume dependencia económica si el menor está escolarizado.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 9.2 dice: "Se entenderá, salvo prueba en contrario, que existe dependencia económica" cuando conviva con el beneficiario. B, C y D contradicen o inventan.',
});

push({
  question:
    "Conforme al art. 9.2 del RD 1335/2005, ¿cuál de las siguientes situaciones NO rompe la convivencia a estos efectos?",
  options: [
    "La separación transitoria motivada por razón de estudios.",
    "El matrimonio del hijo.",
    "La emancipación notarial del hijo.",
    "La renuncia expresa del beneficiario.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 9.2 indica que no rompe la convivencia la separación transitoria por "estudios" (también trabajo, tratamiento médico, rehabilitación u otras causas similares). B, C y D no aparecen como supuestos en el art. 9.2.',
});

push({
  question:
    "Según el art. 9.3 del RD 1335/2005, aun realizando un trabajo lucrativo, ¿cuándo se considera que el hijo o menor acogido está a cargo?",
  options: [
    "Si continúa conviviendo con el beneficiario y sus ingresos por rendimientos del trabajo no superan el 75% del SMI en cómputo anual.",
    "Siempre que los ingresos no superen el 50% del SMI.",
    "Aunque no conviva, si trabaja por cuenta ajena.",
    "Nunca, porque el trabajo lucrativo rompe el requisito.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 9.3 mantiene la condición a cargo "aun cuando realice un trabajo lucrativo" si convive y los ingresos no superan "el 75 por ciento del salario mínimo interprofesional" en cómputo anual. B, C y D no se ajustan.',
});

push({
  question:
    "Conforme al art. 9.4 del RD 1335/2005, ¿cuándo se considera que el hijo o menor acogido NO está a cargo del beneficiario?",
  options: [
    "Cuando sea perceptor de una pensión contributiva, distinta de la pensión de orfandad o de la pensión en favor de familiares de nietos y hermanos.",
    "Cuando sea perceptor de pensión de orfandad.",
    "Cuando conviva con el beneficiario pero estudie fuera.",
    "Cuando tenga ingresos inferiores al 75% del SMI.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 9.4 dice que no está a cargo cuando sea perceptor de "una pensión contributiva" distinta de la de orfandad o la de favor de familiares de nietos y hermanos. B contradice la excepción; C y D no son criterios del art. 9.4.',
});

push({
  question:
    "Según el art. 10.1.a) del RD 1335/2005, ¿qué requisito general de residencia se exige a los beneficiarios y qué supuesto se considera cumplido?",
  options: [
    "Residencia legal en España; se considera cumplida para trabajadores trasladados fuera que estén en asimilada al alta y coticen en el régimen español.",
    "Residencia efectiva en España sin excepciones.",
    "Nacionalidad española obligatoria.",
    "Empadronamiento obligatorio como único medio.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 10.1.a) exige residir legalmente en España y añade que se considera cumplida para trabajadores trasladados fuera "en situación asimilada a la de alta" que coticen en el régimen español. B, C y D no se ajustan.',
});

push({
  question:
    "Conforme al art. 10.1.c) del RD 1335/2005, ¿qué regla se establece si conviven los progenitores/adoptantes y la suma de ingresos de ambos supera el límite anual?",
  options: [
    "No se reconocerá la condición de beneficiario a ninguno de ellos.",
    "Se reconocerá a uno solo, determinado de común acuerdo.",
    "Se reconocerá al progenitor con menores ingresos.",
    "Se reconocerá siempre al progenitor con custodia.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 10.1.c) indica que si conviven y la suma de ingresos supera el límite "no se reconocerá (...) a ninguno". B corresponde a art. 11 para determinación del beneficiario cuando sí se cumplen límites; C y D no figuran.',
});

push({
  question:
    "Según el art. 10.1.c) (párrafo cuarto) del RD 1335/2005, ¿en qué caso pueden ser beneficiarios aun superando el límite anual fijado en la LPGE?",
  options: [
    "Si los ingresos superan el límite pero son inferiores a la cuantía resultante de sumar al límite el producto de multiplicar el importe anual de la asignación por el número de hijos/menores a cargo.",
    "Siempre que haya al menos dos hijos.",
    "Solo si existe discapacidad del menor ≥33%.",
    "Solo si se trata de familias numerosas de categoría especial.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 10.1.c) prevé un supuesto en que, aunque se superen los ingresos, sean inferiores a la suma del límite más "el producto de multiplicar" el importe anual por el número de hijos/menores. B, C y D no recogen esa regla.',
});

push({
  question:
    "Conforme al art. 10.1.c) (párrafo quinto) del RD 1335/2005, ¿se exige límite de recursos económicos para el reconocimiento de asignación por hijo o menor acogido a cargo minusválido?",
  options: [
    "No: no se exigirá límite de recursos económicos.",
    "Sí: el mismo límite de la LPGE.",
    "Sí: un límite específico del 75% del SMI.",
    "Solo se exige si el minusválido es mayor de 18 años.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 10.1.c) dice: "no se exigirá límite de recursos económicos" para el reconocimiento por hijo a cargo minusválido. B, C y D no están en el texto.',
});

push({
  question:
    "Según el art. 10.1.d) del RD 1335/2005, ¿qué requisito de no concurrencia se establece respecto de otras prestaciones de la misma naturaleza?",
  options: [
    "Que no tengan derecho los progenitores/adoptantes/acogedores a prestaciones de esta misma naturaleza en cualquier otro régimen público de protección social.",
    "Que no perciban ninguna prestación contributiva.",
    "Que no tengan derecho a pensión de orfandad.",
    "Que no perciban asistencia sanitaria.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 10.1.d) exige no tener derecho a prestaciones "de esta misma naturaleza" en cualquier otro régimen público. B, C y D no son el requisito del apartado d).',
});

push({
  question:
    "Conforme al art. 10.2 del RD 1335/2005, ¿en qué condiciones pueden ser beneficiarios directos los hijos minusválidos mayores de 18 años?",
  options: [
    "Que no hayan sido incapacitados judicialmente y conserven su capacidad de obrar, previa solicitud y con audiencia de los progenitores/adoptantes.",
    "Que hayan sido incapacitados judicialmente.",
    "Que convivan con el beneficiario y tengan ingresos inferiores al 75% del SMI.",
    "Que sean huérfanos de ambos progenitores.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 10.2 prevé que sean beneficiarios los hijos minusválidos >18 "que no hayan sido incapacitados judicialmente" y conserven capacidad, previa solicitud y audiencia. B contradice; C mezcla art. 9.3; D es art. 10.3.',
});

push({
  question:
    "Según el art. 10.2 (párrafo segundo) del RD 1335/2005, ¿qué presunción se establece sobre la capacidad de obrar del hijo minusválido mayor de 18 años?",
  options: [
    "Se presume que conserva su capacidad de obrar, salvo que se acredite incapacitación judicial.",
    "Se presume incapacitación judicial.",
    "No existe presunción; siempre se exige sentencia.",
    "Se presume incapacidad solo si está casado.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 10.2 establece: "Se presumirá que (...) conserva su capacidad de obrar" salvo que se acredite incapacitación judicial. B, C y D no figuran.',
});

push({
  question:
    "Conforme al art. 10.3 del RD 1335/2005, ¿quiénes pueden ser beneficiarios de la asignación en sustitución de progenitores/adoptantes y en qué supuestos?",
  options: [
    "Los huérfanos de ambos, menores de 18 o minusválidos ≥65%; y también los no huérfanos abandonados, si no están en acogimiento permanente o preadoptivo.",
    "Solo los huérfanos de ambos, menores de 18, sin excepción.",
    "Cualquier menor abandonado, aunque esté en acogimiento.",
    "Solo los mayores de 18 con discapacidad ≥33%.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 10.3 incluye "huérfanos de ambos" (menores de 18 o minusválidos ≥65%) y también los abandonados "siempre que no se encuentren" en acogimiento permanente o preadoptivo. B, C y D no se ajustan.',
});

push({
  question:
    "Según el art. 10.4 del RD 1335/2005, en los supuestos de los apartados 2 y 3, ¿qué efecto tiene el matrimonio del minusválido (≥65%) sobre el derecho a la asignación?",
  options: [
    "No determina la extinción del derecho.",
    "Extingue automáticamente el derecho.",
    "Suspende el derecho hasta resolución judicial.",
    "Convierte la asignación en pago único.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 10.4 dice que el matrimonio del minusválido "no determinará la extinción" del derecho. B, C y D no están previstos.',
});

push({
  question:
    "Conforme al art. 11.1 del RD 1335/2005, si ambos posibles beneficiarios conviven y reúnen requisitos respecto de un mismo causante, ¿qué regla general se aplica?",
  options: [
    "El derecho solo puede reconocerse a favor de uno, determinado de común acuerdo; se presume acuerdo si solicita uno.",
    "El derecho se reconoce siempre a ambos por partes iguales.",
    "El derecho se reconoce al progenitor con mayor base de cotización.",
    "El derecho se reconoce al que tenga la patria potestad en exclusiva, siempre.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 11.1 establece que "solamente podrá ser reconocido" en favor de uno, de "común acuerdo", presumiéndose acuerdo cuando la solicite uno. B, C y D no se ajustan.',
});

push({
  question:
    "Según el art. 11.1 del RD 1335/2005, si no existe acuerdo sobre quién percibe la asignación y se notifica expresamente a la entidad gestora, ¿qué medida adopta el INSS?",
  options: [
    "Dicta resolución suspendiendo el abono en tanto no recaiga la oportuna resolución judicial.",
    "Reconoce automáticamente al solicitante.",
    "Extingue el derecho definitivamente.",
    "Abona provisionalmente al menor.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 11.1 indica que el INSS dictará resolución y "se suspenderá el abono" hasta resolución judicial. B, C y D no figuran.',
});

push({
  question:
    "Conforme al art. 11.2 del RD 1335/2005, tras separación/nulidad/divorcio, ¿quién conserva el derecho al percibo de la asignación?",
  options: [
    "Quien tenga a su cargo al hijo o menor acogido, aunque sea persona distinta a la que la tenía reconocida antes, y siempre que sus ingresos no superen los límites exigidos.",
    "Siempre el progenitor que la tenía reconocida antes.",
    "Siempre la madre.",
    "Solo el progenitor con mayor renta.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 11.2 dice que el derecho se conserva para quien tenga "a su cargo" al hijo/menor, aunque sea distinto del que la tenía reconocida antes, si sus ingresos no superan límites. B, C y D no se ajustan.',
});

push({
  question:
    "Según el art. 11.2 del RD 1335/2005, cuando por resolución judicial se acuerda ejercicio compartido de la guarda y custodia, ¿cómo se reconoce la prestación?",
  options: [
    "A cada uno, en proporción al tiempo en que le haya sido reconocida la custodia, previa solicitud.",
    "Solo a uno, al que la solicite primero.",
    "Se suspende hasta nuevo acuerdo.",
    "Se reconoce siempre al menor.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 11.2 establece que, con guarda y custodia compartida por resolución judicial, la prestación se reconocerá "a cada uno" en "proporción al tiempo" de custodia, previa solicitud. B, C y D no figuran.',
});

push({
  question:
    "Conforme al art. 11.3 del RD 1335/2005, en supuestos de huérfanos de ambos o abandonados (art. 10.3), ¿a quién se hace efectiva la asignación?",
  options: [
    "A los representantes legales o a quienes tengan a su cargo al menor o minusválido, mientras cumplan la obligación de mantenerlo y educarlo.",
    "Directamente al menor en todo caso.",
    "A la TGSS para su depósito.",
    "Al INSS como administración gestora.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 11.3 dice que la asignación se hará efectiva a "los representantes legales" o a quienes tengan a su cargo al menor/minusválido, mientras cumplan la obligación de mantenerlo y educarlo. B, C y D no figuran.',
});

push({
  question:
    "Según el art. 12 del RD 1335/2005, ¿de dónde deriva la cuantía vigente de la asignación económica por cada hijo o menor acogido a cargo?",
  options: [
    "De la fijada en el TRLGSS o en las normas que lo modifiquen.",
    "De un importe fijo establecido en el RD 1335/2005.",
    "De la LPGE exclusivamente.",
    "Del SMI anual.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 12 establece que la cuantía "es la fijada en" el TRLGSS "o en las normas que lo modifiquen". B, C y D no son lo que dice el art. 12.',
});

push({
  question:
    "Conforme al art. 13.1 del RD 1335/2005, para el supuesto del art. 10.1.c) (párrafo tercero), ¿qué operación se realiza en la regla a) para determinar la cuantía?",
  options: [
    "Multiplicar el importe anual de la asignación por el número de hijos/menores menores de 18 no minusválidos y sumar el producto al límite de ingresos aplicable.",
    "Sumar el SMI al límite de ingresos.",
    "Restar el límite de ingresos al importe anual de la asignación.",
    "Dividir el límite de ingresos entre el número de hijos.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 13.1.a) manda multiplicar el importe anual por el número de hijos/menores y sumar al límite de ingresos. B, C y D no son la operación descrita.',
});

push({
  question:
    "Según el art. 13.1.b) del RD 1335/2005, ¿qué constituye la cuantía anual de la asignación en el supuesto especial?",
  options: [
    "La diferencia entre la cifra resultante de aplicar la regla a) y los ingresos computables del beneficiario.",
    "El importe anual íntegro de la asignación.",
    "El 75% del SMI anual.",
    "Un tercio del límite de ingresos aplicable.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 13.1.b) establece que la cuantía anual es "La diferencia" entre la cifra de la regla a) y los ingresos computables (art. 14). B, C y D no se ajustan.',
});

push({
  question:
    "Conforme al art. 13.2 del RD 1335/2005, ¿cuándo NO se reconocerá asignación económica por hijo o menor acogido a cargo en el supuesto especial?",
  options: [
    "Cuando la diferencia anual calculada sea inferior al importe mensual de la asignación, por cada hijo o menor acogido no minusválido.",
    "Cuando la diferencia sea superior al importe mensual.",
    "Cuando existan dos progenitores convivientes.",
    "Cuando el menor esté escolarizado.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 13.2 dice: "No se reconocerá" cuando la diferencia sea "inferior al importe mensual" por cada hijo/menor no minusválido. B invierte el criterio; C y D no figuran.',
});

push({
  question:
    "Según el art. 14.2.a) del RD 1335/2005, ¿cómo se computan los ingresos procedentes de actividades económicas por cuenta propia?",
  options: [
    "En su valor neto, al que se añadirá el importe de las cotizaciones sociales.",
    "En su valor bruto, sin excepciones.",
    "Solo se computan las cotizaciones sociales.",
    "No se computan nunca.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 14.2.a) establece que, para actividades por cuenta propia, se computa el valor "neto" y se añade el importe de "cotizaciones sociales". B, C y D contradicen.',
});

push({
  question:
    "Conforme al art. 14.2.b) del RD 1335/2005, respecto a rendimientos de capital mobiliario, ¿qué se computa como ingreso?",
  options: [
    "Solo los intereses u otra clase de rendimientos obtenidos, pero no el capital en sí.",
    "El capital en sí mismo y los rendimientos.",
    "Solo el capital si está invertido.",
    "No se computa nada de capital mobiliario.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 14.2.b) dice: "sólo se computarán los intereses u otra clase de rendimientos (...) pero no el capital en sí mismo". B, C y D no se ajustan.',
});

push({
  question:
    "Según el art. 14.3 del RD 1335/2005, ¿de qué periodo temporal se tienen en cuenta los ingresos para el cómputo del límite?",
  options: [
    "Los obtenidos durante el ejercicio anterior a la solicitud.",
    "Los del trimestre anterior.",
    "Los del mes anterior.",
    "Los previstos para el ejercicio siguiente.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 14.3 indica que se tendrán en cuenta los ingresos "durante el ejercicio anterior a la solicitud". B, C y D no figuran.',
});

push({
  question:
    "Conforme al art. 14.4 del RD 1335/2005, en el caso de menores abandonados o huérfanos de ambos progenitores (sin acogimiento permanente o preadoptivo), ¿qué ingresos se computan?",
  options: [
    "Exclusivamente los ingresos que aquellos perciban.",
    "Los ingresos conjuntos de los progenitores.",
    "Los ingresos de la unidad familiar del representante legal.",
    "No se computa ningún ingreso.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 14.4 dice: "se computarán exclusivamente los ingresos que aquellos perciban". B, C y D no se ajustan.',
});

push({
  question:
    "Según el art. 14.5 del RD 1335/2005, si conviven ambos progenitores/adoptantes/acogedores y el hijo es menor de 18 no minusválido, ¿cómo se computan los ingresos?",
  options: [
    "Conjuntamente los ingresos de aquellos, conforme al art. 10.1.c).",
    "Solo los ingresos del progenitor solicitante.",
    "Solo los ingresos del hijo.",
    "No se computan ingresos en convivencia.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 14.5 dispone que se computarán "conjuntamente" los ingresos de los progenitores/adoptantes/acogedores, de acuerdo con el art. 10.1.c). B, C y D contradicen el texto.',
});

push({
  question:
    "Conforme al art. 14.6 del RD 1335/2005, en convivencia con un solo progenitor por fallecimiento/nulidad/separación/divorcio, ¿qué ingresos NO se tienen en cuenta?",
  options: [
    "Los ingresos de los hijos a cargo que perciba el beneficiario como representante legal y que provengan de pensión de orfandad o pensión en favor de familiares.",
    "Cualquier ingreso por trabajo del beneficiario.",
    "Los rendimientos del capital mobiliario del beneficiario.",
    "Las rentas inmobiliarias imputadas.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 14.6 excluye de cómputo los ingresos de hijos a cargo percibidos como representante legal y que provengan de "pensión de orfandad" o "pensión en favor de familiares". B, C y D sí son ingresos computables según el art. 14.',
});

push({
  question:
    "Según el art. 15 del RD 1335/2005, ¿qué órgano determina y revisa el grado de minusvalía y la necesidad de tercera persona?",
  options: [
    "Los equipos de valoración y orientación del IMSERSO o, en su caso, los órganos de las CCAA con funciones transferidas, según el baremo vigente.",
    "El INSS mediante resolución automática.",
    "La TGSS por informe interno.",
    "La empresa mediante declaración responsable.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 15 atribuye la determinación y revisión a los equipos del "Instituto de Mayores y Servicios Sociales" o a órganos autonómicos transferidos, según baremo vigente. B, C y D no se ajustan.',
});

push({
  question:
    "Conforme al art. 16.1 del RD 1335/2005, ¿qué obligación de comunicación tiene el beneficiario y en qué plazo?",
  options: [
    "Comunicar al INSS, en 30 días desde que se produzcan, variaciones que puedan modificar o extinguir el derecho, debidamente acreditadas.",
    "Comunicar a la TGSS cada seis meses los cambios de domicilio.",
    "Comunicar al INSS solo cuando se extinga el derecho.",
    "No existe obligación de comunicación.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 16.1 impone obligación de comunicar al INSS, en "30 días", variaciones que supongan modificación o extinción del derecho. B, C y D no coinciden.',
});

push({
  question:
    "Según el art. 16.2 del RD 1335/2005, ¿qué declaración debe presentarse antes del 1 de abril de cada año?",
  options: [
    "Una declaración expresiva de los ingresos habidos durante el ejercicio presupuestario anterior.",
    "Una declaración de cotizaciones de los últimos seis meses.",
    "Una declaración de patrimonio inmobiliario de los últimos cinco años.",
    "Una declaración de cargas familiares de los últimos tres meses.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 16.2 obliga a presentar "antes del 1 de abril" una "declaración" de ingresos del ejercicio presupuestario anterior. B, C y D no figuran.',
});

push({
  question:
    "Conforme al art. 16.4 del RD 1335/2005, si por variaciones se produce extinción o reducción del derecho, ¿desde cuándo se consideran indebidamente percibidas las cantidades abonadas de más?",
  options: [
    "Desde el día siguiente a aquel en que se hubieran debido producir los efectos económicos de la variación.",
    "Desde el día de la solicitud inicial.",
    "Desde el 1 de enero del año en curso.",
    "Desde el último día del trimestre natural.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 16.4 dice que las cantidades abonadas de más serán indebidamente percibidas "desde el día siguiente" a aquel en que debieron producirse efectos económicos de la variación. B, C y D no son lo que dice el precepto.',
});

push({
  question:
    "Según el art. 17.1 del RD 1335/2005, ¿desde cuándo surte efectos el reconocimiento del derecho a la asignación económica?",
  options: [
    "Desde el día primero del trimestre natural inmediatamente siguiente al de la presentación de la solicitud.",
    "Desde el día de la presentación de la solicitud.",
    "Desde el día primero del mes siguiente.",
    "Desde el día primero del año siguiente.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 17.1 fija efectos desde "el día primero del trimestre natural inmediatamente siguiente" al de la solicitud. B, C y D no figuran.',
});

push({
  question:
    "Conforme al art. 17.2 del RD 1335/2005, cuando deba producirse extinción o reducción por variaciones, ¿cuándo surten efectos dichas variaciones?",
  options: [
    "Hasta el último día del trimestre natural en el que se haya producido la variación.",
    "De forma inmediata el mismo día de la variación.",
    "Desde el primer día del mes siguiente.",
    "Desde el primer día del trimestre anterior.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 17.2 establece que no surtirán efectos hasta "el último día del trimestre natural" en que se produjo la variación. B, C y D no se ajustan.',
});

push({
  question:
    "Según el art. 17.3 del RD 1335/2005, si la extinción/modificación viene motivada por variación de los ingresos anuales computables, ¿desde cuándo surte efectos?",
  options: [
    "El día 1 de enero del año siguiente a aquel al que correspondan dichos ingresos.",
    "El día 1 del trimestre siguiente.",
    "El día de la solicitud.",
    "El último día del mes de la variación.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 17.3 fija efectos el "día 1 de enero del año siguiente" al que correspondan los ingresos. B, C y D no se ajustan.',
});

push({
  question:
    "Conforme al art. 18.2 del RD 1335/2005, ¿con qué periodicidad general se paga la asignación y cuál es la excepción para asignaciones por hijo minusválido mayor de 18 años?",
  options: [
    "Pago semestral por semestre vencido; excepción: pago mensual por mensualidad vencida para hijo minusválido >18.",
    "Pago mensual general; excepción: pago semestral para minusválido >18.",
    "Pago trimestral general; excepción: pago anual para minusválido >18.",
    "Pago anual general; excepción: pago trimestral para minusválido >18.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 18.2 dice: "Con carácter general, el pago será semestral" por "semestre vencido", salvo hijo minusválido >18, cuyo pago será "mensual" por "mensualidad vencida". B, C y D contradicen.',
});

// Sección 2ª: art. 19-22 (pago único tercer o sucesivos)

push({
  question:
    "Según el art. 19.1 del RD 1335/2005, ¿qué condición relativa al número de hijos deben alcanzar los beneficiarios con motivo del nacimiento o adopción?",
  options: [
    "Llegar a tener tres o más hijos.",
    "Llegar a tener dos o más hijos.",
    "Tener exactamente tres hijos.",
    "Tener al menos cuatro hijos.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 19.1 exige "tres o más hijos" con motivo del nacimiento o adopción, además de requisitos del art. 10.1.a), c) y d). B, C y D no coinciden.',
});

push({
  question:
    "Conforme al art. 19.2 del RD 1335/2005, para determinar el límite de ingresos del art. 10.1.c) en esta prestación, ¿qué ingresos se tienen en cuenta?",
  options: [
    "Los ingresos obtenidos durante el año anterior al nacimiento o a la adopción.",
    "Los ingresos del trimestre anterior al nacimiento.",
    "Los ingresos del mismo año natural del nacimiento.",
    "Los ingresos previstos para el año siguiente.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 19.2 dice expresamente: "se tendrán en cuenta los ingresos obtenidos (...) durante el año anterior al nacimiento o a la adopción". B, C y D no figuran.',
});

push({
  question:
    "Según el art. 20.1 del RD 1335/2005, ¿quiénes son causantes de la prestación por nacimiento/adopción del tercer o sucesivos hijos?",
  options: [
    "El tercer hijo nacido o adoptado y los siguientes.",
    "Solo el tercer hijo nacido, no el adoptado.",
    "Cualquier hijo nacido o adoptado.",
    "Únicamente el cuarto y sucesivos.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 20.1 indica que serán causantes "el tercer hijo nacido o adoptado y los siguientes". B, C y D contradicen el texto.',
});

push({
  question:
    "Conforme al art. 20.1 del RD 1335/2005, ¿qué requisito territorial se exige para causar derecho a la prestación y qué se reputa producido en España?",
  options: [
    "Nacimiento o formalización de adopción en España; se reputa producido en España si ocurre en el extranjero pero se acredita integración inmediata en núcleo familiar residente en España.",
    "Obligatoriamente nacimiento en España; la adopción en el extranjero no puede causar derecho.",
    "Basta con residencia legal del beneficiario, sin requisito territorial del nacimiento/adopción.",
    "Solo se exige empadronamiento del hijo.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 20.1 exige que el nacimiento o la formalización de la adopción se produzca en España y añade que se reputará producido en España si fue en el extranjero pero el hijo se integró "de manera inmediata" en un núcleo familiar con residencia en España. B, C y D no se ajustan.',
});

push({
  question:
    "Según el art. 20.2 del RD 1335/2005, para el cómputo del tercer o sucesivos hijos, ¿qué hijos se tienen en cuenta?",
  options: [
    "Todos los hijos, cualquiera que sea su filiación, comunes o no comunes, que convivan en la unidad familiar y estén a cargo.",
    "Solo los hijos comunes de ambos progenitores.",
    "Solo los hijos naturales, no adoptados.",
    "Solo los hijos menores de 18 años.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 20.2 señala que se tienen en cuenta "todos los hijos" con independencia de filiación, comunes o no, que convivan y estén a cargo. B, C y D restringen indebidamente.',
});

push({
  question:
    "Conforme al art. 20.3 del RD 1335/2005, ¿cómo computan los hijos con minusvalía igual o superior al 33% a efectos del número de hijos?",
  options: [
    "Computan el doble.",
    "Computan por la mitad.",
    "No computan.",
    "Computan como uno más adicional fijo, independientemente del número.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 20.3 establece que los hijos con minusvalía "computarán el doble". B, C y D no se ajustan.',
});

push({
  question:
    "Según el art. 21.1 del RD 1335/2005, en convivencia de progenitores/adoptantes, ¿quién es beneficiario y qué presunción opera?",
  options: [
    "Cualquiera de ellos de común acuerdo; se presume acuerdo cuando la prestación la solicite uno.",
    "Siempre la madre, sin excepción.",
    "Siempre el padre, sin excepción.",
    "El que tenga mayores ingresos, presumiéndose acuerdo siempre.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 21.1 dice beneficiario cualquiera determinado de "común acuerdo" y presume acuerdo si la solicita uno; a falta de acuerdo será beneficiaria "la madre". B, C y D alteran el orden/regla.',
});

push({
  question:
    "Conforme al art. 21.2 del RD 1335/2005, si progenitores/adoptantes no conviven, ¿quién es beneficiario?",
  options: [
    "El que tenga a su cargo la guarda y custodia del hijo.",
    "El que solicite primero.",
    "La madre en todo caso.",
    "El INSS.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 21.2 señala que será beneficiario "el que tenga a su cargo la guarda y custodia". B, C y D no figuran.',
});

push({
  question:
    "Según el art. 22.2 del RD 1335/2005, si los ingresos superan el límite del art. 10.1.c) pero son inferiores al importe conjunto (límite + prestación), ¿cómo se determina la cuantía?",
  options: [
    "Es igual a la diferencia entre los ingresos percibidos por el beneficiario y el indicado importe conjunto.",
    "Se abona íntegra la cuantía fijada en el TRLGSS.",
    "No se reconoce en ningún caso.",
    "Se abona la mitad de la prestación.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 22.2 dice que la cuantía será la "diferencia" entre los ingresos percibidos y el importe conjunto. B, C y D contradicen el texto.',
});

// Sección 3ª: art. 23-26 (parto/adopción múltiples)

push({
  question:
    "Conforme al art. 24.1 del RD 1335/2005, ¿cuándo hay parto múltiple a efectos de la prestación y qué mínimo se exige?",
  options: [
    "Cuando el número de nacidos sea igual o superior a dos.",
    "Solo cuando haya tres o más nacidos.",
    "Solo si hay dos nacidos y ambos con discapacidad.",
    "Cuando el número de nacidos sea exactamente dos.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 24.1 indica parto múltiple cuando el número de nacidos sea "igual o superior a dos". B, C y D no se ajustan.',
});

push({
  question:
    "Según el art. 24.2 del RD 1335/2005, en casos de parto/adopción múltiple con un hijo afectado por minusvalía ≥33%, ¿a qué remite el precepto?",
  options: [
    "A lo establecido en el art. 20.3.",
    "A lo establecido en el art. 9.3.",
    "A lo establecido en el art. 14.2.d).",
    "A lo establecido en la disposición adicional única.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 24.2 dice que se estará a lo establecido en el "artículo 20.3". B y D no son remisiones del art. 24.2; C cita un precepto de cómputo de ingresos, no de cómputo de hijos.',
});

push({
  question:
    "Conforme al art. 25.3 del RD 1335/2005, si los causantes quedan huérfanos de ambos progenitores/adoptantes o son abandonados, ¿quién es beneficiario de la prestación por parto/adopción múltiple?",
  options: [
    "La persona física que legalmente se haga cargo de los nacidos o adoptados.",
    "El INSS como entidad gestora.",
    "La TGSS como pagadora.",
    "El hospital donde se produjo el parto.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 25.3 establece como beneficiaria "la persona física que legalmente se haga cargo" de los nacidos o adoptados. B, C y D no figuran.',
});

push({
  question:
    "Según el art. 26 del RD 1335/2005, ¿dónde se establece la cuantía de la prestación por parto o adopción múltiples?",
  options: [
    "En el art. 188 del TRLGSS.",
    "En el propio art. 26 con importe fijo.",
    "En la LPGE únicamente.",
    "En el SMI vigente.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 26 remite a la cuantía "establecida en el artículo 188" del TRLGSS. B, C y D no son lo que dice el art. 26.',
});

// Sección 4ª: art. 27-30 (gestión, solicitudes, compatibilidades, incompatibilidades)

push({
  question:
    "Conforme al art. 27 del RD 1335/2005, ¿a qué entidad corresponde la gestión y el reconocimiento del derecho a las prestaciones familiares reguladas?",
  options: [
    "Al Instituto Nacional de la Seguridad Social.",
    "A la Tesorería General de la Seguridad Social.",
    "Al Instituto Social de la Marina en todos los casos.",
    "A las empresas mediante pago delegado.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 27 atribuye la gestión y reconocimiento al "Instituto Nacional de la Seguridad Social". B, C y D no se ajustan (el ISM aparece en disposición transitoria segunda para gestión transitoria).',
});

push({
  question:
    "Según el art. 28.1 del RD 1335/2005, ¿qué efecto tiene aportar la solicitud de reconocimiento de grado de minusvalía ante el órgano competente en el procedimiento?",
  options: [
    "Puede iniciarse el procedimiento y se suspende para incorporar la resolución de minusvalía, según el art. 42.5.d) de la Ley 30/1992.",
    "Impide iniciar el procedimiento hasta que haya resolución.",
    "Obliga a resolver en 15 días.",
    "Sustituye la solicitud de prestación.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 28.1 permite iniciar con la solicitud de minusvalía y señala que "se suspenderá el procedimiento" conforme al art. 42.5.d) de la Ley 30/1992 hasta incorporar la resolución. B, C y D no se ajustan.',
});

push({
  question:
    "Conforme al art. 28.2 del RD 1335/2005, ¿qué tipo de hechos/datos no pueden exigirse al solicitante por ser de conocimiento de la Administración?",
  options: [
    "Hechos como la situación del beneficiario en el sistema, percepción de otra prestación familiar (art. 30.2) y condición del hijo como perceptor de pensiones/subsidios del art. 30.3, y sus cuantías.",
    "El empadronamiento siempre.",
    "La identidad del solicitante siempre.",
    "La certificación médica siempre.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 28.2 dice: "En ningún caso" será exigible acreditar hechos que la Administración deba conocer, citando expresamente situación en el sistema, percepción de otra prestación (art. 30.2) y condición del hijo (art. 30.3) y cuantías. B, C y D contradicen el tenor del art. 28.2.',
});

push({
  question:
    "Según el art. 29.1 del RD 1335/2005, ¿qué compatibilidades se declaran entre prestaciones económicas por nacimiento/adopción del tercer o sucesivos hijos y por parto/adopción múltiples?",
  options: [
    "Son compatibles entre sí cuando son causadas por un mismo sujeto.",
    "Son incompatibles entre sí en todo caso.",
    "Solo son compatibles si no hay asignación por hijo a cargo.",
    "Solo son compatibles si el beneficiario es familia numerosa.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 29.1 establece que las prestaciones por tercer o sucesivos y por múltiples, "causadas por un mismo sujeto", "serán compatibles entre sí". B, C y D no figuran.',
});

push({
  question:
    "Conforme al art. 30.2 del RD 1335/2005, con qué son incompatibles las prestaciones familiares?",
  options: [
    "Con cualquier otra prestación análoga establecida en los demás regímenes públicos de protección social.",
    "Con la asistencia sanitaria.",
    "Con la pensión de orfandad siempre.",
    "Con el trabajo por cuenta ajena del beneficiario.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 30.2 dice que serán incompatibles con "cualquier otra prestación análoga" en otros regímenes públicos. B, C y D no son lo que dice el art. 30.2.',
});

push({
  question:
    "Según el art. 30.4 del RD 1335/2005, cuando las prestaciones incompatibles corresponden a beneficiarios diferentes y no hay acuerdo, ¿qué derecho prevalece?",
  options: [
    "El derecho a la pensión de invalidez o jubilación en modalidad no contributiva, o, en su caso, la pensión Ley 45/1960 o los subsidios Ley 13/1982.",
    "El derecho a la asignación económica por hijo minusválido.",
    "El derecho a la prestación por parto múltiple.",
    "El derecho que se solicite en primer lugar.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 30.4 establece que, sin acuerdo, prevalecerá el derecho a la pensión de invalidez/jubilación no contributiva o, en su caso, pensión Ley 45/1960 o subsidios Ley 13/1982. B, C y D no figuran como regla de prevalencia.',
});

// Some edits/copies can accidentally duplicate question blocks during authoring.
// Build a stable, de-duplicated list by question text and then pick exactly 35.
const today = new Date().toISOString().slice(0, 10);
const seed =
  hashStringToUInt32(outPath) ^
  hashStringToUInt32("tema09-prestaciones-familiares") ^
  hashStringToUInt32(today);

const seen = new Set();
const unique = [];
for (const q of questions) {
  if (!seen.has(q.question)) {
    seen.add(q.question);
    unique.push(q);
  }
}

const eligible = unique.filter((q) =>
  typeof q.explanation === "string" &&
  q.explanation.includes("art.") &&
  q.explanation.includes('"') &&
  Array.isArray(q.options) &&
  q.options.length === 4
);

if (eligible.length < 35) {
  throw new Error(`Internal: expected at least 35 eligible questions, got ${eligible.length}`);
}

const pickRand = mulberry32(seed ^ 0xa5a5a5a5);
shuffleInPlace(eligible, pickRand);
const baseQuestions = eligible.slice(0, 35);

const randKey = mulberry32(seed ^ 0x9e3779b9);
const { rekeyed, seq } = applyBalancedAnswerKey(baseQuestions, randKey);

// Shuffle within buckets, then reassemble following the already-valid answer-key sequence
const buckets = { A: [], B: [], C: [], D: [] };
for (const q of rekeyed) buckets[q.correctAnswer].push(q);

const rand = mulberry32(seed);
shuffleInPlace(buckets.A, rand);
shuffleInPlace(buckets.B, rand);
shuffleInPlace(buckets.C, rand);
shuffleInPlace(buckets.D, rand);

const finalQuestions = seq.map((letter) => {
  const q = buckets[letter].shift();
  if (!q) throw new Error(`Internal: bucket underflow for ${letter}`);
  return { ...q, options: q.options.slice() };
});

const { dist, seqStart } = validateQuestions(finalQuestions);
fs.writeFileSync(outPath, JSON.stringify({ questions: finalQuestions }, null, 2) + "\n", "utf8");
console.log(`OK ${outPath} count=35 dist=${JSON.stringify(dist)} seqStart=${seqStart}`);

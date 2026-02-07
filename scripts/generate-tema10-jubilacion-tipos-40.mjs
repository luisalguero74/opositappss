import fs from "node:fs";

const outPath = "TEMA 10_ESPECÍFICO_JUBILACIÓN_TIPOS.JSON";

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
  if (list.length !== 40) throw new Error(`Expected 40 questions, got ${list.length}`);

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

function applyBalancedAnswerKey(list, rand) {
  const letters = ["A", "B", "C", "D"];
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

  for (let attempt = 0; attempt < 8000; attempt++) {
    const remaining = { A: 10, B: 10, C: 10, D: 10 };
    const seq = [];

    for (let i = 0; i < list.length; i++) {
      const candidates = letters.filter((l) => {
        if (remaining[l] <= 0) return false;
        const n = seq.length;
        if (n >= 2 && seq[n - 1] === l && seq[n - 2] === l) return false;
        return true;
      });
      if (candidates.length === 0) break;

      const total = candidates.reduce((acc, l) => acc + remaining[l], 0);
      let r = rand() * total;
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

    if (seq.length !== list.length) continue;
    const seqStr = seq.join("");
    if (maxRun(seqStr) > 2) continue;
    if (hasTooPredictablePattern(seqStr)) continue;

    return { rekeyed: list.map((q, i) => rekeyQuestion(q, seq[i])), seq };
  }

  throw new Error("Could not build a balanced, non-predictable answer key.");
}

// ---------------------------------------------------------------------------
// TEMA 10 - Jubilación (tipos): RD 1132/2002 (única fuente: texto pegado)
// ---------------------------------------------------------------------------

// 1
push({
  question:
    "Según el art. 1.1 del RD 1132/2002, ¿qué edad mínima real se exige para acceder a la jubilación anticipada de trabajadores por cuenta ajena?",
  options: [
    "Tener cumplidos 61 años de edad reales.",
    "Tener cumplidos 60 años de edad reales.",
    "Tener cumplidos 63 años de edad reales.",
    "Tener cumplidos 65 años de edad reales.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.1.1 exige "tener cumplidos sesenta y un años de edad reales". B, C y D no coinciden con la edad mínima que fija el art. 1.1.1.',
});

// 2
push({
  question:
    "Conforme al art. 1.1.1 del RD 1132/2002, para el requisito de 61 años, ¿se aplican bonificaciones de edad por actividades penosas, tóxicas, peligrosas o insalubres?",
  options: [
    "No: no son de aplicación las bonificaciones de edad para este requisito.",
    "Sí: se aplican siempre y pueden reducir la edad mínima por debajo de 61.",
    "Solo se aplican si el trabajador acredita 35 años de cotización.",
    "Solo se aplican en el Régimen Especial de Trabajadores del Mar.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.1.1 indica que "no serán de aplicación las bonificaciones de edad" para el requisito de 61 años reales. B, C y D introducen condiciones que el art. 1.1.1 no contempla.',
});

// 3
push({
  question:
    "Según el art. 1.1 (párrafo inicial) del RD 1132/2002, ¿qué colectivos pueden acceder a la jubilación anticipada regulada en ese artículo?",
  options: [
    "Trabajadores del Régimen General, del Régimen Especial de la Minería del Carbón y trabajadores por cuenta ajena del Régimen Especial de Trabajadores del Mar.",
    "Solo trabajadores del Régimen General.",
    "Solo trabajadores por cuenta propia del RETA.",
    "Exclusivamente los mutualistas laborales anteriores a 1/1/1967.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.1 permite el acceso a trabajadores del "Régimen General", de la "Minería del Carbón" y trabajadores por cuenta ajena del "Régimen especial de Trabajadores del Mar". B, C y D restringen o cambian los colectivos del art. 1.1.',
});

// 4
push({
  question:
    "Conforme al art. 1.1.2 del RD 1132/2002, ¿qué período mínimo de cotización efectiva se exige y qué elementos se excluyen expresamente de su cómputo?",
  options: [
    "30 años completos, día a día; sin computar la parte proporcional por pagas extraordinarias ni el abono de años/días por cotizaciones anteriores a 1/1/1967 (DT 2.ª.3.b Orden 18/1/1967).",
    "30 años, pudiendo computar pagas extraordinarias y abono de años anteriores a 1/1/1967.",
    "35 años completos, computando siempre pagas extraordinarias.",
    "15 años, siempre que 2 estén en los últimos 15.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.1.2 exige "treinta años completos, día a día" y dice que no se tendrá en cuenta "la parte proporcional por pagas extraordinarias" ni el abono de años/días por cotizaciones anteriores a "1 de enero de 1967" (referencia indicada). B, C y D contradicen esos límites.',
});

// 5
push({
  question:
    "Según el art. 1.1.2 del RD 1132/2002, para acreditar el período mínimo de cotización en el caso de trabajo a tiempo parcial, ¿qué regla específica se establece?",
  options: [
    "Se multiplican los días teóricos de cotización por el coeficiente 1,5.",
    "Se dividen los días teóricos de cotización entre 1,5.",
    "Se computan los días teóricos directamente sin coeficiente.",
    "Se aplica un coeficiente fijo del 2% por año.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.1.2 señala que, para trabajadores a tiempo parcial, se tendrá en cuenta la regulación específica "multiplicando el número de días teóricos de cotización por el coeficiente multiplicador del 1,5". B, C y D no aparecen en el art. 1.1.2.',
});

// 6
push({
  question:
    "Conforme al art. 1.1.2 (último párrafo) del RD 1132/2002, dentro del período de cotización exigido, ¿qué requisito temporal mínimo se exige respecto de los últimos 15 años?",
  options: [
    "Que al menos 2 años estén dentro de los 15 años inmediatamente anteriores al momento de causar el derecho (o al cese de la obligación de cotizar, si procede).",
    "Que al menos 5 años estén dentro de los 10 años anteriores.",
    "Que todo el período de cotización esté dentro de los últimos 15 años.",
    "Que al menos 2 años estén dentro de los 30 años anteriores.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.1.2 exige que, del período de cotización, "al menos dos años" estén dentro de los "quince años" inmediatamente anteriores al hecho causante (o al cese de la obligación de cotizar en el supuesto indicado). B, C y D no coinciden con el art. 1.1.2.',
});

// 7
push({
  question:
    "Según el art. 1.1.3 del RD 1132/2002, ¿qué requisito de inscripción como demandante de empleo se exige para la jubilación anticipada y durante cuánto tiempo?",
  options: [
    "Estar inscrito como demandante de empleo al menos 6 meses inmediatamente anteriores a la solicitud.",
    "Estar inscrito como demandante de empleo al menos 3 meses inmediatamente anteriores.",
    "Estar inscrito como demandante de empleo durante 12 meses, aunque no sean inmediatos.",
    "No se exige inscripción como demandante de empleo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.1.3 exige estar inscrito "durante un plazo de, al menos, seis meses inmediatamente anteriores" a la solicitud. B, C y D se apartan del tenor del art. 1.1.3.',
});

// 8
push({
  question:
    "Conforme al art. 1.1.3 (párrafo segundo) del RD 1132/2002, ¿la inscripción como demandante de empleo es incompatible con realizar una actividad por cuenta propia o ajena?",
  options: [
    "No necesariamente: no obstará si la actividad es compatible con la inscripción como demandante de empleo.",
    "Sí: cualquier actividad por cuenta propia o ajena impide cumplir el requisito.",
    "Solo es compatible si la actividad es a tiempo completo.",
    "Solo es compatible si la actividad es en otra provincia.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.1.3 indica: "No obstará" la simultaneidad con una actividad por cuenta propia o ajena, "siempre que dicha actividad sea compatible" con la inscripción. B, C y D añaden condiciones no previstas.',
});

// 9
push({
  question:
    "Según el art. 1.1.4 del RD 1132/2002, ¿qué condición se exige respecto al cese en el trabajo por extinción del contrato para acceder a la jubilación anticipada?",
  options: [
    "Que el cese no se haya producido por causa imputable a la libre voluntad del trabajador.",
    "Que el cese se haya producido por libre voluntad del trabajador.",
    "Que el cese se haya producido por mutuo acuerdo en todo caso.",
    "Que el cese se haya producido por jubilación flexible.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.1.4 exige que el cese "no se haya producido por causa imputable a la libre voluntad del trabajador". B, C y D contradicen el requisito del art. 1.1.4.',
});

// 10
push({
  question:
    "Conforme al art. 1.1.4 del RD 1132/2002, ¿cómo se define la 'libre voluntad del trabajador' a estos efectos?",
  options: [
    "Como la inequívoca manifestación de voluntad de quien, pudiendo continuar su relación laboral y no existiendo razón objetiva que la impida, decide poner fin a la misma.",
    "Como cualquier extinción del contrato, sea cual sea su causa.",
    "Como la voluntad del empresario de extinguir el contrato.",
    "Como la finalización de un contrato temporal por expiración del término.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.1.4 define la libre voluntad como "inequívoca manifestación de voluntad" del trabajador que, pudiendo continuar y sin razón objetiva, decide poner fin. B, C y D no recogen esa definición.',
});

// 11
push({
  question:
    "Según el art. 1.1.4 del RD 1132/2002, ¿cuándo se presume que el cese en la relación laboral se produjo de forma involuntaria?",
  options: [
    "Cuando la extinción se haya producido por alguna de las causas del art. 208.1.1 de la LGSS.",
    "Cuando la extinción sea por dimisión del trabajador.",
    "Cuando la extinción sea por jubilación flexible.",
    "Cuando exista un convenio especial suscrito por el trabajador.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.1.4 indica que "se presumirá" involuntario cuando la extinción sea por causas del "artículo 208.1.1" de la LGSS. B, C y D no son la presunción del art. 1.1.4.',
});

// 12
push({
  question:
    "Conforme al art. 1.1.5 del RD 1132/2002, además de los requisitos generales, ¿qué colectivos se mencionan expresamente como posibles beneficiarios al extinguirse la relación laboral en los términos previstos?",
  options: [
    "Beneficiarios de prestación de desempleo (cuando se extinga por agotamiento o por pasar a ser pensionista), beneficiarios del subsidio asistencial mayores de 52 y trabajadores mayores de 52 que, agotada la prestación, sigan inscritos.",
    "Solo beneficiarios del subsidio asistencial mayores de 55.",
    "Solo beneficiarios de prestación por incapacidad temporal.",
    "Solo pensionistas con pensión suspendida a la entrada en vigor.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.1.5 enumera los supuestos a), b) y c): prestación por desempleo (con extinción por agotamiento o por pasar a pensionista), subsidio asistencial mayores de "cincuenta y dos" y mayores de 52 sin requisitos que, agotada la prestación, continúan inscritos. B, C y D no coinciden.',
});

// 13
push({
  question:
    "Según el art. 1.1.6 del RD 1132/2002, ¿en qué supuesto no es exigible cumplir los requisitos de inscripción (art. 1.1.3) y cese involuntario (art. 1.1.4)?",
  options: [
    "Cuando la empresa, por obligación adquirida en acuerdo colectivo, haya abonado al menos durante los 2 años anteriores una cantidad global no inferior a 24 veces la suma de determinados importes.",
    "Cuando el trabajador tenga 35 años de cotización acreditados.",
    "Cuando el trabajador haya estado en jubilación flexible.",
    "Cuando el trabajador sea del Régimen Especial del Mar.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.1.6 indica que no será exigible cumplir requisitos de los apartados 3 y 4 cuando la empresa haya abonado, por obligación de acuerdo colectivo, una cantidad ("como mínimo, durante los dos años") cuyo cómputo global sea al menos "multiplicar por 24" la suma indicada. B, C y D no son el supuesto de exoneración del art. 1.1.6.',
});

// 14
push({
  question:
    "Conforme al art. 1.1.6 del RD 1132/2002, ¿qué dos componentes integran la suma que se multiplica por 24 para fijar la cuantía mínima abonada por la empresa?",
  options: [
    "La cuantía mensual de la prestación contributiva por desempleo que hubiera correspondido y el importe mensual de la cuota del convenio especial satisfecha por el trabajador.",
    "La base reguladora de la pensión y el tipo de cotización por contingencias comunes.",
    "El salario anual y el IPC del último año.",
    "La pensión mínima y la pensión máxima del sistema.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.1.6 (letras a) y b)) fija como suma: "la cuantía mensual" de la prestación contributiva por desempleo hipotética y "el importe mensual" de la cuota del convenio especial del trabajador; y esa suma se multiplica por "24". B, C y D no aparecen en el art. 1.1.6.',
});

// 15
push({
  question:
    "Según el art. 1.1.6 (párrafo final) del RD 1132/2002, ¿qué documentación debe aportar el trabajador con la solicitud de jubilación anticipada en el supuesto del pago empresarial por acuerdo colectivo?",
  options: [
    "Una certificación de la empresa con cantidades abonadas (al menos 2 años) y las bases de cotización por desempleo de los 180 días anteriores a la baja.",
    "Un informe médico de incapacidad permanente.",
    "Una declaración jurada del trabajador sobre su voluntad de cese.",
    "Un contrato a tiempo parcial para jubilación flexible.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.1.6 exige que la empresa emita certificación con las "cantidades abonadas" y las "bases de cotización por desempleo" de los "ciento ochenta días" anteriores a la baja; y que el trabajador la presente junto a la solicitud. B, C y D no son la documentación exigida en el art. 1.1.6.',
});

// 16
push({
  question:
    "Conforme al art. 2.1 del RD 1132/2002, ¿sobre qué magnitud temporal se aplica el coeficiente reductor de la pensión en jubilación anticipada para trabajadores por cuenta ajena?",
  options: [
    "Por cada año o fracción de año que, en el momento del hecho causante, falte para cumplir 65 años.",
    "Por cada trimestre completo que falte para cumplir 65 años.",
    "Solo por años completos, sin fracciones.",
    "Por cada mes que falte para cumplir 67 años.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.1 indica reducción "por cada año o fracción de año" que falte para cumplir "los sesenta y cinco años". B, C y D no coinciden con la regla del art. 2.1.',
});

// 17
push({
  question:
    "Según el art. 2.1.a) del RD 1132/2002, con 30 años completos de cotización acreditados, ¿cuál es el coeficiente reductor anual?",
  options: [
    "8% por cada año o fracción.",
    "7,5% por cada año o fracción.",
    "7% por cada año o fracción.",
    "6% por cada año o fracción.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.1.a) fija: "Con treinta años completos...: 8 por 100". B, C y D son coeficientes de otros tramos o no corresponden.',
});

// 18
push({
  question:
    "Conforme al art. 2.1.b) del RD 1132/2002, para quienes acrediten entre 31 y 34 años completos de cotización, ¿qué coeficiente reductor anual se aplica?",
  options: [
    "7,5% por cada año o fracción.",
    "8% por cada año o fracción.",
    "7% por cada año o fracción.",
    "6,5% por cada año o fracción.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.1.b) señala: "Entre treinta y uno y treinta y cuatro...: 7,5 por 100". B, C y D corresponden a otros tramos.',
});

// 19
push({
  question:
    "Según el art. 2.1.c) del RD 1132/2002, ¿qué coeficiente reductor anual se aplica entre 35 y 37 años completos de cotización?",
  options: [
    "7% por cada año o fracción.",
    "6,5% por cada año o fracción.",
    "7,5% por cada año o fracción.",
    "6% por cada año o fracción.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.1.c) fija: "Entre treinta y cinco y treinta y siete...: 7 por 100". B, C y D son coeficientes de otros tramos.',
});

// 20
push({
  question:
    "Conforme al art. 2.1.d) del RD 1132/2002, con 38 o 39 años completos de cotización acreditados, ¿qué coeficiente reductor anual se aplica?",
  options: [
    "6,5% por cada año o fracción.",
    "7% por cada año o fracción.",
    "6% por cada año o fracción.",
    "8% por cada año o fracción.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.1.d) establece: "Entre treinta y ocho y treinta y nueve...: 6,5 por 100". B, C y D no corresponden al tramo del art. 2.1.d).',
});

// 21
push({
  question:
    "Según el art. 2.1.e) del RD 1132/2002, con 40 o más años completos de cotización acreditados, ¿qué coeficiente reductor anual se aplica?",
  options: [
    "6% por cada año o fracción.",
    "6,5% por cada año o fracción.",
    "7% por cada año o fracción.",
    "7,5% por cada año o fracción.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.1.e) dispone: "Con cuarenta o más...: 6 por 100". B, C y D son coeficientes de otros tramos.',
});

// 22
push({
  question:
    "Conforme al art. 2.2.b) del RD 1132/2002, al computar años de cotización para determinar el coeficiente reductor, ¿cómo se trata la fracción de año?",
  options: [
    "Se toman años completos de cotización, sin equiparar a un año la fracción del mismo.",
    "La fracción de año se equipara siempre a un año completo.",
    "La fracción de año se computa como seis meses.",
    "La fracción de año se computa solo si supera nueve meses.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.2.b) es claro: "Se tomarán años completos... sin que se equipare a un año la fracción". B, C y D contradicen el art. 2.2.b).',
});

// 23
push({
  question:
    "Según el art. 2.3 del RD 1132/2002, una vez causado el derecho, ¿cómo influyen los coeficientes reductores de edad por trabajos penosos, tóxicos, peligrosos o insalubres en la reducción de la pensión?",
  options: [
    "Se tienen en cuenta para determinar el coeficiente reductor aplicable a la pensión.",
    "Se ignoran completamente tras causar el derecho.",
    "Solo se tienen en cuenta si el trabajador tiene 30 años de cotización.",
    "Sustituyen los coeficientes del art. 2.1 por un 2% fijo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.3 señala que, una vez causado el derecho, los coeficientes reductores de edad por trabajos penosos, etc., "serán tenidos en cuenta" para determinar el coeficiente reductor de la pensión. B, C y D no se ajustan al art. 2.3.',
});

// 24
push({
  question:
    "Conforme al art. 3.1 del RD 1132/2002, si se accede a la jubilación con edad superior a 65, ¿qué incremento porcentual puede añadirse al 100% y bajo qué condición de cotización previa?",
  options: [
    "Se suma al 100% un 2% adicional por cada año completo cotizado desde cumplir 65, siempre que en el hecho causante se acrediten 35 años de cotización.",
    "Se suma al 100% un 1% por cada año, con independencia de la cotización total.",
    "Se suma al 100% un 2% por cada año desde los 60, sin requisito de 35 años.",
    "No existe ningún incremento por cotizar después de 65.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 3.1 indica que el porcentaje será el resultante de sumar al 100% un "2 por 100 adicional" por cada año completo cotizado desde cumplir 65, "siempre que" en ese momento tuviera acreditados "treinta y cinco años". B, C y D contradicen el art. 3.1.',
});

// 25
push({
  question:
    "Según el art. 3.1 (segundo párrafo) del RD 1132/2002, si en el momento de acceder a la jubilación con más de 65 años no se acreditan 35 años de cotización, ¿desde cuándo se aplica el 2% adicional?",
  options: [
    "Desde la fecha en que, cumplidos los 65, se acredite el período de 35 años de cotización.",
    "Desde el día siguiente a cumplir 65 años, aunque no se acrediten 35.",
    "Desde la fecha en que se cumplan 30 años de cotización.",
    "No se aplica nunca si no se tenían 35 años en el hecho causante.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 3.1 añade: si no tenía el período, el porcentaje adicional se aplicará, "cumplidos los sesenta y cinco años", desde la fecha en que "se haya acreditado" el período de cotización. B, C y D no son lo previsto.',
});

// 26
push({
  question:
    "Conforme al art. 3.3 del RD 1132/2002, para tener derecho al incremento del 2% adicional, ¿qué exigencia se establece respecto a 'un año completo' y a las gratificaciones extraordinarias?",
  options: [
    "Debe acreditarse un año completo de cotización, sin asimilar fracciones; y no se computa la parte proporcional por gratificaciones extraordinarias de cotizaciones posteriores a 65.",
    "Puede asimilarse a año la fracción; y sí se computan gratificaciones extraordinarias.",
    "Se exige solo seis meses completos; y se computan gratificaciones extraordinarias.",
    "No hay exigencia de año completo para el 2%.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 3.3 exige "un año completo" y dice que no puede "asimilarse a un año la fracción"; además, "no se tendrá en cuenta" la parte proporcional por gratificaciones extraordinarias de cotizaciones posteriores a 65. B, C y D contradicen el art. 3.3.',
});

// 27
push({
  question:
    "Según el art. 3.4 del RD 1132/2002, ¿qué efecto tienen los años exonerados de cotización del art. 112 bis LGSS para el incremento del art. 3.1?",
  options: [
    "Se computan a efectos de aumentar la cuantía de la pensión en el supuesto del art. 3.1.",
    "No se computan en ningún caso.",
    "Solo se computan para reducir coeficientes reductores de jubilación anticipada.",
    "Se computan únicamente para incapacidad permanente.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 3.4 establece que los años exonerados "se computarán" para aumentar la cuantía de la pensión en el supuesto del art. 3.1. B, C y D no se ajustan.',
});

// 28
push({
  question:
    "Conforme al art. 3.6 del RD 1132/2002, ¿qué límite se establece para la cuantía total de la pensión resultante por aplicación del porcentaje adicional del art. 3.1?",
  options: [
    "No puede superar el límite máximo anual de pensión pública fijado por la Ley de Presupuestos Generales del Estado.",
    "No puede superar el 100% de la base reguladora.",
    "No puede superar dos veces la pensión mínima.",
    "No existe límite máximo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 3.6 dice: "En ningún caso" podrá superar el límite máximo anual de pensión pública que establezca la Ley de Presupuestos. B, C y D no son el límite del art. 3.6.',
});

// 29
push({
  question:
    "Según el art. 4 del RD 1132/2002, ¿a qué regímenes se aplica la regulación de la jubilación flexible de la sección 3.ª?",
  options: [
    "A todos los regímenes de la Seguridad Social, con la salvedad de la disposición adicional primera.",
    "Solo al Régimen General.",
    "Solo al Régimen Especial de Trabajadores del Mar.",
    "Solo al Régimen Especial de la Minería del Carbón.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 4 afirma que lo dispuesto en la sección se aplica a "todos los Regímenes" con la salvedad indicada. B, C y D restringen indebidamente.',
});

// 30
push({
  question:
    "Conforme al art. 5.1 del RD 1132/2002, ¿qué define la situación de jubilación flexible y cuál es su consecuencia sobre la cuantía de la pensión?",
  options: [
    "Compatibilizar la pensión (ya causada) con trabajo a tiempo parcial dentro de límites del art. 12.6 ET, con minoración de la pensión en proporción inversa a la reducción de jornada.",
    "Compatibilizar la pensión con trabajo a tiempo completo, sin minoración.",
    "Compatibilizar la pensión con cualquier actividad lucrativa, con aumento de la pensión.",
    "Sustituir la pensión por una prestación de desempleo durante el trabajo parcial.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 5.1 define la jubilación flexible como compatibilizar la pensión con trabajo parcial dentro de los límites y con la "consecuente minoración" en "proporción inversa" a la reducción de jornada. B, C y D no coinciden con el art. 5.1.',
});

// 31
push({
  question:
    "Según el art. 5.2 del RD 1132/2002, fuera de los supuestos de jubilación flexible del art. 5.1, ¿qué regla general se establece sobre la compatibilidad de la pensión de jubilación con actividades que impliquen inclusión en regímenes de Seguridad Social?",
  options: [
    "La pensión es incompatible con la realización de actividades (lucrativas o no) que den lugar a inclusión en cualquiera de los regímenes, además de los supuestos del art. 165.2 y 165.3 LGSS.",
    "La pensión es siempre compatible con cualquier actividad.",
    "La pensión es incompatible solo con actividades lucrativas.",
    "La pensión es incompatible solo con trabajo por cuenta propia.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 5.2 dice que, fuera del art. 5.1, la pensión será incompatible con actividades "lucrativas o no" que den lugar a inclusión en regímenes, y también con los supuestos de los apartados "2 y 3 del artículo 165" LGSS. B, C y D recortan o alteran el alcance.',
});

// 32
push({
  question:
    "Conforme al art. 6.1 del RD 1132/2002, ¿qué obligación formal tiene el pensionista antes de iniciar las actividades mediante contrato a tiempo parcial en jubilación flexible?",
  options: [
    "Comunicar a la Entidad gestora respectiva, antes de iniciar la actividad, que va a realizarla mediante contrato a tiempo parcial.",
    "Solicitar autorización al empresario.",
    "Presentar la solicitud de jubilación anticipada del art. 1.",
    "Firmar un convenio especial obligatorio.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 6.1 es expreso: el pensionista, "antes de iniciar" la actividad, "deberá comunicar" tal circunstancia a la Entidad gestora. B, C y D no son exigencias del art. 6.1.',
});

// 33
push({
  question:
    "Según el art. 6.2 del RD 1132/2002, ¿cuándo surte efectos la minoración de la cuantía de la pensión por jubilación flexible?",
  options: [
    "Desde el día en que comience la realización de las actividades.",
    "Desde el primer día del mes siguiente.",
    "Desde la fecha de comunicación a la Entidad gestora, aunque sea posterior al inicio.",
    "Desde la fecha de la resolución administrativa de revisión.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 6.2 establece que la minoración "tendrá efectos desde el día en que comience" la realización de las actividades. B, C y D no se corresponden con el art. 6.2.',
});

// 34
push({
  question:
    "Conforme al art. 6.3 del RD 1132/2002, ¿qué consecuencias tiene no comunicar a la Entidad gestora la realización de actividad a tiempo parcial en jubilación flexible?",
  options: [
    "La pensión es indebida en el importe correspondiente a la actividad desde el inicio, con obligación de reintegro, sin perjuicio de sanciones según la LISOS.",
    "Se extingue automáticamente la pensión de jubilación.",
    "Solo se aplica una advertencia sin reintegro.",
    "Se transforma la pensión en subsidio por desempleo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 6.3 prevé que la falta de comunicación produce el carácter "indebido" de la pensión en el importe correspondiente desde la fecha de inicio y la "obligación de reintegro", además de posibles sanciones (Ley sobre infracciones y sanciones en el orden social). B, C y D no son lo previsto.',
});

// 35
push({
  question:
    "Según el art. 7.1 del RD 1132/2002, la pensión de jubilación flexible será incompatible con qué tipo de pensiones y en qué condición temporal respecto de la actividad?",
  options: [
    "Con pensiones de incapacidad permanente que pudieran corresponder por la actividad desarrollada con posterioridad al reconocimiento de la pensión de jubilación, cualquiera que sea el régimen.",
    "Con cualquier pensión de viudedad, sin excepciones.",
    "Con incapacidad temporal derivada de la actividad parcial.",
    "Con maternidad derivada de la actividad parcial.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 7.1 declara incompatibilidad con pensiones de incapacidad permanente por la actividad desarrollada "con posterioridad" al reconocimiento, "cualquiera que sea el Régimen". B, C y D no son el contenido del art. 7.1 (C y D, además, se declaran compatibles en el art. 7.2).',
});

// 36
push({
  question:
    "Conforme al art. 7.2 del RD 1132/2002, ¿con qué prestaciones es compatible el percibo de la pensión de jubilación flexible cuando derivan de la actividad a tiempo parcial?",
  options: [
    "Con incapacidad temporal o maternidad derivadas de la actividad a tiempo parcial.",
    "Con cualquier incapacidad permanente derivada de la actividad.",
    "Con desempleo contributivo derivado de la actividad.",
    "Con pensión de jubilación anticipada simultánea.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 7.2 dice expresamente que el percibo será compatible con prestaciones de "incapacidad temporal" o de "maternidad" derivadas de la actividad parcial. B contradice el art. 7.1; C y D no aparecen.',
});

// 37
push({
  question:
    "Según el art. 8.2 (regla 1.ª) del RD 1132/2002, al cesar en el trabajo tras jubilación flexible, ¿qué regla se aplica para recalcular la base reguladora y qué salvaguarda se prevé si el recálculo reduce la base anterior?",
  options: [
    "Se recalcula con nuevas cotizaciones aplicando reglas vigentes al cese; pero si resulta una reducción de la base anterior, se mantiene la anterior aplicando revalorizaciones desde su determinación hasta el cese.",
    "Siempre se recalcula aunque resulte inferior, sin salvaguarda.",
    "Nunca se recalcula la base reguladora.",
    "Se recalcula aplicando siempre reglas vigentes al reconocimiento inicial, sin tener en cuenta el cese.",
  ],
  correctAnswer: "A",
  explanation:
    'La regla 1.ª del art. 8.2 indica que se calculará de nuevo la base reguladora con nuevas cotizaciones y reglas vigentes al cese, "salvo" que ello redujera la base anterior, en cuyo caso "se mantendrá" la anterior con "revalorizaciones" hasta el cese. B, C y D contradicen esa estructura.',
});

// 38
push({
  question:
    "Conforme al art. 8.2 (regla 2.ª) del RD 1132/2002, ¿qué dos efectos generales pueden tener las cotizaciones efectuadas tras la minoración del importe de la pensión durante la jubilación flexible?",
  options: [
    "Modificar el porcentaje aplicable a la base reguladora por el nuevo período cotizado y disminuir o suprimir el coeficiente reductor aplicado en caso de acceso anticipado.",
    "Reducir siempre la base reguladora para evitar duplicidades.",
    "Sustituir el porcentaje por un 2% fijo.",
    "Eliminar cualquier posibilidad de revalorización de la pensión.",
  ],
  correctAnswer: "A",
  explanation:
    'La regla 2.ª del art. 8.2 dice que las cotizaciones darán lugar a modificar el "porcentaje aplicable" por el nuevo período y que surtirán efectos para "disminuir o suprimir" el coeficiente reductor aplicado en acceso anticipado. B, C y D no se recogen.',
});

// 39
push({
  question:
    "Según el art. 9 del RD 1132/2002, durante el percibo de la pensión de jubilación flexible, ¿qué condición se mantiene respecto de las prestaciones sanitarias?",
  options: [
    "Se mantiene la condición de pensionista a efectos de reconocimiento y percibo de prestaciones sanitarias.",
    "Se pierde la condición de pensionista a efectos sanitarios.",
    "Solo se mantiene para prestaciones farmacéuticas, pero no médicas.",
    "Solo se mantiene si el contrato parcial es indefinido.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 9 establece que durante el percibo de la pensión de jubilación flexible se mantiene la condición de pensionista "a efectos" de prestaciones sanitarias. B, C y D contradicen el art. 9.',
});

// 40
push({
  question:
    "Conforme al art. 10.1 del RD 1132/2002, ¿cuándo no se reconoce el derecho a prestaciones de incapacidad permanente para beneficiarios con 65 o más años y cuál es la excepción?",
  options: [
    "No se reconoce si con 65 o más años se reúnen todos los requisitos para acceder a jubilación; excepto si el origen de la incapacidad permanente son contingencias profesionales.",
    "No se reconoce nunca a partir de 65, sin excepciones.",
    "Sí se reconoce siempre a partir de 65 si hay 30 años cotizados.",
    "Solo se reconoce si la incapacidad deriva de contingencias comunes.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 10.1 dispone que "No se reconocerá" el derecho cuando el beneficiario tenga "sesenta y cinco o más" y reúna todos los requisitos de jubilación, "excepto" si la IP se debe a "contingencias profesionales". B, C y D contradicen el art. 10.1.',
});

if (questions.length !== 40) {
  throw new Error(`Internal: expected 40 questions, got ${questions.length}`);
}

const today = new Date().toISOString().slice(0, 10);
const seed =
  hashStringToUInt32(outPath) ^
  hashStringToUInt32("tema10-jubilacion-tipos") ^
  hashStringToUInt32(today);

const { rekeyed, seq } = applyBalancedAnswerKey(questions, mulberry32(seed ^ 0x9e3779b9));

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
console.log(`OK ${outPath} count=40 dist=${JSON.stringify(dist)} seqStart=${seqStart}`);

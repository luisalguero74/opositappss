import fs from "node:fs";

const outPath = "TEMA 10_ESPECÍFICO_JUBILACIÓN_PARCIAL.JSON";

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
// TEMA 10 - Jubilación parcial (ESPECÍFICO)
// ÚNICA FUENTE: RD 1131/2002 (texto pegado)
// ---------------------------------------------------------------------------

// 1
push({
  question:
    "Según el art. 1.1 del RD 1131/2002, ¿qué colectivos quedan dentro del ámbito de aplicación del capítulo II?",
  options: [
    "Trabajadores con contrato a tiempo parcial, contrato de relevo y contrato fijo-discontinuo (art. 12 y 15.8 ET) incluidos en Régimen General, Minería del Carbón y trabajadores por cuenta ajena del Régimen del Mar.",
    "Solo trabajadores con contrato a tiempo parcial incluidos exclusivamente en el Régimen General.",
    "Solo trabajadores autónomos incluidos en el RETA.",
    "Solo trabajadores funcionarios incluidos en un régimen especial de clases pasivas.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.1 delimita que el capítulo II se aplica a trabajadores con "contrato a tiempo parcial, contrato de relevo y contrato de trabajo fijo-discontinuo" incluidos en los regímenes citados. Las otras opciones restringen o cambian regímenes no mencionados en el art. 1.1.',
});

// 2
push({
  question:
    "Conforme al art. 1.2 del RD 1131/2002, en relación con las prestaciones cubiertas mediante convenio especial simultáneo con trabajo a tiempo parcial, ¿qué colectivos quedan excluidos de la aplicación del real decreto?",
  options: [
    "Quienes, una vez suscrito un convenio especial, sean incluidos en el mismo régimen por un contrato a tiempo parcial; y los trabajadores a tiempo parcial que suscriban el convenio especial previsto en el art. 13 de la Orden de 18 de julio de 1991.",
    "Todos los trabajadores a tiempo parcial que coticen al Régimen General.",
    "Únicamente los trabajadores del Régimen Especial del Mar.",
    "Los trabajadores fijos-discontinuos, en todo caso.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.2 excluye, "a efectos de las prestaciones" cubiertas por convenio especial simultáneo, los supuestos de las letras a) y b). B, C y D no son las exclusiones descritas en el art. 1.2.',
});

// 3
push({
  question:
    "Según el art. 1.2 (último párrafo) del RD 1131/2002, en los supuestos excluidos por convenio especial, ¿con arreglo a qué normas se otorgarán las prestaciones?",
  options: [
    "Con arreglo a las normas que las regulen para los trabajadores que presten servicios a tiempo completo.",
    "Con arreglo a las normas del capítulo III sobre jubilación parcial.",
    "Con arreglo a un prorrateo de bases del art. 65.3 del Reglamento de cotización.",
    "Con arreglo a la normativa específica de desempleo en todo caso.",
  ],
  correctAnswer: "A",
  explanation:
    'El último párrafo del art. 1.2 dispone literalmente que las prestaciones "se otorgarán con arreglo a las normas" aplicables a trabajadores a "tiempo completo". B, C y D no son la regla del art. 1.2.',
});

// 4
push({
  question:
    "Conforme al art. 2.1 del RD 1131/2002, ¿qué alcance tiene la acción protectora para los trabajadores incluidos en el art. 1.1?",
  options: [
    "Están protegidos frente a la totalidad de situaciones y contingencias previstas con carácter general en su régimen, con las particularidades y condiciones de los artículos siguientes.",
    "Están protegidos solo frente a contingencias comunes.",
    "Quedan excluidos de las prestaciones por maternidad y riesgo durante el embarazo.",
    "Solo están protegidos frente a la jubilación parcial.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.1 afirma que están protegidos frente a "la totalidad de situaciones y contingencias" del régimen, con "particularidades" posteriores. B, C y D contradicen esa amplitud.',
});

// 5
push({
  question:
    "Según el art. 2.2 del RD 1131/2002, en materia de protección por desempleo, ¿qué normativa se aplica a estos trabajadores?",
  options: [
    "Su normativa específica, conforme a la regla cuarta del apartado 1 de la disposición adicional séptima de la Ley General de la Seguridad Social.",
    "La normativa general del RD 1131/2002, sin particularidades.",
    "La normativa del Estatuto de los Trabajadores sobre contrato a tiempo parcial.",
    "La normativa del capítulo III sobre jubilación parcial.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.2 indica que, "en materia de protección por desempleo", será de aplicación "su normativa específica" según la DA séptima LGSS. B, C y D no coinciden con el art. 2.2.',
});

// 6
push({
  question:
    "Conforme al art. 3.1 del RD 1131/2002, ¿cómo se obtienen los días teóricos de cotización a partir de horas efectivamente trabajadas?",
  options: [
    "Dividiendo el número de horas efectivamente trabajadas entre cinco, equivalente diario del cómputo de 1.826 horas anuales.",
    "Dividiendo el número de horas trabajadas entre siete.",
    "Multiplicando las horas trabajadas por 1,5.",
    "Dividiendo las horas trabajadas entre treinta.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 3.1 establece la equivalencia en días teóricos: se dividirán las horas trabajadas "por cinco" (equivalente diario de "mil ochocientas veintiséis horas anuales"). B, C y D no son la regla del art. 3.1.',
});

// 7
push({
  question:
    "Según el art. 3.2 del RD 1131/2002, para causar derecho a las pensiones de jubilación e incapacidad permanente, ¿qué coeficiente se aplica a los días teóricos de cotización?",
  options: [
    "Un coeficiente multiplicador de 1,5, para obtener el número de días que se considerarán acreditados a efectos de periodos mínimos.",
    "Un coeficiente reductor del 0,5.",
    "Un coeficiente adicional del 2%.",
    "No se aplica coeficiente alguno.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 3.2 dispone que se aplicará el "coeficiente multiplicador de 1,5". B, C y D no se corresponden con el art. 3.2.',
});

// 8
push({
  question:
    "Conforme al art. 3.6 del RD 1131/2002, al sumar días teóricos de cotización en los supuestos previstos, ¿qué límite absoluto se establece?",
  options: [
    "En ningún caso podrá computarse un número de días cotizados superior al que correspondería de haberse realizado la prestación de servicios a tiempo completo.",
    "Se puede computar hasta el doble de días si hay pluriempleo.",
    "Se puede computar sin límite si hay pluriactividad.",
    "El límite es 1.826 días anuales.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 3.6 fija el límite: "en ningún caso" se computarán más días que los que corresponderían a tiempo completo. B, C y D inventan límites o excepciones no previstas.',
});

// 9
push({
  question:
    "Según el art. 4.1.a) del RD 1131/2002, ¿cómo se calcula la base reguladora diaria de incapacidad temporal y cuándo se abona la prestación en el caso de trabajadores a tiempo parcial?",
  options: [
    "Se divide la suma de bases de cotización de los tres meses anteriores entre los días efectivamente trabajados/cotizados; y se abona durante los días contratados como de trabajo efectivo.",
    "Se divide la suma de bases de cotización de los doce meses anteriores entre 365; y se abona durante todos los días naturales.",
    "Se divide el salario mensual entre 30; y se abona solo los fines de semana.",
    "Se aplica siempre el promedio de seis meses y se paga por semestres vencidos.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 4.1.a) fija que la base diaria resulta de dividir bases de los "tres meses" anteriores entre "días efectivamente trabajados" y que se abona durante los "días contratados" como trabajo efectivo. B corresponde a maternidad (art. 6.2) y al supuesto b) de IT; C y D no aparecen.',
});

// 10
push({
  question:
    "Conforme al art. 6.2 del RD 1131/2002, ¿cómo se determina la base reguladora diaria de la prestación económica por maternidad para estos trabajadores?",
  options: [
    "Dividiendo la suma de bases de cotización de los doce meses anteriores entre 365; si la antigüedad es menor, entre los días naturales a que correspondan las bases acreditadas.",
    "Dividiendo la suma de bases de los tres meses anteriores entre los días efectivamente trabajados.",
    "Aplicando directamente la base mínima de cotización vigente.",
    "Dividiendo el salario semanal entre siete.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 6.2 establece literalmente que la base diaria será el resultado de dividir bases de los "doce meses" entre "trescientos sesenta y cinco"; y, si hay menor antigüedad, entre "días naturales" correspondientes. B es art. 4.1.a); C y D no son la regla del art. 6.2.',
});

// 11
push({
  question:
    "Según el art. 7.2 del RD 1131/2002, ¿cómo se integran las lagunas de cotización en jubilación e incapacidad permanente derivadas de enfermedad común o accidente no laboral, y qué no se considera laguna con carácter general?",
  options: [
    "Se integran con la base mínima aplicable correspondiente al número de horas contratadas; y, salvo entre temporadas/campañas de fijos-discontinuos, no son lagunas las horas o días no trabajados por interrupciones derivadas del propio contrato a tiempo parcial.",
    "Se integran siempre con la base máxima vigente; y siempre son lagunas los días no trabajados.",
    "Se integran con la base media de los 12 meses anteriores; y nunca hay excepción para fijos-discontinuos.",
    "No se integran lagunas en ningún caso.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 7.2 dice que la integración se hace con "la base mínima" correspondiente a las horas contratadas y que, en general, "en ningún caso" se considerarán lagunas las horas o días no trabajados por interrupciones del contrato a tiempo parcial, con la excepción de períodos entre temporadas/campañas de fijos-discontinuos. B, C y D contradicen el precepto.',
});

// 12
push({
  question:
    "Conforme al art. 8 del RD 1131/2002, ¿cómo se computa la fracción de año resultante para fijar el porcentaje aplicable a la base reguladora de la pensión de jubilación?",
  options: [
    "La fracción de año se computa como un año completo.",
    "La fracción de año se descarta y no se computa.",
    "La fracción de año se prorratea a meses.",
    "La fracción de año se computa solo si supera seis meses.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 8 dispone que la fracción de año resultante "se computará como un año completo". B, C y D no figuran en el art. 8.',
});

// 13
push({
  question:
    "Según el art. 9 del RD 1131/2002, ¿qué requisitos definen la jubilación parcial en su concepto reglamentario?",
  options: [
    "Que se inicie después de cumplir 60 años, simultánea con contrato a tiempo parcial, y vinculada o no con contrato de relevo, conforme a los arts. 166 LGSS y 12.6 ET.",
    "Que se inicie obligatoriamente a los 65 años y siempre con contrato indefinido.",
    "Que se inicie a cualquier edad si existe desempleo.",
    "Que se inicie solo si hay incapacidad permanente previa.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 9 define la jubilación parcial como la iniciada "después del cumplimiento de los sesenta años", simultánea con contrato a tiempo parcial y "vinculada o no" con relevo, conforme a los preceptos citados. B, C y D no se ajustan.',
});

// 14
push({
  question:
    "Conforme al art. 10.a) del RD 1131/2002, ¿entre qué límites debe situarse la reducción de jornada y salario al acceder a la jubilación parcial?",
  options: [
    "Entre un mínimo del 25% y un máximo del 85% de jornada y salario.",
    "Entre un mínimo del 15% y un máximo del 50%.",
    "Entre un mínimo del 50% y un máximo del 100%.",
    "Sin límites: depende del acuerdo individual.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 10.a) fija explícitamente un mínimo del "25 por 100" y un máximo del "85 por 100". B, C y D no coinciden con el texto.',
});

// 15
push({
  question:
    "Según el art. 10.b) del RD 1131/2002, ¿cuándo es obligatorio que la empresa celebre simultáneamente un contrato de relevo y cuándo no es preciso?",
  options: [
    "Es obligatorio si se accede con edad real inferior a 65 años (sin contar bonificaciones/anticipaciones); no es preciso si se accede con 65 años de edad real, siempre que se cumplan los demás requisitos.",
    "Es obligatorio siempre, con independencia de la edad.",
    "Nunca es obligatorio.",
    "Solo es obligatorio si el relevista es indefinido.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 10.b) distingue: para edad real inferior a 65, la empresa "deberá concertar simultáneamente" relevo; y para 65 real "no será preciso" relevo si concurren los demás requisitos. B, C y D no responden a esa regla.',
});

// 16
push({
  question:
    "Conforme al art. 11 del RD 1131/2002, ¿cuándo se entiende producido el hecho causante de la pensión de jubilación parcial?",
  options: [
    "El día del cese en la jornada que se venía realizando, siempre que en esa fecha se haya suscrito el contrato a tiempo parcial y, si es necesario, el de relevo.",
    "El día de la solicitud, en todo caso.",
    "El primer día del mes siguiente al cese.",
    "La fecha en que el relevista es dado de alta, aunque el jubilado parcial no reduzca jornada.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 11 indica que el hecho causante se entiende producido "el día del cese" en la jornada previa, siempre que se haya suscrito el contrato a tiempo parcial y, "caso de ser necesario", el contrato de relevo. B, C y D no figuran.',
});

// 17
push({
  question:
    "Según el art. 12.1 del RD 1131/2002, ¿cómo se calcula la cuantía inicial de la pensión de jubilación parcial y qué elemento expresamente no se aplica?",
  options: [
    "Aplicando el porcentaje de reducción de jornada al importe de pensión que correspondería según años cotizados, calculado por normas generales, pero sin aplicar el coeficiente adicional del 2% del art. 163.2 LGSS.",
    "Aplicando siempre un 50% del importe de la pensión mínima.",
    "Aplicando coeficientes reductores por edad si se accede antes de 65.",
    "Aplicando el coeficiente 1,5 del art. 3.2 al importe de la pensión.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 12.1 establece que la cuantía es el resultado de aplicar el "porcentaje de reducción de jornada" al importe de pensión que correspondería, pero "sin la aplicación del coeficiente adicional del 2 por 100" del art. 163.2 LGSS. B, C y D no describen la regla.',
});

// 18
push({
  question:
    "Conforme al art. 12.1 (párrafo segundo) del RD 1131/2002, ¿qué garantía mínima se establece para la pensión de jubilación parcial?",
  options: [
    "No puede ser inferior a la cuantía que resulte de aplicar el mismo porcentaje de reducción al importe de la pensión mínima vigente para jubilados mayores de 65 años, según circunstancias familiares.",
    "No puede ser inferior a la pensión mínima de jubilación ordinaria, sin reducción.",
    "No puede ser inferior al SMI anual.",
    "No existe garantía mínima.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 12.1 (párrafo segundo) dice literalmente que "no podrá ser inferior" a aplicar ese porcentaje al importe de la "pensión mínima" para jubilados "mayores de sesenta y cinco años" según circunstancias familiares. B, C y D contradicen el texto.',
});

// 19
push({
  question:
    "Según el art. 12.2 del RD 1131/2002, ¿puede incrementarse el porcentaje de reducción de jornada durante la jubilación parcial y bajo qué condiciones?",
  options: [
    "Sí, puede incrementarse por períodos anuales, a petición del jubilado parcial y con la conformidad del empresario, dentro de los límites del art. 10.a).",
    "No, el porcentaje queda fijado y es inmodificable.",
    "Sí, pero solo por decisión unilateral del empresario.",
    "Sí, pero únicamente si el relevista se niega a ampliar su jornada.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 12.2 permite incrementar la reducción "por períodos anuales", "a petición" del trabajador y con "conformidad" del empresario, dentro de límites del art. 10.a). B, C y D no se ajustan.',
});

// 20
push({
  question:
    "Conforme al art. 12.2 del RD 1131/2002, cuando para percibir la pensión sea preciso mantener un contrato de relevo, ¿qué obligación tiene la empresa respecto del relevista si aumenta la reducción del jubilado parcial?",
  options: [
    "Debe ofrecer al relevista la ampliación de su jornada en proporción a la reducción de la del jubilado parcial.",
    "Debe extinguir el contrato del relevista y contratar otro.",
    "Debe reducir la jornada del relevista.",
    "No tiene obligación alguna.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 12.2 establece que la empresa "deberá ofrecer" al relevista la ampliación de su jornada "en proporción" a la nueva reducción del jubilado parcial. B, C y D no figuran.',
});

// 21
push({
  question:
    "Según el art. 12.2 del RD 1131/2002, si la jornada del relevista ya fuese superior a la jornada dejada vacante, ¿qué límite tiene la ampliación?",
  options: [
    "Como límite, la jornada a tiempo completo del convenio colectivo aplicable o, en su defecto, la jornada ordinaria máxima legal.",
    "Como límite, el 85% de la jornada a tiempo completo.",
    "Como límite, la jornada mínima legal del relevista.",
    "No existe límite; puede superar la jornada a tiempo completo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 12.2 fija el límite cuando el relevista ya supera la vacante: la ampliación no puede exceder la jornada a "tiempo completo" del convenio o la "máxima legal". B, C y D no se apoyan en el texto.',
});

// 22
push({
  question:
    "Conforme al art. 12.2 del RD 1131/2002, si el relevista no acepta ampliar su jornada, ¿qué debe hacer la empresa y qué consecuencia se prevé si no se cumplen estas obligaciones?",
  options: [
    "Debe contratar por la jornada reducida a otro trabajador con requisitos del art. 10.b); y si no se cumple, no puede ampliarse la cuantía de la pensión de jubilación parcial.",
    "Debe suspender la pensión del jubilado parcial automáticamente.",
    "Debe reducir la cuantía de la pensión a la mitad.",
    "No debe hacer nada, porque la negativa del relevista no tiene efectos.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 12.2 prevé que, si no se acepta la ampliación, la empresa "deberá contratar" a otro trabajador por la jornada reducida y que, si no se cumple lo anterior, "no podrá" ampliarse la cuantía de la pensión. B, C y D no se corresponden con el texto.',
});

// 23
push({
  question:
    "Según el art. 12.2 (párrafos finales) del RD 1131/2002, cuando se modifica la reducción de jornada, ¿cómo se modifica la cuantía de la pensión y qué regla de actualización se aplica?",
  options: [
    "Se aplica a la pensión inicialmente reconocida el porcentaje correspondiente a la nueva reducción y la nueva pensión se actualiza con las revalorizaciones desde la fecha de efectos inicial hasta la del nuevo importe.",
    "Se recalcula como si fuera una pensión nueva sin tener en cuenta revalorizaciones.",
    "Se mantiene la cuantía inicial sin cambios.",
    "Se actualiza solo con revalorizaciones posteriores al nuevo importe.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 12.2 indica que se modificará la cuantía "aplicando" el porcentaje por la nueva reducción y que la nueva pensión será objeto de "actualización" con revalorizaciones desde la fecha de efectos inicial hasta la nueva. B, C y D no son lo previsto.',
});

// 24
push({
  question:
    "Conforme al art. 12.3 del RD 1131/2002, en supuestos de pluriempleo, ¿qué bases se tienen en cuenta para calcular la base reguladora de la pensión de jubilación parcial?",
  options: [
    "Solo las bases de cotización correspondientes al trabajo que es objeto de la reducción de jornada.",
    "Las bases de todas las actividades, incluidas las no reducidas.",
    "Solo las bases del trabajo más antiguo.",
    "Ninguna base: se usa siempre la pensión mínima.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 12.3 dice que "sólo se tendrán en cuenta" las bases del trabajo desempeñado hasta el momento y que es objeto de la reducción. B, C y D contradicen el precepto.',
});

// 25
push({
  question:
    "Según el art. 13.1 del RD 1131/2002, ¿qué debe indicar el trabajador al solicitar la pensión de jubilación parcial y con qué antelación máxima puede presentarse la solicitud?",
  options: [
    "Debe indicar la fecha prevista de cese en el trabajo (y, si procede, la fecha de nueva reducción); la solicitud puede presentarse con antelación máxima de tres meses.",
    "Debe indicar únicamente su base de cotización; y puede presentarse con antelación máxima de un mes.",
    "Debe indicar el nombre del relevista; y puede presentarse con antelación máxima de seis meses.",
    "Debe indicar la fecha de jubilación total; y puede presentarse sin límite de antelación.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 13.1 exige indicar la "fecha prevista" del cese y, en supuestos del art. 12.2, la fecha de la nueva reducción; y señala que la solicitud podrá presentarse con antelación máxima de "tres meses". B, C y D no coinciden.',
});

// 26
push({
  question:
    "Conforme al art. 13.1 del RD 1131/2002, ¿qué trámite previo se prevé antes de redactar la propuesta de resolución y cuál es el plazo para alegaciones?",
  options: [
    "La entidad gestora informará si reúne condiciones y la cuantía posible, para que en un plazo máximo de diez días formule alegaciones y aporte documentos.",
    "La empresa informará y el plazo de alegaciones será de treinta días.",
    "No existe trámite de información previa ni alegaciones.",
    "Se publica un edicto y el plazo es de quince días.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 13.1 prevé que la Entidad gestora "informará" y que el solicitante, en un plazo máximo de "diez días", pueda formular alegaciones y aportar documentos. B, C y D no se ajustan.',
});

// 27
push({
  question:
    "Según el art. 13.2 del RD 1131/2002, ¿desde cuándo se producen los efectos económicos de la pensión de jubilación parcial si la solicitud se presenta dentro de los tres meses anteriores o posteriores al cese?",
  options: [
    "El día siguiente al del hecho causante, siempre que haya entrado en vigor el contrato a tiempo parcial y, si es necesario, el de relevo.",
    "El día de la solicitud.",
    "El primer día del trimestre siguiente.",
    "El último día del mes del cese.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 13.2 fija que los efectos económicos se producen "el día siguiente" al hecho causante, condicionados a la entrada en vigor del contrato a tiempo parcial y, en su caso, relevo, si la solicitud está dentro de los "tres meses". B, C y D no figuran.',
});

// 28
push({
  question:
    "Conforme al art. 13.2 del RD 1131/2002, si la solicitud se presenta transcurridos más de tres meses desde el cese (o desde la nueva reducción en art. 12.2), ¿qué retroactividad máxima tienen los efectos económicos?",
  options: [
    "Retroactividad máxima de tres meses, contados desde la fecha de presentación de la solicitud.",
    "Retroactividad máxima de un mes.",
    "Retroactividad máxima de seis meses.",
    "No hay retroactividad.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 13.2 señala que, si se presenta tras más de tres meses, los efectos económicos "sólo" tendrán una retroactividad de "tres meses" desde la solicitud. B, C y D no se ajustan.',
});

// 29
push({
  question:
    "Según el art. 14.1.a) del RD 1131/2002, ¿en qué condiciones se mantiene la compatibilidad de la pensión de jubilación parcial con el trabajo a tiempo parcial y qué ocurre si se aumenta la duración de la jornada?",
  options: [
    "Es compatible con el trabajo a tiempo parcial en la empresa y, en su caso, otros trabajos a tiempo parcial, siempre que no se aumente la duración de la jornada; si se aumenta, la pensión queda en suspenso.",
    "Es compatible con cualquier trabajo a tiempo completo; si se aumenta la jornada, la pensión se revaloriza.",
    "No es compatible con ningún trabajo, ni a tiempo parcial.",
    "Solo es compatible si el trabajo es en otra empresa distinta.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 14.1.a) admite compatibilidad con trabajos a tiempo parcial "siempre que no se aumente" la jornada y prevé que, en caso de aumentarse, la pensión "quedará en suspenso". B, C y D contradicen el texto.',
});

// 30
push({
  question:
    "Conforme al art. 14.2 del RD 1131/2002, ¿cuál de las siguientes combinaciones recoge correctamente las incompatibilidades de la jubilación parcial?",
  options: [
    "Incompatibilidad con incapacidad permanente absoluta y gran invalidez; con jubilación por otra actividad distinta; y con incapacidad permanente total para el trabajo del contrato que dio lugar a la jubilación parcial.",
    "Incompatibilidad con viudedad y con desempleo.",
    "Incompatibilidad con asistencia sanitaria y servicios sociales.",
    "Incompatibilidad con maternidad y riesgo durante el embarazo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 14.2 establece que la pensión de jubilación parcial "será incompatible" con (a) "incapacidad permanente absoluta y gran invalidez", (b) la jubilación por otra actividad, y (c) la incapacidad permanente total para el trabajo del contrato que dio lugar a la jubilación parcial. B, C y D confunden con compatibilidades del art. 14.1 o derechos del art. 17.',
});

// 31
push({
  question:
    "Según el art. 15.1 del RD 1131/2002, si durante la jubilación parcial el trabajador fallece o se le reconoce una incapacidad permanente, ¿qué regla de bases se aplica para calcular la base reguladora cuando existe contrato de relevo?",
  options: [
    "Se toman las bases del trabajo a tiempo parcial en la empresa donde redujo jornada, incrementadas hasta el 100% de lo que hubiera correspondido con el mismo porcentaje de jornada previo a la jubilación parcial, siempre que se simultanee con contrato de relevo.",
    "Se toman solo las bases realmente ingresadas sin posibilidad de incremento.",
    "Se toma la base mínima del grupo profesional.",
    "Se toma el promedio de bases de los 12 meses posteriores al hecho causante.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 15.1 prevé que las bases se tengan en cuenta "incrementadas hasta el 100 por 100" bajo la condición de simultanear jubilación parcial con contrato de relevo. B, C y D no se apoyan en el art. 15.1.',
});

// 32
push({
  question:
    "Conforme al art. 15.2 del RD 1131/2002, cuando la jubilación parcial se simultanea con prestación de desempleo u otras prestaciones sustitutorias compatibles, ¿cuándo se aplica también el beneficio de elevación al 100% y qué excepción se establece por despido disciplinario procedente?",
  options: [
    "Se aplica también en esos períodos si además existe contrato de relevo; pero si el cese se debió a despido disciplinario procedente, la elevación al 100% solo alcanza al período anterior al cese.",
    "Se aplica siempre aunque no exista contrato de relevo.",
    "Nunca se aplica en periodos con desempleo.",
    "La excepción es para despido improcedente, limitando al período posterior.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 15.2 extiende el beneficio a periodos con desempleo/otras prestaciones sustitutorias compatibles "durante" los periodos en que exista relevo, "salvo" despido disciplinario procedente, en cuyo caso solo alcanza al periodo "anterior" al cese. B, C y D contradicen el texto.',
});

// 33
push({
  question:
    "Según el art. 15.3 del RD 1131/2002, si no procede el incremento al 100% por no existir contrato de relevo, ¿qué opciones se reconocen para determinar la base reguladora?",
  options: [
    "Optar entre computar bases realmente ingresadas durante la jubilación parcial o calcular la base en la fecha de reconocimiento (o cuando dejó de aplicarse el beneficio), aplicando reglas vigentes entonces y revalorizaciones hasta el hecho causante si procede.",
    "Obligatoriamente computar bases realmente ingresadas, sin opción.",
    "Obligatoriamente calcular la base en la fecha del hecho causante, sin revalorizaciones.",
    "Elegir siempre la base mínima, por ser la más protectora.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 15.3 reconoce una opción expresa: bases realmente ingresadas o cálculo en fecha anterior (reconocimiento/fin del beneficio) aplicando reglas vigentes y, si la base se fija en fecha anterior, aplicar "revalorizaciones" hasta el hecho causante. B, C y D no coinciden con el texto.',
});

// 34
push({
  question:
    "Conforme al art. 16 del RD 1131/2002, ¿cuál de las siguientes causas de extinción aparece expresamente y cuál excepción se establece para determinadas extinciones del contrato a tiempo parcial?",
  options: [
    "Se extingue, entre otras, por fallecimiento; y por extinción del contrato a tiempo parcial salvo que exista derecho a desempleo compatible u otras prestaciones sustitutorias, en cuyo caso se extingue cuando estas se extingan; además, no se aplica a extinciones declaradas improcedentes.",
    "Se extingue obligatoriamente al cumplir 65 años en todo caso.",
    "Se extingue por contraer matrimonio.",
    "Se extingue por superar 1.826 horas anuales.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 16 enumera causas (por ejemplo, "fallecimiento") y prevé la regla del contrato a tiempo parcial con excepción si hay desempleo compatible u otras sustitutorias; añade que lo anterior no se aplica a extinciones declaradas "improcedentes". B, C y D no están en el art. 16.',
});

// 35
push({
  question:
    "Según el art. 17 del RD 1131/2002, ¿qué condición tiene el jubilado parcial a efectos del reconocimiento y percepción de determinadas prestaciones?",
  options: [
    "Tiene la condición de pensionista a efectos de prestaciones sanitarias (médicas y farmacéuticas) y de servicios sociales.",
    "No tiene condición de pensionista hasta la jubilación total.",
    "Solo tiene derecho a asistencia sanitaria, pero no a farmacéuticas.",
    "Solo tiene derecho a servicios sociales, pero no a prestaciones sanitarias.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 17 afirma que el jubilado parcial tendrá condición de "pensionista" para prestaciones sanitarias "tanto médicas como farmacéuticas" y para prestaciones de "servicios sociales". B, C y D contradicen el tenor del art. 17.',
});

// 36
push({
  question:
    "Conforme al art. 18.2 del RD 1131/2002, para calcular la base reguladora de la pensión de jubilación ordinaria o anticipada, ¿qué regla se aplica si la jubilación parcial se simultaneó con contrato de relevo y qué excepción se reitera?",
  options: [
    "Se consideran las bases del período a tiempo parcial incrementadas al 100% como si mantuviera el porcentaje de jornada previo, siempre que hubiera contrato de relevo; y, si el cese fue por despido disciplinario procedente, la elevación al 100% solo alcanza al período anterior al cese.",
    "Se consideran siempre las bases reales sin incremento, aunque exista relevo.",
    "Se consideran las bases máximas del sistema durante todo el periodo.",
    "Se consideran únicamente las bases de otras empresas.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 18.2 replica la técnica del art. 15: bases del periodo a tiempo parcial "incrementadas hasta el 100 por 100" si hubo relevo, y reitera la excepción de despido disciplinario procedente, limitando al periodo anterior. B, C y D no se ajustan.',
});

// 37
push({
  question:
    "Según el art. 18.3 del RD 1131/2002, a efectos de determinar el porcentaje aplicable a la base reguladora, ¿cómo se trata el periodo entre jubilación parcial y jubilación ordinaria/anticipada cuando existió contrato de relevo?",
  options: [
    "Se toma como periodo cotizado a tiempo completo el periodo entre jubilación parcial y jubilación ordinaria/anticipada, siempre que se simultanease con contrato de relevo.",
    "Se toma siempre como periodo no cotizado.",
    "Se toma como periodo cotizado a tiempo parcial con coeficiente 1,5.",
    "Se toma como periodo cotizado solo si la jornada se incrementó anualmente.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 18.3 establece que, para el porcentaje, se tomará como "período cotizado a tiempo completo" el periodo entre jubilación parcial y la ordinaria/anticipada si en ese periodo hubo relevo. B, C y D no se corresponden.',
});

// 38
push({
  question:
    "Conforme al art. 18.4 del RD 1131/2002, si no puede aplicarse el incremento al 100% por no existir contrato de relevo, ¿qué alternativa se reconoce para el cálculo de la base reguladora de la pensión de jubilación?",
  options: [
    "Optar entre computar bases realmente ingresadas durante jubilación parcial o calcular la base en la fecha de reconocimiento de la jubilación parcial (o cuando dejó de aplicarse el beneficio), aplicando reglas vigentes entonces y revalorizaciones hasta el hecho causante.",
    "Aplicar siempre la pensión mínima vigente.",
    "Calcular la base con las bases futuras hasta la jubilación total.",
    "Anular el período de jubilación parcial del cálculo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 18.4 dispone que el interesado "podrá optar" entre computar las bases realmente ingresadas durante la jubilación parcial o que la base se calcule en una fecha anterior (reconocimiento de la jubilación parcial o fin del beneficio), aplicando las reglas vigentes entonces y, en su caso, "revalorizaciones" hasta el hecho causante. B, C y D no figuran en el art. 18.4.',
});

// 39
push({
  question:
    "Según el art. 4.1.b) del RD 1131/2002, cuando por interrupción de la actividad la Entidad gestora (o colaboradora) asume el pago de la incapacidad temporal, ¿cómo se recalcula la base reguladora diaria?",
  options: [
    "Dividiendo la suma de bases de cotización de los tres meses anteriores entre los días naturales comprendidos en ese período; si la antigüedad es menor, entre los días naturales a que correspondan las bases acreditadas.",
    "Dividiendo la suma de bases de los tres meses anteriores entre los días efectivamente trabajados y cotizados.",
    "Dividiendo la suma de bases de los doce meses anteriores entre 365.",
    "Aplicando directamente el coeficiente 1,5 a los días teóricos de cotización.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 4.1.b) señala que, si la Entidad gestora/colaboradora asume el pago, la base diaria será dividir bases de los "tres meses" anteriores entre los "días naturales" del período; y que, si hay menor antigüedad, se divide entre los "días naturales" a que correspondan las bases. B corresponde al art. 4.1.a); C es art. 6.2; D es del art. 3.2 y no aplica al cálculo de esta base reguladora.',
});

// 40
push({
  question:
    "Conforme al art. 4.2 del RD 1131/2002, ¿qué efecto tiene la aplicación de las reglas del art. 4.1.a) sobre el cómputo del período máximo de duración de la incapacidad temporal?",
  options: [
    "No lo afecta: el período máximo se computa, en todo caso, por referencia al número de días naturales de permanencia en la incapacidad temporal.",
    "Reduce el período máximo en proporción a la jornada parcial.",
    "Aumenta el período máximo en proporción a la reducción de jornada.",
    "Sustituye el cómputo por días naturales por un cómputo por días efectivamente trabajados.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 4.2 indica que la aplicación de las reglas del art. 4.1.a) "no afectará" al período máximo, que "se realizará por referencia al número de días naturales" de permanencia en IT. B, C y D introducen proporcionalidades o sustituciones que el art. 4.2 no contempla.',
});

if (questions.length !== 40) {
  throw new Error(`Internal: expected 40 questions, got ${questions.length}`);
}

const today = new Date().toISOString().slice(0, 10);
const seed =
  hashStringToUInt32(outPath) ^
  hashStringToUInt32("tema10-jubilacion-parcial") ^
  hashStringToUInt32(today);

const { rekeyed, seq } = applyBalancedAnswerKey(questions, mulberry32(seed ^ 0x9e3779b9));

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
console.log(`OK ${outPath} count=40 dist=${JSON.stringify(dist)} seqStart=${seqStart}`);

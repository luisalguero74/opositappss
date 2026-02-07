import fs from "node:fs";

const outPath = "TEMA 09_ESPECÍFICO_PRESTACIONES.JSON";

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

  for (let attempt = 0; attempt < 5000; attempt++) {
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

    return list.map((q, i) => rekeyQuestion(q, seq[i]));
  }

  throw new Error("Could not build a balanced, non-predictable answer key.");
}

// ---------------------------------------------------------------------------
// TEMA 09 - Nacimiento y cuidado de menor (ESPECÍFICO)
// ÚNICA FUENTE: texto pegado (RD 295/2009: art. 8 y 12; RD 1148/2011: arts. 1-9 + anexo)
// ---------------------------------------------------------------------------

// =======================
// RD 295/2009 - Artículo 8
// =======================

// 1
push({
  question:
    "Según el art. 8.1 del RD 295/2009, ¿desde qué momento se tiene derecho al subsidio por maternidad?",
  options: [
    "Desde el mismo día en que dé comienzo el periodo de descanso correspondiente.",
    "Desde el día siguiente al parto, en todo caso.",
    "Desde la fecha de solicitud, con retroactividad máxima de tres meses.",
    "Desde la fecha del alta hospitalaria del menor.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.1 establece que se tendrá derecho "a partir del mismo día en que dé comienzo el periodo de descanso correspondiente". B, C y D introducen reglas no contenidas en el art. 8.1.',
});

// 2
push({
  question:
    "Conforme al art. 8.2 del RD 295/2009, cuando el subsidio por maternidad sea compartido, ¿cómo se abona a cada beneficiario?",
  options: [
    "Se abona íntegramente a un único beneficiario con independencia de quién disfrute el descanso.",
    "Se abona a cada beneficiario durante la parte de los periodos de descanso efectivamente disfrutados por cada progenitor/adoptante/acogedor.",
    "Se abona siempre de forma simultánea, sin posibilidad de forma sucesiva.",
    "Se abona siempre de forma sucesiva, sin posibilidad de forma simultánea.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 8.2 indica: "se abonará a cada beneficiario durante la parte de los periodos de descanso (...) que hayan sido disfrutados efectivamente" y permite percepción "de forma simultánea o sucesiva". A, C y D contradicen el texto.',
});

// 3
push({
  question:
    "Según el art. 8.3 del RD 295/2009, ¿cuál es la duración general del subsidio por maternidad?",
  options: [
    "Dieciséis semanas ininterrumpidas.",
    "Catorce semanas ininterrumpidas.",
    "Dieciocho semanas ininterrumpidas.",
    "Veinte semanas ininterrumpidas.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.3 dice: "Con carácter general, el subsidio por maternidad tendrá una duración de dieciséis semanas ininterrumpidas". B, C y D no coinciden con la literalidad.',
});

// 4
push({
  question:
    "Conforme al art. 8.3 del RD 295/2009, en casos de parto, adopción o acogimiento múltiples, ¿cómo se amplía la duración?",
  options: [
    "Se amplía en dos semanas por cada hijo o menor a partir del segundo.",
    "Se amplía en dos semanas por cada hijo o menor desde el primero.",
    "Se amplía en una semana por cada hijo o menor desde el segundo.",
    "No existe ampliación por parto/adopción/acogimiento múltiples.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.3 establece que "se ampliará en dos semanas por cada hijo o menor a partir del segundo". B, C y D alteran la regla.',
});

// 5
push({
  question:
    "Según el art. 8.3 del RD 295/2009, ¿qué ampliación se prevé en el supuesto de discapacidad del hijo?",
  options: [
    "Una ampliación de dos semanas adicionales.",
    "Una ampliación de trece semanas adicionales.",
    "Una ampliación de una semana adicional.",
    "No se prevé ampliación por discapacidad.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.3 dispone que "en el supuesto de discapacidad del hijo se ampliará (...) en dos semanas adicionales". B, C y D no se ajustan.',
});

// 6
push({
  question:
    "Conforme al art. 8.3 del RD 295/2009, en casos de hospitalización del neonato a continuación del parto, ¿hasta qué máximo puede ampliarse la duración del subsidio?",
  options: [
    "Hasta un máximo de trece semanas.",
    "Hasta un máximo de siete días.",
    "Hasta un máximo de treinta días.",
    "Hasta un máximo de dieciséis semanas adicionales.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.3 prevé ampliación "hasta un máximo de trece semanas". B, C y D no figuran en el precepto.',
});

// 7
push({
  question:
    "Según el art. 8.3 (párrafo final) del RD 295/2009, en supuestos de parto múltiple, ¿qué ocurre con la acumulación de los periodos de hospitalización de cada hijo cuando esos periodos hubieran sido simultáneos?",
  options: [
    "No procede acumular los periodos de hospitalización de cada hijo cuando dichos periodos hubieran sido simultáneos.",
    "Se acumulan siempre, aunque hayan sido simultáneos.",
    "Solo se acumulan si la hospitalización supera siete días.",
    "Nunca se tiene en cuenta la hospitalización a efectos de ampliación.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.3 indica que "no procederá acumular" los periodos de hospitalización cuando hayan sido simultáneos. B, C y D contradicen el texto.',
});

// 8
push({
  question:
    "Conforme al art. 8.4 del RD 295/2009, en caso de fallecimiento del hijo, ¿qué regla general se aplica a la duración de la prestación económica?",
  options: [
    "No se verá reducida, salvo que, finalizadas las seis semanas posteriores al parto, la madre solicite reincorporarse a su puesto de trabajo.",
    "Se reduce automáticamente a seis semanas.",
    "Se extingue siempre de forma inmediata.",
    "Solo se mantiene si el feto cumple el art. 30 del Código Civil.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.4 establece que la duración "no se verá reducida", salvo si tras "las seis semanas posteriores al parto" la madre solicitara reincorporarse. B, C y D no se ajustan.',
});

// 9
push({
  question:
    "Según el art. 8.4 del RD 295/2009, ¿cuándo se aplica lo dispuesto aun cuando el feto no reúna las condiciones del art. 30 del Código Civil para adquirir la personalidad?",
  options: [
    "Siempre que hubiera permanecido en el seno materno durante, al menos, ciento ochenta días.",
    "En todo caso, sin requisito temporal.",
    "Solo en partos múltiples.",
    "Solo si la madre no se reincorpora nunca al trabajo.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.4 prevé esta aplicación siempre que el feto "hubiera permanecido en el seno materno durante, al menos, ciento ochenta días". B, C y D no figuran.',
});

// 10
push({
  question:
    "Conforme al art. 8.5 del RD 295/2009, si la madre cedió una parte determinada e ininterrumpida del descanso y el otro progenitor fallece antes de completarla, ¿qué posibilidad se reconoce a la madre?",
  options: [
    "Puede ser beneficiaria por la parte del periodo de descanso que restara hasta alcanzar la duración máxima, incluso aunque ya se hubiera reincorporado al trabajo.",
    "Pierde la parte cedida y no puede recuperarla.",
    "Solo puede recuperarla si existe hospitalización del neonato.",
    "Solo puede recuperarla si la cesión fue simultánea.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.5 permite que la madre "podrá ser beneficiaria" por la parte que reste "incluso aunque" ya se hubiera reincorporado al trabajo. B, C y D añaden restricciones no previstas.',
});

// 11
push({
  question:
    "Según el art. 8.6 del RD 295/2009, si ambos progenitores trabajan y el otro progenitor estaba disfrutando del periodo inicialmente cedido, ¿puede seguir haciendo uso de ese periodo aunque la madre esté en incapacidad temporal en el momento previsto para su reincorporación?",
  options: [
    "Sí, puede seguir haciendo uso del periodo cedido y percibir, si reúne requisitos, el subsidio correspondiente.",
    "No, la incapacidad temporal de la madre extingue automáticamente la cesión.",
    "Solo puede hacerlo si el neonato fue hospitalizado más de siete días.",
    "Solo puede hacerlo si la madre no ejercitó ninguna opción.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.6 dice que el otro progenitor "podrá seguir haciendo uso" del periodo cedido y percibir el subsidio "aunque" la madre esté en IT. B, C y D no figuran.',
});

// 12
push({
  question:
    "Conforme al art. 8.7 del RD 295/2009, ¿qué grado de discapacidad del hijo o menor acogido debe valorarse para reconocer una duración adicional de dos semanas?",
  options: [
    "Igual o superior al 33 por 100.",
    "Igual o superior al 65 por 100.",
    "Superior al 25 por 100.",
    "No se exige mínimo.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.7 exige que la discapacidad se valore "en un grado igual o superior al 33 por 100". B, C y D no se corresponden.',
});

// 13
push({
  question:
    "Según el art. 8.7 del RD 295/2009, si ambos progenitores/adoptantes/acogedores trabajan, ¿cómo puede distribuirse el periodo adicional por discapacidad?",
  options: [
    "A opción de los interesados, pudiendo disfrutarlo simultánea o sucesivamente y siempre de forma ininterrumpida.",
    "Debe disfrutarlo exclusivamente la madre.",
    "Solo puede disfrutarse de forma sucesiva, nunca simultánea.",
    "Solo puede disfrutarse de forma simultánea, nunca sucesiva.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.7 prevé que el periodo adicional se distribuirá "a opción" y podrá disfrutarse "simultánea o sucesivamente" y "siempre de forma ininterrumpida". B, C y D lo contradicen.',
});

// 14
push({
  question:
    "Conforme al art. 8.7 del RD 295/2009, cuando el grado de discapacidad no haya sido determinado tratándose de recién nacidos, ¿qué documentación puede ser suficiente?",
  options: [
    "Un informe del Servicio Público de Salud o un informe médico de un hospital público o privado avalado por el Servicio Público de Salud, en el que conste la discapacidad o su posible existencia.",
    "Únicamente una resolución firme de reconocimiento de discapacidad.",
    "Solo un informe del hospital privado sin aval.",
    "Un certificado de empresa sobre la jornada laboral.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.7 dice que será suficiente un informe del Servicio Público de Salud o un informe médico de hospital "público o privado" (este último "avalado") que haga constar la discapacidad "o su posible existencia". B, C y D no se ajustan.',
});

// 15
push({
  question:
    "Según el art. 8.8 del RD 295/2009, ¿las situaciones de huelga y cierre patronal impiden el reconocimiento y percepción del subsidio por maternidad?",
  options: [
    "No, no impedirán el reconocimiento y percepción.",
    "Sí, siempre impiden el reconocimiento.",
    "Solo impiden la percepción, pero no el reconocimiento.",
    "Solo impiden el reconocimiento si el cierre patronal es legal.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.8 afirma: "no impedirán el reconocimiento y percepción". B, C y D contradicen el precepto.',
});

// 16
push({
  question:
    "Conforme al art. 8.9 del RD 295/2009, en supuestos de partos prematuros o cuando el neonato precise hospitalización a continuación del parto, ¿qué requisito previo se exige para poder interrumpir el permiso y la percepción del subsidio a petición del beneficiario?",
  options: [
    "Haber completado el período de descanso obligatorio para la madre de seis semanas posteriores al parto.",
    "Que la hospitalización sea superior a siete días.",
    "Que se extinga el contrato de trabajo del beneficiario.",
    "Que el menor sea dado de alta.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.9 permite interrumpir "una vez completado" el descanso obligatorio de "seis semanas". B es un umbral para ampliación; C y D no son requisitos del apartado.',
});

// 17
push({
  question:
    "Según el art. 8.9 del RD 295/2009, ¿desde cuándo puede reanudarse el permiso interrumpido?",
  options: [
    "A partir de la fecha del alta hospitalaria del menor, por el periodo que reste por disfrutar.",
    "A partir del ingreso hospitalario.",
    "A partir del día siguiente al parto.",
    "A partir de la fecha de solicitud.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.9 dice que el permiso "se podrá reanudar a partir de la fecha del alta hospitalaria del menor" por el periodo restante. B, C y D no figuran.',
});

// 18
push({
  question:
    "Conforme al art. 8.9 del RD 295/2009, si durante el periodo de percepción del subsidio se extingue el contrato de trabajo del beneficiario o se produce el cese de la actividad, ¿qué ocurre con la percepción?",
  options: [
    "No se interrumpe la percepción del subsidio por maternidad.",
    "Se interrumpe automáticamente.",
    "Se transforma en prestación por desempleo.",
    "Se suspende durante 30 días.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.9 establece: "No se interrumpirá la percepción del subsidio" aunque se extinga el contrato o cese la actividad. B, C y D no se contemplan.',
});

// 19
push({
  question:
    "Según el art. 8.9 del RD 295/2009, en caso de fallecimiento de la madre, ¿qué facultad se reconoce al otro progenitor respecto a la interrupción del permiso?",
  options: [
    "Puede interrumpir el disfrute del permiso incluso durante las seis semanas siguientes al parto.",
    "No puede interrumpirlo durante las seis semanas siguientes al parto.",
    "Solo puede interrumpirlo si hay cierre patronal.",
    "Solo puede interrumpirlo si la hospitalización supera siete días.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.9 prevé que, "en caso de fallecimiento de la madre", el otro progenitor "podrá interrumpir" incluso durante las seis semanas siguientes al parto. B, C y D no figuran.',
});

// 20
push({
  question:
    "Conforme al art. 8.10 del RD 295/2009, para personal incluido en el EBEP, ¿cómo se amplía la duración del permiso por maternidad en supuestos de hospitalización del neonato a continuación del parto?",
  options: [
    "En tantos días como el neonato se encuentre hospitalizado, con un máximo de trece semanas adicionales, con independencia de la duración mínima y de su causa.",
    "Solo si la hospitalización es superior a siete días.",
    "Solo si la hospitalización es por causa relacionada con el parto.",
    "No se prevé ampliación en estos casos.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.10 dispone ampliación "en tantos días" como hospitalización, con un máximo de "trece semanas adicionales" e independencia de duración mínima y causa. B, C y D contradicen el texto.',
});

// =======================
// RD 295/2009 - Artículo 12
// =======================

// 21
push({
  question:
    "Según el art. 12.1 del RD 295/2009, ¿quién gestiona las prestaciones económicas por maternidad y cuál es la excepción?",
  options: [
    "Las gestiona directamente el INSS; excepción: trabajadores del mar, cuya gestión corresponde al Instituto Social de la Marina.",
    "Las gestiona siempre la empresa.",
    "Las gestiona siempre una mutua.",
    "Las gestiona la Tesorería General de la Seguridad Social.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 12.1 señala gestión directa por el "Instituto Nacional de la Seguridad Social", excepto Régimen del Mar, cuya gestión corresponde al "Instituto Social de la Marina". B, C y D no coinciden.',
});

// 22
push({
  question:
    "Conforme al art. 12.2 del RD 295/2009, ¿cómo se realiza el pago del subsidio por maternidad y qué se excluye expresamente?",
  options: [
    "Pago directo por la entidad gestora, sin que quepa fórmula alguna de colaboración en la gestión por parte de las empresas.",
    "Pago delegado por la empresa.",
    "Pago directo por la empresa con colaboración del INSS.",
    "Pago por la Tesorería General a través de la empresa.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 12.2 establece: "El pago del subsidio será realizado directamente por la entidad gestora" y "sin que quepa fórmula alguna de colaboración (...) por parte de las empresas". B, C y D lo contradicen.',
});

// 23
push({
  question:
    "Según el art. 12.3 del RD 295/2009, ¿con qué periodicidad se realiza el pago del subsidio y cuándo se abona el subsidio especial en caso de parto múltiple?",
  options: [
    "Por periodos vencidos; el subsidio especial por parto múltiple se abona en un solo pago al término de las seis semanas posteriores al parto.",
    "Por anticipado; el subsidio especial se abona mensualmente.",
    "Semanalmente; el subsidio especial se abona al inicio del descanso.",
    "Trimestralmente; el subsidio especial se abona al día 30 del parto.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 12.3 dice: "El pago del subsidio se realizará por periodos vencidos" y el subsidio especial "será abonado en un solo pago al término del periodo de seis semanas posteriores al parto". B, C y D no figuran.',
});

// =======================
// RD 1148/2011 - Arts. 1-9 + anexo
// =======================

// 24
push({
  question:
    "Según el art. 1.1 del RD 1148/2011, ¿a qué regímenes resulta de aplicación este real decreto?",
  options: [
    "A todos los regímenes del sistema de la Seguridad Social.",
    "Solo al Régimen General.",
    "Solo al Régimen Especial de Trabajadores Autónomos.",
    "Solo al personal funcionario del EBEP.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 1.1 afirma que "serán de aplicación a todos los regímenes del sistema de la Seguridad Social". B, C y D restringen o contradicen el texto (véase art. 1.2).',
});

// 25
push({
  question:
    "Conforme al art. 1.2 del RD 1148/2011, ¿qué personal queda fuera del ámbito de aplicación y qué precepto del EBEP se menciona?",
  options: [
    "El personal funcionario incluido en el EBEP; se menciona el art. 49.e) del EBEP.",
    "Los trabajadores del mar; se menciona el art. 49.e) del EBEP.",
    "Las personas autónomas; se menciona el art. 37.6 del ET.",
    "Las personas a tiempo parcial; se menciona el art. 66 de la Ley 39/2015.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 1.2 indica que no se aplica al personal funcionario del EBEP y remite al "artículo 49.e)". B, C y D no se corresponden.',
});

// 26
push({
  question:
    "Según el art. 2.1 del RD 1148/2011, ¿qué se considera situación protegida a efectos de la prestación por cuidado de menores afectados por cáncer u otra enfermedad grave?",
  options: [
    "La reducción de la jornada de trabajo (art. 37.6 ET) realizada para el cuidado del menor, cuando ambas personas trabajen o en familias monoparentales.",
    "Cualquier baja médica por enfermedad del menor, sin reducción de jornada.",
    "Una excedencia voluntaria para cuidado de hijos.",
    "El cambio de puesto de trabajo por razones preventivas.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 2.1 define como situación protegida la "reducción de la jornada de trabajo" (art. 37.6 ET) en los supuestos previstos y para cuidado del menor. B, C y D no encajan con el texto.',
});

// 27
push({
  question:
    "Conforme al art. 2.1 del RD 1148/2011, ¿qué exigencia vincula el cáncer o enfermedad grave del menor con el ingreso hospitalario?",
  options: [
    "Debe implicar un ingreso hospitalario de larga duración.",
    "Basta con cualquier asistencia sanitaria, aunque sea ambulatoria.",
    "Solo se exige hospitalización a domicilio, no ingreso hospitalario.",
    "No se exige ingreso hospitalario si hay reducción de jornada.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 2.1 dice que el cáncer o enfermedad grave "deberá implicar un ingreso hospitalario de larga duración". B, C y D contradicen esa exigencia.',
});

// 28
push({
  question:
    "Según el art. 2.2 del RD 1148/2011, si el diagnóstico y tratamiento del cáncer/enfermedad grave del menor se ha realizado por servicios médicos privados, ¿qué se exige respecto a la declaración acreditativa?",
  options: [
    "Que la declaración sea cumplimentada además por el médico del centro responsable de la atención del menor.",
    "Que solo la cumplimente el médico privado.",
    "Que la cumpla exclusivamente la empresa.",
    "Que se sustituya por un certificado de afiliación.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 2.2 exige que, si se realizó por servicios privados, la declaración sea cumplimentada "además" por el médico del centro responsable de la atención. B, C y D no figuran.',
});

// 29
push({
  question:
    "Conforme al art. 2.3 del RD 1148/2011, ¿hasta qué edad se mantiene la prestación económica y cuándo se puede extender a 26 años?",
  options: [
    "Hasta los 23 años; y hasta los 26 si antes de 23 se acredita además una discapacidad igual o superior al 65%.",
    "Hasta los 18 años; y hasta los 26 en todo caso.",
    "Hasta los 21 años; y hasta los 26 si el ingreso dura más de un año.",
    "Hasta los 26 años siempre que exista reducción de jornada del 50%.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 2.3 prevé mantener la prestación "hasta los 23 años" y añade que se mantendrá hasta 26 si se acredita "un grado de discapacidad igual o superior al 65 por ciento" antes de los 23. B, C y D no se corresponden.',
});

// 30
push({
  question:
    "Según el art. 2.4 del RD 1148/2011, ¿qué regla se establece sobre otras posibles modalidades de acogimiento familiar?",
  options: [
    "No se considerarán equiparables a la guarda con fines de adopción y al acogimiento familiar permanente.",
    "Siempre se considerarán equiparables.",
    "Solo serán equiparables si hay resolución judicial extranjera.",
    "Serán equiparables si el menor tiene menos de 3 años.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 2.4 dice: "No se considerarán equiparables (...) otras posibles modalidades de acogimiento familiar". B, C y D no figuran.',
});

// 31
push({
  question:
    "Conforme al art. 2.5 del RD 1148/2011, si existe recaída del causante por el cáncer o la misma enfermedad grave, ¿qué ocurre con la necesidad de un nuevo ingreso hospitalario?",
  options: [
    "No será necesario un nuevo ingreso hospitalario, pero debe acreditarse mediante una nueva declaración médica.",
    "Siempre es obligatorio un nuevo ingreso hospitalario.",
    "Solo se exige nuevo ingreso si el menor tiene más de 18 años.",
    "Depende de la empresa.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 2.5 establece que en la recaída "no será necesario que exista un nuevo ingreso hospitalario" pero debe acreditarse mediante "una nueva declaración médica". B, C y D contradicen el texto.',
});

// 32
push({
  question:
    "Según el art. 3 del RD 1148/2011, ¿qué enfermedades se consideran graves a efectos del reconocimiento de la prestación?",
  options: [
    "Las incluidas en el listado que figura en el anexo del real decreto.",
    "Cualquier enfermedad diagnosticada.",
    "Solo las oncológicas.",
    "Solo las que duren más de 12 meses.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 3 remite a las enfermedades graves "incluidas en el listado" del anexo. B, C y D añaden criterios no previstos.',
});

// 33
push({
  question:
    "Conforme al art. 4.1 del RD 1148/2011, ¿qué porcentaje mínimo de reducción de jornada se exige para ser persona beneficiaria?",
  options: [
    "Al menos un 50 por 100 de su duración.",
    "Al menos un 33 por 100.",
    "Al menos un 25 por 100.",
    "Cualquier porcentaje, sin mínimo.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 4.1 exige reducir la jornada "en, al menos, un 50 por 100 de su duración". B, C y D no se ajustan.',
});

// 34
push({
  question:
    "Según el art. 4.3 del RD 1148/2011, si ambas personas progenitoras/guardadoras/acogedoras tuvieran derecho al subsidio, ¿qué regla aplica el reconocimiento?",
  options: [
    "Solo podrá reconocerse a una de ellas; a falta de acuerdo, a quien lo solicite en primer lugar.",
    "Se reconoce siempre a las dos.",
    "Se reconoce a la madre en todo caso.",
    "Se reconoce a quien tenga más antigüedad.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 4.3 establece: "solamente podrá reconocerse a una de ellas" y, a falta de acuerdo, será beneficiaria la que "lo solicite en primer lugar". B, C y D no figuran.',
});

// 35
push({
  question:
    "Conforme al art. 5.1 del RD 1148/2011, ¿se exigen periodos mínimos de cotización a quienes tengan menos de 21 años en la fecha de inicio de la reducción de jornada?",
  options: [
    "No se exigirán periodos mínimos de cotización.",
    "Sí, 90 días en los 7 años anteriores.",
    "Sí, 180 días en los 7 años anteriores.",
    "Sí, 360 días a lo largo de la vida laboral.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 5.1 señala: "No se exigirán periodos mínimos de cotización" en ese caso. B, C y D no se aplican.',
});

// 36
push({
  question:
    "Según el art. 5.2.a) del RD 1148/2011, si la persona trabajadora tiene 21 años cumplidos y es menor de 26, ¿qué periodo mínimo de cotización se exige?",
  options: [
    "90 días cotizados en los 7 años anteriores, o alternativamente 180 días cotizados a lo largo de su vida laboral.",
    "180 días en los 7 años anteriores, o 360 a lo largo de la vida laboral.",
    "No se exige ningún periodo mínimo.",
    "365 días en el último año.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 5.2.a) exige "90 días" en los "siete años" anteriores o, alternativamente, "180 días" a lo largo de la vida laboral. B es el supuesto de 26 años o más (art. 5.2.b); C y D no figuran.',
});

// 37
push({
  question:
    "Conforme al art. 6.1 del RD 1148/2011, ¿en qué consiste la prestación económica por cuidado de menores (devengo diario) y qué se aplica sobre esa cuantía?",
  options: [
    "Subsidio equivalente al 100% de la base reguladora de IT (profesionales o comunes), aplicando el porcentaje de reducción de jornada.",
    "Subsidio equivalente al 75% de la base mínima.",
    "Cuantía fija mensual, sin relación con bases.",
    "Subsidio del 100% sin aplicar porcentaje de reducción.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 6.1 dice que será "equivalente al 100 por 100 de la base reguladora" de IT y que se aplica el "porcentaje de reducción". B, C y D no se ajustan al texto.',
});

// 38
push({
  question:
    "Según el art. 7.1 del RD 1148/2011, ¿qué retroactividad máxima de efectos económicos se aplica si la solicitud se formula fuera del plazo de tres meses desde la reducción de jornada?",
  options: [
    "Retroactividad máxima de tres meses.",
    "Retroactividad máxima de un mes.",
    "Retroactividad máxima de seis meses.",
    "No existe retroactividad.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 7.1 establece que, transcurridos los tres meses, los efectos económicos tendrán "una retroactividad máxima de tres meses". B, C y D no figuran.',
});

// 39
push({
  question:
    "Conforme al art. 8.4 del RD 1148/2011, ¿cómo se realiza el pago del subsidio por cuidado de menores afectados por cáncer u otra enfermedad grave?",
  options: [
    "Por periodos mensuales vencidos.",
    "Por periodos semanales vencidos.",
    "Por anticipado al inicio de cada mes.",
    "En un pago único al final del derecho.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.4 indica que el pago "se realizará (...) por periodos mensuales vencidos". B, C y D no coinciden con el precepto.',
});

// 40
push({
  question:
    "Según el anexo del RD 1148/2011 (apartado I. Oncología), ¿qué previsión se incluye para enfermedades oncológicas graves no enumeradas expresamente?",
  options: [
    "Incluye una cláusula abierta para " +
      '"cualquier otra enfermedad oncológica grave" que, por indicación expresa facultativa, precise cuidados permanentes en ingreso hospitalario u hospitalización a domicilio.',
    "Excluye cualquier enfermedad no enumerada.",
    "Incluye solo las enfermedades sin necesidad de indicación facultativa.",
    "Limita estrictamente el listado a las enfermedades numeradas.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 3 remite al listado del anexo y, en el anexo (I. Oncología), se recoge: "Cualquier otra enfermedad oncológica grave" que "precise de cuidados permanentes" en ingreso hospitalario u hospitalización a domicilio. B, C y D contradicen esa previsión.',
});

if (questions.length !== 40) {
  throw new Error(`Internal: expected 40 questions, got ${questions.length}`);
}

const seed =
  hashStringToUInt32(outPath) ^
  hashStringToUInt32("tema09-prestaciones") ^
  hashStringToUInt32(new Date().toISOString().slice(0, 10));

const balancedQuestions = applyBalancedAnswerKey(questions, mulberry32(seed ^ 0x9e3779b9));

// Shuffle question order without breaking the already-valid answer-letter sequence.
// 1) Take the desired answer key sequence from the balanced list.
// 2) Shuffle questions *within* each answer-letter bucket.
// 3) Rebuild the list by consuming from buckets in the original sequence.
const desiredSeq = balancedQuestions.map((q) => q.correctAnswer);
const buckets = { A: [], B: [], C: [], D: [] };
for (const q of balancedQuestions) buckets[q.correctAnswer].push(q);

const rand = mulberry32(seed);
shuffleInPlace(buckets.A, rand);
shuffleInPlace(buckets.B, rand);
shuffleInPlace(buckets.C, rand);
shuffleInPlace(buckets.D, rand);

const finalQuestions = desiredSeq.map((letter) => {
  const q = buckets[letter].shift();
  if (!q) throw new Error(`Internal: bucket underflow for ${letter}`);
  return { ...q, options: q.options.slice() };
});

const { dist, seqStart } = validateQuestions(finalQuestions);
fs.writeFileSync(outPath, JSON.stringify({ questions: finalQuestions }, null, 2) + "\n", "utf8");
console.log(`OK ${outPath} count=40 dist=${JSON.stringify(dist)} seqStart=${seqStart}`);

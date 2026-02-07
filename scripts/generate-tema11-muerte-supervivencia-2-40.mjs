import fs from "node:fs";

const outPath = "TEMA 11_PRESTACIONES_POR_MUERTE Y SUPERVIVENCIA_2.JSON";

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

function explanationHasRequiredCitations(expl) {
  return /\bart\./i.test(expl) || /\bdisposici\u00f3n\b/i.test(expl) || /\bdisp\./i.test(expl);
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
    if (!explanationHasRequiredCitations(q.explanation))
      throw new Error(`Question ${i} explanation must cite art. (or disposición/disp.)`);
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
// TEMA 11 - Prestaciones por muerte y supervivencia (Orden 13/02/1967)
// Bloque 2: foco en Cap. V–VIII (arts. 22–33) y reglas de reconocimiento/pago.
// ---------------------------------------------------------------------------

// 1
push({
  question:
    "Según el art. 22.1 (párrafo inicial), además de las condiciones del beneficiario, ¿qué requisito de cotización puede exigirse al causante para la pensión en favor de familiares cuando fallece en activo o asimilado al alta, y en qué ventana temporal?",
  options: [
    "Haber cubierto 500 días dentro de los 5 años anteriores al fallecimiento, salvo accidente de trabajo o enfermedad profesional.",
    "Haber cubierto 15 años dentro de los 10 años anteriores, sin excepciones.",
    "Haber cubierto 30 años completos, día a día.",
    "No se exige ningún requisito de cotización en ningún caso.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1 exige que el causante en activo o asimilado haya cubierto "quinientos días dentro de los cinco años anteriores" salvo que la causa sea "accidente de trabajo o enfermedad profesional". B y C no aparecen en el art. 22.1 y D contradice el requisito.',
});

// 2
push({
  question:
    "Conforme al art. 22.1.1.a), ¿qué condición de edad o incapacidad se exige a nietos y hermanos para ser beneficiarios de la pensión en favor de familiares?",
  options: [
    "Ser menores de 18 años o tener reducida su capacidad en un porcentaje valorado como incapacidad permanente absoluta o gran invalidez.",
    "Ser menores de 22 años en todo caso, sin referencia a incapacidad.",
    "Ser mayores de 18 años y estar casados.",
    "Tener 60 años cumplidos o estar incapacitados para el trabajo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1.a) exige que sean "menores de dieciocho años" o con capacidad reducida valorada en "incapacidad permanente absoluta o gran invalidez". B elimina el criterio principal; C es lo contrario; D corresponde a ascendientes (art. 22.1.3).',
});

// 3
push({
  question:
    "Según el art. 22.1.1 (párrafo sobre menores de 22), ¿cuándo puede mantenerse la condición de beneficiario hasta los 22 años por la regla de ingresos?",
  options: [
    "Cuando no efectúe trabajo lucrativo o, realizándolo, sus ingresos anuales sean inferiores al 75% del SMI anual, y al fallecer sea menor de 22.",
    "Cuando, aunque supere el 75% del SMI, siga estudiando.",
    "Cuando tenga siempre ingresos inferiores al 100% del SMI anual.",
    "Cuando tenga a su cargo hijos con derecho a orfandad.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1 permite ser beneficiario hasta 22 años si no hay trabajo lucrativo o si los ingresos anuales son "inferiores al 75 por 100" del SMI anual, y si al fallecer es "menor de veintidós años". B, C y D no están en ese párrafo.',
});

// 4
push({
  question:
    "Conforme al art. 22.1.1 (suspensión), ¿qué ocurre con la pensión en favor de familiares reconocida a beneficiarios mayores de 18 años si conciertan contrato laboral o realizan trabajo por cuenta propia y superan el límite de ingresos?",
  options: [
    "Queda en suspenso desde el día siguiente a aquel en que concurra la causa de la suspensión.",
    "Se extingue automáticamente, sin posibilidad de recuperación.",
    "Se mantiene siempre, porque el trabajo no afecta.",
    "Se reduce al 50% mientras dure el contrato.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1 indica que, reconocida la pensión, "quedará en suspenso" si mayores de 18 conciertan contrato o trabajan por cuenta propia y superan el límite, con efectos "desde el día siguiente". B, C y D no se ajustan al régimen de suspensión del artículo.',
});

// 5
push({
  question:
    "Según el art. 22.1.1 (supuesto de percepción antes de los 18), si el pensionista ya venía percibiendo la pensión y había trabajado antes de cumplir 18, ¿cuándo produce efectos la suspensión por superar ingresos?",
  options: [
    "En la fecha del cumplimiento de los 18 años, si en ese momento los ingresos superan el límite previsto.",
    "Desde el fallecimiento del causante.",
    "Desde la fecha de solicitud inicial de la pensión.",
    "Nunca: lo trabajado antes de los 18 siempre se computa para suspender inmediatamente.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1 prevé que, si se venía percibiendo antes de 18 y el pensionista trabajaba, la suspensión tendrá efectos "en la fecha del cumplimiento de los dieciocho años" cuando se superen ingresos. B y C no aparecen y D contradice la frase sobre ingresos antes de 18.',
});

// 6
push({
  question:
    "Conforme al art. 22.1.1 (regla de ingresos antes de 18), ¿qué ingresos se excluyen expresamente al determinar ingresos del beneficiario en esos supuestos?",
  options: [
    "Los obtenidos por el huérfano antes de que se cumplan los 18 años.",
    "Los obtenidos por el beneficiario después de los 18 años.",
    "Todos los ingresos del capital.",
    "Las pensiones públicas, siempre.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1 dice: "Para la determinación de los ingresos, en ningún caso se tendrán en cuenta los obtenidos... antes de que se cumplan los dieciocho años". B invierte la regla; C y D no se establecen.',
});

// 7
push({
  question:
    "Según el art. 22.1.1 (recuperación), ¿desde cuándo tiene efectos la recuperación de la pensión cuando se extingue el contrato de trabajo o cesa la actividad por cuenta propia?",
  options: [
    "Desde el día siguiente a la fecha de extinción del contrato o del cese de la actividad (si se solicita dentro de 3 meses).",
    "Desde el primer día del mes siguiente, siempre.",
    "Desde la fecha del fallecimiento del causante.",
    "Desde la fecha de la primera solicitud, sin condiciones.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1 indica que la recuperación tendrá efectos "desde el día siguiente" a la extinción del contrato o cese de actividad, siempre que se solicite dentro de "tres meses". B, C y D no coinciden con la regla.',
});

// 8
push({
  question:
    "Conforme al art. 22.1.1 (solicitud tardía), si no se solicita la recuperación dentro de los 3 meses, ¿qué límite de retroactividad máxima establece el texto?",
  options: [
    "Una retroactividad máxima de 3 meses, a contar desde la solicitud.",
    "Una retroactividad máxima de 12 meses.",
    "Retroactividad ilimitada.",
    "No hay recuperación posible.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1 prevé que, si no se solicita en tres meses, la pensión recuperada tendrá una "retroactividad máxima de tres meses" desde la solicitud. B, C y D contradicen el precepto.',
});

// 9
push({
  question:
    "Según el art. 22.1.1 (regularización anual), si al finalizar el ejercicio los ingresos anuales fueron inferiores al límite, ¿qué regla de abono retroactivo se prevé y qué plazo de solicitud se fija?",
  options: [
    "Se abona la pensión por el tiempo no percibido desde el 1 de enero del ejercicio o desde la suspensión (si posterior), si se solicita en los 3 primeros meses del año siguiente.",
    "Se abona siempre automáticamente sin necesidad de solicitud.",
    "Solo se abona desde la fecha de solicitud, sin retroactividad.",
    "Se pierde definitivamente el tiempo no percibido.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1 establece el abono por tiempo no percibido desde "el día primero de enero" o desde la suspensión (si posterior), siempre que se solicite en "los tres primeros meses del año siguiente". B, C y D no reflejan el régimen del texto.',
});

// 10
push({
  question:
    "Conforme al art. 22.1.1.b), ¿qué requisito adicional se exige a nietos y hermanos para ser beneficiarios (distinto de edad/incapacidad)?",
  options: [
    "Ser huérfanos de padre y madre.",
    "Ser hijos póstumos del causante.",
    "Tener derecho a pensión de viudedad.",
    "Estar inscritos como demandantes de empleo durante 6 meses.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1.b) exige que sean "huérfanos de padre y madre". B es un supuesto de orfandad del art. 3; C corresponde a otra prestación; D no se menciona en la Orden.',
});

// 11
push({
  question:
    "Según el art. 22.1.1.c), ¿qué duración mínima de convivencia y dependencia económica se exige respecto del causante?",
  options: [
    "Convivir con el causante y a sus expensas al menos con 2 años de antelación al fallecimiento.",
    "Convivir con el causante al menos 6 meses antes del fallecimiento.",
    "Haber convivido con el causante solo en el último mes.",
    "No se exige convivencia previa.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1.c) exige convivencia "al menos con dos años de antelación" y "a sus expensas". B y C reducen el plazo y D elimina un requisito expreso.',
});

// 12
push({
  question:
    "Conforme al art. 22.1.1.d), ¿qué requisito se fija respecto al acceso a pensión pública?",
  options: [
    "No tener derecho a pensión pública.",
    "Tener ya reconocida una pensión pública.",
    "Tener derecho a cualquier prestación, sea pública o privada.",
    "Tener derecho a pensión pública solo si es inferior al SMI.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1.d) exige expresamente "que no tengan derecho a pensión pública". B, C y D contradicen o alteran el requisito.',
});

// 13
push({
  question:
    "Según el art. 22.1.1.e), ¿qué doble condición material se exige sobre medios de subsistencia y familiares obligados a prestar alimentos?",
  options: [
    "Carecer de medios de subsistencia y no quedar familiares con obligación y posibilidad de prestar alimentos.",
    "Tener medios de subsistencia suficientes y quedar familiares obligados.",
    "Carecer de medios, aunque existan familiares obligados y con posibilidad.",
    "Tener cualquier ingreso, aunque mínimo, y no se analiza alimentos.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1.e) exige "que carezcan de medios de subsistencia" y además "no queden familiares con obligación y posibilidad de prestarles alimentos". B, C y D no cumplen ambas condiciones.',
});

// 14
push({
  question:
    "Conforme al art. 22.1.1 (definición), ¿cuándo se entiende que el nieto o hermano carece de medios de subsistencia?",
  options: [
    "Cuando sus ingresos anuales sean iguales o inferiores al SMI anual para trabajadores con 18 años.",
    "Cuando sus ingresos anuales sean inferiores al 75% del SMI anual.",
    "Cuando no tenga ingresos mensuales.",
    "Cuando sus ingresos superen el SMI anual.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1 precisa que carece de medios cuando los ingresos anuales sean "iguales o inferiores" al SMI anual para trabajadores con 18 años. B se refiere al límite del 75% en otro párrafo; C y D no se ajustan.',
});

// 15
push({
  question:
    "Según el art. 22.1.1 (mayores de 18 con trabajo), además de la regla general, ¿qué requisito adicional se exige sobre el tope de ingresos cuando realizan trabajo por cuenta ajena o actividad por cuenta propia?",
  options: [
    "Que los ingresos anuales del trabajo/actividad no superen el 75% del SMI anual vigente.",
    "Que los ingresos no superen el 100% del SMI anual.",
    "Que los ingresos no superen 2 veces el SMI.",
    "Que no haya ingresos del capital.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1 establece que, con 18 o más años y trabajo/actividad, los ingresos anuales "no superen el 75 por 100" del SMI anual. B, C y D no son el umbral previsto.',
});

// 16
push({
  question:
    "Conforme al art. 22.1.2.a), ¿qué condición específica se exige para que madre y abuelas sean beneficiarias de la pensión en favor de familiares?",
  options: [
    "Ser viudas, casadas cuyo marido esté incapacitado para el trabajo, o solteras.",
    "Ser siempre casadas y convivir con el causante dos años.",
    "Tener 60 años cumplidos en todo caso.",
    "Ser huérfanas de padre y madre.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.2.a) exige que sean "viudas, casadas cuyo marido esté incapacitado... o solteras". B y C no reflejan el requisito de estado civil del artículo, y D corresponde a nietos/hermanos.',
});

// 17
push({
  question:
    "Según el art. 22.1.2.b), además de la condición del art. 22.1.2.a), ¿qué remisión de requisitos se hace para madre y abuelas?",
  options: [
    "Deben reunir las condiciones de los apartados c), d) y e) del punto 1).",
    "Deben reunir solo la condición de ser menores de 18 años.",
    "Deben reunir los requisitos de la pensión de viudedad.",
    "No se exige ninguna otra condición.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.2.b) remite a que reúnan las condiciones de los apartados "c), d) y e)" del punto 1). B, C y D contradicen la remisión expresa.',
});

// 18
push({
  question:
    "Conforme al art. 22.1.3.a), ¿qué requisito alternativo se exige a padre y abuelos para ser beneficiarios?",
  options: [
    "Tener 60 años cumplidos o hallarse incapacitados para el trabajo.",
    "Ser menores de 18 años.",
    "Ser huérfanos de padre y madre.",
    "Tener 40 años cumplidos.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.3.a) exige "sesenta años" o estar "incapacitados para el trabajo". B, C y D no se ajustan a ese punto.',
});

// 19
push({
  question:
    "Según el art. 22.2, ¿cómo define el texto la 'incapacidad para el trabajo' a efectos de los supuestos de ascendientes y nietos/hermanos?",
  options: [
    "La de carácter permanente y absoluta que inhabilite por completo para toda profesión u oficio.",
    "Cualquier incapacidad temporal.",
    "La incapacidad parcial para la profesión habitual.",
    "La incapacidad que permita trabajar a tiempo parcial.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.2 define la incapacidad como "permanente y absoluta" que "inhabilite por completo". B, C y D no corresponden a esa definición.',
});

// 20
push({
  question:
    "Conforme al art. 23.1, ¿cuál es la cuantía de la pensión en favor de familiares para cada beneficiario, en términos de remisión?",
  options: [
    "Es igual a la señalada para la prestación de orfandad del art. 17.1.",
    "Es igual al 45% de la base reguladora del causante.",
    "Es igual al auxilio por defunción.",
    "Es una cuantía fija de cinco mil pesetas para todos los casos.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 23.1 remite: "será... igual a la señalada para la prestación de orfandad" del art. 17.1. B, C y D no son la remisión del precepto.',
});

// 21
push({
  question:
    "Según el art. 23.2, ¿cuándo se incrementa la pensión correspondiente a nietos o hermanos y a qué artículo remite el mecanismo del incremento?",
  options: [
    "Cuando no quede cónyuge sobreviviente o fallezca el cónyuge con derecho a viudedad; se incrementa en la forma del art. 17.2.",
    "Siempre que haya cónyuge sobreviviente, incrementándose según el art. 8.1.",
    "Solo en caso de pluriempleo, incrementándose según el art. 32.",
    "Solo cuando el causante era pensionista, incrementándose según el art. 9.1.b).",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 23.2 prevé el incremento si no queda "cónyuge sobreviviente" o si éste fallece estando en disfrute, y remite a "la forma prevista" en el art. 17.2. B, C y D no coinciden con el art. 23.2.',
});

// 22
push({
  question:
    "Conforme al art. 23.2 (segundo supuesto), si no quedan cónyuge sobreviviente, ni hijos, nietos o hermanos con derecho a pensión, ¿qué regla se establece para ascendientes y reparto del incremento?",
  options: [
    "El porcentaje para la pensión de ascendientes se incrementa igual, repartiéndose por partes iguales entre todos los ascendientes con derecho.",
    "No se incrementa nunca la pensión de ascendientes.",
    "Se incrementa solo para el ascendiente de mayor edad.",
    "Se incrementa proporcionalmente a las bases de cotización.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 23.2 establece que, en ausencia de cónyuge e hijos/nietos/hermanos con derecho, el porcentaje de ascendientes "se incrementará" y se distribuirá "por partes iguales" entre los ascendientes con derecho. B, C y D contradicen el texto.',
});

// 23
push({
  question:
    "Según el art. 24.a), ¿cómo se extingue la pensión a favor de familiares de nietos y hermanos?",
  options: [
    "Por las mismas causas señaladas para la pensión de orfandad en el art. 21.",
    "Solo por contraer matrimonio.",
    "Solo por fallecimiento del causante.",
    "Nunca se extingue.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 24.a) remite expresamente a las causas "señaladas para la pensión de orfandad" en el art. 21. B y C reducen indebidamente las causas, y D es falso.',
});

// 24
push({
  question:
    "Conforme al art. 24.b), ¿cuáles son las causas de extinción de la pensión a favor de familiares de ascendientes?",
  options: [
    "Contraer matrimonio y fallecimiento.",
    "Cumplir la edad mínima fijada para orfandad.",
    "Ser adoptado.",
    "Constituir una pareja de hecho.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 24.b) enumera para ascendientes: "Contraer matrimonio" y "Fallecimiento". B y C son causas del art. 21 para orfandad; D no está en el art. 24.',
});

// 25
push({
  question:
    "Según el art. 25, ¿quiénes tienen derecho al subsidio temporal en favor de familiares (edad/estado civil) y a qué condiciones remite?",
  options: [
    "Hijos y hermanos mayores de 22, solteros o viudos, que reúnan las condiciones c), d) y e) del art. 22.1.",
    "Nietos y hermanos menores de 18, siempre.",
    "Madre y abuelas viudas, sin más condiciones.",
    "Padre y abuelos mayores de 60, sin remisiones.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 25 exige que sean "hijos y hermanos" mayores de "veintidós" años, "solteros o viudos" y que reúnan las condiciones de los párrafos "c), d) y e)" del art. 22.1. B, C y D no son el supuesto del art. 25.',
});

// 26
push({
  question:
    "Conforme al art. 26, ¿cuál es la duración máxima del subsidio temporal en favor de familiares?",
  options: [
    "Doce mensualidades como máximo.",
    "Seis mensualidades.",
    "Veinticuatro mensualidades.",
    "No tiene límite de duración.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 26 establece que tendrá "una duración máxima de doce mensualidades". B y C no son el límite y D contradice el precepto.',
});

// 27
push({
  question:
    "Según el art. 26, ¿a qué cuantía equivale el subsidio temporal en favor de familiares?",
  options: [
    "A la señalada para la pensión en el art. 23.1.",
    "A cinco mil pesetas.",
    "A seis mensualidades de la base reguladora.",
    "Al 45% de la base reguladora.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 26 establece que la cuantía del subsidio "será igual a la señalada para la pensión" del art. 23.1. B, C y D pertenecen a otras prestaciones del texto.',
});

// 28
push({
  question:
    "Conforme al art. 27, ¿cuál de las siguientes es causa de extinción del subsidio temporal en favor de familiares?",
  options: [
    "Agotamiento del período de duración fijado como máximo.",
    "Contraer matrimonio del causante.",
    "Pluriempleo del causante.",
    "Tener ingresos inferiores al SMI.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 27.a) prevé la extinción por "Agotamiento del período" máximo. B, C y D no son causas del art. 27.',
});

// 29
push({
  question:
    "Según el art. 27, ¿qué otras dos causas (además del agotamiento del período) se enumeran para extinguir el subsidio temporal en favor de familiares?",
  options: [
    "Observar una conducta deshonesta o inmoral y fallecimiento.",
    "Constituir pareja de hecho y fallecimiento.",
    "Contraer nuevo matrimonio y culpabilidad en sentencia.",
    "Adopción y cumplir edad límite.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 27 enumera: b) "Observar una conducta deshonesta o inmoral" y c) "Fallecimiento". B, C y D mezclan causas de otros artículos (art. 11 o art. 21).',
});

// 30
push({
  question:
    "Conforme al art. 28.1, ¿quiénes pueden ser beneficiarios de la indemnización especial a tanto alzado en caso de muerte por accidente de trabajo o enfermedad profesional?",
  options: [
    "La viuda o el viudo que se encuentre en las condiciones del art. 7.2 y reúna las condiciones de viudedad del capítulo III.",
    "Cualquier familiar consanguíneo del causante sin más requisitos.",
    "Solo los nietos y hermanos menores de 18 años.",
    "Solo el causante, en vida.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 28.1 reconoce el derecho a "la viuda o el viudo" en las condiciones del art. 7.2 y con requisitos de viudedad del cap. III, para muerte por AT/EP. B, C y D no corresponden a ese supuesto.',
});

// 31
push({
  question:
    "Según el art. 28.2, además de la viuda/viudo, ¿quiénes pueden tener derecho a una indemnización especial por una sola vez en muerte por accidente de trabajo o enfermedad profesional?",
  options: [
    "Los huérfanos que reúnan condiciones para ser beneficiarios de la pensión de orfandad.",
    "Los ascendientes mayores de 60 años automáticamente.",
    "Los parientes que paguen el sepelio.",
    "Los beneficiarios del subsidio temporal en favor de familiares.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 28.2 indica que los "huérfanos" con condiciones para la pensión de orfandad tendrán derecho a indemnización especial por una sola vez. B, C y D no aparecen en el art. 28.2.',
});

// 32
push({
  question:
    "Conforme al art. 29.1, ¿a cuánto equivale la indemnización especial para la viuda/viudo prevista en el art. 28.1?",
  options: [
    "Al importe de seis mensualidades de la base reguladora calculada como en el art. 9.",
    "Al importe de una mensualidad de la base reguladora.",
    "A cinco mil pesetas.",
    "Al 45% de la base reguladora.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 29.1 fija que será igual al importe de "seis mensualidades" de la base reguladora calculada como en viudedad (art. 9). B, C y D no son lo previsto.',
});

// 33
push({
  question:
    "Según el art. 29.2.a), existiendo también viuda/viudo con derecho a indemnización, ¿qué cuantía corresponde a cada huérfano beneficiario?",
  options: [
    "Una mensualidad de la base reguladora para cada huérfano.",
    "Seis mensualidades para cada huérfano.",
    "Una cuantía fija de 250 pesetas mensuales.",
    "La mitad de la indemnización de la viuda/viudo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 29.2.a) establece "Una mensualidad" de la base reguladora para cada huérfano cuando exista viuda/viudo con derecho. B, C y D no coinciden con el art. 29.2.a).',
});

// 34
push({
  question:
    "Conforme al art. 30.a), ¿quién reconoce el derecho a las prestaciones cuando la muerte se debe a enfermedad común o accidente no laboral, según el texto?",
  options: [
    "La correspondiente Mutualidad laboral.",
    "La Mutua de Accidentes de Trabajo y Enfermedades Profesionales.",
    "El Servicio común de la Seguridad Social.",
    "El beneficiario, por declaración responsable.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 30.a) dispone que el reconocimiento se realiza "por la correspondiente Mutualidad laboral" cuando la muerte sea por enfermedad común o accidente no laboral. B y C son otras contingencias del art. 30, y D no aparece.',
});

// 35
push({
  question:
    "Según el art. 30.b), ¿quién reconoce el derecho cuando la muerte se debe a accidente de trabajo?",
  options: [
    "La Mutualidad laboral o Mutua de Accidentes de Trabajo y Enfermedades Profesionales de la Seguridad Social que tenga a su cargo la protección.",
    "Siempre el Servicio común de la Seguridad Social.",
    "Siempre la empresa.",
    "Siempre el beneficiario que pagó el sepelio.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 30.b) atribuye el reconocimiento a la "Mutualidad laboral o Mutua" que tenga a su cargo la protección de contingencias cuando la muerte sea por accidente de trabajo. B, C y D no son el criterio del artículo.',
});

// 36
push({
  question:
    "Conforme al art. 30.c), ¿quién reconoce el derecho cuando la muerte se debe a enfermedad profesional?",
  options: [
    "El correspondiente Servicio común de la Seguridad Social.",
    "La Mutualidad laboral.",
    "La empresa.",
    "El Fondo de Garantía Salarial.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 30.c) señala que el reconocimiento corresponde al "Servicio común de la Seguridad Social" cuando la muerte sea por enfermedad profesional. B, C y D no se ajustan.',
});

// 37
push({
  question:
    "Según el art. 31.1, ¿quién asume el pago de las prestaciones reguladas en la Orden?",
  options: [
    "La Mutualidad laboral, Mutua de Accidentes de Trabajo y Enfermedades Profesionales o Servicio común que haya reconocido el derecho según el art. 30.",
    "Siempre el INSS, con independencia del reconocimiento.",
    "Siempre la empresa del causante.",
    "Siempre el beneficiario mediante autoliquidación.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 31.1 dispone que el pago correrá a cargo de la entidad que haya "reconocido el derecho" según art. 30 (Mutualidad/Mutua/Servicio común). B, C y D no son la regla del art. 31.1.',
});

// 38
push({
  question:
    "Conforme al art. 31.2, si existe duda acerca de la contingencia que originó la muerte, ¿qué regla especial se fija para el auxilio por defunción?",
  options: [
    "Se satisface de forma inmediata por la Mutualidad laboral de encuadramiento, sin perjuicio de repetición contra la entidad obligada al pago.",
    "Se suspende el auxilio hasta que se aclare la contingencia.",
    "Se paga solo si se acredita accidente de trabajo.",
    "Se paga por el Servicio común en todo caso.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 31.2 ordena que, si hay duda, el auxilio por defunción sea satisfecho "de forma inmediata" por la Mutualidad laboral, "sin perjuicio" de que repita contra la entidad obligada. B, C y D contradicen el artículo.',
});

// 39
push({
  question:
    "Según el art. 32.1, en caso de pluriempleo del causante, ¿cómo se computan las bases de cotización para determinar la base reguladora y qué límite se aplica?",
  options: [
    "Se computan todas las bases de cotización en las distintas empresas y se aplica el tope máximo establecido a efectos de cotización.",
    "Solo se computa la base de la empresa en la que llevaba más antigüedad.",
    "Solo se computa la base de la empresa con salario más bajo.",
    "Se promedian las bases pero sin aplicar ningún tope.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 32.1 establece que se computarán "todas sus bases" y se aplicará el "tope máximo" de cotización. B, C y D no reflejan el precepto.',
});

// 40
push({
  question:
    "Conforme al art. 33.b), en pluriempleo y muerte debida a accidente de trabajo, ¿qué entidad reconoce y paga, y cómo se reparte el coste entre entidades?",
  options: [
    "Reconoce y paga la Mutualidad laboral o Mutua que cubría la contingencia en la empresa del accidente; el importe se prorratea entre todas en proporción a las bases por las que se cotizaba.",
    "Reconoce y paga siempre una sola Mutualidad: la de mayor base del mes anterior, sin prorrateo.",
    "Reconoce el Servicio común y no hay prorrateo.",
    "Reconoce y paga la empresa y no hay prorrateo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 33.b) fija que en accidente de trabajo reconoce/paga la entidad que cubría la contingencia en la empresa donde ocurrió el accidente, y que el importe "se prorrateará" entre todas "en proporción" a las bases. B recoge el criterio del art. 32.2/33.a), C corresponde a enfermedad profesional, y D no aparece.',
});

// ---------------------------------------------------------------------------
// Build, shuffle deterministically, balance answers, validate, write
// ---------------------------------------------------------------------------

if (questions.length !== 40) {
  throw new Error(`Internal error: expected 40 pushes, got ${questions.length}`);
}

const seed = hashStringToUInt32(`2026-02-02|${outPath}|tema11-muerte-supervivencia-2`);
const rand = mulberry32(seed);

shuffleInPlace(questions, rand);
const { rekeyed } = applyBalancedAnswerKey(questions, rand);

const payload = {
  questions: rekeyed.map((q) => ({
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation,
    difficulty: q.difficulty,
  })),
};

const { dist, seqStart } = validateQuestions(payload.questions);

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(`OK ${outPath} count=${payload.questions.length} dist=${JSON.stringify(dist)} seqStart=${seqStart}`);

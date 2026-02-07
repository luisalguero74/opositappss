import fs from "node:fs";

const outPath = "TEMA 11_PRESTACIONES_POR_MUERTE Y SUPERVIVENCIA_3.JSON";

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
// Bloque 3: matices y casos límite no explotados en _1/_2.
// ---------------------------------------------------------------------------

// 1
push({
  question:
    "Conforme al art. 2.4.b), ¿qué situación asimilada a la de alta se establece respecto al desplazamiento internacional del trabajador?",
  options: [
    "El traslado del trabajador, por su empresa, a centros de trabajo radicados fuera del territorio nacional.",
    "La prestación de servicios en varias empresas (pluriempleo) dentro del territorio nacional.",
    "La inscripción como demandante de empleo tras extinguirse el contrato.",
    "La excedencia voluntaria sin obligación de readmisión.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.4.b) incluye como asimilada "el traslado del trabajador, por su Empresa, a centros de trabajo radicados fuera del territorio nacional". B corresponde al cap. VIII (pluriempleo), C no aparece en art. 2.4 y D no es el supuesto descrito.',
});

// 2
push({
  question:
    "Según el art. 2.4.d), ¿qué situación se considera asimilada a la de alta en materia de desempleo?",
  options: [
    "El desempleo involuntario total y subsidiado.",
    "El desempleo voluntario con baja por dimisión.",
    "Cualquier desempleo, haya o no subsidio.",
    "El desempleo parcial siempre.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.4.d) menciona expresamente "el desempleo involuntario total y subsidiado". B y C no están formulados así en el artículo y D no aparece como supuesto.',
});

// 3
push({
  question:
    "Conforme al art. 2.4.e), ¿qué situación se describe para el paro involuntario tras agotarse las prestaciones y qué dato de edad incorpora?",
  options: [
    "El paro involuntario tras agotarse las prestaciones por desempleo, cuando el trabajador tuviese cumplidos 55 años en ese momento.",
    "El paro voluntario tras agotarse cualquier ayuda, con 52 años.",
    "El desempleo involuntario total y subsidiado, con 60 años.",
    "La excedencia forzosa por cargo público.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.4.e) establece "el paro involuntario" tras agotarse las prestaciones por desempleo "cuando... tuviese cumplidos... cincuenta y cinco años". B, C y D no coinciden con el tenor del artículo.',
});

// 4
push({
  question:
    "Según el art. 2.4.f), ¿qué situación militar se considera asimilada a la de alta y qué extensión temporal se menciona?",
  options: [
    "La permanencia en filas para el Servicio Militar, ampliada a estos efectos en dos meses previstos en el art. 79.2 de la Ley de Contrato de Trabajo.",
    "La realización de prácticas universitarias, ampliada en seis meses.",
    "La permanencia en filas solo si es obligatoria, sin ampliación.",
    "La prestación de servicios en el extranjero, ampliada en dos años.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.4.f) incluye la "permanencia en filas" para el Servicio Militar y menciona la ampliación "en los dos meses" del art. 79.2 de la Ley de Contrato de Trabajo. B, C y D no aparecen en el precepto.',
});

// 5
push({
  question:
    "Conforme al art. 2.4.g), ¿qué cláusula abierta permite incluir otras situaciones asimiladas a la de alta?",
  options: [
    "Las demás que puedan declararse expresamente por el Ministerio de Trabajo al amparo de lo previsto en el art. 93.2 de la Ley de 1966.",
    "Cualquier situación que declare la empresa por convenio colectivo.",
    "Cualquier situación de baja médica, automáticamente.",
    "Solo las que figuren en el art. 1.1.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.4.g) prevé "las demás" que puedan declararse expresamente por el Ministerio de Trabajo, al amparo del art. 93.2 de la Ley de 1966. B, C y D no reflejan esa habilitación.',
});

// 6
push({
  question:
    "Según el art. 21.1.a), ¿qué condición evita la extinción por cumplir la edad mínima si, en ese momento, el beneficiario tiene la capacidad de trabajo reducida en determinados grados?",
  options: [
    "Tener reducida su capacidad de trabajo en un porcentaje valorado en incapacidad permanente absoluta o gran invalidez.",
    "Estar inscrito como demandante de empleo.",
    "Tener hijos a cargo.",
    "Haber devengado ya 12 mensualidades.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 21.1.a) exceptúa la extinción por edad cuando el beneficiario tuviera reducida su capacidad en grado valorado como "incapacidad permanente, absoluta o gran invalidez". B, C y D no son la excepción del apartado a).',
});

// 7
push({
  question:
    "Conforme al art. 21.1.d), ¿en qué caso NO extingue la pensión de orfandad el hecho de contraer matrimonio?",
  options: [
    "Cuando el beneficiario estuviera afectado por incapacidad en uno de los grados señalados en el art. 21.1.a).",
    "Cuando haya devengado al menos 6 mensualidades.",
    "Cuando el causante falleció por enfermedad profesional.",
    "Cuando exista pluriempleo del causante.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 21.1.d) prevé extinción por matrimonio, "salvo" que estuviera afectado por incapacidad en los grados del párrafo a). B, C y D no son excepciones del art. 21.1.d).',
});

// 8
push({
  question:
    "Según el art. 21.2 (segundo párrafo), si el beneficiario no devengó cantidad alguna de orfandad por solicitarla tras cumplir la edad límite, ¿qué condición adicional exige el texto para aplicar la entrega única hasta 12 mensualidades?",
  options: [
    "Que en la fecha del hecho causante hubiera reunido las condiciones para ser beneficiario.",
    "Que el causante estuviera en alta o asimilada.",
    "Que la muerte fuera por accidente de trabajo.",
    "Que el beneficiario fuera hijo póstumo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 21.2 (segundo párrafo) aplica la regla también si no devengó nada por solicitar tarde, "siempre que" en la fecha del hecho causante "hubiera reunido las condiciones" para ser beneficiario. B, C y D no son esa condición adicional.',
});

// 9
push({
  question:
    "Conforme al art. 21.3, si se incrementaron pensiones de orfandad con el porcentaje de viudedad y se extingue el derecho de uno de los beneficiarios, ¿qué ocurre con la parte de porcentaje de viudedad que le correspondió?",
  options: [
    "Pasa a incrementar la pensión de orfandad de los restantes beneficiarios.",
    "Se pierde y reduce la suma total definitivamente.",
    "Se traslada a la pensión en favor de familiares de ascendientes.",
    "Se convierte en auxilio por defunción.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 21.3 establece que la parte del porcentaje de viudedad que correspondió al beneficiario extinguido "pasará a incrementar" la orfandad de los restantes. B, C y D no se desprenden del precepto.',
});

// 10
push({
  question:
    "Según el art. 27.b), ¿qué causa de extinción se enumera para el subsidio temporal en favor de familiares, aunque una NOTA indique su inaplicabilidad?",
  options: [
    "Observar una conducta deshonesta o inmoral.",
    "Contraer matrimonio.",
    "Cumplir la edad mínima fijada.",
    "Adopción.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 27.b) incluye como causa "Observar una conducta deshonesta o inmoral" (aunque la NOTA diga que se considera inaplicable). B corresponde a art. 24.b), y C y D se encuentran en art. 21.1.',
});

// 11
push({
  question:
    "Conforme al art. 30 (regla general), ¿de qué depende que el reconocimiento del derecho corresponda a Mutualidad laboral, Mutua o Servicio común?",
  options: [
    "De la contingencia que haya ocasionado el fallecimiento del causante.",
    "De la edad del beneficiario.",
    "De si el beneficiario convivía dos años con el causante.",
    "Del número de empresas en las que trabajaba el causante.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 30 indica que el reconocimiento se llevará a cabo "según la contingencia" que haya ocasionado el fallecimiento. B y C son requisitos de otros artículos y D remite al pluriempleo (cap. VIII).',
});

// 12
push({
  question:
    "Según el art. 31.1, ¿qué entidades pueden ser responsables del pago de las prestaciones, atendiendo al reconocimiento previo del derecho?",
  options: [
    "La Mutualidad laboral, la Mutua de Accidentes de Trabajo y Enfermedades Profesionales o el Servicio común que haya reconocido el derecho.",
    "Solo la empresa.",
    "Solo el beneficiario.",
    "Solo el Servicio común, en cualquier contingencia.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 31.1 dice que el pago correrá a cargo de la entidad que "haya reconocido el derecho" (Mutualidad/Mutua/Servicio común). B, C y D no se ajustan a ese mandato.',
});

// 13
push({
  question:
    "Conforme al art. 32.2, salvo en muerte por accidente de trabajo o enfermedad profesional, ¿qué regla establece el texto sobre el abono de las prestaciones en caso de pluriempleo?",
  options: [
    "Se abonarán íntegramente por una sola Mutualidad laboral.",
    "Se prorratearán siempre entre todas las entidades.",
    "Se abonarán por la empresa con mayor base de cotización.",
    "Se abonarán por el Servicio común.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 32.2 indica que, salvo AT/EP, las prestaciones "se abonarán íntegramente por una sola Mutualidad laboral". B contradice el texto; C y D no aparecen como regla general.',
});

// 14
push({
  question:
    "Según el art. 32.2, ¿qué criterio principal determina cuál es la Mutualidad que abona en pluriempleo (fuera de AT/EP)?",
  options: [
    "La Mutualidad en la que el causante tuviese una base de cotización de cuantía superior en el mes inmediatamente anterior al fallecimiento.",
    "La Mutualidad que reconoció por primera vez una prestación al causante.",
    "La Mutualidad de la empresa donde llevaba más antigüedad.",
    "La Mutualidad elegida por el beneficiario.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 32.2 fija el criterio de base de cotización "superior" en el mes anterior al fallecimiento. B, C y D no son el criterio principal del artículo.',
});

// 15
push({
  question:
    "Conforme al art. 32.2, si hay igualdad de bases de cotización en el mes anterior al fallecimiento, ¿qué criterio de desempate establece el texto?",
  options: [
    "La Mutualidad que hubiera reconocido el derecho al subsidio de defunción.",
    "La Mutualidad de la empresa con mayor plantilla.",
    "La Mutua de accidentes.",
    "El Servicio común.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 32.2 indica que, "a igualdad de bases", será la Mutualidad que reconoció el derecho al "subsidio de defunción". B, C y D no aparecen como desempate.',
});

// 16
push({
  question:
    "Según el art. 32.3, en fallecimiento debido a accidente de trabajo o enfermedad profesional en pluriempleo, ¿qué ocurre con el importe de los subsidios o del capital coste de las pensiones?",
  options: [
    "Se prorrateará entre las diversas Mutualidades laborales y Mutuas en función de las respectivas bases de cotización.",
    "Se abonará íntegramente por una sola Mutualidad, siempre.",
    "Se abonará por el beneficiario y luego se compensa.",
    "Se abonará por el Servicio común en todo caso.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 32.3 dispone que, en AT/EP, el importe de subsidios o capital coste "se prorrateará" entre entidades "en función" de las bases de cotización. B, C y D contradicen la regla.',
});

// 17
push({
  question:
    "Conforme al art. 33.a), en pluriempleo y muerte por enfermedad común o accidente no laboral, ¿qué criterio reproduce el texto para determinar la entidad que reconoce y paga?",
  options: [
    "La Mutualidad con base de cotización superior en el mes anterior y, a igualdad de bases, la que reconoció el subsidio de defunción.",
    "La Mutua que cubría la contingencia en la empresa del accidente.",
    "El Servicio común.",
    "La empresa con mayor base del mes del fallecimiento.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 33.a) establece el mismo criterio: base superior en el mes anterior y, a igualdad, la que reconoció el "subsidio de defunción". B es el supuesto del art. 33.b), C el del art. 33.c) y D no es el criterio del precepto.',
});

// 18
push({
  question:
    "Según el art. 33.c), en pluriempleo y muerte por enfermedad profesional, ¿qué entidad reconoce y paga y bajo qué reglas generales?",
  options: [
    "El correspondiente Servicio común de la Seguridad Social, conforme a las normas generales aplicables.",
    "La Mutualidad con mayor base del mes anterior.",
    "La Mutua que cubría la contingencia en la empresa del accidente.",
    "La entidad elegida por el beneficiario.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 33.c) atribuye el reconocimiento y pago al "Servicio común" en enfermedad profesional, de acuerdo con las "normas generales". B y C son criterios de otros apartados, y D no aparece.',
});

// 19
push({
  question:
    "Conforme al art. 33.b), ¿qué elemento adicional (además de la empresa del accidente) condiciona el prorrateo en accidente de trabajo en pluriempleo?",
  options: [
    "Que se haga en proporción a las respectivas bases por las que viniese cotizando el causante.",
    "Que se reparta a partes iguales entre empresas.",
    "Que se reparta solo entre entidades del mismo territorio.",
    "Que se reparta según antigüedad.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 33.b) ordena prorrateo "en proporción" a las bases por las que cotizaba el causante. B, C y D inventan criterios no mencionados.',
});

// 20
push({
  question:
    "Según el art. 31.2, ¿qué prestación se ordena pagar inmediatamente si existe duda sobre la contingencia y qué derecho de repetición se prevé?",
  options: [
    "El auxilio por defunción, con repetición contra la entidad obligada al pago.",
    "La indemnización especial, con repetición contra la empresa.",
    "La pensión de viudedad, sin posibilidad de repetición.",
    "La pensión de orfandad, con repetición contra el beneficiario.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 31.2 dispone que, si hay duda, el auxilio por defunción se satisfaga "de forma inmediata" y que la entidad "repita" contra la obligada al pago. B, C y D no son la regla del art. 31.2.',
});

// 21
push({
  question:
    "Conforme al art. 30 (matiz de contingencias), ¿qué combinación asocia correctamente contingencia y entidad que reconoce el derecho según el texto?",
  options: [
    "Enfermedad profesional → Servicio común; Accidente de trabajo → Mutualidad laboral o Mutua; Enfermedad común/accidente no laboral → Mutualidad laboral.",
    "Enfermedad profesional → Mutualidad laboral; Accidente de trabajo → Servicio común; Enfermedad común → Mutua.",
    "Todas las contingencias → Servicio común.",
    "Todas las contingencias → Mutua.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 30 distribuye: a) enfermedad común/accidente no laboral → "Mutualidad laboral"; b) accidente de trabajo → "Mutualidad laboral o Mutua"; c) enfermedad profesional → "Servicio común". B, C y D contradicen esa distribución.',
});

// 22
push({
  question:
    "Según el art. 33 (idea matriz), ¿qué se regula específicamente en ese artículo respecto a pluriempleo?",
  options: [
    "Reglas de reconocimiento del derecho y pago de las prestaciones en situaciones de pluriempleo según la contingencia.",
    "Las causas de extinción de la pensión de viudedad.",
    "La cuantía de la pensión de orfandad.",
    "El concepto de auxilio por defunción.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 33 se titula "Reconocimiento del derecho y pago de las prestaciones" en pluriempleo y fija reglas según contingencia. B corresponde a art. 11, C a art. 17 y D a art. 4.',
});

// 23
push({
  question:
    "Conforme al art. 32.1, en pluriempleo, ¿qué dos ideas deben concurrir al calcular la base reguladora de las prestaciones de muerte y supervivencia?",
  options: [
    "Computar todas las bases de cotización en distintas empresas y aplicar el tope máximo a efectos de cotización.",
    "Elegir una sola base de cotización y no aplicar topes.",
    "Computar solo la base de mayor cuantía y aplicar el tope mínimo.",
    "Computar solo las bases del último mes y aplicar el tope mínimo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 32.1 ordena computar "todas" las bases en las distintas empresas y aplicar el "tope máximo". B, C y D no coinciden con el precepto.',
});

// 24
push({
  question:
    "Según el art. 25 (remisión), ¿a qué concretos apartados del art. 22.1 se remite el subsidio temporal en favor de familiares?",
  options: [
    "A las condiciones contenidas en los párrafos c), d) y e) del art. 22.1.",
    "A todos los requisitos del art. 22.1.1 (a–e) íntegros.",
    "Solo a los requisitos de cotización del causante.",
    "Solo al requisito de ser huérfano de padre y madre.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 25 remite expresamente a las condiciones de los párrafos "c), d) y e)" del art. 22.1. B, C y D son remisiones incorrectas o parciales.',
});

// 25
push({
  question:
    "Conforme al art. 22.1.1 (efectos de suspensión), ¿desde cuándo tiene efectos la suspensión por superar el límite de ingresos en el caso general de mayores de 18 años?",
  options: [
    "Desde el día siguiente a aquel en que concurra la causa de la suspensión.",
    "Desde el primer día del mes siguiente.",
    "Desde la fecha del contrato, con efecto retroactivo de un año.",
    "Desde el fallecimiento del causante.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1 indica que la suspensión tendrá efectos "desde el día siguiente" a aquel en que concurra la causa. B, C y D no se desprenden del texto.',
});

// 26
push({
  question:
    "Según el art. 22.1.1 (caso especial), cuando el beneficiario venía percibiendo la pensión antes de cumplir 18 y ya trabajaba, ¿qué regla fija el texto sobre el momento de inicio de efectos de la suspensión al cumplir 18?",
  options: [
    "La suspensión tendrá efectos en la fecha del cumplimiento de los 18 años.",
    "La suspensión solo puede empezar al cumplir 22 años.",
    "La suspensión empieza siempre al día siguiente del contrato, sin relación con cumplir 18.",
    "No cabe suspensión en ese supuesto.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1 prevé que, en esos supuestos, la suspensión tendrá efectos "en la fecha del cumplimiento de los dieciocho años". B, C y D contradicen esa regla.',
});

// 27
push({
  question:
    "Conforme al art. 22.1.1 (recuperación y plazo), si la recuperación se solicita fuera de los tres meses siguientes a la fecha indicada, ¿qué limitación expresa fija el texto?",
  options: [
    "La retroactividad máxima de la pensión recuperada será de tres meses desde la solicitud.",
    "No existe limitación: retroactividad total.",
    "La retroactividad será de un año.",
    "Se pierde definitivamente el derecho a recuperar.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1 establece que, en caso contrario, la pensión recuperada tendrá "una retroactividad máxima de tres meses" desde la solicitud. B, C y D no corresponden al texto.',
});

// 28
push({
  question:
    "Según el art. 22.1.1 (año siguiente), si los ingresos percibidos en el año resultan superiores al límite, ¿cuándo se produce la recuperación de la pensión y bajo qué condición?",
  options: [
    "El día primero del año siguiente, siempre que en esa fecha se sigan cumpliendo los requisitos exigidos.",
    "Al día siguiente de la solicitud, siempre.",
    "Nunca se recupera.",
    "En la fecha de extinción del contrato, sin más.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1 indica que, si en el año los ingresos fueron superiores al límite, la recuperación se producirá "el día primero del año siguiente" si en esa fecha se siguen cumpliendo requisitos. B, C y D no se ajustan.',
});

// 29
push({
  question:
    "Conforme al art. 22.1.1 (abono por tiempo no percibido), si al finalizar el ejercicio los ingresos fueron inferiores al límite, ¿desde qué fecha se abona lo no percibido si se solicita en plazo?",
  options: [
    "Desde el 1 de enero del ejercicio o desde la fecha de suspensión, si esta última es posterior.",
    "Desde la fecha del fallecimiento del causante.",
    "Desde la fecha de solicitud únicamente.",
    "Desde el último día del ejercicio.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1 prevé abono por tiempo no percibido desde "el día primero de enero" del ejercicio o desde la suspensión si posterior, si se solicita en plazo. B, C y D no son la regla.',
});

// 30
push({
  question:
    "Según el art. 22.1.1 (penalización por demora), si no se solicita el abono del tiempo no percibido en los tres primeros meses del año siguiente, ¿qué consecuencia fija el texto?",
  options: [
    "El período de percepción se reduce en tantos días como se haya demorado la presentación de la solicitud.",
    "Se pierde todo el derecho del ejercicio.",
    "Se mantiene íntegro pero sin intereses.",
    "Se convierte en subsidio temporal.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 22.1.1 establece que, en otro caso, el período de percepción "se reducirá en tantos días" como se demore la solicitud. B, C y D no se ajustan al tenor literal.',
});

// 31
push({
  question:
    "Conforme al art. 30.a) y 31.2, si hay duda sobre la contingencia, ¿qué entidad satisface el auxilio por defunción de forma inmediata según el texto?",
  options: [
    "La Mutualidad laboral en que el causante estuviese encuadrado.",
    "La Mutua de accidentes.",
    "El Servicio común.",
    "La empresa.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 31.2 establece que el auxilio sea satisfecho "de forma inmediata" por la "Mutualidad laboral" de encuadramiento. B y C dependen de otras contingencias en art. 30; D no figura.',
});

// 32
push({
  question:
    "Según el art. 33.b), ¿qué entidad reconoce y paga en pluriempleo cuando la muerte se debe a accidente de trabajo?",
  options: [
    "La Mutualidad laboral o Mutua que cubriese la contingencia en la empresa en la que se produjo el accidente.",
    "La Mutualidad de mayor base del mes anterior, siempre.",
    "El Servicio común.",
    "La empresa, directamente.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 33.b) atribuye reconocimiento y pago a la entidad que cubriese "la indicada contingencia en la Empresa en la que se hubiera producido el accidente". B es el criterio de enfermedad común/no laboral (art. 33.a), C corresponde a enfermedad profesional (art. 33.c) y D no aparece.',
});

// 33
push({
  question:
    "Conforme al art. 33.a), ¿qué dos contingencias agrupa el texto bajo el mismo criterio de una sola Mutualidad en pluriempleo?",
  options: [
    "Enfermedad común y accidente no laboral.",
    "Accidente de trabajo y enfermedad profesional.",
    "Enfermedad profesional y accidente no laboral.",
    "Accidente de trabajo y enfermedad común.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 33.a) se refiere a "enfermedad común" o "accidente no laboral" y aplica la regla de una sola Mutualidad con criterios de base del mes anterior y subsidio de defunción. B, C y D no son la agrupación del apartado a).',
});

// 34
push({
  question:
    "Según el art. 30.b), ¿qué condición adicional se menciona respecto de la entidad que reconoce el derecho cuando la muerte se debe a accidente de trabajo?",
  options: [
    "Que tenga a su cargo la protección de las contingencias.",
    "Que sea la entidad con mayor base de cotización del mes anterior.",
    "Que sea el Servicio común.",
    "Que haya pagado previamente el auxilio por defunción.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 30.b) refiere a la Mutualidad laboral o Mutua "que tenga a su cargo la protección de las contingencias". B es criterio de pluriempleo de art. 32/33.a), C es enfermedad profesional, y D es un supuesto de desempate en art. 32.2.',
});

// 35
push({
  question:
    "Conforme al art. 33.c) y al art. 30.c), ¿qué coincidencia existe para enfermedad profesional tanto en pluriempleo como en regla general?",
  options: [
    "En ambos casos el reconocimiento/pago se atribuye al Servicio común de la Seguridad Social.",
    "En ambos casos se atribuye a la Mutualidad de mayor base.",
    "En ambos casos se atribuye a la empresa.",
    "En ambos casos se atribuye al beneficiario.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 30.c) (regla general) y el art. 33.c) (pluriempleo) atribuyen a enfermedad profesional el "Servicio común". B, C y D no se ajustan al texto.',
});

// 36
push({
  question:
    "Según el art. 32.3, ¿qué dos tipos de importes menciona el texto que se prorratean en caso de fallecimiento por accidente de trabajo o enfermedad profesional?",
  options: [
    "El importe de los subsidios o el capital coste de las pensiones.",
    "Solo el auxilio por defunción.",
    "Solo la pensión de viudedad.",
    "Solo las bases de cotización.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 32.3 se refiere al "importe de los subsidios o del capital coste de las pensiones". B, C y D no reflejan el contenido del artículo.',
});

// 37
push({
  question:
    "Conforme al art. 33.b), ¿qué conceptos se incluyen explícitamente como parte del 'importe de las prestaciones satisfechas' susceptible de prorrateo?",
  options: [
    "Incluido el del capital coste de las pensiones.",
    "Incluido el complemento por mínimos.",
    "Incluido el auxilio por defunción.",
    "Incluidas las retribuciones efectivamente percibidas.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 33.b) dice que el importe de las prestaciones satisfechas, "incluido el del capital coste de las pensiones", se prorrateará. B no se cita ahí, C se regula en otros artículos, y D corresponde a base reguladora de AT/EP en art. 9.1.d).',
});

// 38
push({
  question:
    "Según el art. 31.1, ¿qué condición debe cumplirse para que sea aplicable la referencia específica cuando la muerte sea debida a accidente de trabajo?",
  options: [
    "Que la muerte del causante sea debida a accidente de trabajo.",
    "Que el beneficiario sea huérfano de padre y madre.",
    "Que exista pluriempleo.",
    "Que la muerte sea por enfermedad común.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 31.1 añade que será aplicable "cuando la muerte del causante sea debida a accidente de trabajo" lo previsto en el precepto referido. B, C y D no son la condición del inciso final.',
});

// 39
push({
  question:
    "Conforme al art. 33.a), ¿qué momento temporal concreto utiliza el texto para comparar bases de cotización en pluriempleo?",
  options: [
    "El mes inmediatamente anterior al de su fallecimiento.",
    "El mes del fallecimiento.",
    "El año anterior al fallecimiento.",
    "Los 24 meses anteriores.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 33.a) usa como referencia "el mes inmediatamente anterior" al fallecimiento para determinar la Mutualidad. B, C y D no coinciden con el punto temporal señalado.',
});

// 40
push({
  question:
    "Según el art. 32.2, ¿qué prestación se usa como criterio de desempate si hay igualdad de bases en el mes anterior, y cómo se formula?",
  options: [
    "La que hubiera reconocido el derecho al " +
      "\"subsidio de defunción\"" +
      ".",
    "La que hubiera reconocido la pensión de orfandad.",
    "La que hubiera reconocido la pensión de viudedad.",
    "La que hubiera reconocido el subsidio temporal en favor de familiares.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 32.2 indica que, a igualdad de bases, decide la Mutualidad que hubiera reconocido el derecho al "subsidio de defunción". B, C y D no son el criterio de desempate del precepto.',
});

// ---------------------------------------------------------------------------
// Build, shuffle deterministically, balance answers, validate, write
// ---------------------------------------------------------------------------

if (questions.length !== 40) {
  throw new Error(`Internal error: expected 40 pushes, got ${questions.length}`);
}

const seed = hashStringToUInt32(`2026-02-02|${outPath}|tema11-muerte-supervivencia-3`);
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

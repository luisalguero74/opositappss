import fs from "node:fs";

const outPath = "TEMA 11_PRESTACIONES_POR_MUERTE Y SUPERVIVENCIA_1.JSON";

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
  // Prefer artículo citations; allow disposiciones too if needed.
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
// ÚNICA FUENTE: el texto pegado (incluidas NOTAS del propio documento).
// ---------------------------------------------------------------------------

// 1
push({
  question:
    "Según el art. 1.1 de la Orden de 13 de febrero de 1967, ¿qué conjunto recoge exclusivamente prestaciones enumeradas expresamente para el caso de muerte?",
  options: [
    "Auxilio por defunción; pensión vitalicia o, en su caso, subsidio temporal de viudedad; pensión de orfandad; pensión vitalicia o, en su caso, subsidio temporal en favor de familiares.",
    "Prestación por desempleo; subsidio por incapacidad temporal; auxilio por defunción; pensión de jubilación.",
    "Pensión de viudedad; complemento por mínimos; asistencia sanitaria; prestación farmacéutica.",
    "Auxilio por defunción; subsidio por maternidad; pensión de orfandad; incapacidad temporal.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.1 enumera literalmente: "auxilio por defunción", "pensión vitalicia o, en su caso, subsidio temporal de viudedad", "pensión de orfandad" y "pensión vitalicia o, en su caso, subsidio temporal en favor de familiares". B, C y D incluyen prestaciones que no están listadas en el art. 1.1.',
});

// 2
push({
  question:
    "Conforme al art. 1.2, ¿qué prestación adicional se reconoce cuando la muerte es causada por accidente de trabajo o enfermedad profesional?",
  options: [
    "Una indemnización a tanto alzado, además de las prestaciones del art. 1.1.",
    "Únicamente el auxilio por defunción, sin otras prestaciones.",
    "Un complemento por mínimos automático sobre la base reguladora.",
    "Una prestación por desempleo de pago único.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 1.2 indica que, en caso de muerte causada por accidente de trabajo o enfermedad profesional, "se concederá, además, una indemnización a tanto alzado". B, C y D no aparecen en el art. 1.2.',
});

// 3
push({
  question:
    "Según el art. 2.1, ¿cuál de los siguientes puede ser sujeto causante de las prestaciones de muerte y supervivencia enumeradas en el art. 1?",
  options: [
    "Un trabajador en situación de alta o asimilada a ella.",
    "Cualquier persona residente en España aunque no tenga relación con el sistema.",
    "Únicamente los beneficiarios de prestaciones por desempleo.",
    "Solo los trabajadores autónomos cuando estén al corriente de pago (aunque el texto no lo menciona).",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.1 incluye como causantes a "los trabajadores en situación de alta o asimilada a ella" (además de otros supuestos). B, C y D introducen requisitos o colectivos que el art. 2.1 no establece con ese alcance.',
});

// 4
push({
  question:
    "De acuerdo con el art. 2.2, ¿cuándo es admisible la prueba de que la muerte se debió a un accidente de trabajo?",
  options: [
    "Solo cuando el fallecimiento haya ocurrido dentro de los cinco años siguientes a la fecha del accidente de trabajo.",
    "En cualquier momento, aunque hayan transcurrido más de cinco años desde el accidente.",
    "Solo si la muerte ocurre dentro del año siguiente al accidente.",
    "Nunca: no se admite prueba de la relación con el accidente de trabajo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.2 establece que la prueba "sólo será admisible, en caso de accidente de trabajo, cuando el fallecimiento haya ocurrido dentro de los cinco años siguientes a la fecha del mismo". B, C y D contradicen ese límite temporal del art. 2.2.',
});

// 5
push({
  question:
    "Según el art. 2.2, respecto de la enfermedad profesional, ¿qué regla se fija para admitir la prueba de que la muerte se debió a esa contingencia?",
  options: [
    "Se admite la prueba cualquiera que sea el tiempo transcurrido.",
    "Solo se admite si el fallecimiento ocurre dentro de los cinco años siguientes.",
    "Solo se admite si el fallecimiento ocurre dentro de los dos años siguientes.",
    "No se admite prueba en ningún caso.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.2 dice que "en caso de enfermedad profesional se admitirá tal prueba, cualquiera que sea el tiempo transcurrido". B y C trasladan el límite del accidente de trabajo o inventan otro, y D lo niega.',
});

// 6
push({
  question:
    "Conforme al art. 2.2 (párrafo final), ¿en qué supuesto se reputa de derecho que la muerte es consecuencia de accidente de trabajo o enfermedad profesional?",
  options: [
    "Cuando el fallecido tuviese reconocida por tales causas una incapacidad permanente absoluta para todo trabajo o la condición de grandes inválidos.",
    "Cuando el fallecido estuviera desempleado involuntario total y subsidiado.",
    "Cuando el fallecido hubiera suscrito un convenio especial.",
    "Cuando el fallecido hubiera percibido auxilio por defunción.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.2 señala que "se reputarán, de derecho" muertos por AT/EP quienes fallezcan "teniendo reconocida por tales causas una incapacidad permanente absoluta para todo trabajo o la condición de grandes inválidos". B, C y D no son supuestos del art. 2.2.',
});

// 7
push({
  question:
    "Según el art. 2.3, ¿cuándo se consideran pensionistas de jubilación, a efectos de causar prestaciones, quienes no hubieran solicitado la pensión?",
  options: [
    "Cuando, habiendo cesado en el trabajo por cuenta ajena y reuniendo todas las condiciones para la pensión, fallecen sin haberla solicitado.",
    "Siempre que hayan cumplido 65 años, aunque no hayan cesado en el trabajo.",
    "Solo si habían solicitado la pensión y estaba pendiente de resolución.",
    "Solo si el fallecimiento deriva de accidente de trabajo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.3 establece que serán considerados pensionistas de jubilación quienes "habiendo cesado en el trabajo por cuenta ajena" y reuniendo "todas las condiciones" falleciesen "sin haber solicitado dicha pensión". B, C y D añaden condiciones no previstas.',
});

// 8
push({
  question:
    "Conforme al art. 2.4.a), ¿qué situación se considera asimilada a la de alta para causar estas prestaciones?",
  options: [
    "La excedencia forzosa del trabajador por cuenta ajena por designación para ocupar un cargo público, con obligación de readmisión al cesar.",
    "La excedencia voluntaria sin obligación de readmisión.",
    "La situación de estudiante sin trabajo.",
    "La baja voluntaria por dimisión sin causa.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.4.a) incluye "la excedencia forzosa... motivada por su designación para ocupar un cargo público... con obligación... de readmitirle". B, C y D no aparecen como asimiladas en el art. 2.4.',
});

// 9
push({
  question:
    "Según el art. 2.4.c), ¿qué circunstancia se menciona como situación asimilada a la de alta?",
  options: [
    "El cese como trabajador por cuenta ajena con suscripción de convenio especial con la Mutualidad correspondiente.",
    "La mera inscripción como demandante de empleo sin más requisitos.",
    "La percepción de una prestación asistencial de cualquier tipo.",
    "La jubilación flexible (no citada en el texto).",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 2.4.c) menciona "el cese en la condición de trabajador por cuenta ajena, con la suscripción del oportuno convenio especial". B, C y D no son supuestos recogidos en el art. 2.4.',
});

// 10
push({
  question:
    "De acuerdo con el art. 3, ¿cuál es la regla general sobre la fecha del hecho causante de las prestaciones del art. 1?",
  options: [
    "Se entienden causadas en la fecha en que se produzca el fallecimiento del sujeto causante.",
    "Se entienden causadas en la fecha de la solicitud de la prestación.",
    "Se entienden causadas en la fecha del sepelio.",
    "Se entienden causadas el día primero del mes siguiente al fallecimiento.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 3 establece que las prestaciones "se entenderán causadas... en la fecha en que se produzca el fallecimiento del sujeto causante" (salvo la excepción del hijo póstumo). B, C y D no se ajustan al art. 3.',
});

// 11
push({
  question:
    "Conforme al art. 3 (excepción), ¿cuándo se entiende causada la pensión de orfandad si el beneficiario es hijo póstumo?",
  options: [
    "En la fecha de su nacimiento.",
    "En la fecha del fallecimiento del causante.",
    "En la fecha de inscripción en el Registro Civil.",
    "En la fecha de la solicitud de la pensión.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 3 indica que, para la orfandad cuando el beneficiario sea hijo póstumo, "se entenderá causada en la fecha de su nacimiento". B, C y D contradicen esa excepción.',
});

// 12
push({
  question:
    "Según el art. 4, ¿qué concepto define el auxilio por defunción?",
  options: [
    "Un auxilio para hacer frente a los gastos del sepelio, percibido de forma inmediata.",
    "Una pensión vitalicia calculada sobre la base reguladora.",
    "Una indemnización especial exclusiva para viudedad.",
    "Una prestación por desempleo vinculada al fallecimiento.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 4 establece que el fallecimiento "dará derecho a la percepción inmediata de un auxilio por defunción para hacer frente a los gastos del sepelio". B, C y D no describen el auxilio del art. 4.',
});

// 13
push({
  question:
    "Conforme al art. 5.1, ¿quién es beneficiario del auxilio por defunción?",
  options: [
    "Quien haya soportado los gastos del sepelio del sujeto causante.",
    "Siempre el cónyuge, aunque no haya pagado el sepelio.",
    "Siempre los hijos, con independencia de quién pague.",
    "La entidad gestora en todo caso.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 5.1 dispone: "Será beneficiario... quien haya soportado los gastos del sepelio". B y C convierten en beneficiarios automáticos a familiares, y D no se corresponde con el art. 5.1.',
});

// 14
push({
  question:
    "Según el art. 5.1 (presunción), ¿cuál es el orden presunto de quienes han satisfecho los gastos del sepelio, salvo prueba en contrario?",
  options: [
    "Viuda, hijos o parientes del fallecido que conviviesen con él habitualmente.",
    "Hijos, viuda y después la empresa.",
    "La Mutualidad laboral y, en su defecto, los parientes.",
    "Primero cualquier tercero que aporte factura; después los familiares.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 5.1 presume, salvo prueba en contrario, que los gastos fueron satisfechos "por este orden: por la viuda, hijos o parientes... que conviviesen". B, C y D alteran el orden o introducen sujetos no previstos.',
});

// 15
push({
  question:
    "Conforme al art. 6.a), ¿cuál es la cuantía del auxilio por defunción cuando el beneficiario es alguno de los familiares mencionados en el art. 5.1?",
  options: [
    "Cinco mil pesetas.",
    "El importe exacto del sepelio, sin límite.",
    "Seis mensualidades de la base reguladora.",
    "Veintiochoavas partes de las bases de cotización de 24 meses.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 6.a) fija "Cinco mil pesetas" cuando el beneficiario sea uno de los familiares del art. 5.1. B contradice el límite y el sistema del art. 6, y C y D pertenecen a otras prestaciones/cálculos del texto.',
});

// 16
push({
  question:
    "Según el art. 6.b), si el auxilio por defunción se satisface a una persona distinta de los familiares del art. 5.1, ¿qué regla de cuantía se aplica?",
  options: [
    "Se abona el importe de los gastos del sepelio, sin rebasar la cantidad del apartado a).",
    "Se abona siempre una cuantía fija de cinco mil pesetas, aunque no sea familiar.",
    "Se abona el 45% de la base reguladora.",
    "Se abona el 20% de la base reguladora.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 6.b) prevé el abono del "importe de los gastos ocasionados por el sepelio" pero "sin que pueda rebasarse la cantidad" del apartado a). B ignora la regla del art. 6.b), y C y D son porcentajes de pensiones (viudedad/orfandad).',
});

// 17
push({
  question:
    "Conforme al art. 7.1.b), si el causante fallece en activo o en situación asimilada al alta y la muerte no es por accidente de trabajo ni enfermedad profesional, ¿qué período previo de cotización se exige para la pensión de viudedad?",
  options: [
    "Quinientos días dentro de los cinco años anteriores a la fecha del fallecimiento.",
    "Quince años dentro de los últimos treinta años.",
    "Treinta años completos, día a día.",
    "No se exige ningún período previo en ningún caso.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 7.1.b) exige haber completado "quinientos días, dentro de los cinco años anteriores" al fallecimiento, salvo AT/EP. B y C son períodos que no constan en el art. 7.1.b), y D contradice la existencia del requisito.',
});

// 18
push({
  question:
    "Según el art. 7.1.b), ¿qué ocurre con el requisito de 500 días si la muerte deriva de accidente de trabajo o enfermedad profesional?",
  options: [
    "No se exigirá ese requisito.",
    "Se eleva a 15 años.",
    "Se exige igualmente, pero dentro de 10 años.",
    "Se exige solo si el beneficiario tiene hijos a cargo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 7.1.b) dispone que, si la causa es accidente de trabajo o enfermedad profesional, "no se exigirá este requisito". B, C y D no aparecen en el art. 7.1.b).',
});

// 19
push({
  question:
    "Conforme al art. 7.2, ¿en qué caso específico el viudo tendría derecho a la pensión de viudedad según el texto?",
  options: [
    "Si, además de cumplir los requisitos de los apartados a) y b) del art. 7.1, está incapacitado para el trabajo y sostenido económicamente por la esposa.",
    "Siempre que exista matrimonio, con independencia de la incapacidad.",
    "Solo si la muerte es por enfermedad profesional.",
    "Solo si el viudo tiene 40 años o más.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 7.2 condiciona el derecho del viudo a que se encuentre "incapacitado para el trabajo" y "sostenido económicamente por ella", además de los requisitos a) y b). B, C y D añaden o eliminan condiciones que el art. 7.2 no establece.',
});

// 20
push({
  question:
    "Según el art. 8.1, ¿a qué porcentaje de la base reguladora equivale la pensión vitalicia de viudedad en el texto de la Orden?",
  options: [
    "Al 45% de la base reguladora correspondiente al causante.",
    "Al 20% de la base reguladora.",
    "Al 52% de la base reguladora (como regla general en el propio artículo).",
    "Al 70% de la base reguladora en todo caso.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 8.1 dice literalmente que será equivalente al "45 por 100" de la base reguladora. B es el porcentaje de orfandad (art. 17.1), y C y D aparecen solo en NOTAS como referencia de normativa posterior, no como regla del art. 8.1.',
});

// 21
push({
  question:
    "Conforme al art. 9.1.a), en fallecimiento no debido a accidente de trabajo ni enfermedad profesional, ¿cómo se determina la base reguladora si el causante era trabajador en activo o asimilado?",
  options: [
    "Dividiendo por 28 la suma de las bases de cotización de un período ininterrumpido de 24 meses naturales elegido dentro de los 7 años anteriores.",
    "Dividiendo por 12 la suma de las bases de cotización del último año.",
    "Tomando la última nómina íntegra como base reguladora.",
    "Tomando siempre la pensión que hubiera correspondido al causante.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 9.1.a) fija como cociente "dividir por veintiocho" la suma de bases de cotización de "veinticuatro meses"; y permite elegir el período dentro de los "siete años" anteriores. B, C y D no se ajustan a esa regla.',
});

// 22
push({
  question:
    "Según el art. 9.1.a) (matiz), ¿puede existir dentro del período de 24 meses elegido lapsos sin obligación de cotizar y aun así computarse el período?",
  options: [
    "Sí: el artículo prevé que el período es válido \"aun cuando dentro del mismo existan lapsos\" sin obligación de cotizar.",
    "No: el período debe ser continuo y sin ningún lapso sin cotización.",
    "Solo si el lapso es inferior a 15 días.",
    "Solo si la muerte fue por accidente de trabajo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 9.1.a) dice que el período de 24 meses se aplica "aun cuando dentro del mismo existan lapsos en los que no haya habido obligación de cotizar". B, C y D introducen restricciones no mencionadas.',
});

// 23
push({
  question:
    "De acuerdo con el art. 9.1.b), si el causante fuese pensionista de jubilación o incapacidad permanente, ¿qué se toma como base reguladora y qué se excluye expresamente?",
  options: [
    "El importe de su pensión, excluyendo el incremento del 50% concedido a grandes inválidos.",
    "La suma de bases de cotización de 24 meses dividida por 28.",
    "Las retribuciones efectivamente percibidas en el mes anterior.",
    "Siempre el 70% de la base reguladora por cargas familiares.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 9.1.b) indica que la base reguladora será "el importe de su pensión" y que "no se compute" el incremento del "50 por 100" a grandes inválidos. B y C corresponden a otros supuestos del art. 9, y D es una referencia de NOTA de otra normativa.',
});

// 24
push({
  question:
    "Según el art. 10, ¿con qué es compatible la pensión de viudedad en el texto?",
  options: [
    "Con cualquier renta de trabajo de la viuda y con la pensión de jubilación o incapacidad permanente a que pueda tener derecho.",
    "Es incompatible con toda renta de trabajo.",
    "Solo es compatible con rentas del capital, no con trabajo.",
    "Es incompatible con la pensión de jubilación en todo caso.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 10 establece que la pensión de viudedad será compatible "con cualquier renta de trabajo" y "con la pensión de jubilación o incapacidad permanente". B, C y D contradicen el art. 10.',
});

// 25
push({
  question:
    "Conforme al art. 11.1, ¿cuál es la causa general de extinción de la pensión de viudedad y qué excepción relevante se contempla?",
  options: [
    "Se extingue por contraer nuevo matrimonio; no obstante, puede mantenerse si concurren determinados requisitos del propio art. 11.1.",
    "Se extingue automáticamente al cumplir 61 años.",
    "Se extingue por convivencia habitual con el causante.",
    "Se extingue por ser compatible con rentas de trabajo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 11.1 indica que se extingue por "contraer nuevo matrimonio" pero añade que "podrán mantener el percibo" si concurren requisitos (a), b) y c)). B, C y D no son causas de extinción del art. 11.',
});

// 26
push({
  question:
    "Según el art. 11.1.b), ¿cuándo se entiende que la pensión de viudedad constituye la principal fuente de rendimientos?",
  options: [
    "Cuando el importe anual de la pensión represente, como mínimo, el 75% del total de ingresos del pensionista, en cómputo anual.",
    "Cuando represente al menos el 50% de los ingresos.",
    "Cuando represente al menos el 90% de los ingresos.",
    "Cuando sea inferior al salario mínimo interprofesional.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 11.1.b) fija el umbral: "como mínimo, el 75 por 100 del total de ingresos". B y C alteran el porcentaje y D no es el criterio de principal fuente.',
});

// 27
push({
  question:
    "Conforme al art. 11.1.b), para el cómputo del 75% de ingresos, ¿qué se considera comprendido en la cuantía de la pensión?",
  options: [
    "El complemento por mínimos que, en su caso, pudiera corresponder.",
    "Solo la parte contributiva, excluyendo siempre complementos.",
    "Únicamente las pagas extraordinarias.",
    "Las indemnizaciones por accidente de trabajo.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 11.1.b) indica que, para el porcentaje, "se considerará comprendida... el complemento por mínimos". B lo excluye, y C y D no responden al criterio del art. 11.1.b).',
});

// 28
push({
  question:
    "Según el art. 11.1.c), ¿qué límite de ingresos se exige para mantener la pensión pese a contraer matrimonio?",
  options: [
    "Que el matrimonio tenga ingresos anuales, incluida la pensión, que no superen 2 veces el SMI en cómputo anual.",
    "Que el matrimonio no tenga ingresos de ningún tipo.",
    "Que los ingresos no superen 3 veces el SMI.",
    "Que los ingresos no superen el 75% del SMI.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 11.1.c) exige que los ingresos del matrimonio "no superen 2 veces" el SMI en cómputo anual, incluyendo la pensión. B, C y D no coinciden con el umbral del art. 11.1.c).',
});

// 29
push({
  question:
    "Conforme al art. 11.1 (párrafos finales), si existen varias pensiones de viudedad y procede minoración para no superar el límite, ¿cómo se realiza dicha minoración?",
  options: [
    "Proporcionalmente a la relación entre cada pensión y la suma total de todas ellas.",
    "A partes iguales, con independencia de su cuantía.",
    "Solo se minorará la pensión de mayor cuantía.",
    "No cabe minoración: se extinguen todas.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 11.1 indica que, si hay más de una pensión, la minoración se llevará a cabo "proporcionalmente" a la relación entre cada pensión y la suma total. B, C y D contradicen el mecanismo descrito.',
});

// 30
push({
  question:
    "Según el art. 11.1 (último párrafo), ¿qué regla se fija sobre una nueva pensión de viudedad que pudiera generarse por fallecimiento del nuevo cónyuge?",
  options: [
    "Será incompatible con la pensión o pensiones de viudedad que se venían percibiendo, debiendo optar por una de ellas.",
    "Se acumula siempre con la anterior sin límite.",
    "Solo es compatible si la suma no supera el 75% de ingresos.",
    "Se convierte automáticamente en subsidio temporal.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 11.1 señala que la nueva pensión "será incompatible" con la(s) previa(s) y que el interesado debe "optar por una de ellas". B, C y D no figuran en el art. 11.1.',
});

// 31
push({
  question:
    "Conforme al art. 11.2, ¿qué causa de extinción se vincula a una resolución judicial?",
  options: [
    "La declaración, en sentencia firme, de culpabilidad en la muerte del causante.",
    "La falta de convivencia habitual.",
    "La no inscripción como demandante de empleo.",
    "La existencia de pluriempleo del causante.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 11.2 recoge como causa de extinción la "declaración, en sentencia firme, de culpabilidad en la muerte del causante". B, C y D no son causas del art. 11.',
});

// 32
push({
  question:
    "Según el art. 11.4, ¿qué efecto general tiene constituir una pareja de hecho sobre la pensión de viudedad, y qué excepción se contempla?",
  options: [
    "La extingue; no obstante, no se extingue si se dan los mismos supuestos que los del art. 11.1 para mantenerla en caso de matrimonio.",
    "No tiene ningún efecto en ningún caso.",
    "La transforma automáticamente en subsidio temporal.",
    "Solo la extingue si hay hijos con derecho a orfandad.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 11.4 indica "Constituir una pareja de hecho" como causa, pero añade que "No obstante, no se extinguirá" si se dan los mismos supuestos del apartado 1. B, C y D no corresponden al art. 11.4.',
});

// 33
push({
  question:
    "Conforme al art. 17.1, ¿cuál es la cuantía de la pensión de orfandad para cada huérfano?",
  options: [
    "El 20% de la base reguladora del causante, calculada según el art. 9, con un mínimo de 250 pesetas mensuales.",
    "El 45% de la base reguladora, sin mínimo.",
    "Una cuantía fija de cinco mil pesetas mensuales.",
    "El 60% de la base reguladora en todo caso.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 17.1 establece que será "equivalente al 20 por 100" de la base reguladora (calculada como en viudedad, art. 9) y "no... inferior a 250 pesetas mensuales". B, C y D contradicen el art. 17.1.',
});

// 34
push({
  question:
    "Según el art. 17.2, ¿cuándo se incrementa el porcentaje de la pensión de orfandad con el señalado para viudedad y cómo se reparte?",
  options: [
    "Cuando no quede cónyuge sobreviviente o cuando el cónyuge con derecho a viudedad fallezca estando en el disfrute; el incremento se distribuye entre los huérfanos por partes iguales.",
    "Siempre que exista cónyuge sobreviviente, y se reparte solo al huérfano mayor.",
    "Solo cuando la muerte sea por accidente de trabajo, y se reparte proporcionalmente a las bases.",
    "Solo cuando el huérfano sea hijo póstumo, y se reparte a la mitad.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 17.2 prevé el incremento cuando "no quede cónyuge sobreviviente" o cuando éste "falleciese estando en el disfrute", y ordena que "se distribuirá entre todos" por partes iguales. B, C y D no son las condiciones del art. 17.2.',
});

// 35
push({
  question:
    "Conforme al art. 17.3, en concurrencia de pensiones de orfandad causadas por padre y madre en los mismos beneficiarios, ¿qué regla se establece?",
  options: [
    "Son compatibles entre sí.",
    "Son incompatibles y debe optarse por una.",
    "Solo es compatible la de mayor cuantía.",
    "Solo son compatibles si el causante falleció por enfermedad profesional.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 17.3 afirma: "dichas pensiones serán compatibles entre sí". B, C y D introducen incompatibilidades o condiciones no previstas.',
});

// 36
push({
  question:
    "Según el art. 18.1, ¿qué límite general se fija para la suma de pensiones de viudedad y orfandad?",
  options: [
    "No puede exceder de la cuantía de la base reguladora sobre la que se hayan determinado.",
    "No puede exceder de 2 veces el SMI.",
    "No puede exceder de 6 mensualidades de la base reguladora.",
    "No existe límite si hay varios beneficiarios.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 18.1 establece que la suma "no podrá exceder" de la base reguladora utilizada. B, C y D no están en el art. 18.1.',
});

// 37
push({
  question:
    "Conforme al art. 18.2, si al aplicar el límite del art. 18.1 se extingue el derecho de un beneficiario, ¿qué debe hacerse con las cuantías de los restantes?",
  options: [
    "Recalcular nuevamente las cuantías de los restantes hasta que la suma alcance el límite.",
    "Mantener las cuantías sin cambios.",
    "Extinguir también las pensiones de los restantes.",
    "Convertir automáticamente las pensiones en subsidios temporales.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 18.2 dispone que, al producirse extinción de cualquiera de los beneficiarios tras aplicar el límite, "se volverán a calcular nuevamente las cuantías" de los restantes hasta alcanzar el límite. B, C y D no se ajustan al art. 18.2.',
});

// 38
push({
  question:
    "Según el art. 21.1, ¿cuál de las siguientes es una causa de extinción de la pensión de orfandad que afecta al beneficiario?",
  options: [
    "Contraer matrimonio, salvo que estuviera afectado por incapacidad en los grados señalados.",
    "Percibir rentas de trabajo en cualquier cuantía.",
    "Ser nieto del causante.",
    "Haber convivido con el causante al menos dos años.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 21.1.d) recoge "Contraer matrimonio" como causa, con la salvedad de incapacidad del párrafo a). B no figura en el art. 21.1, y C y D son elementos de otros artículos (art. 22.1).',
});

// 39
push({
  question:
    "Conforme al art. 21.2, si la pensión de orfandad se extingue por causas de los apartados a), b), c) o d) y no se han devengado 12 mensualidades, ¿qué regla se aplica?",
  options: [
    "Se entrega de una sola vez la cantidad precisa para completarlas.",
    "Se pierde definitivamente el derecho a cualquier importe pendiente.",
    "Se convierte automáticamente en auxilio por defunción.",
    "Se abona solo la mitad de lo que falte hasta 12 mensualidades.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 21.2 establece que, si al extinguirse por causas a)-d) no ha devengado 12 mensualidades, "le será entregada de una sola vez" la cantidad para completarlas. B, C y D contradicen esa previsión.',
});

// 40
push({
  question:
    "Según el art. 29.2.b), en muerte por accidente de trabajo o enfermedad profesional sin viuda/viudo con derecho a la indemnización especial, ¿qué cuantía corresponde a los huérfanos beneficiarios?",
  options: [
    "Una mensualidad de la base reguladora para cada huérfano, más la cantidad resultante de distribuir entre ellos el importe de seis mensualidades de la base reguladora.",
    "Solo una mensualidad de la base reguladora para cada huérfano.",
    "Seis mensualidades de la base reguladora para cada huérfano.",
    "Una cuantía fija de cinco mil pesetas para cada huérfano.",
  ],
  correctAnswer: "A",
  explanation:
    'El art. 29.2.b) establece "la misma cantidad" del apartado a) (una mensualidad por huérfano) "más" lo que resulte de distribuir "seis mensualidades" entre los huérfanos cuando no exista viuda/viudo con derecho. B omite el reparto adicional; C y D no se corresponden con el art. 29.2.',
});

// ---------------------------------------------------------------------------
// Build, shuffle deterministically, balance answers, validate, write
// ---------------------------------------------------------------------------

if (questions.length !== 40) {
  throw new Error(`Internal error: expected 40 pushes, got ${questions.length}`);
}

const seed = hashStringToUInt32(`2026-02-02|${outPath}|tema11-muerte-supervivencia-1`);
const rand = mulberry32(seed);

shuffleInPlace(questions, rand);
const { rekeyed, seq } = applyBalancedAnswerKey(questions, rand);

const payload = { questions: rekeyed.map((q) => ({
  question: q.question,
  options: q.options,
  correctAnswer: q.correctAnswer,
  explanation: q.explanation,
  difficulty: q.difficulty,
})) };

const { dist, seqStart } = validateQuestions(payload.questions);

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");
console.log(`OK ${outPath} count=${payload.questions.length} dist=${JSON.stringify(dist)} seqStart=${seqStart}`);

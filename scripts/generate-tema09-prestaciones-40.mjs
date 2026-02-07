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
    if (!(q.explanation.includes('"') || q.explanation.includes("\"")))
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

// ---------------------------------------------------------------------------
// TEMA 09 - Nacimiento y cuidado de menor. Categoría: ESPECÍFICO.
// ÚNICA FUENTE: texto pegado (RD 295/2009: arts. 8, 12, 31-39; RD 1148/2011: arts. 1-9 + anexo).
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
    "Desde la fecha de alta hospitalaria del menor.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.1 establece que se tendrá derecho "a partir del mismo día en que dé comienzo el periodo de descanso correspondiente". B, C y D introducen reglas (día siguiente, retroactividad de 3 meses, alta hospitalaria) que no aparecen en el art. 8.1.',
});

// 2
push({
  question:
    "Conforme al art. 8.2 del RD 295/2009, cuando el subsidio por maternidad sea compartido, ¿cómo se abona a cada beneficiario?",
  options: [
    "Se abona íntegramente a la madre, aunque el descanso lo disfrute el otro progenitor.",
    "Se abona a cada beneficiario durante la parte de los periodos de descanso efectivamente disfrutados por cada uno.",
    "Se abona siempre de forma simultánea, no pudiendo ser sucesivo.",
    "Se abona siempre de forma sucesiva, no pudiendo ser simultáneo.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 8.2 indica: "se abonará a cada beneficiario durante la parte de los periodos de descanso (...) que hayan sido disfrutados efectivamente" y añade que la percepción podrá ser "simultánea o sucesiva". A contradice el reparto; C y D contradicen la posibilidad de simultaneidad o sucesividad.',
});

// 3
push({
  question:
    "Según el art. 8.3 del RD 295/2009, ¿cuál es la duración general del subsidio por maternidad?",
  options: [
    "Dieciséis semanas ininterrumpidas.",
    "Catorce semanas, ampliables por hospitalización hasta trece.",
    "Veinte semanas ininterrumpidas.",
    "Dieciocho semanas, ampliables por discapacidad del hijo a dos semanas.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.3 dice: "Con carácter general, el subsidio por maternidad tendrá una duración de dieciséis semanas ininterrumpidas". B, C y D cambian la duración general o mezclan ampliaciones como si fueran la regla general.',
});

// 4
push({
  question:
    "Conforme al art. 8.3 del RD 295/2009, en casos de parto, adopción o acogimiento múltiples, ¿cómo se amplía la duración del subsidio por maternidad?",
  options: [
    "Se amplía en una semana por cada hijo o menor desde el primero.",
    "Se amplía en dos semanas por cada hijo o menor a partir del segundo.",
    "Se amplía en dos semanas por cada hijo o menor a partir del primero.",
    "Se amplía en trece semanas por cada hijo o menor a partir del segundo.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 8.3 establece que, en casos de parto/adopción/acogimiento múltiples, "se ampliará en dos semanas por cada hijo o menor a partir del segundo". A y C alteran el criterio; D confunde con el máximo de ampliación por hospitalización.',
});

// 5
push({
  question:
    "Según el art. 8.3 del RD 295/2009, ¿qué ampliación se prevé en el supuesto de discapacidad del hijo?",
  options: [
    "Una ampliación de trece semanas.",
    "Una ampliación de dos semanas adicionales.",
    "Una ampliación de cuatro semanas adicionales.",
    "No se prevé ampliación alguna.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 8.3 señala: "en el supuesto de discapacidad del hijo se ampliará la duración del subsidio en dos semanas adicionales". A corresponde a otro supuesto; C y D no coinciden con el texto.',
});

// RD 1148/2011 - Cuidado de menores afectados por cáncer u otra enfermedad grave

// =========================
// RD 1148/2011 - Artículos 1–7
// =========================

// 6
push({
  question:
    "Según el art. 1.1 del RD 1148/2011, ¿a qué regímenes resulta de aplicación este real decreto?",
  options: [
    "A todos los regímenes del sistema de la Seguridad Social, sin más particularidades que las expresamente indicadas.",
    "Solo al Régimen General, sin excepciones.",
    "Solo al Régimen Especial de Trabajadores Autónomos.",
    "Solo al personal funcionario incluido en el EBEP.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 1.1 indica que sus disposiciones "serán de aplicación a todos los regímenes del sistema de la Seguridad Social" con las particularidades expresas. B y C restringen indebidamente el ámbito y D contradice el art. 1.2.',
});

// 7
push({
  question:
    "Conforme al art. 1.2 del RD 1148/2011, ¿qué personal queda expresamente fuera del ámbito de aplicación del real decreto y por qué referencia normativa se regirá?",
  options: [
    "El personal funcionario incluido en el ámbito del EBEP, que se regirá por lo previsto en el art. 49.e) de dicha ley y el resto de normas de Función Pública.",
    "Los trabajadores del mar, que se regirán por el Instituto Social de la Marina.",
    "Las personas trabajadoras por cuenta propia, que se regirán por el Estatuto del Trabajo Autónomo.",
    "Las personas trabajadoras a tiempo parcial, que se regirán por convenio colectivo.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 1.2 establece que este real decreto "no será de aplicación al personal funcionario" incluido en el EBEP y que "se regirá por lo previsto en el artículo 49.e)" del EBEP, así como por el resto de normas de Función Pública. B, C y D no figuran como exclusiones del art. 1.2.',
});

// 8
push({
  question:
    "Según el art. 2.1 del RD 1148/2011, ¿qué se considera situación protegida a efectos de la prestación por cuidado de menores afectados por cáncer u otra enfermedad grave?",
  options: [
    "La reducción de la jornada de trabajo (conforme al art. 37.6 ET) llevada a cabo por progenitores/guardadores/acogedores cuando ambas trabajen o en familias monoparentales, para el cuidado del menor afectado por cáncer u otra enfermedad grave del anexo.",
    "El cambio de puesto por embarazo, aunque sea posible.",
    "Cualquier ausencia al trabajo por enfermedad del menor.",
    "Solo la hospitalización del menor, sin necesidad de reducción de jornada.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 2.1 define la situación protegida como la "reducción de la jornada de trabajo" prevista en el art. 37.6 ET realizada para el cuidado del menor afectado por cáncer u otra enfermedad grave del anexo, con los requisitos de que ambas personas trabajen o familia monoparental. B, C y D omiten la reducción de jornada o alteran el supuesto legal.',
});

// 9
push({
  question:
    "Conforme al art. 2.1 del RD 1148/2011, ¿qué condición adicional debe implicar el cáncer o enfermedad grave del menor en relación con el ingreso hospitalario y el cuidado?",
  options: [
    "Debe implicar un ingreso hospitalario de larga duración que requiera cuidado directo, continuo y permanente durante la hospitalización y tratamiento continuado; incluyendo la continuación del tratamiento o cuidado en domicilio tras diagnóstico y hospitalización.",
    "Basta con diagnóstico sin ingreso y sin necesidad de cuidado.",
    "Solo se exige ingreso hospitalario, sin referencia a cuidado directo.",
    "Solo se exige cuidado en domicilio, sin relación con hospitalización.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 2.1 exige que la enfermedad "implique un ingreso hospitalario de larga duración" y requiera cuidado "directo, continuo y permanente" durante hospitalización y tratamiento, y añade que también se considera ingreso de larga duración la "continuación del tratamiento médico o el cuidado del menor en domicilio" tras diagnóstico y hospitalización. B, C y D contradicen/recortan el texto.',
});

// 10
push({
  question:
    "Según el art. 2.3 del RD 1148/2011, ¿hasta qué edad puede mantenerse la prestación económica cuando, alcanzada la mayoría de edad, persista la enfermedad y la necesidad de hospitalización, tratamiento y cuidado?",
  options: [
    "Hasta los 18 años, sin excepciones.",
    "Hasta los 21 años, sin excepciones.",
    "Hasta los 23 años; y hasta los 26 si antes de los 23 acredita además una discapacidad igual o superior al 65%.",
    "Hasta los 26 años en todo caso, sin requisitos adicionales.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 2.3 indica que se mantendrá la prestación "hasta los 23 años" cuando persistan los requisitos, y añade: "hasta que el causante cumpla los 26 años si antes de alcanzar los 23 años acreditara, además, un grado de discapacidad igual o superior al 65 por ciento". A, B y D no se ajustan al texto.',
});

// 11
push({
  question:
    "Conforme al art. 4.1 del RD 1148/2011, ¿qué porcentaje mínimo de reducción de jornada se exige para ser persona beneficiaria del subsidio por cuidado de menores afectados por cáncer u otra enfermedad grave?",
  options: [
    "Al menos un 25% de reducción de jornada.",
    "Al menos un 33% de reducción de jornada.",
    "Al menos un 50% de reducción de jornada.",
    "Una reducción del 100% (cese total).",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 4.1 exige que la persona trabajadora "reduzca su jornada de trabajo en, al menos, un 50 por 100 de su duración". A y B rebajan el mínimo y D introduce una exigencia de cese total que no aparece en el artículo.',
});

// 12
push({
  question:
    "Según el art. 4.3 del RD 1148/2011, si ambas personas progenitoras/guardadoras/acogedoras tuvieran derecho al subsidio, ¿a cuántas de ellas puede reconocerse?",
  options: [
    "A las dos, siempre y de forma simultánea.",
    "Solo a una de ellas, determinada de común acuerdo; a falta de acuerdo, a la que lo solicite en primer lugar.",
    "Solo a la madre, en todo caso.",
    "Solo a quien tenga pluriempleo.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 4.3 dispone que, si ambas personas tienen derecho, "solamente podrá reconocerse a una de ellas", determinada "de común acuerdo"; y añade: "A falta de acuerdo, será persona beneficiaria aquella que lo solicite en primer lugar". A, C y D contradicen o inventan reglas.',
});

// 13
push({
  question:
    "Conforme al art. 5.2.a) del RD 1148/2011, si la persona trabajadora tiene 21 años cumplidos y es menor de 26 en la fecha de inicio de la reducción de jornada, ¿qué periodo mínimo de cotización se exige?",
  options: [
    "90 días cotizados dentro de los 7 años anteriores; o alternativamente 180 días cotizados a lo largo de la vida laboral, con anterioridad.",
    "180 días cotizados dentro de los 7 años anteriores; o 360 a lo largo de la vida laboral.",
    "No se exigen periodos mínimos de cotización.",
    "360 días dentro de los 12 meses anteriores.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 5.2.a) exige "90 días cotizados dentro de los siete años" anteriores, o alternativamente "180 días cotizados a lo largo de su vida laboral" con anterioridad. B corresponde al supuesto de 26 años o más (art. 5.2.b), C solo aplica a menores de 21 (art. 5.1) y D no figura.',
});

// 14
push({
  question:
    "Según el art. 7.1 del RD 1148/2011, ¿desde cuándo se tiene derecho al subsidio por cuidado de menores y qué regla de efectos económicos se aplica si la solicitud se presenta fuera de plazo?",
  options: [
    "Desde el mismo día en que dé comienzo la reducción de jornada; si se solicita fuera de 3 meses, la retroactividad máxima de efectos económicos es de 3 meses.",
    "Desde el día siguiente a la reducción; si se solicita fuera de 1 mes, no hay retroactividad.",
    "Desde la fecha de alta hospitalaria; siempre con retroactividad de 12 meses.",
    "Desde que lo autorice la empresa; sin retroactividad en ningún caso.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 7.1 reconoce el derecho "a partir del mismo día en que dé comienzo la reducción de jornada" si se solicita en el plazo de tres meses; y añade que, transcurrido ese plazo, los efectos económicos tendrán "una retroactividad máxima de tres meses". B, C y D inventan reglas distintas.',
});

// 15
push({
  question:
    "Según el art. 8.8 del RD 295/2009, ¿las situaciones de huelga y cierre patronal impiden el reconocimiento y percepción del subsidio por maternidad?",
  options: [
    "Sí, siempre impiden el reconocimiento.",
    "No, no impedirán el reconocimiento y percepción.",
    "Solo impiden la percepción, pero no el reconocimiento.",
    "Solo impiden el reconocimiento si el cierre patronal es legal.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 8.8 es literal: "Las situaciones de huelga y cierre patronal no impedirán el reconocimiento y percepción". A, C y D contradicen esa frase.',
});

// 16
push({
  question:
    "Conforme al art. 8.9 del RD 295/2009, en partos prematuros o cuando el neonato precise hospitalización a continuación del parto, ¿qué requisito previo se exige para poder interrumpir el permiso y la percepción del subsidio a petición del beneficiario?",
  options: [
    "Que la hospitalización supere siete días.",
    "Que se complete el período de descanso obligatorio para la madre de seis semanas posteriores al parto.",
    "Que exista extinción del contrato de trabajo.",
    "Que el otro progenitor haya ejercido la opción inicial.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 8.9 permite interrumpir "una vez completado el período de descanso obligatorio para la madre de seis semanas posteriores al parto". A se relaciona con la ampliación, no con el requisito para interrumpir; C y D no son requisitos del apartado.',
});

// 17
push({
  question:
    "Según el art. 8.9 del RD 295/2009, ¿desde cuándo puede reanudarse el permiso interrumpido en los supuestos de hospitalización del neonato?",
  options: [
    "Desde la fecha del alta hospitalaria del menor, por el periodo que reste por disfrutar.",
    "Desde la fecha del ingreso hospitalario.",
    "Desde el día siguiente a la solicitud del beneficiario.",
    "Desde que transcurran treinta días naturales desde el parto.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.9 establece que el permiso "se podrá reanudar a partir de la fecha del alta hospitalaria del menor, por el periodo que reste". B, C y D no aparecen como regla de reanudación.',
});

// 18
push({
  question:
    "Conforme al art. 8.9 del RD 295/2009, si durante el periodo de percepción del subsidio por maternidad se extingue el contrato de trabajo del beneficiario o se produce el cese de la actividad, ¿qué ocurre con la percepción del subsidio?",
  options: [
    "Se interrumpe automáticamente.",
    "No se interrumpe la percepción del subsidio.",
    "Se convierte en prestación por desempleo.",
    "Se mantiene solo durante siete días.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 8.9 dice literalmente: "No se interrumpirá la percepción del subsidio por maternidad si durante el periodo de percepción (...) se extingue el contrato (...) o se produce el cese". A, C y D no figuran.',
});

// 19
push({
  question:
    "Según el art. 8.9 del RD 295/2009, en caso de fallecimiento de la madre, ¿puede el otro progenitor interrumpir el disfrute del permiso incluso durante las seis semanas siguientes al parto?",
  options: [
    "No, nunca durante las seis semanas siguientes al parto.",
    "Sí, el otro progenitor podrá interrumpirlo incluso durante las seis semanas siguientes al parto.",
    "Solo si el neonato fue dado de alta.",
    "Solo si hubo cierre patronal.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 8.9 contempla expresamente: "En caso de fallecimiento de la madre, el otro progenitor podrá interrumpir el disfrute (...) incluso durante las seis semanas siguientes al parto". A lo niega; C y D no son condiciones del texto.',
});

// 20
push({
  question:
    "Conforme al art. 8.9 (párrafo sobre ampliación) del RD 295/2009, si la hospitalización del neonato a continuación del parto tiene una duración superior a siete días, ¿cómo se amplía la duración del permiso por maternidad y cuál es el máximo?",
  options: [
    "Se amplía en tantos días como el neonato permanezca hospitalizado, con un máximo de trece semanas adicionales.",
    "Se amplía automáticamente en dos semanas.",
    "Se amplía en tantos días como la hospitalización, sin máximo.",
    "Se amplía solo si no se interrumpió el permiso.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.9 señala que, si la hospitalización dura "superior a siete días", "se ampliará (...) en tantos días" como el neonato permanezca hospitalizado, "con un máximo de trece semanas adicionales". B no coincide; C ignora el máximo; D contradice que la ampliación tiene lugar aun cuando se haya decidido interrumpir.',
});

// 21
push({
  question:
    "Según el art. 8.10 del RD 295/2009, para el personal incluido en el Estatuto Básico del Empleado Público, en supuestos de hospitalización del neonato a continuación del parto, ¿de qué depende la ampliación del permiso de maternidad?",
  options: [
    "Depende de que la hospitalización dure más de siete días.",
    "Depende de la causa de la hospitalización.",
    "Se amplía en tantos días como el neonato se encuentre hospitalizado, con un máximo de trece semanas adicionales, con independencia de la duración mínima y de su causa.",
    "No existe ampliación para personal EBEP.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 8.10 dice que se ampliará "en tantos días" como el neonato esté hospitalizado, "con un máximo de trece semanas adicionales", "con independencia de la duración mínima (...) y de su causa". A y B contradicen esa independencia; D es falso.',
});

// 22
push({
  question:
    "Conforme al art. 8.11 del RD 295/2009, para la ampliación por hospitalización del neonato a continuación del parto, ¿qué internamientos se tienen en cuenta temporalmente?",
  options: [
    "Solo los iniciados el mismo día del parto.",
    "Los internamientos iniciados durante los treinta días naturales siguientes al parto.",
    "Los internamientos iniciados durante los siete días naturales siguientes al parto.",
    "Los internamientos iniciados hasta seis meses después del parto.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 8.11 fija que se tendrán en cuenta los internamientos "iniciados durante los treinta días naturales siguientes al parto". A, C y D no coinciden.',
});

// 23
push({
  question:
    "Según el art. 8.12.a) del RD 295/2009, ¿por qué causa se extingue el derecho al subsidio por maternidad?",
  options: [
    "Por el transcurso de los plazos máximos de duración de los periodos de descanso referidos en el artículo.",
    "Por huelga legal.",
    "Por cierre patronal.",
    "Por el simple cambio de entidad gestora.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.12.a) señala la extinción "por el transcurso de los plazos máximos de duración". B y C están expresamente descartadas en el art. 8.8; D no es causa del art. 8.12.',
});

// 24
push({
  question:
    "Conforme al art. 8.12.b) del RD 295/2009, cuando el periodo de descanso sea disfrutado exclusivamente por uno de los progenitores, ¿qué hecho puede extinguir el derecho al subsidio?",
  options: [
    "La reincorporación voluntaria al trabajo antes del cumplimiento del plazo máximo de duración del periodo de descanso.",
    "La extinción del contrato de trabajo en cualquier momento.",
    "La hospitalización del neonato.",
    "La valoración de discapacidad del 33%.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.12.b) prevé extinción cuando, disfrutado exclusivamente por uno, se produce "reincorporación voluntaria" antes de completar el plazo máximo. B, C y D no figuran como causa específica en ese apartado.',
});

// 25
push({
  question:
    "Según el art. 8.12.c) del RD 295/2009, en el disfrute sucesivo o simultáneo por ambos progenitores, si uno o ambos se reincorporan voluntariamente antes de cumplir los plazos máximos, ¿qué ocurre con la parte que restase?",
  options: [
    "Se pierde y no produce efectos.",
    "Incrementará la duración del subsidio a que tuviera derecho el otro beneficiario, con los matices del propio art. 8.12.c).",
    "Se acumula siempre a las seis semanas obligatorias.",
    "Solo incrementa si el menor estuvo hospitalizado más de siete días.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 8.12.c) indica que "la parte que restase (...) incrementará la duración del subsidio" del otro beneficiario, sin perjuicio de límites y remisiones (párrafos del apartado 4 y art. 9). A, C y D no reflejan la regla general del apartado.',
});

// 26
push({
  question:
    "Conforme al art. 8.12.d) del RD 295/2009, ¿qué causa de extinción se prevé relativa al beneficiario?",
  options: [
    "El fallecimiento del beneficiario, salvo que pueda continuar el progenitor sobreviviente según condiciones establecidas.",
    "El fallecimiento del hijo, siempre.",
    "La hospitalización del neonato.",
    "La existencia de pluriempleo.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.12.d) prevé extinción "por el fallecimiento del beneficiario", con la salvedad de continuación por el progenitor sobreviviente en condiciones establecidas. B no es literal (y el art. 8.4 regula otra consecuencia); C y D no son causas de extinción.',
});

// 27
push({
  question:
    "Según el art. 8.12.e) del RD 295/2009, ¿qué sucede si el beneficiario adquiere la condición de pensionista de jubilación o por incapacidad permanente?",
  options: [
    "El derecho se extingue, sin perjuicio del disfrute del período de descanso restante por el otro progenitor.",
    "Se mantiene íntegramente hasta el máximo sin cambios.",
    "Se suspende durante un mes.",
    "Se traslada automáticamente a la empresa.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 8.12.e) contempla la extinción por adquirir la condición de pensionista de jubilación o IP, "sin perjuicio del disfrute del período de descanso restante por el otro progenitor". B, C y D no están en el texto.',
});

// 28
push({
  question:
    "Conforme al último párrafo del art. 8.12 del RD 295/2009, en los supuestos de reincorporación voluntaria (b) y (c), ¿qué limitación específica se impone a la reincorporación de la madre al trabajo en caso de parto?",
  options: [
    "Puede reincorporarse en cualquier momento.",
    "No cabrá la reincorporación hasta que hayan transcurrido las seis semanas posteriores al parto establecidas como descanso obligatorio.",
    "No cabrá la reincorporación hasta el alta hospitalaria del menor.",
    "No cabrá la reincorporación hasta que el menor cumpla 18 años.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 8.12 (último párrafo) dispone: "no cabrá la reincorporación de la madre al trabajo, en caso de parto, hasta que hayan transcurrido las seis semanas posteriores" establecidas como descanso obligatorio. A contradice el texto; C y D no aparecen en ese precepto.',
});

// =======================
// RD 295/2009 - Artículo 12
// =======================

// 29
push({
  question:
    "Según el art. 12.1 del RD 295/2009, ¿quién gestiona las prestaciones económicas por maternidad y cuál es la excepción?",
  options: [
    "Las gestiona el INSS; excepción: trabajadores del mar, cuya gestión corresponde al Instituto Social de la Marina.",
    "Las gestiona siempre la mutua colaboradora.",
    "Las gestiona la empresa; excepción: artistas, cuyo pago corresponde al INSS.",
    "Las gestiona la Tesorería General; excepción: funcionarios EBEP.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 12.1 establece: "gestionadas directamente por el Instituto Nacional de la Seguridad Social", excepto Régimen Especial del Mar, cuya gestión corresponde al "Instituto Social de la Marina". B, C y D no están en el artículo.',
});

// 30
push({
  question:
    "Conforme al art. 12.2 del RD 295/2009, ¿cómo se realiza el pago del subsidio y qué se excluye expresamente?",
  options: [
    "El pago lo realiza directamente la entidad gestora, sin que quepa fórmula alguna de colaboración en la gestión por parte de las empresas.",
    "El pago lo realiza la empresa en pago delegado.",
    "El pago lo realiza la mutua, siempre.",
    "El pago lo realiza la TGSS mediante transferencia directa a la empresa.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 12.2 dice: "El pago del subsidio será realizado directamente por la entidad gestora" y añade: "sin que quepa fórmula alguna de colaboración (...) por parte de las empresas". B, C y D contradicen esa literalidad.',
});

// 31
push({
  question:
    "Según el art. 12.3 del RD 295/2009, ¿con qué periodicidad se realiza el pago del subsidio y cuándo se abona el subsidio especial en caso de parto múltiple?",
  options: [
    "El subsidio se paga por periodos vencidos; el subsidio especial por parto múltiple se abona en un solo pago al término del periodo de seis semanas posteriores al parto.",
    "El subsidio se paga por anticipado; el subsidio especial se abona mensualmente.",
    "El subsidio se paga semanalmente; el subsidio especial se abona al inicio del descanso.",
    "El subsidio se paga trimestralmente; el subsidio especial se abona a los 30 días del parto.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 12.3: "El pago del subsidio se realizará por periodos vencidos" y el subsidio especial por parto múltiple "será abonado en un solo pago al término del periodo de seis semanas posteriores al parto". B, C y D no figuran.',
});

// =======================
// RD 295/2009 - Arts. 31-39 (Riesgo durante el embarazo)
// =======================

// 32
push({
  question:
    "Conforme al art. 31.1 del RD 295/2009, ¿cuándo se considera 'situación protegida' a efectos de la prestación por riesgo durante el embarazo?",
  options: [
    "Cuando la trabajadora decide voluntariamente cambiar de puesto por razones personales.",
    "Cuando, debiendo cambiar de puesto por otro compatible con su estado (en los términos del art. 26.2 y 3 de la Ley 31/1995), el cambio no sea técnica u objetivamente posible o no pueda razonablemente exigirse por motivos justificados.",
    "Cuando exista cualquier patología del embarazo, aunque no guarde relación con el puesto.",
    "Cuando la empresa acuerde un teletrabajo parcial.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 31.1 define la situación protegida cuando, debiendo cambiar de puesto, "dicho cambio de puesto no resulte técnica u objetivamente posible o no pueda razonablemente exigirse por motivos justificados". A, C y D no encajan con la definición del artículo.',
});

// 33
push({
  question:
    "Según el art. 31.2 del RD 295/2009, ¿qué NO se considera situación protegida por riesgo durante el embarazo?",
  options: [
    "La derivada de riesgos o patologías que puedan influir negativamente en la salud de la trabajadora o del feto cuando NO esté relacionada con agentes, procedimientos o condiciones de trabajo del puesto desempeñado.",
    "La que se produce cuando el cambio de puesto no es posible.",
    "La que afecta a una funcionaria integrada en el Régimen General en el ámbito EBEP.",
    "La que exige un informe del Servicio Público de Salud.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 31.2 excluye expresamente la situación derivada de riesgos/patologías "cuando no esté relacionada con agentes, procedimientos o condiciones de trabajo". B es parte de la definición del 31.1; C está contemplado en el 31.1 (párrafo segundo); D es un elemento procedimental (art. 39), no una categoría de exclusión del 31.2.',
});

// 34
push({
  question:
    "Conforme al art. 32.1 del RD 295/2009, ¿quiénes son beneficiarias del subsidio por riesgo durante el embarazo en términos generales?",
  options: [
    "Las trabajadoras por cuenta ajena en suspensión del contrato por riesgo durante el embarazo, afiliadas y en alta en la fecha de inicio de dicha suspensión.",
    "Cualquier trabajadora embarazada, aunque no esté afiliada ni en alta.",
    "Solo trabajadoras autónomas.",
    "Solo funcionarias EBEP.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 32.1 exige: trabajadoras por cuenta ajena "en situación de suspensión del contrato" y "afiliadas y en alta" en la fecha de inicio. B, C y D no reflejan el tenor literal (además el texto menciona también empleadas de hogar, pero no excluye a cuenta ajena como regla general).',
});

// 35
push({
  question:
    "Según el art. 32.1 del RD 295/2009, ¿qué colectivo se menciona expresamente como beneficiario 'en los mismos términos' dentro del Régimen Especial de Empleados de Hogar?",
  options: [
    "Trabajadoras integradas en el Régimen Especial de Empleados de Hogar que presten servicios para un hogar con carácter exclusivo.",
    "Trabajadoras del mar en cualquier situación.",
    "Trabajadoras artistas.",
    "Cualquier persona cuidadora no profesional.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 32.1 añade: "En los mismos términos" serán beneficiarias las trabajadoras integradas en el Régimen Especial de Empleados de Hogar "que presten sus servicios para un hogar con carácter exclusivo". B, C y D no aparecen en el apartado.',
});

// 36
push({
  question:
    "Conforme al art. 32.3 del RD 295/2009, ¿qué sucede si la empresa incumple sus obligaciones respecto de la trabajadora por cuenta ajena en riesgo durante el embarazo?",
  options: [
    "Pierde el derecho automáticamente.",
    "Se considerará, de pleno derecho, en situación de alta a efectos de obtener el subsidio.",
    "Debe esperar a que la empresa regularice las cuotas.",
    "Solo podrá solicitar desempleo.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 32.3: se considerarán "de pleno derecho, en situación de alta" aunque la empresa hubiera incumplido obligaciones. A, C y D no están en el texto.',
});

// 37
push({
  question:
    "Según el art. 33 del RD 295/2009, ¿en qué consiste la prestación económica por riesgo durante el embarazo?",
  options: [
    "En un subsidio equivalente al 100 por 100 de la base reguladora correspondiente.",
    "En un subsidio equivalente al 75 por 100 de la base mínima.",
    "En una prestación a tanto alzado.",
    "En un pago único al término de seis semanas.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 33 dice: "consistirá en un subsidio equivalente al 100 por 100 de la base reguladora". B se refiere a otro supuesto (formación, art. 34.5); C y D no están en el art. 33.',
});

// 38
push({
  question:
    "Conforme al art. 34.1 del RD 295/2009, ¿a qué base reguladora se equipara, como regla, la base reguladora del subsidio por riesgo durante el embarazo?",
  options: [
    "A la establecida para la prestación por incapacidad temporal derivada de contingencias profesionales o, si el régimen no cubre profesionales, a la IT por contingencias comunes.",
    "A la base mínima de cotización vigente.",
    "A la base máxima de cotización vigente.",
    "A la media de bases de los últimos doce meses en todo caso.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 34.1 señala que la base reguladora "será equivalente a la que esté establecida para la prestación por incapacidad temporal, derivada de contingencias profesionales" o, si el régimen no contempla esa cobertura, equivalente a la de IT por contingencias comunes. B y C no se establecen como regla en el artículo y D introduce un promedio anual que el precepto no menciona.',
});

// 39
push({
  question:
    "Según el art. 34.2.a) del RD 295/2009, en pluriempleo, si la suspensión por riesgo durante el embarazo se declara en todas las actividades simultáneas, ¿qué bases se computan para la base reguladora?",
  options: [
    "Solo la base de cotización de la actividad principal.",
    "Todas las bases de cotización en las distintas empresas, aplicando el tope máximo a efectos de cotización.",
    "La media anual dividida por 365.",
    "Solo la base mínima del régimen.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 34.2.a) indica que se computarán "todas sus bases de cotización en las distintas empresas", aplicando el "tope máximo". A, C y D no se ajustan.',
});

// 40
push({
  question:
    "Conforme al art. 39.5 del RD 295/2009, ¿en qué plazo debe dictarse y notificarse la resolución sobre el reconocimiento del subsidio por riesgo durante el embarazo?",
  options: [
    "En el plazo de quince días desde la solicitud.",
    "En el plazo de treinta días desde la recepción de la solicitud.",
    "En el plazo de tres meses desde el inicio del embarazo.",
    "No hay plazo, depende de la inspección.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 39.5 establece que se notificará "en el plazo de treinta días, contados desde la recepción de la solicitud". A (15 días) es el plazo del informe de ITSS del 39.6; C y D no figuran.',
});

// NOTE: El texto pegado contiene mucho más (RD 1148/2011, más artículos del RD 295/2009),
// pero este fichero se limita estrictamente a 40 preguntas de máxima calidad.

// ---------------------------------------------------------------------------
// Ajuste final: barajar para evitar patrones de respuesta, manteniendo validaciones.
// ---------------------------------------------------------------------------

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

  // Try multiple times to build a balanced, non-periodic answer-key without >2 runs.
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

const seed =
  hashStringToUInt32(outPath) ^
  hashStringToUInt32("tema09-prestaciones") ^
  hashStringToUInt32(new Date().toISOString().slice(0, 10));
const rand = mulberry32(seed);

const balancedQuestions = applyBalancedAnswerKey(questions, mulberry32(seed ^ 0x9e3779b9));

let attempts = 0;
let best = null;

while (attempts < 2000) {
  attempts += 1;
  const shuffled = balancedQuestions.map((q) => ({ ...q }));
  shuffleInPlace(shuffled, rand);
  try {
    const { dist, seqStart } = validateQuestions(shuffled);
    best = { shuffled, dist, seqStart };
    break;
  } catch {
    // keep trying
  }
}

if (!best) {
  throw new Error("Could not satisfy answer-distribution constraints after shuffling attempts.");
}

const payload = { questions: best.shuffled };
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");

console.log(
  `OK ${outPath} count=${payload.questions.length} dist=${JSON.stringify(best.dist)} seqStart=${best.seqStart}`
);

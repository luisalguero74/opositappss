import fs from "node:fs";

const outPath = "TEMA 08_ESPECÍFICO_INCAPACIDAD_PERMANENTES_LESIONES_INCAPACITANTES.JSON";

const questions = [];
const push = (q) => questions.push({ ...q, difficulty: "hard" });

const letters = ["A", "B", "C", "D"];

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
  // Reject simple short-period cycles (e.g., ABCD repeated) and strict alternation.
  for (let p = 1; p <= 8; p++) {
    if (seq.length >= p * 4 && isPeriodic(seq, p)) return true;
  }
  return false;
}

// NOTA: Basado EXCLUSIVAMENTE en el texto legal pegado (LGSS RDL 8/2015: arts. 169-176, 193-200, 201-203).

// -----------------------
// Incapacidad temporal (169-176)
// -----------------------

// 1
push({
  question:
    "Según el art. 169.1.a) de la LGSS (RDL 8/2015), ¿cuál es la duración máxima de la incapacidad temporal por enfermedad/accidente (con asistencia sanitaria y estando impedido para el trabajo) y cuál es su posible prórroga?",
  options: [
    "Máxima de 365 días, prorrogables por 180 días cuando se presuma alta médica por curación.",
    "Máxima de 180 días, prorrogables por 365 días.",
    "Máxima de 545 días sin prórrogas.",
    "Máxima de 730 días, prorrogables por 90 días.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 169.1.a) fija "duración máxima de trescientos sesenta y cinco días, prorrogables por otros ciento ochenta días" si se presume alta por curación. B, C y D no coinciden con el texto.',
});

// 2
push({
  question:
    "Conforme al art. 169.1.a) (párrafo 2.º) de la LGSS (RDL 8/2015), ¿qué dos requisitos se exigen para la situación especial de IT por menstruación incapacitante secundaria?",
  options: [
    "Que derive de accidente de trabajo y exista propuesta de incapacidad permanente.",
    "Que reciba asistencia sanitaria por el Servicio Público de Salud y esté impedida para el trabajo.",
    "Que exista hospitalización y diagnóstico definitivo.",
    "Que se haya superado el período máximo de 365 días.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 169.1.a) (párrafo segundo) exige que, en estas situaciones especiales, la mujer "reciba asistencia sanitaria por el Servicio Público de Salud y esté impedida para el trabajo". A, C y D no figuran como requisitos en el texto.',
});

// 3
push({
  question:
    "Según el art. 169.1.a) (párrafo 2.º) de la LGSS (RDL 8/2015), ¿qué calificación tiene la IT por interrupción del embarazo cuando dicha interrupción es debida a accidente de trabajo o enfermedad profesional?",
  options: [
    "Siempre contingencias comunes.",
    "Siempre enfermedad común.",
    "Tendrá la consideración de IT por contingencias profesionales.",
    "No es una situación protegida de IT.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 169.1.a) indica que, "sin perjuicio" de los supuestos en que la interrupción del embarazo sea debida a AT o EP, "tendrá la consideración de situación de incapacidad temporal por contingencias profesionales". A, B y D contradicen el texto.',
});

// 4
push({
  question:
    "Conforme al art. 169.1.a) (párrafo 3.º) de la LGSS (RDL 8/2015), ¿desde cuándo se considera situación especial de IT por contingencias comunes la gestación de la mujer trabajadora?",
  options: [
    "Desde el día primero de la semana vigésima.",
    "Desde el día del parto.",
    "Desde el día primero de la semana trigésima octava.",
    "Desde el día primero de la semana trigésima novena.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 169.1.a) (párrafo tercero) establece: "desde el día primero de la semana trigésima novena". A, B y C no coinciden con la literalidad.',
});

// 5
push({
  question:
    "Según el art. 169.1.a) (párrafo 4.º) de la LGSS (RDL 8/2015), ¿qué incluye la situación especial de IT por contingencias comunes del donante de órganos o tejidos para trasplante?",
  options: [
    "Incluye días discontinuos o ininterrumpidos de preparación médica y los transcurridos desde el ingreso hospitalario hasta el alta por curación.",
    "Incluye solo los días de ingreso hospitalario, excluyendo preparación previa.",
    "Incluye únicamente el día de la cirugía.",
    "Incluye todo el proceso hasta 545 días, automáticamente.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 169.1.a) (párrafo cuarto) dice que comprende "tanto los días discontinuos como ininterrumpidos" de preparación, y los transcurridos "desde el día del ingreso hospitalario (...) hasta que sea dado de alta por curación". B, C y D recortan o añaden elementos no previstos.',
});

// 6
push({
  question:
    "Conforme al art. 169.1.b) de la LGSS (RDL 8/2015), ¿cuál es la duración máxima del período de observación por enfermedad profesional cuando se prescriba la baja, y su posible prórroga?",
  options: [
    "Máximo 365 días, prorrogables por 180.",
    "Máximo 180 días, prorrogables por otros 180 cuando se estime necesario para estudio y diagnóstico.",
    "Máximo 90 días, prorrogables por 90.",
    "Máximo 545 días, sin prórroga.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 169.1.b) fija "duración máxima de ciento ochenta días, prorrogables por otros ciento ochenta días" cuando sea necesario para estudio y diagnóstico. A, C y D no corresponden.',
});

// 7
push({
  question:
    "Según el art. 169.2 de la LGSS (RDL 8/2015), para el cómputo del período máximo de IT y su prórroga, ¿qué períodos deben computarse expresamente?",
  options: [
    "Solo los períodos de observación.",
    "Solo los períodos de recaída.",
    "Los períodos de recaída y de observación.",
    "Ninguno: el cómputo se reinicia con cada baja.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 169.2 indica: "se computarán los períodos de recaída y de observación". A y B son parciales; D contradice el texto.',
});

// 8
push({
  question:
    "Conforme al art. 169.2 (párrafo 2.º) de la LGSS (RDL 8/2015), ¿cuándo se considera que existe recaída en un mismo proceso?",
  options: [
    "Cuando haya nueva baja por cualquier patología, en cualquier plazo.",
    "Cuando la nueva baja sea por la misma patología dentro de 365 días.",
    "Cuando haya nueva baja por patología distinta dentro de 180 días.",
    "Cuando se produzca nueva baja por la misma o similar patología dentro de los 180 días naturales siguientes a la fecha de efectos del alta médica anterior.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 169.2 define recaída cuando hay nueva baja por "la misma o similar patología" dentro de "los ciento ochenta días naturales" siguientes a la fecha de efectos del alta. A, B y C no se ajustan.',
});

// 9
push({
  question:
    "Según el art. 169.2 (última frase del párrafo sobre recaída) de la LGSS (RDL 8/2015), ¿qué excepción se establece para las bajas por menstruación incapacitante secundaria respecto al cómputo como recaída?",
  options: [
    "Cada proceso se considerará nuevo sin computar a efectos del período máximo de IT y su prórroga.",
    "Siempre computan como recaída aunque pasen más de 180 días.",
    "Se consideran recaída solo si hay informe del INSS.",
    "Se excluyen totalmente del concepto de IT.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 169.2 precisa que, en bajas por "menstruación incapacitante secundaria", "cada proceso se considerará nuevo sin computar" a efectos del período máximo y prórroga. B, C y D no están en el texto.',
});

// 10
push({
  question:
    "Conforme al art. 170.1 de la LGSS (RDL 8/2015), hasta el cumplimiento de 365 días de IT, ¿qué competencia específica puede ejercer el INSS, a través de su inspección médica, a todos los efectos?",
  options: [
    "Emitir partes de confirmación del servicio público de salud.",
    "Emitir un alta médica a todos los efectos.",
    "Reconocer directamente la pensión de incapacidad permanente.",
    "Sustituir la base reguladora del subsidio.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 170.1 establece que el INSS ejercerá las mismas competencias para "emitir un alta médica a todos los efectos". A, C y D no se atribuyen en ese apartado.',
});

// 11
push({
  question:
    "Según el art. 170.1 (párrafo 2.º) de la LGSS (RDL 8/2015), si el alta fue expedida por el INSS, ¿quién es el único competente para emitir una nueva baja por la misma o similar patología dentro de los 180 días siguientes?",
  options: [
    "El servicio público de salud.",
    "La mutua colaboradora.",
    "El INSS, a través de su inspección médica.",
    "La empresa colaboradora.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 170.1 dice: "Cuando el alta haya sido expedida por el INSS, este será el único competente (...) para emitir una nueva baja (...) en los ciento ochenta días". A, B y D contradicen la competencia exclusiva.',
});

// 12
push({
  question:
    "Conforme al art. 170.2 de la LGSS (RDL 8/2015), una vez agotados los 365 días, ¿cuál es el catálogo de altas que puede emitir la inspección médica del INSS como única competente?",
  options: [
    "Solo alta por curación.",
    "Solo alta por mejoría que permita reincorporación.",
    "Solo alta con propuesta de incapacidad permanente.",
    "Alta por curación, por mejoría que permita reincorporación, con propuesta de incapacidad permanente o por incomparecencia injustificada a reconocimientos convocados.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 170.2 enumera expresamente esas modalidades: "por curación", "por mejoría (...)", "con propuesta de incapacidad permanente" o "por incomparecencia injustificada". A, B y C son incompletas.',
});

// 13
push({
  question:
    "Según el art. 170.2 de la LGSS (RDL 8/2015), ¿qué supone la falta de alta médica una vez agotados los 365 días?",
  options: [
    "Que el trabajador se encuentra en prórroga de IT por presumirse alta dentro del período subsiguiente de 180 días.",
    "Que la IT se extingue automáticamente.",
    "Que se inicia automáticamente una jubilación.",
    "Que el pago pasa siempre a la empresa colaboradora.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 170.2 indica: "La falta de alta médica (...) supondrá que el trabajador se encuentra en la situación de prórroga" del art. 169.1.a) por presumirse alta dentro de "ciento ochenta días". B, C y D no se establecen.',
});

// 14
push({
  question:
    "Conforme al art. 170.3 de la LGSS (RDL 8/2015), frente al alta médica emitida por el INSS tras agotar 365 días, ¿en qué plazo máximo puede el interesado manifestar su disconformidad y ante quién?",
  options: [
    "En 7 días naturales ante el INSS.",
    "En 4 días naturales ante la inspección médica del servicio público de salud.",
    "En 11 días naturales ante la empresa.",
    "En 90 días naturales ante el ISM.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 170.3 dispone que el interesado podrá manifestar, "en el plazo máximo de cuatro días naturales", su disconformidad "ante la inspección médica del servicio público de salud". A, C y D no coinciden.',
});

// 15
push({
  question:
    "Según el art. 170.3 de la LGSS (RDL 8/2015), si la inspección médica del servicio público de salud discrepa del alta del INSS, ¿qué plazo máximo tiene para proponer la reconsideración y qué debe especificar?",
  options: [
    "4 días naturales; debe aportar solo el diagnóstico.",
    "11 días naturales; debe aportar pruebas complementarias.",
    "7 días naturales; debe especificar razones y fundamento de su discrepancia.",
    "90 días naturales; debe proponer el grado de incapacidad permanente.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 170.3 establece que la inspección del SPS tendrá la facultad de proponer, "en el plazo máximo de siete días naturales", la reconsideración, "especificando las razones y fundamento". A, B y D no se ajustan.',
});

// 16
push({
  question:
    "Conforme al art. 170.3 de la LGSS (RDL 8/2015), ¿en qué supuesto el alta médica adquiere plenos efectos y qué ocurre durante el período entre la fecha del alta y la de plenos efectos?",
  options: [
    "Siempre adquiere plenos efectos el mismo día; no hay prórroga.",
    "Solo adquiere plenos efectos si el INSS reconsidera; no hay prórroga.",
    "Adquiere plenos efectos cuando el SPS discrepa; durante ese tiempo se suspende la IT.",
    "Adquiere plenos efectos si el SPS confirma el criterio del INSS o si no se pronuncia en 11 días naturales; durante el período intermedio se considera prorrogada la IT.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 170.3 indica que si el SPS confirma o "no se produjera pronunciamiento alguno en los once días naturales" el alta adquiere plenos efectos, y "Durante el período (...) se considerará prorrogada" la IT. A, B y C contradicen el texto.',
});

// 17
push({
  question:
    "Según el art. 171 (párrafo segundo) de la LGSS (RDL 8/2015), ¿qué particularidad se establece para la cuantía del subsidio en la situación especial de IT por donación de órganos o tejidos para trasplante?",
  options: [
    "Subsidio equivalente al 100% de la base reguladora establecida para IT por contingencias comunes.",
    "Subsidio equivalente al 75% de la base reguladora por contingencias profesionales.",
    "Subsidio equivalente al 50% de la base mínima.",
    "No existe prestación económica en este supuesto.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 171 dispone que, en esa situación especial, la prestación consiste en un subsidio equivalente al "cien por ciento de la base reguladora" de IT por contingencias comunes. B y C inventan porcentajes/reglas; D contradice la existencia del subsidio.',
});

// 18
push({
  question:
    "Conforme al art. 172.a) de la LGSS (RDL 8/2015), en caso de enfermedad común, ¿qué período mínimo de cotización se exige para ser beneficiario del subsidio de IT?",
  options: [
    "90 días en los 7 años anteriores.",
    "180 días dentro de los 5 años inmediatamente anteriores al hecho causante.",
    "1800 días en los 10 años anteriores.",
    "15 años, siempre.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 172.a) exige "ciento ochenta días dentro de los cinco años inmediatamente anteriores" al hecho causante para enfermedad común. A es de otro ámbito (art. 178.1); C y D no se corresponden con IT.',
});

// 19
push({
  question:
    "Según el art. 173.1 de la LGSS (RDL 8/2015), en enfermedad común o accidente no laboral, ¿desde cuándo se abona el subsidio y quién lo asume del día 4 al 15 ambos inclusive?",
  options: [
    "Se abona desde el día siguiente; lo asume la entidad gestora desde el día 1.",
    "Se abona desde el día 1; lo asume siempre la mutua.",
    "Se abona a partir del cuarto día; del día 4 al 15 ambos inclusive está a cargo del empresario.",
    "Se abona a partir del día 16; del 16 al 30 está a cargo del empresario.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 173.1 dice que en enfermedad común o accidente no laboral se abona "a partir del cuarto día" y que del día cuarto al decimoquinto "estará a cargo del empresario". A, B y D no coinciden.',
});

// 20
push({
  question:
    "Conforme al art. 174.1 de la LGSS (RDL 8/2015), ¿cuál de las siguientes NO es una causa de extinción del derecho al subsidio de IT enumerada en el precepto?",
  options: [
    "Incomparecencia injustificada a convocatorias para exámenes y reconocimientos.",
    "Reconocimiento de la pensión de jubilación.",
    "Transcurso del plazo máximo de 545 días naturales desde la baja médica.",
    "Rechazo del tratamiento indicado sin causa razonable (como causa de extinción).",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 174.1 enumera causas de extinción (545 días, alta, alta con/sin IP, jubilación, incomparecencia, fallecimiento). El rechazo del tratamiento aparece como causa de suspensión en el art. 175.2, no como extinción en el art. 174.1. A, B y C sí están en el art. 174.1.',
});

// -----------------------
// Incapacidad permanente (193-200)
// -----------------------

// 21
push({
  question:
    "Según el art. 193.1 de la LGSS (RDL 8/2015), ¿qué elemento NO impide por sí solo la calificación de incapacidad permanente contributiva?",
  options: [
    "La posibilidad de recuperación de la capacidad laboral, si se estima médicamente incierta o a largo plazo.",
    "Que las reducciones no sean graves.",
    "Que las reducciones no sean susceptibles de determinación objetiva.",
    "Que las reducciones no sean previsiblemente definitivas.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 193.1 dice: "No obstará" la posibilidad de recuperación si se estima "incierta o a largo plazo". B, C y D sí contradicen requisitos nucleares del propio art. 193.1 (graves, objetivables, previsiblemente definitivas).',
});

// 22
push({
  question:
    "Conforme al art. 194.1 de la LGSS (RDL 8/2015), ¿cuál de estas parejas es un grado real de incapacidad permanente y su denominación exacta?",
  options: [
    "Incapacidad absoluta e invalidez severa.",
    "Gran incapacidad e incapacidad permanente absoluta.",
    "Incapacidad leve e incapacidad moderada.",
    "Incapacidad definitiva e incapacidad totalizada.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 194.1 enumera "incapacidad permanente absoluta" y "gran incapacidad" como grados. A, C y D incluyen denominaciones inexistentes en el artículo.',
});

// 23
push({
  question:
    "Según el art. 195.2 de la LGSS (RDL 8/2015), ¿qué ventana temporal se toma para los 1800 días exigibles en la incapacidad permanente parcial?",
  options: [
    "Los 10 años anteriores al hecho causante de la pensión.",
    "Los 10 años anteriores a la afiliación.",
    "Los 10 años inmediatamente anteriores a la fecha en que se haya extinguido la IT de la que se derive la IP.",
    "Los 5 años anteriores a la baja médica.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 195.2 exige 1800 días "comprendidos en los diez años inmediatamente anteriores" a la fecha en que se haya "extinguido la incapacidad temporal" de la que derive la IP. A, B y D no coinciden.',
});

// 24
push({
  question:
    "Conforme al art. 195.1 de la LGSS (RDL 8/2015), ¿en qué casos no se exige período previo de cotización para tener derecho a prestaciones por incapacidad permanente?",
  options: [
    "Solo en contingencias comunes.",
    "Solo en incapacidad permanente parcial.",
    "Solo si el interesado tiene menos de 31 años.",
    "Si es debida a accidente (sea o no laboral) o a enfermedad profesional.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 195.1 establece que no se exigirá período previo cuando sea "debida a accidente, sea o no laboral, o a enfermedad profesional". A, B y C no recogen el supuesto literal.',
});

// 25
push({
  question:
    "Según el art. 195.4 de la LGSS (RDL 8/2015), ¿qué grados de IP (derivados de contingencias comunes) pueden causarse aunque el interesado no esté en alta o asimilada a la de alta?",
  options: [
    "Absoluta o gran incapacidad.",
    "Parcial.",
    "Total.",
    "Cualquiera de los grados.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 195.4 dispone que las pensiones de IP en grados "absoluta o gran incapacidad" por contingencias comunes "podrán causarse" aunque no haya alta/asimilada. B, C y D no se ajustan.',
});

// 26
push({
  question:
    "Conforme al art. 196.2 (primer párrafo) de la LGSS (RDL 8/2015), ¿qué forma tiene la prestación económica de la incapacidad permanente total y qué límite de edad aparece para su posible sustitución?",
  options: [
    "Cantidad a tanto alzado; sin límite de edad.",
    "Pensión vitalicia; puede sustituirse excepcionalmente por indemnización a tanto alzado cuando el beneficiario fuese menor de 60 años.",
    "Subsidio mensual; puede sustituirse si el beneficiario fuese mayor de 60 años.",
    "Pensión vitalicia; nunca puede sustituirse.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 196.2 dice: "pensión vitalicia" que "podrá excepcionalmente ser sustituida" por indemnización si el beneficiario "fuese menor de sesenta años". A, C y D no reflejan el texto.',
});

// 27
push({
  question:
    "Según el art. 198.2 de la LGSS (RDL 8/2015), ¿qué efecto produce el ejercicio de actividades compatibles por parte de un pensionista de incapacidad permanente absoluta o gran incapacidad respecto a la revisión del grado?",
  options: [
    "Impide cualquier revisión del grado.",
    "Obliga a extinguir automáticamente la pensión.",
    "No impide el ejercicio si son compatibles y no representan un cambio en su capacidad de trabajo a efectos de revisión.",
    "Convierte la pensión en prestación por nacimiento y cuidado.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 198.2 indica que no impiden el ejercicio de actividades compatibles "que no representen un cambio" en la capacidad de trabajo "a efectos de revisión". A, B y D no se contemplan.',
});

// 28
push({
  question:
    "Conforme al art. 200.2 de la LGSS (RDL 8/2015), ¿qué debe constar necesariamente en toda resolución, inicial o de revisión, que reconozca o confirme el derecho a prestaciones de IP?",
  options: [
    "El salario exacto del beneficiario.",
    "La empresa responsable en todo caso.",
    "El diagnóstico completo y las pruebas complementarias.",
    "El plazo a partir del cual se podrá instar la revisión por agravación o mejoría (vinculante), en tanto no se haya cumplido la edad mínima del art. 205.1.a) para jubilación.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 200.2 exige que la resolución haga constar "necesariamente" el "plazo" desde el cual se podrá instar la revisión por agravación o mejoría, y que "será vinculante" mientras no se cumpla la edad mínima del art. 205.1.a). A, B y C no se imponen en ese apartado.',
});

// 29
push({
  question:
    "Según el art. 200.2 (párrafo segundo) de la LGSS (RDL 8/2015), si un pensionista de IP estuviera ejerciendo cualquier trabajo, ¿qué facultad tiene el INSS respecto de la revisión?",
  options: [
    "Puede promover la revisión de oficio o a instancia del interesado, con independencia de que haya transcurrido o no el plazo fijado.",
    "No puede promover revisión hasta que transcurra el plazo fijado en la resolución.",
    "Debe suspender siempre la pensión sin posibilidad de revisión.",
    "Solo puede revisar si hay error de diagnóstico.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 200.2 permite al INSS, si el pensionista trabaja, promover la revisión "de oficio o a instancia" "con independencia" del plazo. B, C y D contradicen o limitan indebidamente.',
});

// 30
push({
  question:
    "Conforme al art. 200.2 (párrafo tercero) de la LGSS (RDL 8/2015), ¿qué régimen temporal se establece para las revisiones fundadas en error de diagnóstico?",
  options: [
    "Solo pueden realizarse dentro de 90 días.",
    "Pueden llevarse a cabo en cualquier momento, en tanto el interesado no haya cumplido la edad del primer párrafo.",
    "Solo pueden realizarse una vez cada 5 años.",
    "Solo pueden realizarse tras 545 días de IT.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 200.2 indica: "Las revisiones fundadas en error de diagnóstico podrán llevarse a cabo en cualquier momento", mientras no se haya cumplido la edad de referencia. A, C y D no aparecen.',
});

// -----------------------
// Lesiones permanentes no incapacitantes (201-203)
// -----------------------

// 31
push({
  question:
    "Según el art. 201 de la LGSS (RDL 8/2015), ¿cuál es el criterio de origen (contingencia) para que unas lesiones permanentes no incapacitantes sean indemnizables por baremo?",
  options: [
    "Deben derivar necesariamente de contingencias comunes.",
    "Deben derivar de cualquier causa, incluso extra laboral.",
    "Deben estar causadas por accidente de trabajo o enfermedad profesional.",
    "Deben derivar de embarazo y parto.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 201 se refiere a lesiones "causadas por accidentes de trabajo o enfermedades profesionales". A, B y D no son el criterio de origen que fija el artículo.',
});

// 32
push({
  question:
    "Conforme al art. 201 de la LGSS (RDL 8/2015), ¿qué característica adicional deben cumplir las lesiones/mutilaciones/deformidades para ser indemnizadas y qué condición formal se exige?",
  options: [
    "Deben ser temporales y no constar en ningún baremo.",
    "Deben constituir siempre incapacidad permanente.",
    "Deben implicar pérdida de ingresos acreditada.",
    "Deben ser de carácter definitivo, suponer disminución o alteración de la integridad física y aparecer recogidas en el baremo anejo.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 201 exige lesiones "de carácter definitivo" que supongan "disminución o alteración de la integridad física" y que "aparezcan recogidas en el baremo". A, B y C no se ajustan.',
});

// 33
push({
  question:
    "Según el art. 201 de la LGSS (RDL 8/2015), ¿cómo se indemnizan estas lesiones permanentes no incapacitantes (forma de pago) y qué precisión añade sobre la continuidad en la empresa?",
  options: [
    "Se indemnizan por una sola vez con cantidades alzadas del baremo, sin perjuicio del derecho del trabajador a continuar al servicio de la empresa.",
    "Se indemnizan mediante pensión vitalicia, extinguiéndose el contrato necesariamente.",
    "Se indemnizan con subsidio temporal trimestral, debiendo el trabajador cesar en el puesto.",
    "Se indemnizan solo si el trabajador renuncia a continuar en la empresa.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 201 dice "por una sola vez" con "cantidades alzadas" y añade "sin perjuicio del derecho del trabajador a continuar al servicio de la empresa". B, C y D contradicen esa literalidad.',
});

// 34
push({
  question:
    "Conforme al art. 202 de la LGSS (RDL 8/2015), además de la condición general del art. 165.1, ¿qué requisito específico se exige para ser beneficiario de indemnizaciones por lesiones permanentes no incapacitantes?",
  options: [
    "Haber agotado 545 días de IT.",
    "Haber sido dado de alta médica.",
    "Haber sido declarado en gran incapacidad.",
    "Tener menos de 60 años.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 202 exige, además de art. 165.1, que los trabajadores "hayan sido dados de alta médica". A, C y D no figuran.',
});

// 35
push({
  question:
    "Según el art. 203 de la LGSS (RDL 8/2015), ¿cuál es la regla de incompatibilidad entre estas indemnizaciones a tanto alzado y las prestaciones económicas de incapacidad permanente, y cuál es la excepción?",
  options: [
    "Son siempre compatibles con la incapacidad permanente.",
    "Son incompatibles incluso si las lesiones son independientes.",
    "Son incompatibles salvo que las lesiones sean totalmente independientes de las consideradas para declarar la IP y su grado.",
    "Solo son incompatibles con la jubilación.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 203 establece incompatibilidad "salvo" cuando las lesiones sean "totalmente independientes" de las tomadas en consideración para declarar la IP y su grado. A, B y D no se ajustan.',
});

// -----------------------
// Extra (IT: extinción/suspensión/demoras) para ampliar cobertura
// -----------------------

// 36
push({
  question:
    "Conforme al art. 174.2 de la LGSS (RDL 8/2015), cuando el derecho al subsidio se extingue por transcurso de 545 días, ¿en qué plazo máximo debe examinarse necesariamente el estado del incapacitado a efectos de calificación de incapacidad permanente?",
  options: [
    "En 11 días naturales.",
    "En 180 días naturales.",
    "En 365 días naturales.",
    "En 90 días naturales.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 174.2 establece que se examinará necesariamente "en el plazo máximo de noventa días naturales". A, B y C no figuran.',
});

// 37
push({
  question:
    "Según el art. 174.2 (párrafo segundo) de la LGSS (RDL 8/2015), si se demora la calificación por expectativa de recuperación, ¿qué límite máximo absoluto se fija para la suma de días de IT y de prolongación de efectos?",
  options: [
    "No se pueden rebasar 730 días naturales, sumados los de IT y los de prolongación de efectos.",
    "No se pueden rebasar 545 días naturales.",
    "No se pueden rebasar 365 días naturales.",
    "No se fija límite máximo.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 174.2 permite demorar, pero "sin que en ningún caso se puedan rebasar los setecientos treinta días naturales sumados" los de IT y prolongación de efectos. B y C son otros hitos; D contradice el límite.',
});

// 38
push({
  question:
    "Conforme al art. 174.2 (párrafo tercero) de la LGSS (RDL 8/2015), durante el período de 90 días y el de demora de calificación, ¿qué ocurre con la obligación de cotizar?",
  options: [
    "Se mantiene íntegramente.",
    "No subsistirá la obligación de cotizar.",
    "Se duplica la obligación de cotizar.",
    "Solo se suspende si hay gran incapacidad.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 174.2 indica: "no subsistirá la obligación de cotizar" durante esos períodos. A, C y D no están en el texto.',
});

// 39
push({
  question:
    "Según el art. 175.1 de la LGSS (RDL 8/2015), ¿cuál de los siguientes supuestos permite denegar, anular o suspender el derecho al subsidio por IT?",
  options: [
    "Que el beneficiario tenga menos de 31 años.",
    "Que exista observación por enfermedad profesional.",
    "Que el beneficiario trabaje por cuenta propia o ajena.",
    "Que la IT derive de contingencias profesionales.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 175.1.b) prevé denegar/anular/suspender "cuando el beneficiario trabaje por cuenta propia o ajena". A, B y D no son causas del art. 175.1.',
});

// 40
push({
  question:
    "Conforme al art. 175.3 de la LGSS (RDL 8/2015), ¿qué efecto produce la incomparecencia del beneficiario a convocatorias realizadas por médicos adscritos al INSS y a las mutuas para examen y reconocimiento médico?",
  options: [
    "Extingue automáticamente el derecho.",
    "No produce ningún efecto.",
    "Obliga a iniciar siempre una incapacidad permanente.",
    "Produce la suspensión cautelar del derecho para comprobar si fue o no justificada.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 175.3 establece que la incomparecencia "producirá la suspensión cautelar del derecho" para comprobar si fue justificada. A confunde con art. 174; B y C no se contemplan.',
});

// Barajar el orden para evitar patrones predecibles en correctAnswer
const baseSeed = hashStringToUInt32(outPath);
let arranged = null;
let arrangedSeq = null;

for (let attempt = 0; attempt < 200; attempt++) {
  const candidate = questions.slice();
  const rand = mulberry32((baseSeed + attempt) >>> 0);
  shuffleInPlace(candidate, rand);
  const seq = candidate.map((q) => q.correctAnswer);
  if (maxRun(seq) > 2) continue;
  if (hasTooPredictablePattern(seq)) continue;
  arranged = candidate;
  arrangedSeq = seq;
  break;
}

if (!arranged) {
  throw new Error("Unable to find a non-predictable ordering that satisfies constraints");
}

const payload = { questions: arranged };
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");

// Validación interna
const parsed = JSON.parse(fs.readFileSync(outPath, "utf8"));
if (!Array.isArray(parsed.questions) || parsed.questions.length !== 40) {
  throw new Error(`Expected 40 questions, got ${parsed.questions?.length}`);
}

const dist = { A: 0, B: 0, C: 0, D: 0 };
for (const [i, q] of parsed.questions.entries()) {
  if (typeof q.question !== "string" || !q.question.trim()) throw new Error(`Empty question at ${i}`);
  if (!Array.isArray(q.options) || q.options.length !== 4) throw new Error(`Bad options at ${i}`);
  if (!(q.correctAnswer in dist)) throw new Error(`Bad correctAnswer at ${i}`);
  if (typeof q.explanation !== "string" || !q.explanation.includes("art.")) throw new Error(`Missing 'art.' in explanation at ${i}`);
  if (q.difficulty !== "hard") throw new Error(`Bad difficulty at ${i}`);

  dist[q.correctAnswer]++;
}

const seq = parsed.questions.map((q) => q.correctAnswer);
if (maxRun(seq) > 2) throw new Error(`Run>2 in final output`);
if (hasTooPredictablePattern(seq)) throw new Error(`Predictable pattern detected in final output`);

console.log("OK", outPath);
console.log("count", parsed.questions.length);
console.log("dist", dist);
console.log("seqStart", arrangedSeq.slice(0, 24).join(""));

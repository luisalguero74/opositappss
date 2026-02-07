import fs from "node:fs";

const outPath = "TEMA 08_ESPECÍFICO_INCAPACIDAD_PERMANENTES_LESIONES_INCAPACITANTES.JSON";

const questions = [];
const push = (q) => questions.push({ ...q, difficulty: "hard" });

const letters = ["A", "B", "C", "D"];
const expect = (n, letter) => {
  const exp = letters[(n - 1) % 4];
  if (exp !== letter) {
    throw new Error(`Answer pattern mismatch at Q${n}: expected ${exp}, got ${letter}`);
  }
};

// Nota: Todas las preguntas se basan EXCLUSIVAMENTE en el texto legal pegado (LGSS, RDL 8/2015) y se justifican con cita + frase literal.

// 1
expect(1, "A");
push({
  question:
    "Según el art. 193.1 de la LGSS (RDL 8/2015), ¿qué caracteriza a la incapacidad permanente contributiva respecto de las reducciones del trabajador?",
  options: [
    "Que presenta reducciones anatómicas o funcionales graves, susceptibles de determinación objetiva y previsiblemente definitivas, que disminuyan o anulen su capacidad laboral.",
    "Que presenta cualquier reducción anatómica o funcional, aunque sea leve y reversible, siempre que haya baja médica.",
    "Que presenta una disminución de ingresos aunque no exista reducción anatómica o funcional.",
    "Que presenta una incapacidad temporal superior a 180 días, automáticamente convertida en permanente.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 193.1 define la IP contributiva como la situación en la que, tras tratamiento, existen "reducciones anatómicas o funcionales graves, susceptibles de determinación objetiva y previsiblemente definitivas" que "disminuyan o anulen su capacidad laboral". B, C y D introducen supuestos no previstos en el precepto.',
});

// 2
expect(2, "B");
push({
  question:
    "Conforme al art. 193.1 (párrafo segundo) de la LGSS (RDL 8/2015), ¿cuándo puede no exigirse el requisito de haber estado sometido previamente al tratamiento prescrito?",
  options: [
    "Nunca: el tratamiento prescrito es siempre requisito imprescindible.",
    "Cuando, atendiendo a características de la patología, estadio, evolución y gravedad, las reducciones queden suficientemente objetivadas y sean previsiblemente definitivas.",
    "Solo cuando el trabajador tenga más de 67 años.",
    "Únicamente si la contingencia deriva de accidente de trabajo.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 193.1 (párrafo segundo) permite no exigir el tratamiento previo si, por las características (patología, estadio, evolución y gravedad), las reducciones "queden suficientemente objetivadas y sean previsiblemente definitivas". A lo niega; C y D añaden condiciones que no figuran.',
});

// 3
expect(3, "C");
push({
  question:
    "Según el art. 193.1 (párrafo tercero) de la LGSS (RDL 8/2015), ¿qué ocurre con las reducciones anatómicas o funcionales existentes en la fecha de afiliación cuando se trata de personas con discapacidad?",
  options: [
    "Impiden siempre la calificación de incapacidad permanente.",
    "Solo permiten calificar IP si se acredita que existían antes de la afiliación.",
    "No impiden la calificación cuando, tras la afiliación, se agravan y por sí mismas o con nuevas lesiones/patologías disminuyen o anulan la capacidad laboral que tenía al afiliarse.",
    "Obligan a calificar siempre gran incapacidad.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 193.1 (párrafo tercero) dice que las reducciones existentes en la afiliación "no impedirán" la calificación cuando, tras la afiliación, "tales reducciones se hayan agravado" provocando "por sí mismas o por concurrencia" una disminución o anulación de la capacidad laboral que tenía al afiliarse. A, B y D no se ajustan al texto.',
});

// 4
expect(4, "D");
push({
  question:
    "Conforme al art. 193.2 de la LGSS (RDL 8/2015), ¿cuál es la regla general sobre el origen de la incapacidad permanente?",
  options: [
    "Debe derivar siempre de accidente de trabajo.",
    "Debe derivar siempre de enfermedad profesional.",
    "Debe derivar siempre de una situación de no alta.",
    "Ha de derivarse de la situación de incapacidad temporal, salvo supuestos expresamente previstos (falta de protección de IT, alta/asimilada que no la comprenda, acceso desde no alta, etc.).",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 193.2 establece: "La incapacidad permanente habrá de derivarse de la situación de incapacidad temporal", con excepciones tasadas (p. ej., situaciones sin protección de IT, asimiladas a alta que no la comprendan, acceso desde no alta, etc.). A, B y C convierten en regla lo que no dice el artículo.',
});

// 5
expect(5, "A");
push({
  question:
    "Según el art. 194.1 de la LGSS (RDL 8/2015), ¿cuál es el listado completo de grados de incapacidad permanente?",
  options: [
    "Parcial, total, absoluta y gran incapacidad.",
    "Leve, moderada, severa y muy severa.",
    "Temporal, permanente y definitiva.",
    "Parcial, absoluta, invalidez y gran invalidez.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 194.1 enumera: "incapacidad permanente parcial", "total", "absoluta" y "gran incapacidad". B, C y D no coinciden con la clasificación literal del precepto.',
});

// 6
expect(6, "B");
push({
  question:
    "Conforme al art. 194.2 de la LGSS (RDL 8/2015), ¿en qué se basa la determinación del grado de incapacidad permanente?",
  options: [
    "En el número de días en incapacidad temporal, exclusivamente.",
    "En el porcentaje de reducción de la capacidad de trabajo que reglamentariamente se establezca, teniendo en cuenta la incidencia en la profesión o grupo profesional previo.",
    "En la edad del interesado únicamente.",
    "En la voluntad del trabajador de reincorporarse.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 194.2 señala que la calificación se determina por el "porcentaje de reducción de la capacidad de trabajo" y que se tendrá en cuenta la "incidencia (...) en el desarrollo de la profesión (...) o del grupo profesional" previo. A, C y D no están en el texto.',
});

// 7
expect(7, "C");
push({
  question:
    "Según el art. 194.3 de la LGSS (RDL 8/2015), ¿qué materias se prevé que sean objeto de desarrollo reglamentario por el Gobierno, previo informe del Consejo General del INSS?",
  options: [
    "La fijación directa de la cuantía de todas las pensiones en la propia ley, sin reglamento.",
    "La creación de un baremo de lesiones no incapacitantes.",
    "La lista de enfermedades, su valoración, la determinación de grados y el régimen de incompatibilidades.",
    "El procedimiento judicial de impugnación de altas médicas."
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 194.3 indica que serán objeto de desarrollo reglamentario "la lista de enfermedades", "la valoración", "la determinación de los distintos grados" y "el régimen de incompatibilidades", por el Gobierno y "previo informe del Consejo General del Instituto Nacional de la Seguridad Social". A, B y D no describen ese contenido.',
});

// 8
expect(8, "D");
push({
  question:
    "Conforme al art. 195.1 de la LGSS (RDL 8/2015), ¿qué afirmación es correcta sobre el período previo de cotización para causar derecho a prestaciones de incapacidad permanente?",
  options: [
    "Siempre se exige período previo de cotización, cualquiera que sea la contingencia.",
    "Solo se exige período previo si la contingencia deriva de accidente de trabajo.",
    "Nunca se exige período previo de cotización en incapacidad permanente.",
    "No se exige período previo cuando la incapacidad permanente sea debida a accidente (sea o no laboral) o a enfermedad profesional.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 195.1 dispone que no se exigirá período previo de cotización si la IP es "debida a accidente, sea o no laboral, o a enfermedad profesional". A y C son absolutas e incorrectas; B invierte el supuesto.',
});

// 9
expect(9, "A");
push({
  question:
    "Según el art. 195.1 de la LGSS (RDL 8/2015), ¿cuándo NO se reconocerá el derecho a prestaciones de incapacidad permanente derivada de contingencias comunes?",
  options: [
    "Cuando el beneficiario, en la fecha del hecho causante, tenga la edad del art. 205.1.a) y reúna los requisitos para acceder a la pensión de jubilación.",
    "Cuando el trabajador tenga menos de 31 años.",
    "Cuando la contingencia derive de accidente no laboral.",
    "Cuando exista una reducción anatómica objetiva.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 195.1 establece expresamente que "No se reconocerá" la IP por contingencias comunes si en el hecho causante se tiene la edad del art. 205.1.a) y se reúnen requisitos para jubilación. B, C y D no figuran como causa de denegación en ese apartado.',
});

// 10
expect(10, "B");
push({
  question:
    "Conforme al art. 195.2 de la LGSS (RDL 8/2015), ¿qué período mínimo de cotización se exige para la incapacidad permanente parcial?",
  options: [
    "Cinco años en los últimos diez años.",
    "Mil ochocientos días dentro de los diez años inmediatamente anteriores a la fecha de extinción de la incapacidad temporal de la que se derive.",
    "Quince años distribuidos con un mínimo en los últimos diez.",
    "No se exige ningún período mínimo de cotización.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 195.2 exige "mil ochocientos días" en los "diez años inmediatamente anteriores" a la extinción de la IT de la que derive. A y C no son el criterio del precepto; D contradice la exigencia.',
});

// 11
expect(11, "C");
push({
  question:
    "Según el art. 195.3.a) de la LGSS (RDL 8/2015), si el causante tiene menos de 31 años, ¿cómo se determina el período mínimo de cotización para pensiones por incapacidad permanente?",
  options: [
    "La mitad del tiempo transcurrido desde los 16 hasta el hecho causante.",
    "Un mínimo fijo de 5 años.",
    "La tercera parte del tiempo transcurrido entre la fecha en que cumplió 16 años y la del hecho causante.",
    "La cuarta parte del tiempo transcurrido entre los 20 años y el hecho causante.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 195.3.a) indica: "la tercera parte del tiempo transcurrido" entre los 16 años y el hecho causante. A, B y D no coinciden con el criterio literal.',
});

// 12
expect(12, "D");
push({
  question:
    "Conforme al art. 195.3.b) de la LGSS (RDL 8/2015), si el causante tiene 31 años o más, ¿cuál es el criterio principal (y mínimo) del período de cotización exigible?",
  options: [
    "La tercera parte del tiempo entre 16 años y hecho causante.",
    "Diez años exactos, siempre.",
    "Quince años, en todo caso.",
    "La cuarta parte del tiempo entre los 20 años y el hecho causante, con un mínimo de 5 años.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 195.3.b) establece "la cuarta parte" del tiempo entre los 20 años y el hecho causante, "con un mínimo (...) de cinco años". A corresponde al supuesto <31; B y C no son la regla general del apartado.',
});

// 13
expect(13, "A");
push({
  question:
    "Según el art. 195.3.b) (segundo inciso) de la LGSS (RDL 8/2015), en el supuesto de 31 años o más, ¿qué fracción del período exigible debe estar comprendida dentro de los diez años inmediatamente anteriores al hecho causante?",
  options: [
    "Al menos la quinta parte.",
    "Al menos la mitad.",
    "Al menos dos tercios.",
    "No se exige ninguna parte dentro de los últimos diez años.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 195.3.b) indica que "al menos la quinta parte" del período exigible debe estar dentro de los "diez años inmediatamente anteriores". B y C no aparecen; D contradice el texto.',
});

// 14
expect(14, "B");
push({
  question:
    "Conforme al art. 195.3.b) (párrafo tercero) de la LGSS (RDL 8/2015), si se accede a la pensión desde una situación de alta o asimilada sin obligación de cotizar, ¿desde qué fecha se computa hacia atrás el período de diez años referido a la quinta parte?",
  options: [
    "Desde la fecha de nacimiento del interesado.",
    "Desde la fecha en que cesó la obligación de cotizar.",
    "Desde el primer día del año natural del hecho causante.",
    "Desde la fecha de afiliación inicial a la Seguridad Social.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 195.3.b) dispone que, en alta/asimilada sin obligación de cotizar, el período de diez años "se computará, hacia atrás, desde la fecha en que cesó la obligación de cotizar". A, C y D no se citan.',
});

// 15
expect(15, "C");
push({
  question:
    "Según el art. 195.4 de la LGSS (RDL 8/2015), ¿qué grados de incapacidad permanente derivados de contingencias comunes pueden causarse aunque el interesado no esté en alta o asimilada a la de alta en el hecho causante?",
  options: [
    "Solo incapacidad permanente parcial.",
    "Solo incapacidad permanente total.",
    "Incapacidad permanente absoluta o gran incapacidad.",
    "Cualquier grado, sin límites.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 195.4 permite causar pensiones de IP en grados "absoluta o gran incapacidad" por contingencias comunes aunque no haya alta/asimilada. A, B y D no se ajustan.',
});

// 16
expect(16, "D");
push({
  question:
    "Conforme al art. 195.4 de la LGSS (RDL 8/2015), en el supuesto de causar IP absoluta o gran incapacidad desde no alta por contingencias comunes, ¿cuál es el período mínimo de cotización exigible en todo caso?",
  options: [
    "Cinco años.",
    "Diez años.",
    "Mil ochocientos días.",
    "Quince años (distribuidos en la forma prevista en el último inciso del art. 195.3.b)).",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 195.4 fija "en todo caso" un mínimo de "quince años" y remite a la distribución del último inciso del art. 195.3.b). A, B y C no coinciden con el texto.',
});

// 17
expect(17, "A");
push({
  question:
    "Según el art. 195.5 de la LGSS (RDL 8/2015), para causar pensión en el Régimen General y en otro u otros regímenes en los casos del art. 195.4, ¿qué requisito se exige respecto de las cotizaciones acreditadas?",
  options: [
    "Que se superpongan, al menos, durante quince años.",
    "Que no se superpongan en ningún mes.",
    "Que se acrediten solo en el Régimen General.",
    "Que se acrediten exclusivamente en el último régimen de alta.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 195.5 exige que las cotizaciones en cada régimen "se superpongan, al menos, durante quince años". B, C y D contradicen el requisito literal.',
});

// 18
expect(18, "B");
push({
  question:
    "Conforme al art. 196.1 de la LGSS (RDL 8/2015), ¿en qué consiste la prestación económica correspondiente a la incapacidad permanente parcial?",
  options: [
    "En una pensión vitalicia.",
    "En una cantidad a tanto alzado.",
    "En un subsidio equivalente al 100% de la base reguladora.",
    "En una indemnización por baremo de lesiones no incapacitantes.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 196.1 dice literalmente: "consistirá en una cantidad a tanto alzado". A y C se corresponden con otros grados o prestaciones; D pertenece al capítulo de lesiones permanentes no incapacitantes.',
});

// 19
expect(19, "C");
push({
  question:
    "Según el art. 196.2 (primer párrafo) de la LGSS (RDL 8/2015), ¿qué forma tiene la prestación económica de la incapacidad permanente total y qué excepción prevé?",
  options: [
    "Es siempre una indemnización por baremo.",
    "Es un subsidio temporal que se renueva trimestralmente.",
    "Es una pensión vitalicia, que excepcionalmente puede sustituirse por una indemnización a tanto alzado si el beneficiario fuese menor de 60 años.",
    "Es una pensión vitalicia incompatible con cualquier trabajo, sin excepciones.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 196.2 establece que la IPT "consistirá en una pensión vitalicia" y que "podrá excepcionalmente ser sustituida" por indemnización a tanto alzado cuando el beneficiario "fuese menor de sesenta años". A y B no están en el texto; D añade una incompatibilidad absoluta que no figura aquí.',
});

// 20
expect(20, "D");
push({
  question:
    "Conforme al art. 196.2 (párrafo segundo) de la LGSS (RDL 8/2015), ¿cuándo se incrementa la pensión de incapacidad permanente total en un porcentaje que se determine reglamentariamente?",
  options: [
    "Siempre que el trabajador tenga cónyuge no a cargo.",
    "Siempre que derive de contingencias profesionales.",
    "Solo cuando el trabajador sea menor de 60 años.",
    "Cuando, por edad, falta de preparación y circunstancias sociales y laborales del lugar de residencia, se presuma la dificultad de obtener empleo en actividad distinta de la habitual anterior.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 196.2 (párrafo segundo) prevé incremento cuando se presuma la dificultad de empleo por "edad, falta de preparación general o especializada" y circunstancias del lugar de residencia. A, B y C no son la condición descrita.',
});

// 21
expect(21, "A");
push({
  question:
    "Según el art. 196.2 (párrafo tercero) de la LGSS (RDL 8/2015), ¿qué límite se establece para la cuantía mínima de la pensión de incapacidad permanente total derivada de enfermedad común?",
  options: [
    "No podrá ser inferior al importe mínimo fijado anualmente en la Ley de Presupuestos para la IPT de titulares menores de 60 años con cónyuge no a cargo.",
    "No podrá ser inferior al 45% de la pensión sin complemento.",
    "No podrá ser inferior al 100% de la base reguladora.",
    "No podrá ser inferior al salario mínimo interprofesional.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 196.2 (párrafo tercero) fija que la cuantía "no podrá resultar inferior" al mínimo anual de PGE para IPT por enfermedad común de "titulares menores de sesenta años con cónyuge no a cargo". B es regla del complemento de gran incapacidad; C y D no aparecen en el texto.',
});

// 22
expect(22, "B");
push({
  question:
    "Conforme al art. 196.3 de la LGSS (RDL 8/2015), ¿en qué consiste la prestación económica correspondiente a la incapacidad permanente absoluta?",
  options: [
    "En una cantidad a tanto alzado.",
    "En una pensión vitalicia.",
    "En una indemnización por baremo.",
    "En un subsidio equivalente al 50% de la base reguladora.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 196.3 dispone: "consistirá en una pensión vitalicia". A, C y D no se corresponden con el precepto.',
});

// 23
expect(23, "C");
push({
  question:
    "Según el art. 196.4 de la LGSS (RDL 8/2015), además de la pensión, ¿qué derecho adicional existe en caso de gran incapacidad y cuál es la finalidad del complemento?",
  options: [
    "Un complemento destinado a financiar la empresa del pensionista.",
    "Un complemento destinado a compensar la falta de cotización.",
    "Un complemento destinado a que el inválido pueda remunerar a la persona que le atienda.",
    "Un complemento destinado a pagar la asistencia sanitaria privada.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 196.4 indica que se incrementa con un "complemento, destinado a que el inválido pueda remunerar a la persona que le atienda". A, B y D no figuran.',
});

// 24
expect(24, "D");
push({
  question:
    "Conforme al art. 196.4 de la LGSS (RDL 8/2015), ¿cómo se calcula el importe del complemento de gran incapacidad (sin entrar en cuantías externas)?",
  options: [
    "Es un 100% fijo de la base reguladora.",
    "Es el 30% de la base mínima de cotización más el 45% de la última base.",
    "Es el 50% de la pensión sin complemento.",
    "Es el resultado de sumar el 45% de la base mínima de cotización vigente en el hecho causante y el 30% de la última base de cotización del trabajador de la contingencia.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 196.4 fija literalmente: "equivalente al resultado de sumar el 45 por ciento de la base mínima (...) y el 30 por ciento de la última base de cotización (...)". A, B y C no reproducen la fórmula del artículo.',
});

// 25
expect(25, "A");
push({
  question:
    "Según el art. 196.4 (última frase) de la LGSS (RDL 8/2015), ¿qué mínimo garantiza la norma para el complemento de gran incapacidad?",
  options: [
    "No podrá ser inferior al 45% de la pensión percibida, sin el complemento.",
    "No podrá ser inferior al salario mínimo interprofesional.",
    "No podrá ser inferior al 30% de la base mínima.",
    "No podrá ser inferior al 100% de la base reguladora.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 196.4 dispone: "En ningún caso el complemento (...) podrá tener un importe inferior al 45 por ciento de la pensión percibida, sin el complemento". B, C y D no aparecen como garantía mínima.',
});

// 26
expect(26, "B");
push({
  question:
    "Conforme al art. 196.5 de la LGSS (RDL 8/2015), si un trabajador con 67 o más años accede a IP derivada de contingencias comunes por no reunir requisitos de jubilación, ¿a qué equivale la cuantía de la pensión de IP?",
  options: [
    "A la cuantía mínima anual fijada en PGE.",
    "Al resultado de aplicar a la base reguladora el porcentaje que corresponda al período mínimo de cotización exigido para acceder a jubilación.",
    "Siempre al 100% de la base reguladora.",
    "A la última base de cotización íntegra.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 196.5 dice que la cuantía será equivalente a aplicar a la base reguladora "el porcentaje que corresponda al período mínimo de cotización" exigido para jubilación. A, C y D no se indican.',
});

// 27
expect(27, "C");
push({
  question:
    "Según el art. 196.5 (segunda frase) de la LGSS (RDL 8/2015), cuando la incapacidad permanente derive de enfermedad común en el supuesto del art. 196.5, ¿cómo se considera la base reguladora?",
  options: [
    "La media de los últimos 12 meses dividida por 14.",
    "La base mínima de cotización vigente en el hecho causante.",
    "El resultado de aplicar únicamente lo establecido en la norma a) del art. 197.1.",
    "La última base de cotización sin ajustes.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 196.5 indica que, si deriva de enfermedad común, la base reguladora será el resultado de aplicar "únicamente" lo previsto en la norma a) del art. 197.1. A, B y D no aparecen.',
});

// 28
expect(28, "D");
push({
  question:
    "Conforme al art. 197.1.a) de la LGSS (RDL 8/2015), ¿qué operación define la regla básica para hallar la base reguladora de IP por enfermedad común?",
  options: [
    "Dividir por 96 las bases de los 112 meses anteriores.",
    "Dividir por 100 las bases de los 100 meses anteriores.",
    "Dividir por 14 las bases del último año.",
    "Dividir por 112 las bases de cotización del interesado durante los 96 meses anteriores al mes previo al hecho causante.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 197.1.a) establece: "dividir por 112 las bases (...) durante los 96 meses anteriores al mes previo al del hecho causante". A, B y C no reflejan la literalidad.',
});

// 29
expect(29, "A");
push({
  question:
    "Según el art. 197.1.a) (regla 1.ª) de la LGSS (RDL 8/2015), ¿cómo se computan las bases correspondientes a los veinticuatro meses anteriores al mes previo al hecho causante?",
  options: [
    "En su valor nominal.",
    "Actualizadas todas por IPC.",
    "Se excluyen del cálculo.",
    "Se integran con la base mínima.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. La regla 1.ª del art. 197.1.a) dice: "se computarán en su valor nominal". B contradice la regla; C y D no se disponen en ese apartado.',
});

// 30
expect(30, "B");
push({
  question:
    "Conforme al art. 197.1.a) (regla 2.ª) de la LGSS (RDL 8/2015), ¿qué ocurre con las restantes bases de cotización (no incluidas en los 24 meses nominales)?",
  options: [
    "Se computan siempre en valor nominal.",
    "Se actualizan conforme a la evolución del IPC desde los meses correspondientes hasta el mes inmediato anterior al inicio del período no actualizable.",
    "Se sustituyen por la base mínima vigente en el hecho causante.",
    "Se eliminan si son inferiores al 50% de la base mínima.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. La regla 2.ª del art. 197.1.a) establece que las restantes bases "se actualizarán" según la evolución del IPC hasta el mes inmediato anterior al inicio del período no actualizable. A, C y D no son lo previsto.',
});

// 31
expect(31, "C");
push({
  question:
    "Según el art. 197.1.b) de la LGSS (RDL 8/2015), tras obtener el resultado de la norma a), ¿qué se hace para constituir la base reguladora (sin confundir con el porcentaje del grado)?",
  options: [
    "Se aplica directamente el porcentaje del grado de incapacidad para obtener la base reguladora.",
    "Se suma el complemento de gran incapacidad.",
    "Se aplica el porcentaje en función de los años de cotización según la escala del art. 210.1, considerando como cotizados los años restantes hasta la edad ordinaria de jubilación.",
    "Se divide el resultado entre 14 pagas.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 197.1.b) manda aplicar el porcentaje por años de cotización (escala art. 210.1) y considerar como cotizados los años que resten para la edad ordinaria de jubilación. A confunde la fase; B y D no aparecen.',
});

// 32
expect(32, "D");
push({
  question:
    "Conforme al art. 197.1.b) de la LGSS (RDL 8/2015), si no se alcanzan quince años de cotización, ¿qué porcentaje aplicable prevé la norma?",
  options: [
    "30%.",
    "45%.",
    "100%.",
    "50%.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 197.1.b) indica: "En el caso de no alcanzarse quince años de cotización, el porcentaje aplicable será del 50 por ciento". A, B y C no se mencionan como regla.',
});

// 33
expect(33, "A");
push({
  question:
    "Según el art. 197.2 de la LGSS (RDL 8/2015), en supuestos en que se exija un período mínimo de cotización inferior a ocho años, ¿cómo se obtiene la base reguladora respecto del número de bases mensuales a computar?",
  options: [
    "Computando bases mensuales en número igual al de meses del período mínimo exigible (sin tener en cuenta fracciones de mes).",
    "Computando siempre 96 meses.",
    "Computando siempre 24 meses.",
    "Computando únicamente el último mes de cotización.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 197.2 prevé computar bases "en número igual al de meses de que conste el período mínimo exigible" (sin fracciones). B, C y D no son lo que dice el apartado.',
});

// 34
expect(34, "B");
push({
  question:
    "Conforme al art. 197.2 de la LGSS (RDL 8/2015), ¿qué regla específica se fija sobre la actualización de bases en estos supuestos (período mínimo < 8 años)?",
  options: [
    "Se actualizan todas las bases, incluidas las de los 24 meses más cercanos.",
    "Se excluye, en todo caso, de la actualización las bases correspondientes a los 24 meses inmediatamente anteriores al mes previo al hecho causante.",
    "No se aplica nunca el IPC en ningún caso.",
    "Se actualiza solo el último año.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 197.2 indica que se excluyen de actualización "en todo caso" las bases de los "veinticuatro meses" inmediatamente anteriores. A, C y D no reflejan esa regla.',
});

// 35
expect(35, "C");
push({
  question:
    "Según el art. 197.4 de la LGSS (RDL 8/2015), si en el período de cálculo aparecen meses sin obligación de cotizar, ¿cómo se integran las primeras 48 mensualidades?",
  options: [
    "Con el 50% de la base mínima.",
    "Con la última base de cotización conocida.",
    "Con la base mínima de entre todas las existentes en cada momento.",
    "No se integran: se eliminan del cálculo.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 197.4 dispone: "las primeras cuarenta y ocho mensualidades se integrarán con la base mínima de entre todas las existentes en cada momento". A describe el resto; B y D no se contemplan.',
});

// 36
expect(36, "D");
push({
  question:
    "Conforme al art. 197.4 de la LGSS (RDL 8/2015), ¿cómo se integran el resto de mensualidades (más allá de las primeras 48) cuando hay meses sin obligación de cotizar?",
  options: [
    "Con la base mínima íntegra en todos los meses.",
    "Con el 45% de la base mínima.",
    "Con el 30% de la última base.",
    "Con el 50% de la base mínima.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 197.4 indica que "el resto de mensualidades" se integrarán con "el 50 por ciento" de la base mínima. A, B y C no son la regla del apartado.',
});

// 37
expect(37, "A");
push({
  question:
    "Según el art. 198.1 de la LGSS (RDL 8/2015), ¿cuándo es compatible la pensión vitalicia por incapacidad permanente total con el salario que pueda percibir el trabajador?",
  options: [
    "Cuando el salario proceda de la misma empresa o de otra distinta, siempre que las funciones no coincidan con las que dieron lugar a la incapacidad permanente total.",
    "Solo cuando el salario proceda de la misma empresa y en el mismo puesto.",
    "Solo cuando el salario proceda de trabajo autónomo.",
    "Nunca: la incapacidad permanente total es incompatible con cualquier salario.",
  ],
  correctAnswer: "A",
  explanation:
    'Correcta: A. El art. 198.1 establece compatibilidad "en la misma empresa o en otra distinta" si las funciones "no coincidan" con las que dieron lugar a la IPT. B y D contradicen el texto; C limita sin base legal.',
});

// 38
expect(38, "B");
push({
  question:
    "Conforme al art. 198.2 de la LGSS (RDL 8/2015), si un pensionista de incapacidad permanente absoluta o gran incapacidad realiza un trabajo o actividad que dé lugar a inclusión en un régimen de Seguridad Social, ¿qué debe hacer la entidad gestora respecto de la pensión?",
  options: [
    "Mantener siempre el pago íntegro sin cambios.",
    "Suspender el pago de la pensión y reanudarlo cuando cese el trabajo o actividad (sin perjuicio de revisión del grado).",
    "Extinguir definitivamente la pensión sin posibilidad de reanudación.",
    "Convertir automáticamente la pensión en jubilación.",
  ],
  correctAnswer: "B",
  explanation:
    'Correcta: B. El art. 198.2 indica que, si el pensionista realiza trabajo que implique inclusión en un régimen, la entidad gestora "suspenderá el pago" y lo "reanudará" al cesar, "sin perjuicio" de revisión. A, C y D no se corresponden.',
});

// 39
expect(39, "C");
push({
  question:
    "Según el art. 201 de la LGSS (RDL 8/2015), ¿qué conjunto de requisitos describe correctamente las lesiones permanentes no incapacitantes indemnizables por baremo?",
  options: [
    "Lesiones temporales por enfermedad común que requieran asistencia sanitaria.",
    "Cualquier lesión no incluida en baremo, si el trabajador lo solicita.",
    "Lesiones/mutilaciones/deformidades definitivas causadas por accidente de trabajo o enfermedad profesional que, sin constituir incapacidad permanente, disminuyan o alteren la integridad física y estén recogidas en el baremo anejo.",
    "Lesiones derivadas de contingencias comunes que siempre generan pensión.",
  ],
  correctAnswer: "C",
  explanation:
    'Correcta: C. El art. 201 exige lesiones "de carácter definitivo" por AT/EP que "sin llegar a constituir una incapacidad permanente" supongan "disminución o alteración de la integridad física" y "aparezcan recogidas en el baremo". A, B y D contradicen varios elementos del texto.',
});

// 40
expect(40, "D");
push({
  question:
    "Conforme a los arts. 202 y 203 de la LGSS (RDL 8/2015), ¿qué condición y qué regla de incompatibilidad se establecen para las indemnizaciones por lesiones permanentes no incapacitantes?",
  options: [
    "Condición: estar en incapacidad temporal; incompatibilidad: siempre compatibles con IP.",
    "Condición: no haber sido dado de alta médica; incompatibilidad: siempre incompatibles con IP.",
    "Condición: ser beneficiario de gran incapacidad; incompatibilidad: solo incompatibles con jubilación.",
    "Condición: ser trabajador del Régimen General que reúna la condición general del art. 165.1 y haya sido dado de alta médica; incompatibilidad: incompatibles con IP salvo independencia total de lesiones.",
  ],
  correctAnswer: "D",
  explanation:
    'Correcta: D. El art. 202 exige trabajadores del RG que reúnan la condición del art. 165.1 y "hayan sido dados de alta médica". El art. 203 dispone que serán "incompatibles" con IP "salvo" si las lesiones son "totalmente independientes" de las consideradas para declarar la IP. A, B y C no se ajustan al texto.',
});

const payload = { questions };
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + "\n", "utf8");

// Validación interna (formato {questions:[...]})
const parsed = JSON.parse(fs.readFileSync(outPath, "utf8"));
if (!Array.isArray(parsed.questions) || parsed.questions.length !== 40) {
  throw new Error(`Expected 40 questions, got ${parsed.questions?.length}`);
}

const dist = { A: 0, B: 0, C: 0, D: 0 };
let run = 0;
let last = null;
for (const [i, q] of parsed.questions.entries()) {
  if (typeof q.question !== "string" || !q.question.trim()) throw new Error(`Empty question at ${i}`);
  if (!Array.isArray(q.options) || q.options.length !== 4) throw new Error(`Bad options at ${i}`);
  if (!(q.correctAnswer in dist)) throw new Error(`Bad correctAnswer at ${i}`);
  if (typeof q.explanation !== "string" || !q.explanation.includes("art.")) throw new Error(`Missing 'art.' in explanation at ${i}`);
  if (q.difficulty !== "hard") throw new Error(`Bad difficulty at ${i}`);

  dist[q.correctAnswer]++;
  if (q.correctAnswer === last) run++;
  else {
    run = 1;
    last = q.correctAnswer;
  }
  if (run > 2) throw new Error(`Run>2 at ${i}`);
}

console.log("OK", outPath);
console.log("count", parsed.questions.length);
console.log("dist", dist);

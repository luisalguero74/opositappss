// Temario Oficial - Oposiciones Seguridad Social

export interface Tema {
  codigo: string
  numero: number
  titulo: string
  parte: 'GENERAL' | 'ESPECÍFICO'
}

export const TEMARIO_GENERAL: Tema[] = [
  { codigo: 'G01', numero: 1, titulo: 'La Constitución Española de 1978: Estructura y contenido. La reforma de la Constitución.', parte: 'GENERAL' },
  { codigo: 'G02', numero: 2, titulo: 'Derechos y deberes fundamentales. Su garantía y suspensión.', parte: 'GENERAL' },
  { codigo: 'G03', numero: 3, titulo: 'El Tribunal Constitucional. Organización, composición y atribuciones.', parte: 'GENERAL' },
  { codigo: 'G04', numero: 4, titulo: 'La Corona. Funciones constitucionales del Rey. Sucesión y regencia. El refrendo.', parte: 'GENERAL' },
  { codigo: 'G05', numero: 5, titulo: 'El poder legislativo. Las Cortes Generales: Composición, atribuciones y funcionamiento. El Defensor del Pueblo.', parte: 'GENERAL' },
  { codigo: 'G06', numero: 6, titulo: 'El Poder Judicial. El principio de unidad jurisdiccional. El Consejo General del Poder Judicial. La organización judicial española.', parte: 'GENERAL' },
  { codigo: 'G07', numero: 7, titulo: 'El poder ejecutivo. El presidente del Gobierno y el Consejo de Ministros. Relaciones entre el Gobierno y las Cortes Generales. Designación, causas de cese y responsabilidad del Gobierno. El Consejo de Estado.', parte: 'GENERAL' },
  { codigo: 'G08', numero: 8, titulo: 'La Administración General del Estado. Principios de organización y funcionamiento. Órganos centrales. Órganos superiores y órganos directivos: creación, nombramiento, cese y funciones. Los servicios comunes de los ministerios. Órganos territoriales. La Administración del Estado en el Exterior.', parte: 'GENERAL' },
  { codigo: 'G09', numero: 9, titulo: 'La organización territorial del Estado. Las Comunidades Autónomas. Los Estatutos de Autonomía. La delimitación de competencias entre el Estado y las Comunidades Autónomas en la Constitución y en los Estatutos de Autonomía. La Administración local: El municipio. La provincia.', parte: 'GENERAL' },
  { codigo: 'G10', numero: 10, titulo: 'Las Instituciones de la Unión Europea: El Consejo, el Parlamento Europeo, la Comisión, el Tribunal de Justicia.', parte: 'GENERAL' },
  { codigo: 'G11', numero: 11, titulo: 'Las fuentes del derecho de la Unión Europea. Derecho originario. Derecho derivado: Reglamentos, directivas y decisiones. Otras fuentes. Las relaciones entre el Derecho de la Unión Europea y el ordenamiento jurídico de los Estados miembros.', parte: 'GENERAL' },
  { codigo: 'G12', numero: 12, titulo: 'El Ministerio de Inclusión, Seguridad Social y Migraciones. Organización. Estructura y funciones.', parte: 'GENERAL' },
  { codigo: 'G13', numero: 13, titulo: 'Las fuentes del Derecho Administrativo. Concepto y clases. La jerarquía de las fuentes.', parte: 'GENERAL' },
  { codigo: 'G14', numero: 14, titulo: 'La Ley. Tipos de leyes. Disposiciones del Gobierno con fuerza de ley: decreto-ley y decreto legislativo. El Reglamento: concepto, clases y límites. Los principios generales del Derecho.', parte: 'GENERAL' },
  { codigo: 'G15', numero: 15, titulo: 'Los actos administrativos. Concepto y clases. Motivación, forma y eficacia de los actos administrativos. Notificación y publicación. Nulidad y anulabilidad. La revisión de oficio.', parte: 'GENERAL' },
  { codigo: 'G16', numero: 16, titulo: 'El procedimiento administrativo común. La capacidad de obrar y el concepto de interesado. Representación. Identificación y firma de los interesados. Derechos del interesado en el procedimiento administrativo. Obligación de resolver y silencio administrativo. Términos y plazos.', parte: 'GENERAL' },
  { codigo: 'G17', numero: 17, titulo: 'Las fases del procedimiento administrativo: Iniciación, ordenación, instrucción y finalización. La ejecución de los actos y resoluciones administrativas.', parte: 'GENERAL' },
  { codigo: 'G18', numero: 18, titulo: 'Los recursos administrativos: concepto y clases. Recurso de alzada. Recurso potestativo de reposición. Recurso extraordinario de revisión. La jurisdicción contencioso-administrativa: objeto y plazos de interposición del recurso contencioso administrativo.', parte: 'GENERAL' },
  { codigo: 'G19', numero: 19, titulo: 'El personal al servicio de las Administraciones Públicas: concepto y clases. Derechos y deberes de los funcionarios. La carrera administrativa. Las incompatibilidades. Régimen disciplinario: faltas, sanciones y procedimiento.', parte: 'GENERAL' },
  { codigo: 'G20', numero: 20, titulo: 'Atención al público. Atención de personas con discapacidad. Los servicios de información administrativa. Información general y particular al ciudadano. Iniciativas. Reclamaciones. Quejas. Peticiones.', parte: 'GENERAL' },
  { codigo: 'G21', numero: 21, titulo: 'Políticas de igualdad y contra la violencia de género. Discapacidad y dependencia: régimen jurídico. La Ley 4/2023, de 28 de febrero, para la igualdad real y efectiva de las personas trans y para la garantía de los derechos de las personas LGTBI.', parte: 'GENERAL' },
  { codigo: 'G22', numero: 22, titulo: 'Normativa reguladora de la protección de datos personales: principios, derechos de las personas y ejercicios de los derechos.', parte: 'GENERAL' },
  { codigo: 'G23', numero: 23, titulo: 'El funcionamiento electrónico del sector público. Derecho y obligación de relacionarse electrónicamente con las Administraciones Públicas, registros y archivo electrónico.', parte: 'GENERAL' },
]

export const TEMARIO_ESPECIFICO: Tema[] = [
  { codigo: 'E01', numero: 1, titulo: 'La Seguridad Social en la Constitución española de 1978. El texto refundido de la Ley General de la Seguridad Social.', parte: 'ESPECÍFICO' },
  { codigo: 'E02', numero: 2, titulo: 'Campo de aplicación y composición del sistema de la Seguridad Social. Régimen general: ámbito subjetivo de aplicación, inclusiones y exclusiones. Regímenes especiales y sistemas especiales.', parte: 'ESPECÍFICO' },
  { codigo: 'E03', numero: 3, titulo: 'Normas sobre afiliación. Altas y bajas en el régimen general. Procedimiento y efectos. El convenio especial y otras situaciones asimiladas a la del alta. Encuadramiento e inscripción.', parte: 'ESPECÍFICO' },
  { codigo: 'E04', numero: 4, titulo: 'La cotización a la Seguridad Social: normas comunes del sistema. La liquidación de cuotas. El régimen general de la Seguridad Social. Bases y tipos de cotización.', parte: 'ESPECÍFICO' },
  { codigo: 'E05', numero: 5, titulo: 'La gestión recaudatoria: concepto, competencia y objeto. Responsables del pago. La recaudación en periodo voluntario. Aplazamientos. Devolución de ingresos indebidos.', parte: 'ESPECÍFICO' },
  { codigo: 'E06', numero: 6, titulo: 'La recaudación en vía ejecutiva. Normas generales. La providencia de apremio. El embargo de bienes. Enajenación de bienes. Tercerías.', parte: 'ESPECÍFICO' },
  { codigo: 'E07', numero: 7, titulo: 'Acción protectora. Contenido y clasificación de las prestaciones. Requisitos generales del derecho a las prestaciones. Automaticidad y anticipo de prestaciones. Contingencias comunes y profesionales.', parte: 'ESPECÍFICO' },
  { codigo: 'E08', numero: 8, titulo: 'Incapacidad temporal e incapacidad permanente contributiva: concepto, beneficiarios, prestaciones, cuantías, y calificación.', parte: 'ESPECÍFICO' },
  { codigo: 'E09', numero: 9, titulo: 'Nacimiento y cuidado de menor. Prestación por riesgo durante el embarazo y lactancia. Prestaciones familiares. Subsidio por cuidado de menores con enfermedad grave.', parte: 'ESPECÍFICO' },
  { codigo: 'E10', numero: 10, titulo: 'Jubilación en la modalidad contributiva: concepto, requisitos, cuantía. Jubilación ordinaria, anticipada, parcial y flexible. Compatibilidad con el trabajo.', parte: 'ESPECÍFICO' },
  { codigo: 'E11', numero: 11, titulo: 'La protección por muerte y supervivencia. Prestaciones de viudedad, orfandad y en favor de familiares. Auxilio por defunción.', parte: 'ESPECÍFICO' },
  { codigo: 'E12', numero: 12, titulo: 'Prestaciones no contributivas y asistenciales. El ingreso mínimo vital. Prestaciones familiares. Pensiones no contributivas de invalidez y jubilación.', parte: 'ESPECÍFICO' },
  { codigo: 'E13', numero: 13, titulo: 'Recursos generales del sistema de la Seguridad Social. El patrimonio único. El Fondo de Reserva. Gestión de recursos financieros. Pago de prestaciones.', parte: 'ESPECÍFICO' },
]

export const TODOS_LOS_TEMAS = [...TEMARIO_GENERAL, ...TEMARIO_ESPECIFICO]

// Helper para obtener tema por código
export function getTemaByCode(codigo: string): Tema | undefined {
  return TODOS_LOS_TEMAS.find(t => t.codigo === codigo)
}

// Helper para obtener temas por parte
export function getTemasByParte(parte: 'GENERAL' | 'ESPECÍFICO'): Tema[] {
  return TODOS_LOS_TEMAS.filter(t => t.parte === parte)
}

// Helper para buscar temas
export function searchTemas(query: string): Tema[] {
  const lowerQuery = query.toLowerCase()
  return TODOS_LOS_TEMAS.filter(t => 
    t.titulo.toLowerCase().includes(lowerQuery) ||
    t.codigo.toLowerCase().includes(lowerQuery)
  )
}

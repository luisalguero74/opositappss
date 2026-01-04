// Índice oficial completo del temario de oposiciones
export interface ArchivoTemario {
  nombre: string
  numeroPaginas?: number
}

export interface TemaOficial {
  id: string
  numero: number
  titulo: string
  descripcion: string
  categoria: 'general' | 'especifico'
  normativaBase?: string[]
  archivoAsociado?: string // Retrocompatibilidad
  archivosAsociados?: ArchivoTemario[]
  numeroPaginas?: number // Retrocompatibilidad
}

export const TEMARIO_OFICIAL: TemaOficial[] = [
  // PARTE GENERAL (23 temas)
  {
    id: 'g1',
    numero: 1,
    titulo: 'La Constitución Española de 1978',
    descripcion: 'Estructura y contenido. La reforma de la Constitución.',
    categoria: 'general',
    normativaBase: ['Constitución Española 1978'],
    archivosAsociados: [{ nombre: 'tema1_constitucion.txt', numeroPaginas: 42 }]
  },
  {
    id: 'g2',
    numero: 2,
    titulo: 'Derechos y deberes fundamentales',
    descripcion: 'Su garantía y suspensión.',
    categoria: 'general',
    normativaBase: ['Constitución Española 1978 - Título I']
  },
  {
    id: 'g3',
    numero: 3,
    titulo: 'El Tribunal Constitucional',
    descripcion: 'Organización, composición y atribuciones.',
    categoria: 'general',
    normativaBase: ['Ley Orgánica 2/1979, de 3 de octubre, del Tribunal Constitucional']
  },
  {
    id: 'g4',
    numero: 4,
    titulo: 'La Corona',
    descripcion: 'Funciones constitucionales del Rey. Sucesión y regencia. El refrendo.',
    categoria: 'general',
    normativaBase: ['Constitución Española 1978 - Título II']
  },
  {
    id: 'g5',
    numero: 5,
    titulo: 'El poder legislativo',
    descripcion: 'Las Cortes Generales: Composición, atribuciones y funcionamiento. El Defensor del Pueblo.',
    categoria: 'general',
    normativaBase: ['Constitución Española 1978 - Título III', 'Ley Orgánica 3/1981 del Defensor del Pueblo']
  },
  {
    id: 'g6',
    numero: 6,
    titulo: 'El Poder Judicial',
    descripcion: 'El principio de unidad jurisdiccional. El Consejo General del Poder Judicial. La organización judicial española.',
    categoria: 'general',
    normativaBase: ['Ley Orgánica 6/1985, de 1 de julio, del Poder Judicial']
  },
  {
    id: 'g7',
    numero: 7,
    titulo: 'El poder ejecutivo',
    descripcion: 'El presidente del Gobierno y el Consejo de Ministros. Relaciones entre el Gobierno y las Cortes Generales.',
    categoria: 'general',
    normativaBase: ['Ley 50/1997, de 27 de noviembre, del Gobierno']
  },
  {
    id: 'g8',
    numero: 8,
    titulo: 'La Administración General del Estado',
    descripcion: 'Principios de organización y funcionamiento. Órganos centrales y territoriales.',
    categoria: 'general',
    normativaBase: ['Ley 40/2015, de 1 de octubre, de Régimen Jurídico del Sector Público']
  },
  {
    id: 'g9',
    numero: 9,
    titulo: 'La organización territorial del Estado',
    descripcion: 'Las Comunidades Autónomas. Los Estatutos de Autonomía. La Administración local.',
    categoria: 'general',
    normativaBase: ['Constitución Española 1978 - Título VIII', 'Ley 7/1985, de 2 de abril, de Bases del Régimen Local'],
    archivosAsociados: [{ nombre: 'tema2_organizacion_territorial.txt' }]
  },
  {
    id: 'g10',
    numero: 10,
    titulo: 'Las Instituciones de la Unión Europea',
    descripcion: 'El Consejo, el Parlamento Europeo, la Comisión, el Tribunal de Justicia.',
    categoria: 'general',
    normativaBase: ['Tratado de la Unión Europea', 'Tratado de Funcionamiento de la UE']
  },
  {
    id: 'g11',
    numero: 11,
    titulo: 'Las fuentes del derecho de la Unión Europea',
    descripcion: 'Derecho originario. Derecho derivado. Relaciones con ordenamientos nacionales.',
    categoria: 'general',
    normativaBase: ['Tratados UE y TFUE']
  },
  {
    id: 'g12',
    numero: 12,
    titulo: 'Ministerio de Inclusión, Seguridad Social y Migraciones',
    descripcion: 'Organización. Estructura y funciones.',
    categoria: 'general',
    normativaBase: ['Real Decreto 2/2020, de 12 de enero']
  },
  {
    id: 'g13',
    numero: 13,
    titulo: 'Las fuentes del Derecho Administrativo',
    descripcion: 'Concepto y clases. La jerarquía de las fuentes.',
    categoria: 'general',
    normativaBase: ['Ley 40/2015']
  },
  {
    id: 'g14',
    numero: 14,
    titulo: 'La Ley',
    descripcion: 'Tipos de leyes. Decreto-ley y decreto legislativo. El Reglamento.',
    categoria: 'general',
    normativaBase: ['Constitución Española 1978 - Título III']
  },
  {
    id: 'g15',
    numero: 15,
    titulo: 'Los actos administrativos',
    descripcion: 'Concepto y clases. Motivación, forma y eficacia. Nulidad y anulabilidad.',
    categoria: 'general',
    normativaBase: ['Ley 39/2015, de 1 de octubre, del Procedimiento Administrativo Común']
  },
  {
    id: 'g16',
    numero: 16,
    titulo: 'El procedimiento administrativo común',
    descripcion: 'Capacidad de obrar. Derechos del interesado. Términos y plazos.',
    categoria: 'general',
    normativaBase: ['Ley 39/2015']
  },
  {
    id: 'g17',
    numero: 17,
    titulo: 'Las fases del procedimiento administrativo',
    descripcion: 'Iniciación, ordenación, instrucción y finalización. Ejecución.',
    categoria: 'general',
    normativaBase: ['Ley 39/2015']
  },
  {
    id: 'g18',
    numero: 18,
    titulo: 'Los recursos administrativos',
    descripcion: 'Concepto y clases. Recurso de alzada. Recurso potestativo de reposición.',
    categoria: 'general',
    normativaBase: ['Ley 39/2015', 'Ley 29/1998, de 13 de julio, Contencioso-Administrativa']
  },
  {
    id: 'g19',
    numero: 19,
    titulo: 'Personal al servicio de las Administraciones Públicas',
    descripcion: 'Concepto y clases. Derechos y deberes. Régimen disciplinario.',
    categoria: 'general',
    normativaBase: ['Real Decreto Legislativo 5/2015, de 30 de octubre, EBEP']
  },
  {
    id: 'g20',
    numero: 20,
    titulo: 'Atención al público',
    descripcion: 'Atención de personas con discapacidad. Información administrativa.',
    categoria: 'general',
    normativaBase: ['Ley 39/2015', 'Real Decreto 366/2007 condiciones de accesibilidad']
  },
  {
    id: 'g21',
    numero: 21,
    titulo: 'Políticas de igualdad y contra la violencia de género',
    descripcion: 'Discapacidad y dependencia. Ley LGTBI.',
    categoria: 'general',
    normativaBase: [
      'Ley Orgánica 3/2007 igualdad efectiva',
      'Ley 4/2023 igualdad personas trans y LGTBI',
      'Ley 39/2006 de Dependencia'
    ]
  },
  {
    id: 'g22',
    numero: 22,
    titulo: 'Protección de datos personales',
    descripcion: 'Principios, derechos de las personas y ejercicios de los derechos.',
    categoria: 'general',
    normativaBase: ['Ley Orgánica 3/2018 Protección de Datos', 'Reglamento UE 2016/679 RGPD']
  },
  {
    id: 'g23',
    numero: 23,
    titulo: 'Funcionamiento electrónico del sector público',
    descripcion: 'Derecho y obligación. Registros y archivo electrónico.',
    categoria: 'general',
    normativaBase: ['Ley 39/2015', 'Ley 40/2015']
  },

  // PARTE ESPECÍFICA (13 temas)
  {
    id: 'e1',
    numero: 1,
    titulo: 'La Seguridad Social en la Constitución',
    descripcion: 'El texto refundido de la Ley General de la Seguridad Social.',
    categoria: 'especifico',
    normativaBase: ['Real Decreto Legislativo 8/2015, de 30 de octubre, LGSS'],
    archivosAsociados: [{ nombre: 'tema1_estructura_ss.txt' }, { nombre: 'Tema 01. AASS. Turno Libre. Temario Específico..txt' }]
  },
  {
    id: 'e2',
    numero: 2,
    titulo: 'Campo de aplicación del sistema de Seguridad Social',
    descripcion: 'Régimen general y regímenes especiales. Sistemas especiales.',
    categoria: 'especifico',
    normativaBase: ['Real Decreto Legislativo 8/2015 - Título I y II'],
    archivosAsociados: [{ nombre: 'tema2_prestaciones_ss.txt' }, { nombre: 'Tema 02. AASS. Turno Libre. Temario Específico..txt' }]
  },
  {
    id: 'e3',
    numero: 3,
    titulo: 'Normas sobre afiliación',
    descripcion: 'Altas y bajas en el régimen general. Convenio especial.',
    categoria: 'especifico',
    normativaBase: ['Real Decreto 84/1996 Reglamento de afiliación']
  },
  {
    id: 'e4',
    numero: 4,
    titulo: 'La cotización a la Seguridad Social',
    descripcion: 'Normas comunes. Bases y tipos de cotización.',
    categoria: 'especifico',
    normativaBase: ['Real Decreto Legislativo 8/2015 - Título II', 'Ley de Presupuestos Generales del Estado (anual)']
  },
  {
    id: 'e5',
    numero: 5,
    titulo: 'La gestión recaudatoria',
    descripcion: 'Concepto, competencia y objeto. Recaudación en periodo voluntario.',
    categoria: 'especifico',
    normativaBase: ['Real Decreto 1415/2004 Reglamento de recaudación']
  },
  {
    id: 'e6',
    numero: 6,
    titulo: 'La recaudación en vía ejecutiva',
    descripcion: 'Normas generales. Providencia de apremio. Embargo.',
    categoria: 'especifico',
    normativaBase: ['Real Decreto 1415/2004', 'Ley 47/2003 Ley General Presupuestaria']
  },
  {
    id: 'e7',
    numero: 7,
    titulo: 'Acción protectora',
    descripcion: 'Contenido y clasificación de prestaciones. Incompatibilidades.',
    categoria: 'especifico',
    normativaBase: ['Real Decreto Legislativo 8/2015 - Título II']
  },
  {
    id: 'e8',
    numero: 8,
    titulo: 'Incapacidad temporal e incapacidad permanente',
    descripcion: 'Concepto, beneficiarios, prestaciones y cuantías.',
    categoria: 'especifico',
    normativaBase: [
      'Real Decreto Legislativo 8/2015 - Capítulos IV y V',
      'Real Decreto 1300/1995 incapacidad permanente'
    ]
  },
  {
    id: 'e9',
    numero: 9,
    titulo: 'Nacimiento y cuidado de menor',
    descripcion: 'Prestaciones por nacimiento, maternidad, paternidad y riesgos durante el embarazo.',
    categoria: 'especifico',
    normativaBase: ['Real Decreto Legislativo 8/2015 - Capítulos II y VIII']
  },
  {
    id: 'e10',
    numero: 10,
    titulo: 'Jubilación en la modalidad contributiva',
    descripcion: 'Concepto, requisitos, cuantía. Jubilación anticipada y parcial.',
    categoria: 'especifico',
    normativaBase: ['Real Decreto Legislativo 8/2015 - Capítulo VIII', 'Ley 27/2011 actualización SS']
  },
  {
    id: 'e11',
    numero: 11,
    titulo: 'Protección por muerte y supervivencia',
    descripcion: 'Prestaciones de viudedad, orfandad y en favor de familiares.',
    categoria: 'especifico',
    normativaBase: ['Real Decreto Legislativo 8/2015 - Capítulo IX']
  },
  {
    id: 'e12',
    numero: 12,
    titulo: 'Prestaciones no contributivas y asistenciales',
    descripcion: 'Ingreso mínimo vital. Pensiones no contributivas.',
    categoria: 'especifico',
    normativaBase: [
      'Real Decreto-ley 20/2020 Ingreso Mínimo Vital',
      'Real Decreto Legislativo 8/2015 - Título VI'
    ]
  },
  {
    id: 'e13',
    numero: 13,
    titulo: 'Recursos del sistema de Seguridad Social',
    descripcion: 'Patrimonio único. Fondo de Reserva. Gestión financiera.',
    categoria: 'especifico',
    normativaBase: ['Real Decreto Legislativo 8/2015 - Título VII']
  }
]

export function getTemaById(id: string): TemaOficial | undefined {
  return TEMARIO_OFICIAL.find(t => t.id === id)
}

export function getTemasByCategoria(categoria: 'general' | 'especifico'): TemaOficial[] {
  return TEMARIO_OFICIAL.filter(t => t.categoria === categoria)
}

export function getTemasConArchivo(): TemaOficial[] {
  return TEMARIO_OFICIAL.filter(t => t.archivoAsociado)
}

export function getTemasSinArchivo(): TemaOficial[] {
  return TEMARIO_OFICIAL.filter(t => !t.archivoAsociado)
}

export function getEstadisticasTemario() {
  const total = TEMARIO_OFICIAL.length
  const conArchivo = getTemasConArchivo().length
  const sinArchivo = getTemasSinArchivo().length
  const general = getTemasByCategoria('general').length
  const especifico = getTemasByCategoria('especifico').length
  
  return {
    total,
    conArchivo,
    sinArchivo,
    porcentajeCompletado: Math.round((conArchivo / total) * 100),
    general,
    especifico
  }
}

'use client'

import { useState, useEffect } from 'react'

interface AdminHelpTopic {
  id: string
  category: string
  keywords: string[]
  question: string
  answer: string
  steps?: string[]
  tips?: string[]
}

const ADMIN_HELP_TOPICS: AdminHelpTopic[] = [
  {
    id: 'upload-pdf',
    category: '📄 Gestión de Contenido',
    keywords: ['pdf', 'subir', 'cargar', 'documento', 'temario', 'upload', 'importar'],
    question: '¿Cómo subo documentos PDF para generar preguntas?',
    answer: 'Para importar contenido educativo y generar preguntas automáticas:',
    steps: [
      'Ve a Admin → "Subir PDF"',
      'Haz clic en "Seleccionar archivo" o arrastra un PDF',
      'El PDF se procesará para extraer texto',
      'Recibirás un extracto del contenido',
      'Confirma que el contenido es correcto',
      'El PDF se almacena en la biblioteca del temario',
      'Luego puedes generar preguntas desde este contenido'
    ],
    tips: [
      'Los PDFs deben tener texto seleccionable (no imágenes)',
      'Máximo 50 MB por archivo',
      'Los PDFs con OCR (escaneados) requieren preprocesamiento',
      'Organiza por tema para mejor gestión'
    ]
  },
  {
    id: 'generate-questions',
    category: '🤖 Generación de Preguntas',
    keywords: ['generar', 'preguntas', 'ai', 'automático', 'bulto', 'batch', 'crear', 'generator'],
    question: '¿Cómo genero preguntas automáticas con IA?',
    answer: 'Utiliza la IA para crear preguntas desde contenido:',
    steps: [
      'Ve a Admin → "Generador de Preguntas"',
      'Selecciona el tipo: "Teoría" o "Prácticos"',
      'Elige el tema/área de la lista',
      'Selecciona un documento fuente (PDF cargado)',
      'Configura:',
      '   • Número de preguntas a generar (1-50)',
      '   • Dificultad: Básica, Media, Avanzada',
      '   • Tipo: Opción múltiple, V/F, Desarrollo',
      'Haz clic en "Generar con IA"',
      'Espera a que la IA procese el contenido',
      'Revisa las preguntas generadas',
      'Edita y ajusta si es necesario',
      'Haz clic en "Guardar Preguntas"'
    ],
    tips: [
      'La calidad mejora con contenido bien estructurado',
      'Siempre revisa y edita las preguntas generadas',
      'Combina generación automática con edición manual',
      'Las preguntas se guardan como borrador primero',
      'Usa "Publicar" cuando estén listas para usuarios'
    ]
  },
  {
    id: 'bulk-questions',
    category: '🤖 Generación de Preguntas',
    keywords: ['bulto', 'lote', 'batch', 'masivo', 'muchas', 'cantidad', 'bulk generate'],
    question: '¿Cómo genero muchas preguntas en lote?',
    answer: 'Genera múltiples preguntas de una vez desde varios documentos:',
    steps: [
      'Ve a Admin → "Generador Masivo de Preguntas"',
      'Selecciona múltiples temas con checkboxes',
      'Selecciona rango de dificultad',
      'Configura el número de preguntas por tema',
      'Opcionalmente, limita documentos fuente',
      'Haz clic en "Generar Lote"',
      'El sistema procesará en segundo plano',
      'Verás progreso en tiempo real',
      'Las preguntas se crean como borradores',
      'Revísalas en "Preguntas Pendientes de Revisión"'
    ],
    tips: [
      'Mejor para crear contenido inicial en volumen',
      'Puede tomar 5-30 minutos según cantidad',
      'Todas las preguntas se marcan para revisión',
      'No se publican automáticamente (debes aprobarlas)',
      'Ideal ejecutar en horarios de bajo uso'
    ]
  },
  {
    id: 'manage-questions',
    category: '📝 Gestión de Preguntas',
    keywords: ['editar', 'preguntas', 'modificar', 'eliminar', 'archivar', 'manage', 'gestionar'],
    question: '¿Cómo edito, elimino o archivo preguntas?',
    answer: 'Administra el banco completo de preguntas:',
    steps: [
      'Ve a Admin → "Gestionar Preguntas"',
      'Busca preguntas por:',
      '   • Tema',
      '   • Tipo (teoría/práctico)',
      '   • Dificultad',
      '   • Estado (borrador/publicada/archivada)',
      'Haz clic en una pregunta para editarla',
      'Puedes cambiar:',
      '   • Enunciado y opciones de respuesta',
      '   • Respuesta correcta',
      '   • Explicación',
      '   • Tema asignado',
      '   • Dificultad',
      'Haz clic en "Guardar Cambios"',
      'Para eliminar: haz clic en el ícono papelera',
      'Para archivar: marca como "Archivada"'
    ],
    tips: [
      'Los cambios se aplican inmediatamente',
      'Las preguntas archivadas no aparecen a usuarios',
      'Revisa la calidad antes de publicar',
      'Mantén explicaciones claras y detalladas',
      'Las preguntas publicadas afectan estadísticas'
    ]
  },
  {
    id: 'question-quality',
    category: '📊 Calidad de Preguntas',
    keywords: ['calidad', 'revisar', 'review', 'mejorar', 'errores', 'pendiente', 'revisión'],
    question: '¿Cómo reviso y apruebo preguntas automáticas?',
    answer: 'Valida y mejora la calidad de preguntas generadas por IA:',
    steps: [
      'Ve a Admin → "Revisión de Calidad de Preguntas"',
      'Verás preguntas pendientes de revisión',
      'Para cada pregunta:',
      '   1. Lee el enunciado y opciones',
      '   2. Verifica que la respuesta correcta es válida',
      '   3. Revisa la explicación (debe ser clara)',
      '   4. Comprueba relevancia para el tema',
      'Haz clic en "✓ Aprobar" si está bien',
      'O haz clic en "✎ Editar" para mejorarla',
      'O haz clic en "✗ Rechazar" si no sirve',
      'Las aprobadas se publican automáticamente',
      'Las rechazadas se eliminan'
    ],
    tips: [
      'La calidad de IA mejora con cada feedback',
      'Aprecia mejoras en la siguiente generación',
      'Mantén estándares consistentes',
      'Una buena explicación vale más que perfección',
      'Las usuarias valoran preguntas realistas'
    ]
  },
  {
    id: 'users-management',
    category: '👥 Gestión de Usuarios',
    keywords: ['usuarios', 'usuarios', 'gestión', 'crear', 'eliminar', 'roles', 'permisos', 'administrador'],
    question: '¿Cómo gestiono usuarios y accesos?',
    answer: 'Administra cuentas de usuarios y permisos:',
    steps: [
      'Ve a Admin → "Gestión de Usuarios"',
      'Verás lista de todos los usuarios',
      'Para cada usuario puedes:',
      '   • Ver estado (activo/inactivo)',
      '   • Ver fecha de registro',
      '   • Ver última actividad',
      '   • Ver suscripción actual',
      '   • Ver intentos de examen',
      'Para crear usuario:',
      '   1. Haz clic en "Crear Usuario"',
      '   2. Introduce email y contraseña',
      '   3. Asigna rol (usuario/moderador/admin)',
      '   4. Guarda',
      'Para modificar:',
      '   1. Haz clic en el usuario',
      '   2. Cambia role/permisos',
      '   3. Guarda cambios',
      'Para bloquear/eliminar:',
      '   1. Abre el usuario',
      '   2. Haz clic en "Bloquear" o "Eliminar"',
      '   3. Confirma la acción'
    ],
    tips: [
      'Los admins pueden hacer cualquier acción',
      'Los moderadores pueden revisar contenido',
      'Bloquea usuarios con comportamiento inapropiado',
      'Documenta cambios importantes',
      'Revisa regularmente nuevos registros'
    ]
  },
  {
    id: 'statistics',
    category: '📊 Estadísticas y Monitoreo',
    keywords: ['estadísticas', 'admin', 'analytics', 'métricas', 'reportes', 'datos', 'usuarios activos'],
    question: '¿Cómo veo estadísticas de la plataforma?',
    answer: 'Monitora el rendimiento y uso de la plataforma:',
    steps: [
      'Ve a Admin → "Estadísticas"',
      'Verás dashboards con:',
      '   📊 Total de usuarios registrados',
      '   💰 Ingresos mensuales',
      '   ✅ Preguntas respondidas hoy',
      '   🎯 Tasa de aprobación en examen',
      '   🔥 Usuarios activos últimas 24h',
      '   📈 Crecimiento semanal/mensual',
      'Por tema:',
      '   • Preguntas más intentadas',
      '   • Tasa de acierto por tema',
      '   • Temas más estudiados',
      'Por usuario:',
      '   • Top estudiadores',
      '   • Usuarios con más intentos',
      '   • Distribución por suscripción',
      'Descargar reportes en Excel'
    ],
    tips: [
      'Revisa semanalmente tendencias de uso',
      'Identifica temas con bajo rendimiento',
      'Usa datos para mejorar contenido',
      'Comunica progreso a stakeholders',
      'Compara con períodos anteriores'
    ]
  },
  {
    id: 'monetization-admin',
    category: '💰 Monetización',
    keywords: ['dinero', 'publicidad', 'adsense', 'patreon', 'ko-fi', 'donaciones', 'suscripción', 'stripe'],
    question: '¿Cómo configuro monetización (anuncios, Ko-fi, etc.)?',
    answer: 'Activa opciones de generación de ingresos:',
    steps: [
      'Ve a Admin → "Monetización"',
      'Encontrarás 5 secciones principales:',
      '',
      '🎬 1. PUBLICIDAD (Google AdSense)',
      '   • Activa: Toggle "Habilitar Publicidad"',
      '   • Tu ID de cliente: ca-pub-XXXXXXXX',
      '   (Obtenlo desde Google AdSense)',
      '   • Los anuncios aparecen en dashboard y fin de test',
      '',
      '☕ 2. DONACIONES',
      '   • Activa: Toggle "Habilitar Donaciones"',
      '   • Patreon URL: https://patreon.com/tu_usuario',
      '   • Ko-fi URL: https://ko-fi.com/tu_usuario',
      '   • Botones aparecen en dashboard',
      '',
      '📚 3. AFILIADOS (Amazon)',
      '   • Activa: Toggle "Habilitar Afiliados"',
      '   • Tu ID de afiliado: (obtén de Amazon Associates)',
      '   • Comisiones en compras de usuarios',
      '',
      '🎗️ 4. PATROCINADORES',
      '   • Activa: Toggle "Permitir Patrocinadores"',
      '   • Espacio para logos de academias/editoriales',
      '',
      '⭐ 5. CONTENIDO PREMIUM (Opcional)',
      '   • Activa: Toggle "Habilitar Premium"',
      '   • Configura precio básico y premium',
      '   • Selecciona moneda (EUR, USD, GBP)',
      '',
      'Guarda los cambios al terminar'
    ],
    tips: [
      'Empieza con donaciones (Ko-fi) - menos invasivo',
      'Añade publicidad después de 1-2 meses',
      'No actives todo a la vez (abruma usuarios)',
      'Monitorea impacto en tasas de retención',
      'Los ingresos aparecen en Estadísticas'
    ]
  },
  {
    id: 'error-monitoring',
    category: '🔍 Monitoreo y Debugging',
    keywords: ['errores', 'logs', 'debug', 'problemas', 'monitoring', 'error tracking', 'diagnostics'],
    question: '¿Cómo monitoreo errores de la plataforma?',
    answer: 'Detecta y resuelve problemas técnicos rápidamente:',
    steps: [
      'Ve a Admin → "Monitoreo de Errores"',
      'Verás listado de errores recientes con:',
      '   • Mensaje de error',
      '   • Ruta donde ocurrió',
      '   • Usuario afectado',
      '   • Timestamp exacto',
      '   • Stack trace completo',
      'Haz clic en un error para ver detalles',
      'Puedes:',
      '   • Marcar como resuelto',
      '   • Asignar a desarrollador',
      '   • Añadir notas',
      '   • Exportar para debug',
      'Ver patrones: errores más frecuentes',
      'Filtrar por:',
      '   • Fecha',
      '   • Tipo de error',
      '   • Usuario',
      '   • Página afectada'
    ],
    tips: [
      'Los errores se capturan automáticamente',
      'Revisa regularmente para problemas',
      'Comunica al equipo técnico si ve patrones',
      'Los usuarios no ven estos errores internos',
      'Exporta reportes para análisis'
    ]
  },
  {
    id: 'classrooms',
    category: '🎓 Aulas Virtuales',
    keywords: ['aula', 'virtual', 'clase', 'crear', 'sesión', 'livekit', 'jitsi', 'videollamada'],
    question: '¿Cómo creo y gestiono aulas virtuales?',
    answer: 'Configura espacios para clases en vivo:',
    steps: [
      'Ve a Admin → "Aulas Virtuales"',
      'Haz clic en "Crear Nueva Aula"',
      'Completa la información:',
      '   • Nombre del aula',
      '   • Descripción',
      '   • Horarios de sesiones',
      '   • Número máximo de participantes',
      '   • Contraseña (opcional)',
      '   • Tutor/Instructor asignado',
      'Configura:',
      '   • Temas que se cubrirán',
      '   • Recursos disponibles',
      '   • Grabación de sesiones (sí/no)',
      'Haz clic en "Crear Aula"',
      'Para programar sesiones:',
      '   1. Abre el aula creada',
      '   2. Haz clic en "Nueva Sesión"',
      '   3. Introduce fecha y hora',
      '   4. Invita a participantes',
      '   5. Se envían notificaciones automáticas',
      'Para eliminar: marca como "Archivada"'
    ],
    tips: [
      'Las aulas requieren conexión estable',
      'Los horarios deben evitar horas punta',
      'Comunica cambios con anticipación',
      'Graba sesiones para usuarios que no puedan asistir',
      'Mantén límite de participantes para calidad'
    ]
  },
  {
    id: 'email-templates',
    category: '📧 Comunicaciones',
    keywords: ['email', 'correo', 'plantilla', 'notificación', 'mensaje', 'usuarios', 'comunicar'],
    question: '¿Cómo envío emails y notificaciones a usuarios?',
    answer: 'Comunícate con tus usuarios de forma efectiva:',
    steps: [
      'Ve a Admin → "Enviar Email"',
      'Selecciona destinatarios:',
      '   • Todos los usuarios',
      '   • Usuarios con suscripción activa',
      '   • Usuarios inactivos (últimos 30 días)',
      '   • Por tema de interés',
      '   • Selección manual',
      'Elige plantilla o crea personalizado:',
      '   • Verificación de email',
      '   • Reset de contraseña',
      '   • Nuevas preguntas publicadas',
      '   • Invitación a aula virtual',
      '   • Recordatorio de renovación',
      '   • Anuncio importante',
      'Personaliza:',
      '   • Asunto',
      '   • Contenido (markdown)',
      '   • Firma',
      'Preview antes de enviar',
      'Haz clic en "Enviar"',
      'Ver estadísticas: abiertos, clicks, bounces'
    ],
    tips: [
      'Evita spam: máximo 2 emails por semana',
      'Personaliza con nombre del usuario',
      'Usa asuntos claros y atractivos',
      'Incluye botón de acción principal',
      'Monitorea tasa de unsubscribe'
    ]
  },
  {
    id: 'backups',
    category: '💾 Bases de Datos',
    keywords: ['backup', 'datos', 'descargar', 'exportar', 'base de datos', 'respaldo', 'restore'],
    question: '¿Cómo hago backup de los datos?',
    answer: 'Protege los datos de la plataforma:',
    steps: [
      'Ve a Admin → "Gestión de Datos"',
      'Opciones disponibles:',
      '',
      'BACKUP COMPLETO:',
      '   1. Haz clic en "Crear Backup"',
      '   2. Se comprime toda la BD',
      '   3. Se descarga automáticamente (.sql)',
      '   4. Guarda en ubicación segura',
      '',
      'EXPORTAR DATOS:',
      '   1. "Exportar Usuarios" (Excel)',
      '   2. "Exportar Preguntas" (CSV)',
      '   3. "Exportar Estadísticas" (Excel)',
      '',
      'RESTAURAR BACKUP:',
      '   1. Haz clic en "Restaurar"',
      '   2. Selecciona archivo .sql',
      '   3. ⚠️ Esto reemplaza datos actuales',
      '   4. Confirma operación',
      '',
      'SINCRONIZAR BASE DE DATOS:',
      '   1. Haz clic en "Verificar Integridad"',
      '   2. El sistema verifica consistencia',
      '   3. Repara errores si los encuentra'
    ],
    tips: [
      'Haz backup semanal como mínimo',
      'Almacena backups en multiple ubicaciones',
      'Etiqueta backups con fecha',
      'Prueba restauraciones regularmente',
      'Esto es crítico para continuidad del servicio'
    ]
  },
  {
    id: 'settings',
    category: '⚙️ Configuración General',
    keywords: ['configuración', 'settings', 'general', 'site', 'información', 'personalizar'],
    question: '¿Dónde cambio configuración general de la plataforma?',
    answer: 'Personaliza aspectos globales de la plataforma:',
    steps: [
      'Ve a Admin → "Configuración del Sitio"',
      'Secciones disponibles:',
      '',
      '🌐 INFORMACIÓN GENERAL',
      '   • Nombre de la plataforma',
      '   • Descripción/tagline',
      '   • Logo personalizado',
      '   • Favicon',
      '   • URL del sitio',
      '',
      '🎨 TEMA Y COLORES',
      '   • Color primario (azul, verde, etc)',
      '   • Color secundario',
      '   • Modo oscuro sí/no',
      '',
      '🔐 SEGURIDAD',
      '   • Requerir verificación de email',
      '   • CAPTCHA en registro',
      '   • 2FA (autenticación de 2 factores)',
      '',
      '📧 EMAIL',
      '   • Dirección de soporte',
      '   • Nombre del remitente',
      '   • Servidor SMTP personalizado',
      '',
      '💳 PAGOS (Stripe)',
      '   • Claves API de Stripe',
      '   • Porcentaje de comisión',
      '   • Moneda predeterminada',
      '',
      'Guarda cambios al terminar'
    ],
    tips: [
      'Los cambios de tema se ven inmediatamente',
      'Las claves API nunca se muestran (por seguridad)',
      'Verifica cambios en navegador privado',
      'Algunos cambios requieren recarga de página',
      'Documenta cambios importantes'
    ]
  }
]

interface AdminHelpModalProps {
  onClose: () => void
}

export default function AdminHelpModal({ onClose }: AdminHelpModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<AdminHelpTopic | null>(null)
  const [filteredTopics, setFilteredTopics] = useState<AdminHelpTopic[]>(ADMIN_HELP_TOPICS)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    if (!searchQuery.trim()) {
      if (activeCategory) {
        setFilteredTopics(ADMIN_HELP_TOPICS.filter(t => t.category === activeCategory))
      } else {
        setFilteredTopics(ADMIN_HELP_TOPICS)
      }
      return
    }

    const query = searchQuery.toLowerCase()
    const results = ADMIN_HELP_TOPICS.filter(topic =>
      topic.question.toLowerCase().includes(query) ||
      topic.answer.toLowerCase().includes(query) ||
      topic.keywords.some(kw => kw.includes(query))
    )

    setFilteredTopics(results)
  }, [searchQuery, activeCategory])

  const categories = Array.from(new Set(ADMIN_HELP_TOPICS.map(t => t.category)))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white bg-opacity-20 p-3 rounded-xl">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Centro de Ayuda - Admin</h2>
                <p className="text-purple-100 text-sm">Guía completa de funciones administrativas</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Búsqueda */}
          <div className="mt-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Busca una función administrativo..."
                className="w-full px-5 py-3 pl-12 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-white placeholder-purple-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                autoFocus
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 absolute left-4 top-3.5 text-purple-100"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex h-[calc(90vh-200px)]">
          {/* Sidebar - Categorías */}
          {!selectedTopic && (
            <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
              <div className="p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Categorías</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setActiveCategory(null)
                      setSearchQuery('')
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition ${
                      !activeCategory ? 'bg-purple-100 text-purple-700 font-semibold' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    📚 Todas las categorías
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        setActiveCategory(cat)
                        setSearchQuery('')
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
                        activeCategory === cat ? 'bg-purple-100 text-purple-700 font-semibold' : 'hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Lista de preguntas o detalle */}
          <div className="flex-1 overflow-y-auto">
            {!selectedTopic ? (
              <div className="p-6">
                {searchQuery && (
                  <p className="text-sm text-gray-600 mb-4">
                    {filteredTopics.length} resultado{filteredTopics.length !== 1 ? 's' : ''} para "{searchQuery}"
                  </p>
                )}

                <div className="space-y-3">
                  {filteredTopics.map(topic => (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopic(topic)}
                      className="w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-purple-500 hover:shadow-md transition group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <span className="text-xs text-gray-500 font-medium">{topic.category}</span>
                          <h4 className="font-semibold text-gray-900 group-hover:text-purple-600 transition mt-1">
                            {topic.question}
                          </h4>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}

                  {filteredTopics.length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🔍</div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">No encontramos resultados</h3>
                      <p className="text-gray-600">Intenta con otros términos o navega por categorías</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6">
                {/* Botón volver */}
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-semibold mb-6 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Volver a funciones
                </button>

                {/* Detalle del tema */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-6">
                  <span className="text-sm font-semibold text-purple-600">{selectedTopic.category}</span>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2 mb-3">{selectedTopic.question}</h3>
                  <p className="text-gray-700">{selectedTopic.answer}</p>
                </div>

                {/* Pasos */}
                {selectedTopic.steps && selectedTopic.steps.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="bg-purple-100 text-purple-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">📝</span>
                      Pasos a seguir:
                    </h4>
                    <div className="space-y-3">
                      {selectedTopic.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                            {idx + 1}
                          </div>
                          <p className="flex-1 text-gray-700 pt-1">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tips */}
                {selectedTopic.tips && selectedTopic.tips.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <span>💡</span>
                      Consejos útiles:
                    </h4>
                    <ul className="space-y-2">
                      {selectedTopic.tips.map((tip, idx) => (
                        <li key={idx} className="flex gap-2 text-gray-700">
                          <span className="text-yellow-500">•</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ayuda adicional */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="text-sm text-gray-600">
                    ¿Necesitas más ayuda? <a href="mailto:soporte@opositappss.com" className="text-purple-600 hover:text-purple-700 font-semibold">Contacta con soporte</a>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

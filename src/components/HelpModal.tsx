'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

export interface HelpTopic {
  id: string
  category: string
  keywords: string[]
  question: string
  answer: string
  steps?: string[]
  tips?: string[]
  video?: string
}

export const HELP_TOPICS: HelpTopic[] = [
  {
    id: 'classroom-join',
    category: '🎓 Aulas Virtuales',
    keywords: ['aula', 'clase', 'virtual', 'jitsi', 'entrar', 'unirse', 'acceder', 'videollamada'],
    question: '¿Cómo entro a un aula virtual?',
    answer: 'Para acceder a tus aulas virtuales y unirte a una clase en vivo:',
    steps: [
      'Ve al Dashboard principal',
      'Haz clic en la tarjeta "Aulas Virtuales" o en el menú lateral',
      'Verás todas las aulas a las que estás inscrito',
      'Haz clic en "Entrar al Aula" en el aula deseada',
      'Si tiene contraseña, introdúcela cuando se solicite',
      'Permite el acceso a tu cámara y micrófono cuando el navegador lo pida',
      'Haz clic en "Entrar al Aula Virtual" para unirte'
    ],
    tips: [
      'Usa auriculares para evitar eco',
      'Comprueba tu conexión a internet antes de entrar',
      'Las clases programadas aparecen en "Próximas sesiones"'
    ]
  },
  {
    id: 'classroom-controls',
    category: '🎓 Aulas Virtuales',
    keywords: ['controles', 'cámara', 'micrófono', 'compartir', 'pantalla', 'chat', 'mano', 'levantar'],
    question: '¿Qué controles tengo en el aula virtual?',
    answer: 'Durante la clase virtual tienes varios controles disponibles:',
    steps: [
      '📹 Cámara: Botón para activar/desactivar tu video',
      '🎤 Micrófono: Botón para activar/desactivar tu audio',
      '💬 Chat: Accede al chat de texto con otros participantes',
      '✋ Levantar mano: Solicita turno de palabra al moderador',
      '🖥️ Compartir pantalla: Si tienes permiso, comparte tu pantalla',
      '⚙️ Configuración: Ajusta calidad de video, audio, fondos virtuales',
      '📊 Estadísticas: Ver calidad de tu conexión'
    ],
    tips: [
      'Mantén el micrófono silenciado cuando no hables',
      'Usa el chat para preguntas sin interrumpir',
      'El fondo virtual está en Configuración → Fondos'
    ]
  },
  {
    id: 'exam-simulation',
    category: '📝 Simulacros de Examen',
    keywords: ['examen', 'simulacro', 'test', 'tiempo', 'cronómetro', '120', 'minutos', 'empezar'],
    question: '¿Cómo funcionan los simulacros de examen?',
    answer: 'Los simulacros replican las condiciones reales del examen de oposición:',
    steps: [
      'Ve a Dashboard → "Simulacros de Examen"',
      'Selecciona un simulacro disponible',
      'Lee las instrucciones: 70 preguntas + 15 de reserva, 120 minutos',
      'Haz clic en "Comenzar Simulacro"',
      'El cronómetro de 120 minutos se activa automáticamente',
      'Responde todas las preguntas antes de que termine el tiempo',
      'Haz clic en "Finalizar Examen" cuando termines',
      'Revisa tus resultados y explicaciones de errores'
    ],
    tips: [
      'No puedes pausar el simulacro una vez iniciado',
      'Administra bien tu tiempo: ~1.4 minutos por pregunta',
      'Revisa todas las respuestas antes de finalizar',
      'Los resultados se guardan en tu historial'
    ]
  },
  {
    id: 'questionnaires',
    category: '📚 Cuestionarios',
    keywords: ['cuestionario', 'teoría', 'práctico', 'preguntas', 'respuestas', 'hacer', 'empezar', 'test'],
    question: '¿Cómo hacer cuestionarios de teoría o prácticos?',
    answer: 'Practica con cuestionarios específicos por tema:',
    steps: [
      'En el Dashboard, elige entre:',
      '   • "Cuestionarios de Temario" (teoría)',
      '   • "Supuestos Prácticos" (casos prácticos)',
      'Verás la lista de cuestionarios disponibles',
      'Haz clic en "Realizar Cuestionario"',
      'Lee cada pregunta y selecciona tu respuesta',
      'Al finalizar, haz clic en "Enviar Respuestas"',
      'Recibirás tu puntuación inmediata',
      'Revisa explicaciones de respuestas incorrectas'
    ],
    tips: [
      'No hay límite de tiempo (excepto en simulacros)',
      'Puedes repetir cuestionarios las veces que quieras',
      'Las explicaciones te ayudan a aprender de los errores'
    ]
  },
  {
    id: 'statistics',
    category: '📊 Estadísticas',
    keywords: ['estadísticas', 'progreso', 'resultados', 'puntuación', 'historial', 'ver', 'analizar'],
    question: '¿Dónde veo mis estadísticas y progreso?',
    answer: 'Analiza tu rendimiento y progreso de aprendizaje:',
    steps: [
      'Ve a Dashboard → "Estadísticas de Aprendizaje"',
      'Verás un panel completo con:',
      '   • Tasa de acierto global',
      '   • Cuestionarios completados',
      '   • Temas con más errores',
      '   • Evolución temporal',
      '   • Comparativa por tipo (teoría/prácticos)',
      'Usa los filtros para ver periodos específicos',
      'Identifica tus áreas de mejora'
    ],
    tips: [
      'Revisa tus estadísticas semanalmente',
      'Enfócate en temas con menor puntuación',
      'La práctica constante mejora tus resultados'
    ]
  },
  {
    id: 'forum',
    category: '🗣️ Foro',
    keywords: ['foro', 'dudas', 'preguntas', 'comunidad', 'ayuda', 'publicar', 'responder', 'debate'],
    question: '¿Cómo usar el foro de supuestos?',
    answer: 'Comparte dudas y aprende con la comunidad:',
    steps: [
      'Ve a Dashboard → "Foro de Supuestos"',
      'Explora hilos existentes o crea uno nuevo',
      'Para crear: haz clic en "Nuevo Hilo"',
      'Escribe un título descriptivo',
      'Detalla tu duda o aportación en el contenido',
      'Publica y espera respuestas de la comunidad',
      'Responde a otros usuarios para ayudar'
    ],
    tips: [
      'Busca antes de crear un hilo duplicado',
      'Sé específico en tus preguntas',
      'Agradece las respuestas útiles'
    ]
  },
  {
    id: 'subscription',
    category: '💰 Suscripción',
    keywords: ['suscripción', 'pagar', 'plan', 'premium', 'precio', 'stripe', 'renovar', 'cancelar'],
    question: '¿Cómo gestiono mi suscripción?',
    answer: 'Administra tu plan de suscripción:',
    steps: [
      'Ve a tu perfil de usuario',
      'Accede a "Gestión de Suscripción"',
      'Verás tu plan actual y fecha de renovación',
      'Para cambiar de plan: selecciona el nuevo plan',
      'Para cancelar: haz clic en "Cancelar Suscripción"',
      'Los pagos se procesan de forma segura con Stripe'
    ],
    tips: [
      'Cancela antes de la renovación para evitar cargos',
      'Los planes premium dan acceso a todo el contenido',
      'Contacta soporte si tienes problemas de pago'
    ]
  },
  {
    id: 'password-reset',
    category: '🔐 Cuenta',
    keywords: ['contraseña', 'olvidé', 'recuperar', 'cambiar', 'restablecer', 'password', 'login'],
    question: '¿Olvidé mi contraseña, cómo la recupero?',
    answer: 'Restablece tu contraseña fácilmente:',
    steps: [
      'Ve a la página de Login',
      'Haz clic en "¿Olvidaste tu contraseña?"',
      'Introduce tu email registrado',
      'Recibirás un email con un enlace de restablecimiento',
      'Haz clic en el enlace (válido por 1 hora)',
      'Introduce tu nueva contraseña',
      'Confirma y haz login con la nueva contraseña'
    ],
    tips: [
      'Revisa la carpeta de spam si no recibes el email',
      'Usa una contraseña segura (mínimo 8 caracteres)',
      'No compartas tu contraseña con nadie'
    ]
  },
  {
    id: 'email-verify',
    category: '🔐 Cuenta',
    keywords: ['email', 'verificar', 'confirmar', 'activar', 'cuenta', 'correo', 'verificación'],
    question: '¿Cómo verifico mi email?',
    answer: 'Activa tu cuenta verificando tu email:',
    steps: [
      'Tras registrarte, recibirás un email de verificación',
      'Abre el email de "opositAPPSS"',
      'Haz clic en el botón "Verificar Email"',
      'Serás redirigido a la plataforma',
      'Tu cuenta quedará activada automáticamente',
      'Ya puedes hacer login normalmente'
    ],
    tips: [
      'El enlace expira en 24 horas',
      'Revisa spam/promociones si no lo ves',
      'Contacta soporte si no recibes el email'
    ]
  },
  {
    id: 'technical-issues',
    category: '🔧 Problemas Técnicos',
    keywords: ['error', 'no funciona', 'problema', 'bug', 'fallo', 'carga', 'lento', 'caído'],
    question: 'Tengo un problema técnico, ¿qué hago?',
    answer: 'Pasos para resolver problemas comunes:',
    steps: [
      '1. Refresca la página (F5 o Cmd+R)',
      '2. Limpia caché del navegador',
      '3. Prueba en modo incógnito',
      '4. Verifica tu conexión a internet',
      '5. Prueba con otro navegador (Chrome, Firefox, Safari)',
      '6. Cierra sesión y vuelve a entrar',
      '7. Si persiste, contacta con soporte'
    ],
    tips: [
      'Anota el mensaje de error si aparece',
      'Indica qué estabas haciendo cuando ocurrió',
      'Incluye navegador y sistema operativo al reportar'
    ]
  },
  {
    id: 'mobile-app',
    category: '📱 Móvil',
    keywords: ['móvil', 'celular', 'app', 'aplicación', 'teléfono', 'tablet', 'android', 'ios'],
    question: '¿Puedo usar opositAPPSS desde el móvil?',
    answer: 'Sí, la plataforma es totalmente responsive:',
    steps: [
      'Abre tu navegador móvil (Chrome, Safari)',
      'Ve a la URL de opositAPPSS',
      'Haz login normalmente',
      'Todas las funciones están disponibles',
      'Para una mejor experiencia:',
      '   • Añade a pantalla de inicio (como app)',
      '   • Usa en horizontal para aulas virtuales',
      '   • Mantén el navegador actualizado'
    ],
    tips: [
      'Los simulacros funcionan perfectamente en móvil',
      'Las aulas virtuales requieren buena conexión WiFi/4G',
      'Algunos controles están optimizados para pantallas táctiles'
    ]
  },
  {
    id: 'analytics-dashboard',
    category: '📊 Estadísticas',
    keywords: ['estadísticas', 'avanzadas', 'analytics', 'progreso', 'gráficas', 'rendimiento', 'métricas'],
    question: '¿Cómo funcionan las Estadísticas Avanzadas?',
    answer: 'El dashboard de estadísticas avanzadas te muestra métricas detalladas:',
    steps: [
      'Ve a Dashboard → "Estadísticas Avanzadas"',
      'Verás 4 tarjetas principales:',
      '   • Precisión global (%)',
      '   • Racha de estudio actual',
      '   • Cuestionarios completados',
      '   • Total de preguntas respondidas',
      'Gráfica de progreso de últimos 30 días',
      'Rendimiento por tema con porcentajes',
      'Top 5 preguntas más falladas',
      'Historial de últimos 10 intentos'
    ],
    tips: [
      'La precisión se calcula automáticamente',
      'Los datos se actualizan en tiempo real',
      'Identifica tus temas débiles con el desglose',
      'Usa las preguntas falladas para repasar'
    ]
  },
  {
    id: 'failed-questions',
    category: '❌ Preguntas Falladas',
    keywords: ['falladas', 'errores', 'incorrectas', 'revisar', 'repasar', 'equivocadas'],
    question: '¿Cómo usar el banco de preguntas falladas?',
    answer: 'Repasa todas las preguntas que has fallado:',
    steps: [
      'Ve a Dashboard → "Falladas"',
      'Verás listado de preguntas que has fallado',
      'Cada pregunta muestra:',
      '   • Número de veces que la has fallado',
      '   • Tema al que pertenece',
      '   • Última vez que la fallaste',
      'Haz clic en "Ver respuesta" para ver explicación',
      'Las opciones se marcan (correcta en verde)',
      'Estudia la explicación para aprender'
    ],
    tips: [
      'Repasa estas preguntas regularmente',
      'Las que has fallado más veces están primero',
      'Intenta entender el por qué de cada error',
      'Combina con repetición espaciada'
    ]
  },
  {
    id: 'marked-questions',
    category: '📌 Preguntas Marcadas',
    keywords: ['marcadas', 'guardadas', 'marcar', 'duda', 'repasar', 'importante', 'favoritas'],
    question: '¿Cómo marcar preguntas para repasar después?',
    answer: 'Marca preguntas que quieras revisar más tarde:',
    steps: [
      'Durante un cuestionario o estudio, marca preguntas',
      'Ve a Dashboard → "Marcadas"',
      'Filtra por tipo:',
      '   • 🤔 Dudas (preguntas que no entiendes)',
      '   • 📚 Repasar (necesitas practicar más)',
      '   • ⭐ Importantes (temas clave)',
      'Puedes agregar notas personales a cada pregunta',
      'Elimina marcas cuando ya las domines',
      'Organízate creando tu propia lista de estudio'
    ],
    tips: [
      'Marca preguntas difíciles en el momento',
      'Usa las notas para recordar conceptos clave',
      'Repasa tus dudas antes de simulacros',
      'Las marcas son privadas (solo tú las ves)'
    ]
  },
  {
    id: 'spaced-repetition',
    category: '🧠 Repetición Espaciada',
    keywords: ['repetición', 'espaciada', 'spaced', 'repaso', 'inteligente', 'algoritmo', 'sm2', 'tarjetas'],
    question: '¿Qué es la repetición espaciada y cómo funciona?',
    answer: 'Sistema científico que optimiza tu aprendizaje a largo plazo:',
    steps: [
      'Ve a Dashboard → "Repaso Inteligente"',
      'El sistema te muestra hasta 20 tarjetas pendientes',
      'Para cada pregunta:',
      '   1. Lee la pregunta',
      '   2. Haz clic en "Mostrar Respuesta"',
      '   3. Califica qué tan bien recordaste (0-5):',
      '      • 0: No recordé → Vuelve mañana',
      '      • 1-2: Difícil → Intervalo corto',
      '      • 3: Bien → Intervalo medio',
      '      • 4-5: Fácil → Intervalo largo',
      'El algoritmo SM-2 ajusta automáticamente cuándo volver a repasar',
      'Las preguntas se espacían más cuanto mejor las recuerdas'
    ],
    tips: [
      'Sé honesto al calificar (aprenderás mejor)',
      'Las tarjetas difíciles aparecen más frecuentemente',
      'Repasa diariamente para mejores resultados',
      'Combina con otros métodos de estudio'
    ]
  },
  {
    id: 'study-streak',
    category: '🔥 Racha de Estudio',
    keywords: ['racha', 'días', 'consecutivos', 'estudiar', 'diario', 'motivación', 'constancia'],
    question: '¿Cómo funciona el sistema de rachas?',
    answer: 'Mantén tu motivación estudiando cada día:',
    steps: [
      'Tu racha se actualiza automáticamente al:',
      '   • Completar un cuestionario',
      '   • Hacer un simulacro',
      '   • Usar repetición espaciada',
      'Si estudias días consecutivos: racha +1',
      'Si saltas un día: racha reinicia a 1',
      'Ve tu racha actual en:',
      '   • Estadísticas Avanzadas',
      '   • Dashboard principal',
      'Compite con tu racha más larga histórica'
    ],
    tips: [
      'Estudia aunque sea 10 minutos al día',
      'Las rachas largas desbloquean logros',
      'Tu racha más larga se guarda siempre',
      'La constancia es clave para aprobar'
    ]
  },
  {
    id: 'achievements',
    category: '🏆 Logros',
    keywords: ['logros', 'badges', 'medallas', 'puntos', 'desbloquear', 'achievements', 'recompensas'],
    question: '¿Cómo funcionan los logros y badges?',
    answer: 'Sistema gamificado para motivar tu progreso:',
    steps: [
      'Ve a Dashboard → "Logros"',
      'Verás dos secciones:',
      '   • ✅ Desbloqueados (tus logros conseguidos)',
      '   • 🔒 Bloqueados (pendientes por conseguir)',
      'Cada logro tiene:',
      '   • Icono distintivo',
      '   • Descripción del requisito',
      '   • Puntos que otorga',
      'Los logros se desbloquean automáticamente al cumplir requisitos',
      'Acumula puntos para subir de nivel'
    ],
    tips: [
      '12 logros disponibles inicialmente',
      'Desde 10 hasta 1000 puntos por logro',
      'Los logros más difíciles dan más puntos',
      'Consulta los requisitos en la página de logros'
    ]
  },
  {
    id: 'exam-mode',
    category: '⏱️ Modo Examen',
    keywords: ['modo', 'examen', 'cronómetro', 'tiempo', 'real', 'estricto', 'oficial', '120', 'minutos'],
    question: '¿En qué se diferencia el Modo Examen de los simulacros?',
    answer: 'El Modo Examen replica exactamente las condiciones del examen oficial:',
    steps: [
      'Ve a Dashboard → "Modo Examen"',
      'Diferencias con simulacros normales:',
      '   ❌ NO puedes volver a preguntas anteriores',
      '   ❌ NO puedes pausar el examen',
      '   ⏱️ Cronómetro de 120 minutos en cuenta regresiva',
      '   📊 Alerta cuando quedan 10 minutos',
      '   ✅ Finalización automática al acabar tiempo',
      'Formato oficial:',
      '   • 85 preguntas totales',
      '   • Preguntas aleatorias de todos los temas',
      '   • Evaluación al finalizar (aprobado 50%+)',
      'Resultados muestran: correctas, incorrectas, en blanco'
    ],
    tips: [
      'Úsalo cuando te sientas preparado',
      'Practica antes con simulacros normales',
      'Administra bien el tiempo (~1.4 min/pregunta)',
      'Ideal para la semana previa al examen oficial'
    ]
  }
]

interface HelpModalProps {
  onClose: () => void
}

export default function HelpModal({ onClose }: HelpModalProps) {
  const { data: session } = useSession()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTopic, setSelectedTopic] = useState<HelpTopic | null>(null)
  const [filteredTopics, setFilteredTopics] = useState<HelpTopic[]>(HELP_TOPICS)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [aiQuery, setAiQuery] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([])

  const askAI = async () => {
    if (!aiQuery.trim()) return

    setAiLoading(true)
    setAiResponse('')

    // Añadir pregunta del usuario al historial
    const newHistory = [...chatHistory, { role: 'user' as const, content: aiQuery }]
    setChatHistory(newHistory)

    try {
      const res = await fetch('/api/help/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: aiQuery,
          conversationHistory: chatHistory
        })
      })

      if (res.ok) {
        const data = await res.json()
        setAiResponse(data.response)
        setChatHistory([...newHistory, { role: 'assistant', content: data.response }])
        
        // Log de debug si hay información disponible
        if (data.debug) {
          console.log('[HelpModal] Debug Info:', data.debug)
        }
      } else {
        const error = await res.json()
        setAiResponse(`❌ Error: ${error.error || 'No pude obtener respuesta'}${error.debug ? `\n\n📊 Info: ${JSON.stringify(error.debug)}` : ''}`)
      }
    } catch (error) {
      setAiResponse('❌ Error de conexión. Inténtalo de nuevo.')
    } finally {
      setAiLoading(false)
      setAiQuery('')
    }
  }

  useEffect(() => {
    if (!searchQuery.trim()) {
      if (activeCategory) {
        setFilteredTopics(HELP_TOPICS.filter(t => t.category === activeCategory))
      } else {
        setFilteredTopics(HELP_TOPICS)
      }
      return
    }

    const query = searchQuery.toLowerCase()
    const results = HELP_TOPICS.filter(topic =>
      topic.question.toLowerCase().includes(query) ||
      topic.answer.toLowerCase().includes(query) ||
      topic.keywords.some(kw => kw.includes(query))
    )

    setFilteredTopics(results)
  }, [searchQuery, activeCategory])

  const categories = Array.from(new Set(HELP_TOPICS.map(t => t.category)))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
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
                    d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Centro de Ayuda</h2>
                <p className="text-blue-100 text-sm">¿En qué podemos ayudarte, {session?.user?.name || 'usuario'}?</p>
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
          <div className="mt-4 space-y-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Escribe tu pregunta o duda..."
                className="w-full px-5 py-3 pl-12 bg-white bg-opacity-20 border border-white border-opacity-30 rounded-xl text-white placeholder-blue-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                autoFocus={!showAIAssistant}
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 absolute left-4 top-3.5 text-blue-100"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Botón Asistente IA */}
            <button
              onClick={() => {
                setShowAIAssistant(!showAIAssistant)
                setSelectedTopic(null)
              }}
              className={`w-full px-5 py-3 rounded-xl font-semibold transition ${
                showAIAssistant
                  ? 'bg-white text-blue-600'
                  : 'bg-white bg-opacity-20 text-white hover:bg-opacity-30'
              }`}
            >
              {showAIAssistant ? '📚 Ver Preguntas Frecuentes' : '🤖 Asistente IA Profesional'}
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex h-[calc(90vh-250px)]">
          {/* Asistente IA */}
          {showAIAssistant ? (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Introducción */}
                {chatHistory.length === 0 && (
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">🤖 Asistente Jurídico-Administrativo IA</h3>
                    <p className="text-gray-700 mb-4">
                      Hazme cualquier pregunta sobre el temario de oposiciones. Puedo analizar preguntas complejas 
                      que involucren múltiples aspectos del temario, y responder con fundamentación legal basada en:
                    </p>
                    <ul className="space-y-2 text-gray-700">
                      <li>📜 <strong>Leyes y normativas</strong> oficiales</li>
                      <li>📘 <strong>Temario General</strong> completo (23 temas)</li>
                      <li>📕 <strong>Temario Específico</strong> de la SS (13 temas)</li>
                      <li>⚖️ <strong>Documentación administrativa</strong> actualizada</li>
                    </ul>
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        💡 <strong>Ejemplo:</strong> "¿Cuáles son las diferencias entre prestación contributiva y no contributiva 
                        según la normativa vigente?"
                      </p>
                    </div>
                  </div>
                )}

                {/* Historial de chat */}
                {chatHistory.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl p-4 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-600">
                          <span>🤖</span>
                          <span>Asistente IA</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))}

                {/* Loading */}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-xl p-4">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="text-gray-600">Analizando documentación...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input de pregunta */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiQuery}
                    onChange={(e) => setAiQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !aiLoading && askAI()}
                    placeholder="Escribe tu pregunta profesional..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={aiLoading}
                    autoFocus
                  />
                  <button
                    onClick={askAI}
                    disabled={aiLoading || !aiQuery.trim()}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {aiLoading ? '⏳' : '📤'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  El asistente usa IA para buscar en toda la documentación legal y del temario
                </p>
              </div>
            </div>
          ) : (
            <>
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
                      !activeCategory ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    📚 Todos los temas
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => {
                        setActiveCategory(cat)
                        setSearchQuery('')
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition ${
                        activeCategory === cat ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100 text-gray-700'
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
                      className="w-full text-left p-4 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <span className="text-xs text-gray-500 font-medium">{topic.category}</span>
                          <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition mt-1">
                            {topic.question}
                          </h4>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}

                  {filteredTopics.length === 0 && (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🔍</div>
                      <h3 className="text-xl font-semibold text-gray-800 mb-2">No encontramos resultados</h3>
                      <p className="text-gray-600">Intenta con otras palabras clave o selecciona una categoría</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6">
                {/* Botón volver */}
                <button
                  onClick={() => setSelectedTopic(null)}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold mb-6 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Volver a preguntas
                </button>

                {/* Detalle del tema */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
                  <span className="text-sm font-semibold text-blue-600">{selectedTopic.category}</span>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2 mb-3">{selectedTopic.question}</h3>
                  <p className="text-gray-700">{selectedTopic.answer}</p>
                </div>

                {/* Pasos */}
                {selectedTopic.steps && selectedTopic.steps.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold">📝</span>
                      Pasos a seguir:
                    </h4>
                    <div className="space-y-3">
                      {selectedTopic.steps.map((step, idx) => (
                        <div key={idx} className="flex gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
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
                    ¿Sigues teniendo dudas? <a href="mailto:soporte@opositappss.com" className="text-blue-600 hover:text-blue-700 font-semibold">Contacta con soporte</a>
                  </p>
                </div>
              </div>
            )}
          </div>
          </>
          )}
        </div>
      </div>
    </div>
  )
}

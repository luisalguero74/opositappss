'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'

export default function ManualUsuario() {
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-white hover:text-blue-100 transition">
                ← Volver
              </Link>
              <h1 className="text-2xl font-bold text-white">📚 Manual de Usuario</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Índice rápido */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 dark:text-white">Índice Rápido</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <a href="#primeros-pasos" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">1. Primeros Pasos</a>
            <a href="#dashboard" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">2. Dashboard Principal</a>
            <a href="#modos-practica" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">3. Modos de Práctica</a>
            <a href="#estadisticas" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">4. Seguimiento y Estadísticas</a>
            <a href="#herramientas" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">5. Herramientas de Estudio</a>
            <a href="#funciones-avanzadas" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">6. Funciones Avanzadas</a>
            <a href="#configuracion" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">7. Configuración de Cuenta</a>
            <a href="#consejos" className="text-blue-600 hover:text-blue-800 dark:text-blue-400">8. Consejos y Mejores Prácticas</a>
          </div>
        </div>

        {/* Contenido del manual */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 prose prose-blue dark:prose-invert max-w-none">
          <ManualContent />
        </div>
      </div>
    </div>
  )
}

function ManualContent() {
  return (
    <>
      <section id="primeros-pasos" className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">1. Primeros Pasos</h2>
        
        <h3 className="text-xl font-semibold mb-3">1.1 Registro e Inicio de Sesión</h3>
        <ol className="list-decimal list-inside space-y-2 mb-6">
          <li>Accede a la página principal de OpositApp</li>
          <li>Haz clic en <strong>&quot;Registrarse&quot;</strong> si es tu primera vez</li>
          <li>Completa el formulario con tu email y contraseña (mínimo 8 caracteres)</li>
          <li>Verifica tu email (revisa spam si no lo recibes)</li>
          <li>Inicia sesión con tus credenciales</li>
        </ol>

        <h3 className="text-xl font-semibold mb-3">1.2 Primer Vistazo al Dashboard</h3>
        <p>Al iniciar sesión verás:</p>
        <ul className="list-disc list-inside space-y-2 mb-6">
          <li><strong>Panel de Progreso</strong>: Tu rendimiento general en forma circular</li>
          <li><strong>Racha de Estudio</strong>: Días consecutivos estudiando 🔥</li>
          <li><strong>Estadísticas Rápidas</strong>: Preguntas totales, correctas, tasa de acierto</li>
          <li><strong>Calendario de Actividad</strong>: Mapa de calor con tus días de estudio</li>
        </ul>
      </section>

      <section id="dashboard" className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">2. Dashboard Principal</h2>
        
        <h3 className="text-xl font-semibold mb-3">2.1 Panel de Progreso</h3>
        <p className="mb-4">Muestra un círculo de progreso con:</p>
        <ul className="list-disc list-inside space-y-2 mb-6">
          <li><strong>Porcentaje general</strong> de acierto</li>
          <li><strong>Preguntas totales</strong> respondidas</li>
          <li><strong>Código de color</strong>:
            <ul className="ml-6 mt-2 space-y-1">
              <li>🟢 Verde (≥80%): Excelente</li>
              <li>🟡 Amarillo (60-79%): Bien</li>
              <li>🔴 Rojo (&lt;60%): Necesita mejorar</li>
            </ul>
          </li>
        </ul>

        <h3 className="text-xl font-semibold mb-3">2.2 Racha de Estudio</h3>
        <p className="mb-4">Contador de días consecutivos estudiando con niveles:</p>
        <ul className="list-disc list-inside space-y-2 mb-6">
          <li>💤 Sin racha (0 días)</li>
          <li>🌱 Iniciando (1-2 días)</li>
          <li>🌿 Constante (3-6 días)</li>
          <li>🌳 Comprometido (7-13 días)</li>
          <li>🔥 Dedicado (14-29 días)</li>
          <li>👑 Maestro (30+ días)</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3">2.3 Accesos Rápidos</h3>
        <p>El dashboard incluye accesos directos a:</p>
        <ul className="list-disc list-inside space-y-2 mb-6">
          <li>⚡ <strong>Práctica Rápida</strong> - Tests cortos de 5-15 preguntas</li>
          <li>📚 <strong>Cuestionarios de Teoría</strong> - Por temas del temario</li>
          <li>💼 <strong>Supuestos Prácticos</strong> - Casos completos</li>
          <li>📝 <strong>Simulacro de Examen</strong> - Examen completo oficial</li>
          <li>🎯 <strong>Test Personalizado</strong> - A tu medida</li>
        </ul>
      </section>

      <section id="modos-practica" className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">3. Modos de Práctica</h2>

        <h3 className="text-xl font-semibold mb-3">3.1 Cuestionarios de Teoría</h3>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
          <p className="font-semibold mb-2">Características:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Tests organizados por temas del temario oficial</li>
            <li>Preguntas con 4 opciones (A, B, C, D)</li>
            <li>Navegación entre preguntas</li>
            <li>Puedes marcar preguntas para revisión</li>
          </ul>
        </div>
        <p className="mb-4"><strong>Atajos de teclado:</strong></p>
        <ul className="list-disc list-inside space-y-1 mb-6">
          <li><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">A, B, C, D</code> - Seleccionar respuesta</li>
          <li><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">← →</code> - Navegar entre preguntas</li>
          <li><code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">Shift + Espacio</code> - Finalizar</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3">3.2 Práctica Rápida ⚡</h3>
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg mb-4">
          <p className="font-semibold mb-2">Ideal para:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Sesiones cortas de estudio (5-15 preguntas)</li>
            <li>Mantener tu racha diaria</li>
            <li>Repasos rápidos</li>
          </ul>
          <p className="mt-3 text-sm font-semibold text-purple-800 dark:text-purple-300">
            ✅ Ahora guarda estadísticas completas
          </p>
        </div>

        <h3 className="text-xl font-semibold mb-3">3.3 Supuestos Prácticos</h3>
        <p className="mb-4">Casos prácticos con enunciado largo y múltiples preguntas relacionadas. Simula casos reales del examen.</p>

        <h3 className="text-xl font-semibold mb-3">3.4 Simulacro de Examen</h3>
        <p className="mb-4">Examen completo oficial con:</p>
        <ul className="list-disc list-inside space-y-2 mb-6">
          <li>Parte 1: Teoría (múltiples preguntas)</li>
          <li>Parte 2: Supuesto Práctico</li>
          <li>Tiempo cronometrado (opcional)</li>
          <li>Condiciones similares al examen real</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3">3.5 Test Personalizado</h3>
        <p className="mb-4">Crea tests a tu medida seleccionando temas específicos y número de preguntas.</p>
      </section>

      <section id="estadisticas" className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">4. Seguimiento y Estadísticas</h2>

        <h3 className="text-xl font-semibold mb-3">4.1 Mi Racha</h3>
        <p className="mb-4">Visualiza tu constancia con:</p>
        <ul className="list-disc list-inside space-y-2 mb-6">
          <li><strong>Racha Actual</strong>: Días consecutivos estudiando</li>
          <li><strong>Racha Más Larga</strong>: Tu récord personal</li>
          <li><strong>Total Días</strong>: Días totales de estudio</li>
          <li><strong>Calendario Mensual</strong>: Visualiza tus días activos</li>
        </ul>
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg mb-6">
          <p className="font-semibold mb-2">💡 Consejo:</p>
          <p>Estudia al menos 10-15 minutos diarios para mantener la racha. Una práctica rápida cuenta como estudio del día.</p>
        </div>

        <h3 className="text-xl font-semibold mb-3">4.2 Qué Estudiar Hoy</h3>
        <p className="mb-4">Sistema de recomendaciones personalizadas basado en:</p>
        <ul className="list-disc list-inside space-y-2 mb-6">
          <li>Tu rendimiento histórico</li>
          <li>Temas débiles (necesitan refuerzo)</li>
          <li>Preguntas falladas recurrentes</li>
          <li>Repaso espaciado pendiente</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3">4.3 Estadísticas Generales</h3>
        <p className="mb-4">Accede a análisis completos:</p>
        <ul className="list-disc list-inside space-y-2 mb-6">
          <li>Rendimiento global con tendencias</li>
          <li>Estadísticas por tema</li>
          <li>Identificación de puntos débiles</li>
          <li>Gráficas de evolución temporal</li>
        </ul>
      </section>

      <section id="herramientas" className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">5. Herramientas de Estudio</h2>

        <h3 className="text-xl font-semibold mb-3">5.1 Preguntas Falladas</h3>
        <p className="mb-4">Revisa todas las preguntas que has respondido incorrectamente con:</p>
        <ul className="list-disc list-inside space-y-2 mb-6">
          <li>Número de veces fallada</li>
          <li>Tu última respuesta</li>
          <li>Respuesta correcta</li>
          <li>Explicación detallada</li>
        </ul>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-6">
          <p className="font-semibold mb-2">⚠️ Importante:</p>
          <p>Dedica tiempo a entender POR QUÉ fallaste, no solo memorizar la respuesta correcta.</p>
        </div>

        <h3 className="text-xl font-semibold mb-3">5.2 Preguntas Marcadas</h3>
        <p className="mb-4">Guarda preguntas para revisar después. Durante un test, haz clic en ⭐ o 🔖 para marcarlas.</p>

        <h3 className="text-xl font-semibold mb-3">5.3 Notas Personales</h3>
        <p className="mb-4">Añade notas privadas a cualquier pregunta (icono 📝). Úsalas para:</p>
        <ul className="list-disc list-inside space-y-2 mb-6">
          <li>Trucos mnemotécnicos</li>
          <li>Conceptos clave</li>
          <li>Relaciones con otros temas</li>
          <li>Dudas pendientes</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3">5.4 Repaso Espaciado</h3>
        <p className="mb-4">Sistema basado en ciencia de la memoria que te presenta preguntas en el momento óptimo para maximizar retención.</p>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-6">
          <p className="font-semibold mb-2">🧠 Cómo funciona:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Respondes una pregunta</li>
            <li>Calificas su dificultad (Difícil/Normal/Fácil)</li>
            <li>El sistema calcula cuándo debes repasarla</li>
            <li>Te notifica cuando hay repasos pendientes</li>
          </ol>
        </div>

        <h3 className="text-xl font-semibold mb-3">5.5 Búsqueda Avanzada</h3>
        <p className="mb-4">Encuentra preguntas específicas con filtros por:</p>
        <ul className="list-disc list-inside space-y-2 mb-6">
          <li>🔍 Texto en pregunta u opciones</li>
          <li>📚 Tema específico</li>
          <li>⭐ Dificultad</li>
          <li>✅ Estado (correctas/incorrectas/sin responder)</li>
          <li>📅 Rango de fechas</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3">5.6 Asistente de Estudio (IA)</h3>
        <p className="mb-4">Icono de chat 💬 en esquina inferior derecha. Puede:</p>
        <ul className="list-disc list-inside space-y-2 mb-6">
          <li>Explicar conceptos difíciles</li>
          <li>Resolver dudas sobre preguntas</li>
          <li>Generar resúmenes de temas</li>
          <li>Sugerir técnicas de estudio</li>
        </ul>
      </section>

      <section id="funciones-avanzadas" className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">6. Funciones Avanzadas</h2>

        <h3 className="text-xl font-semibold mb-3">6.1 Modo Oscuro 🌙</h3>
        <p className="mb-4">Icono de sol/luna en esquina superior. Ventajas:</p>
        <ul className="list-disc list-inside space-y-2 mb-6">
          <li>Reduce fatiga visual</li>
          <li>Ahorra batería (pantallas OLED)</li>
          <li>Mejor para estudiar de noche</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3">6.2 Atajos de Teclado</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <p className="font-semibold mb-2">Durante tests:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>A, B, C, D</code> - Seleccionar</li>
              <li><code>← →</code> - Navegar</li>
              <li><code>Shift + Espacio</code> - Finalizar</li>
              <li><code>M</code> - Marcar pregunta</li>
              <li><code>N</code> - Añadir nota</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold mb-2">Navegación general:</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><code>Ctrl + D</code> - Dashboard</li>
              <li><code>Ctrl + E</code> - Estadísticas</li>
              <li><code>Ctrl + R</code> - Práctica rápida</li>
            </ul>
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-3">6.3 Comparación de Intentos</h3>
        <p className="mb-4">En Historial de Intentos, selecciona 2 intentos para comparar y ver tu evolución.</p>
      </section>

      <section id="configuracion" className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">7. Configuración de Cuenta</h2>

        <h3 className="text-xl font-semibold mb-3">7.1 Mi Cuenta</h3>
        <p className="mb-4">Edita tu perfil:</p>
        <ul className="list-disc list-inside space-y-2 mb-6">
          <li>Nombre completo</li>
          <li>Email (requiere verificación)</li>
          <li>Contraseña</li>
          <li>Foto de perfil</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3">7.2 Notificaciones</h3>
        <p className="mb-4">Configura alertas por:</p>
        <ul className="list-disc list-inside space-y-2 mb-6">
          <li>📧 Email (racha en peligro, repaso pendiente)</li>
          <li>🔔 Push en navegador (recordatorios)</li>
        </ul>

        <h3 className="text-xl font-semibold mb-3">7.3 Preferencias de Estudio</h3>
        <p className="mb-4">Personaliza tu experiencia:</p>
        <ul className="list-disc list-inside space-y-2 mb-6">
          <li>Orden de preguntas (Aleatorio/Secuencial)</li>
          <li>Barajar opciones (Sí/No)</li>
          <li>Mostrar explicaciones (Inmediato/Al finalizar)</li>
          <li>Sonidos y animaciones</li>
        </ul>
      </section>

      <section id="consejos" className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">8. Consejos y Mejores Prácticas</h2>

        <h3 className="text-xl font-semibold mb-3">8.1 Rutina Diaria Recomendada (30-60 min)</h3>
        <ol className="list-decimal list-inside space-y-2 mb-6">
          <li>Comienza con &quot;Qué Estudiar Hoy&quot; (5 min)</li>
          <li>Repaso espaciado pendiente (10-15 min)</li>
          <li>Práctica rápida o test de tema débil (15-30 min)</li>
          <li>Revisa preguntas falladas del día (5-10 min)</li>
        </ol>

        <h3 className="text-xl font-semibold mb-3">8.2 Maximizar Retención</h3>
        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="font-semibold mb-2">✅ No memorices, comprende</p>
            <p className="text-sm">Lee las explicaciones completas y usa el asistente IA para dudas</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="font-semibold mb-2">✅ Consistencia sobre intensidad</p>
            <p className="text-sm">Mejor 30 min diarios que 3 horas una vez por semana</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="font-semibold mb-2">✅ Variedad de práctica</p>
            <p className="text-sm">Alterna entre teoría y práctico, usa diferentes modos</p>
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-3">8.3 Errores Comunes a Evitar</h3>
        <div className="space-y-4 mb-6">
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="font-semibold mb-2">❌ Hacer muchos tests sin revisar</p>
            <p className="text-sm">Revisa cada respuesta incorrecta y entiende por qué fallaste</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="font-semibold mb-2">❌ Estudiar solo temas fáciles</p>
            <p className="text-sm">Enfócate en tus debilidades usando las recomendaciones del sistema</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="font-semibold mb-2">❌ No mantener racha</p>
            <p className="text-sm">La constancia es clave. 10 minutos diarios son suficientes</p>
          </div>
        </div>

        <h3 className="text-xl font-semibold mb-3">8.4 Preparación para Examen</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <p className="font-bold mb-2">1 mes antes</p>
            <ul className="text-sm space-y-1">
              <li>• Simulacro semanal</li>
              <li>• Identificar debilidades</li>
              <li>• Intensificar repaso</li>
            </ul>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
            <p className="font-bold mb-2">2 semanas antes</p>
            <ul className="text-sm space-y-1">
              <li>• 2-3 simulacros/semana</li>
              <li>• Solo repasar</li>
              <li>• Revisar falladas</li>
            </ul>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="font-bold mb-2">Última semana</p>
            <ul className="text-sm space-y-1">
              <li>• Simulacro diario</li>
              <li>• Repaso ligero</li>
              <li>• Descansar bien ⚠️</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="faq" className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">9. Preguntas Frecuentes</h2>
        
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <p className="font-semibold mb-2">¿Cuántas preguntas debo hacer al día?</p>
            <p className="text-sm">
              Mínimo: 20-30 preguntas (práctica rápida)<br/>
              Ideal: 50-100 preguntas (1-2 tests completos)<br/>
              Intensivo: 100+ preguntas
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <p className="font-semibold mb-2">¿Cómo funciona el repaso espaciado?</p>
            <p className="text-sm">
              Difíciles: En 1-3 días<br/>
              Normales: En 5-7 días<br/>
              Fáciles: En 2-4 semanas
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <p className="font-semibold mb-2">¿Qué hago si tengo un tema muy bajo (&lt;40%)?</p>
            <ol className="text-sm list-decimal list-inside mt-2 space-y-1">
              <li>Estudia la teoría primero (fuera de la app)</li>
              <li>Haz tests solo de ese tema</li>
              <li>Revisa cada error inmediatamente</li>
              <li>Usa el asistente IA para dudas</li>
              <li>Practica en días consecutivos</li>
            </ol>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-4 text-blue-600 dark:text-blue-400">10. Actualizaciones Recientes</h2>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
          <p className="font-bold mb-3">Febrero 2026:</p>
          <ul className="space-y-2 text-sm">
            <li>✅ Práctica rápida ahora guarda estadísticas completas</li>
            <li>✅ Corrección de niveles en &quot;Mi Racha&quot;</li>
            <li>✅ Mensajes contextuales en &quot;Qué Estudiar Hoy&quot;</li>
            <li>✅ Sistema de comparación de respuestas mejorado</li>
            <li>✅ Integración completa de estadísticas en todos los modos</li>
          </ul>
        </div>
      </section>

      <div className="text-center mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          <strong>Versión del Manual:</strong> 1.0<br/>
          <strong>Última actualización:</strong> 21 de Febrero de 2026<br/>
          <strong>Autor:</strong> Equipo OpositApp
        </p>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
          ¿Necesitas ayuda adicional? Contacta con soporte@opositapp.com
        </p>
      </div>
    </>
  )
}

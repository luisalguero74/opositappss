import Link from 'next/link'

export const metadata = {
  title: 'Preguntas Frecuentes | OpositApp',
  description: 'Resuelve todas tus dudas sobre OpositApp, la mejor plataforma para preparar oposiciones a Administrativo de la Seguridad Social',
}

export default function FAQPage() {
  const faqs = [
    {
      category: '📚 Sobre la Plataforma',
      questions: [
        {
          q: '¿Qué es OpositApp?',
          a: 'OpositApp es una plataforma completa de preparación online para las oposiciones a Administrativo de la Seguridad Social. Ofrecemos tests interactivos, simulacros de examen, supuestos prácticos, asistente con IA, repositorio legal actualizado y mucho más.'
        },
        {
          q: '¿Necesito conocimientos previos?',
          a: 'No. OpositApp está diseñada tanto para principiantes como para personas que ya están preparándose. Nuestro sistema se adapta a tu nivel y te guía paso a paso en tu preparación.'
        },
        {
          q: '¿Puedo usar OpositApp desde cualquier dispositivo?',
          a: 'Sí, totalmente. OpositApp es una aplicación web responsive que funciona perfectamente en ordenadores, tablets y móviles. Solo necesitas conexión a internet y un navegador moderno.'
        },
        {
          q: '¿El contenido está actualizado?',
          a: 'Sí. Actualizamos constantemente nuestro contenido para reflejar las últimas modificaciones legislativas y cambios en el temario oficial. Monitorizamos el BOE automáticamente para mantenerte informado.'
        }
      ]
    },
    {
      category: '💳 Planes y Precios',
      questions: [
        {
          q: '¿Hay una versión gratuita?',
          a: 'Sí. Ofrecemos un plan gratuito con acceso limitado a tests básicos y algunas funcionalidades. Es perfecto para probar la plataforma antes de suscribirte.'
        },
        {
          q: '¿Qué incluye el plan Premium?',
          a: 'El plan Premium incluye: acceso ilimitado a todos los tests, simulacros de examen completos, supuestos prácticos con soluciones, asistente IA sin límites, estadísticas avanzadas, repositorio legal completo y soporte prioritario.'
        },
        {
          q: '¿Puedo cancelar mi suscripción en cualquier momento?',
          a: 'Sí, puedes cancelar tu suscripción cuando quieras desde tu panel de usuario. No hay permanencias ni penalizaciones. Si cancelas, mantendrás el acceso hasta el final del periodo ya pagado.'
        },
        {
          q: '¿Ofrecen descuentos para grupos?',
          a: 'Sí. Ofrecemos descuentos especiales para academias, grupos de estudio y matriculados en determinadas academias. Contacta con nosotros para más información.'
        }
      ]
    },
    {
      category: '🎯 Funcionalidades',
      questions: [
        {
          q: '¿Cómo funciona el Asistente con IA?',
          a: 'Nuestro asistente utiliza Inteligencia Artificial avanzada (GPT-4) para responder tus dudas sobre el temario, resolver casos prácticos, explicar fundamentos legales y crear planes de estudio personalizados. Es como tener un tutor disponible 24/7.'
        },
        {
          q: '¿Los tests son de tipo test real de oposición?',
          a: 'Sí. Todos nuestros tests siguen el formato oficial: preguntas tipo test con 4 opciones, donde solo una es correcta. Incluimos tests por tema, simulacros cronometrados y modo examen real con penalización por errores.'
        },
        {
          q: '¿Qué son los supuestos prácticos?',
          a: 'Los supuestos prácticos son casos reales que podrías encontrar en el examen. Te presentamos una situación y debes resolverla aplicando la normativa correspondiente. Incluimos soluciones detalladas paso a paso con fundamento legal.'
        },
        {
          q: '¿Las estadísticas me ayudan a mejorar?',
          a: 'Absolutamente. Nuestro sistema de estadísticas avanzadas analiza tu rendimiento por tema, identifica tus puntos débiles, calcula tu progresión temporal y te sugiere qué áreas repasar. Es fundamental para optimizar tu estudio.'
        }
      ]
    },
    {
      category: '📖 Temario y Contenido',
      questions: [
        {
          q: '¿Cuántas preguntas hay disponibles?',
          a: 'Tenemos una base de datos en constante crecimiento con miles de preguntas organizadas por todos los temas del temario oficial. Añadimos nuevas preguntas regularmente basadas en exámenes oficiales anteriores.'
        },
        {
          q: '¿El repositorio legal incluye toda la normativa?',
          a: 'Sí. Nuestro repositorio incluye toda la legislación relevante para la oposición: Ley General de la Seguridad Social, Estatuto de los Trabajadores, legislación laboral, normativa administrativa y mucho más, todo organizado y actualizado.'
        },
        {
          q: '¿Cómo se actualizan los cambios legislativos?',
          a: 'Monitorizamos automáticamente el BOE (Boletín Oficial del Estado) y cuando se publican cambios relevantes, actualizamos el contenido y te notificamos. También marcamos qué temas han sido modificados recientemente.'
        },
        {
          q: '¿Hay material descargable?',
          a: 'Sí. Los usuarios Premium pueden descargar documentos PDF con resúmenes por tema, legislación importante, y resultados de sus tests para estudiar offline.'
        }
      ]
    },
    {
      category: '🏆 Preparación y Resultados',
      questions: [
        {
          q: '¿Cuánto tiempo necesito para prepararme?',
          a: 'Depende de tu punto de partida y dedicación. En promedio, nuestros usuarios dedican entre 6-12 meses de preparación intensiva. Nuestro sistema te ayuda a crear un plan de estudio personalizado según tu fecha objetivo.'
        },
        {
          q: '¿Ofrecen planes de estudio personalizados?',
          a: 'Sí. El asistente IA puede crear un plan de estudio adaptado a tu situación: tiempo disponible, nivel actual, fecha del examen y objetivos. El plan se va ajustando según tu progreso.'
        },
        {
          q: '¿Puedo simular el examen oficial?',
          a: 'Sí. Nuestros simulacros replican exactamente las condiciones del examen oficial: mismo número de preguntas, tiempo limitado, mismo sistema de puntuación y penalización por errores. Es la mejor forma de llegar preparado.'
        },
        {
          q: '¿Qué tasa de éxito tienen los usuarios?',
          a: 'Nuestros usuarios que completan al menos el 80% del material tienen una tasa de aprobación significativamente superior a la media. Muchos han conseguido plaza en las últimas convocatorias.'
        }
      ]
    },
    {
      category: '🔐 Privacidad y Seguridad',
      questions: [
        {
          q: '¿Mis datos están seguros?',
          a: 'Absolutamente. Utilizamos cifrado SSL/TLS para todas las conexiones, almacenamos contraseñas con hash seguro (bcrypt) y cumplimos con el RGPD. Tus datos nunca se comparten con terceros sin tu consentimiento.'
        },
        {
          q: '¿Qué información personal recopilan?',
          a: 'Solo recopilamos lo esencial: email, nombre y datos de progreso académico. No vendemos ni compartimos tu información. Puedes consultar nuestra Política de Privacidad para más detalles.'
        },
        {
          q: '¿Puedo eliminar mi cuenta?',
          a: 'Sí. Puedes eliminar tu cuenta en cualquier momento desde la configuración. Todos tus datos personales serán borrados permanentemente, aunque conservaremos datos estadísticos anónimos.'
        },
        {
          q: '¿Usan cookies?',
          a: 'Sí, usamos cookies necesarias para el funcionamiento (sesión) y opcionales para análisis y publicidad (Google AdSense). Puedes configurar tus preferencias en el banner de cookies o en nuestra Política de Cookies.'
        }
      ]
    },
    {
      category: '💬 Soporte y Ayuda',
      questions: [
        {
          q: '¿Cómo puedo contactar con soporte?',
          a: 'Puedes contactarnos por email en info@opositapp.com o a través del formulario de contacto. Los usuarios Premium tienen soporte prioritario con respuesta en menos de 24 horas.'
        },
        {
          q: '¿Hay tutoriales o guías de uso?',
          a: 'Sí. Tenemos una sección de ayuda con videotutoriales, guías paso a paso y consejos de estudio. Además, el asistente IA puede guiarte en el uso de cualquier funcionalidad.'
        },
        {
          q: '¿Organizan aulas virtuales o clases en directo?',
          a: 'Sí, organizamos regularmente aulas virtuales donde resolvemos dudas, explicamos temas complejos y damos consejos de preparación. Los usuarios Premium tienen acceso prioritario.'
        },
        {
          q: '¿Hay comunidad de estudiantes?',
          a: 'Sí. Tenemos grupos de estudio donde los usuarios pueden compartir experiencias, resolver dudas entre ellos y motivarse mutuamente. Es muy útil para mantener la constancia.'
        }
      ]
    },
    {
      category: '⚙️ Técnico',
      questions: [
        {
          q: '¿Qué navegadores son compatibles?',
          a: 'OpositApp funciona en todos los navegadores modernos: Chrome, Firefox, Safari, Edge. Recomendamos mantener tu navegador actualizado para la mejor experiencia.'
        },
        {
          q: '¿Funciona sin conexión a internet?',
          a: 'Actualmente necesitas conexión a internet para usar OpositApp. Estamos trabajando en una funcionalidad de modo offline para acceder a contenido descargado.'
        },
        {
          q: '¿Hay app móvil nativa?',
          a: 'No necesitas app nativa. OpositApp es una Progressive Web App (PWA) que funciona perfectamente en móviles y puedes "instalar" en tu pantalla de inicio como si fuera una app nativa.'
        },
        {
          q: '¿Con qué frecuencia actualizan la plataforma?',
          a: 'Actualizamos la plataforma constantemente. Lanzamos mejoras menores semanalmente y funcionalidades importantes mensualmente. Siempre notificamos los cambios importantes.'
        }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-12 shadow-lg">
        <div className="max-w-6xl mx-auto px-4">
          <Link 
            href="/landing" 
            className="inline-flex items-center text-white/90 hover:text-white mb-4 transition"
          >
            ← Volver al inicio
          </Link>
          <h1 className="text-5xl font-bold mb-4">
            Preguntas Frecuentes
          </h1>
          <p className="text-xl text-blue-100">
            Encuentra respuestas a las dudas más comunes sobre OpositApp
          </p>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        
        {/* Intro */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <p className="text-lg text-gray-700 leading-relaxed">
            ¿Tienes dudas sobre OpositApp? Hemos recopilado las preguntas más frecuentes de nuestros usuarios. 
            Si no encuentras la respuesta que buscas, no dudes en{' '}
            <Link href="/contact" className="text-blue-600 hover:underline font-medium">
              contactarnos
            </Link>.
          </p>
        </div>

        {/* FAQs por categoría */}
        <div className="space-y-8">
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4">
                <h2 className="text-2xl font-bold text-white">
                  {category.category}
                </h2>
              </div>
              
              <div className="p-6 space-y-6">
                {category.questions.map((faq, faqIndex) => (
                  <div key={faqIndex} className="border-b border-gray-200 last:border-0 pb-6 last:pb-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-start gap-2">
                      <span className="text-blue-600 flex-shrink-0">Q:</span>
                      <span>{faq.q}</span>
                    </h3>
                    <div className="ml-7 text-gray-700 leading-relaxed">
                      <span className="text-green-600 font-semibold">R:</span> {faq.a}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-2xl p-8 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            ¿Listo para empezar tu preparación?
          </h2>
          <p className="text-xl text-blue-100 mb-6">
            Únete a miles de opositores que ya confían en OpositApp
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/register" 
              className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-50 transition shadow-lg"
            >
              Crear cuenta gratis
            </Link>
            <Link 
              href="/contact" 
              className="inline-block bg-blue-800 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-900 transition"
            >
              Contactar con soporte
            </Link>
          </div>
        </div>

        {/* Enlaces relacionados */}
        <div className="mt-8 flex flex-wrap gap-4 justify-center text-sm">
          <Link href="/privacy" className="text-gray-600 hover:text-blue-600 transition">
            Privacidad
          </Link>
          <span className="text-gray-300">•</span>
          <Link href="/terms" className="text-gray-600 hover:text-blue-600 transition">
            Términos
          </Link>
          <span className="text-gray-300">•</span>
          <Link href="/cookies" className="text-gray-600 hover:text-blue-600 transition">
            Cookies
          </Link>
          <span className="text-gray-300">•</span>
          <Link href="/about" className="text-gray-600 hover:text-blue-600 transition">
            Acerca de
          </Link>
          <span className="text-gray-300">•</span>
          <Link href="/contact" className="text-gray-600 hover:text-blue-600 transition">
            Contacto
          </Link>
        </div>
      </main>
    </div>
  )
}

import Link from 'next/link'
import Image from 'next/image'

export const metadata = {
  title: 'Sobre Nosotros | OpositApp',
  description: 'Conoce más sobre OpositApp, la plataforma líder en preparación de oposiciones',
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <Link href="/landing" className="text-2xl font-bold text-blue-600">
              OpositApp
            </Link>
            <Link
              href="/landing"
              className="text-gray-600 hover:text-blue-600 transition-colors"
            >
              ← Volver
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">
              Sobre OpositApp
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              La plataforma líder en preparación inteligente de oposiciones, 
              combinando tecnología avanzada con metodología pedagógica probada.
            </p>
          </div>
        </div>
      </section>

      {/* Nuestra Misión */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Nuestra Misión
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed mb-4">
              En OpositApp, nuestra misión es democratizar el acceso a una preparación de oposiciones 
              de calidad, utilizando inteligencia artificial y metodologías de estudio científicamente 
              probadas para maximizar el rendimiento de cada opositor.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Creemos que todos merecen las mejores herramientas para alcanzar sus objetivos profesionales, 
              independientemente de su ubicación geográfica o disponibilidad económica.
            </p>
          </div>
        </div>
      </section>

      {/* Qué nos hace diferentes */}
      <section className="py-16 bg-gradient-to-br from-blue-100 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            ¿Qué nos hace diferentes?
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Inteligencia Artificial
              </h3>
              <p className="text-gray-600">
                Asistente de estudio con IA que genera contenido personalizado, 
                responde dudas y crea preguntas adaptadas a tu nivel.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Análisis Avanzado
              </h3>
              <p className="text-gray-600">
                Estadísticas detalladas de rendimiento, identificación de puntos débiles 
                y seguimiento de progreso en tiempo real.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Contenido Actualizado
              </h3>
              <p className="text-gray-600">
                Base de datos constantemente actualizada con normativa vigente, 
                jurisprudencia reciente y últimas reformas legislativas.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-pink-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Repetición Espaciada
              </h3>
              <p className="text-gray-600">
                Sistema científico de repaso que optimiza la memorización a largo plazo 
                basado en algoritmos cognitivos probados.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Simulacros Realistas
              </h3>
              <p className="text-gray-600">
                Exámenes simulados con condiciones reales: tiempo limitado, 
                preguntas aleatorias y corrección automática detallada.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Accesible para Todos
              </h3>
              <p className="text-gray-600">
                Plan gratuito con funcionalidades completas y planes premium 
                a precios competitivos para democratizar el acceso.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Nuestros Valores */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Nuestros Valores
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Excelencia
              </h3>
              <p className="text-gray-600">
                Compromiso con la máxima calidad en contenidos, tecnología y servicio al usuario.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                <span className="text-3xl">🚀</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Innovación
              </h3>
              <p className="text-gray-600">
                Adopción constante de nuevas tecnologías para mejorar la experiencia de estudio.
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
                <span className="text-3xl">🤝</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Compromiso
              </h3>
              <p className="text-gray-600">
                Dedicación total al éxito de nuestros usuarios y su desarrollo profesional.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tecnología */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Tecnología de Vanguardia
            </h2>
            <p className="text-lg text-gray-700 mb-8">
              OpositApp está construida con las tecnologías más modernas para garantizar 
              rendimiento, seguridad y escalabilidad:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm text-gray-600">
              <div className="bg-gray-50 rounded-lg p-4">
                <strong className="block text-gray-900 mb-1">Next.js 16</strong>
                Framework React
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <strong className="block text-gray-900 mb-1">PostgreSQL</strong>
                Base de datos
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <strong className="block text-gray-900 mb-1">OpenAI GPT-4</strong>
                Inteligencia Artificial
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <strong className="block text-gray-900 mb-1">Vercel</strong>
                Hosting & CDN
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            ¿Listo para empezar tu preparación?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Únete a miles de opositores que ya están alcanzando sus objetivos con OpositApp
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
            >
              Comenzar Gratis
            </Link>
            <Link
              href="/pricing"
              className="bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-800 transition-colors border-2 border-white"
            >
              Ver Planes
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-sm">
              © 2026 OpositApp. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/privacy" className="text-gray-600 hover:text-blue-600">
                Privacidad
              </Link>
              <Link href="/terms" className="text-gray-600 hover:text-blue-600">
                Términos
              </Link>
              <Link href="/about" className="text-blue-600 hover:underline">
                Sobre Nosotros
              </Link>
              <Link href="/contact" className="text-gray-600 hover:text-blue-600">
                Contacto
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

'use client'

import Link from 'next/link'
import Image from 'next/image'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">opositAPPSS</h1>
          <div className="flex gap-4">
            <Link href="/login" className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition">
              Iniciar Sesión
            </Link>
            <Link href="/register" className="bg-blue-800 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-900 transition">
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-5xl font-bold text-gray-900 mb-6">
                Prepara tu Oposición a <span className="text-blue-600">Administrativo de la Seguridad Social</span>
              </h2>
              <p className="text-xl text-gray-700 mb-8">
                La plataforma más completa con tests, simulacros, supuestos prácticos, asistente con IA y mucho más.
              </p>
              <Link 
                href="/register" 
                className="inline-block bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-blue-700 hover:to-indigo-800 transition shadow-lg"
              >
                Empieza Gratis Ahora →
              </Link>
              <p className="text-sm text-gray-600 mt-3">✓ Sin tarjeta de crédito necesaria</p>
            </div>
            <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&h=600&fit=crop"
                alt="Estudiantes preparando oposiciones"
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="text-4xl font-bold text-center text-gray-900 mb-16">
            Todo lo que necesitas para aprobar
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition">
              <div className="text-5xl mb-4">📚</div>
              <h4 className="text-2xl font-bold text-gray-900 mb-3">Tests Temario Completo</h4>
              <p className="text-gray-600">
                Miles de preguntas organizadas por los 36 temas oficiales del temario con explicaciones detalladas.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition">
              <div className="text-5xl mb-4">📝</div>
              <h4 className="text-2xl font-bold text-gray-900 mb-3">Simulacros de Examen</h4>
              <p className="text-gray-600">
                Practica con exámenes completos de 85 preguntas (70+15 reserva) en modo examen real con tiempo limitado.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition">
              <div className="text-5xl mb-4">💼</div>
              <h4 className="text-2xl font-bold text-gray-900 mb-3">Supuestos Prácticos</h4>
              <p className="text-gray-600">
                Resuelve casos prácticos reales con soluciones paso a paso y análisis de fundamento legal.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition">
              <div className="text-5xl mb-4">🤖</div>
              <h4 className="text-2xl font-bold text-gray-900 mb-3">Asistente con IA</h4>
              <p className="text-gray-600">
                Pregunta cualquier duda sobre el temario oficial y recibe respuestas precisas con referencias legales.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition">
              <div className="text-5xl mb-4">📊</div>
              <h4 className="text-2xl font-bold text-gray-900 mb-3">Estadísticas Avanzadas</h4>
              <p className="text-gray-600">
                Analiza tu progreso tema por tema, identifica puntos débiles y mejora tu rendimiento.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 hover:shadow-xl transition">
              <div className="text-5xl mb-4">🎓</div>
              <h4 className="text-2xl font-bold text-gray-900 mb-3">Aulas Virtuales</h4>
              <p className="text-gray-600">
                Participa en sesiones en directo con otros opositores y resuelve dudas en tiempo real.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Study Image Section */}
      <section className="py-20 bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop"
                alt="Grupo de estudiantes adultos colaborando"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h3 className="text-4xl font-bold text-gray-900 mb-6">
                Aprende a tu ritmo, con el mejor contenido
              </h3>
              <ul className="space-y-4 text-lg text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-2xl">✓</span>
                  <span><strong>Actualizado 2026:</strong> Contenido revisado conforme a la última convocatoria</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-2xl">✓</span>
                  <span><strong>Modo examen real:</strong> Practica en condiciones idénticas al examen oficial</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-2xl">✓</span>
                  <span><strong>Corrección automática:</strong> Resultados instantáneos con explicaciones detalladas</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 text-2xl">✓</span>
                  <span><strong>Fundamento legal:</strong> Todas las respuestas incluyen referencias normativas</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Classroom Image Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-4xl font-bold text-gray-900 mb-6">
                Estudia donde quieras, cuando quieras
              </h3>
              <p className="text-xl text-gray-700 mb-6">
                Accede desde cualquier dispositivo: ordenador, tablet o móvil. Tu progreso se sincroniza automáticamente.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl">
                    📱
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900">Multiplataforma</h5>
                    <p className="text-gray-600">Compatible con todos tus dispositivos</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 text-2xl">
                    ☁️
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900">En la nube</h5>
                    <p className="text-gray-600">Tu progreso siempre sincronizado</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-2xl">
                    🔒
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900">100% Seguro</h5>
                    <p className="text-gray-600">Tus datos protegidos con encriptación</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative h-96 rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&h=600&fit=crop"
                alt="Estudiantes adultos en clase concentrados"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-4xl font-bold mb-6">
            ¿Listo para empezar tu preparación?
          </h3>
          <p className="text-xl mb-8 text-blue-100">
            Únete a cientos de opositores que ya están preparándose con opositAPPSS
          </p>
          <Link 
            href="/register" 
            className="inline-block bg-white text-blue-600 px-10 py-4 rounded-lg text-lg font-bold hover:bg-blue-50 transition shadow-lg"
          >
            Crear Cuenta Gratuita
          </Link>
          <p className="mt-4 text-sm text-blue-200">
            Empieza hoy mismo • Sin compromisos • Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h4 className="text-white font-bold text-lg mb-4">opositAPPSS</h4>
              <p className="text-sm text-gray-400">
                La mejor plataforma para preparar oposiciones de Administrativo de la Seguridad Social.
              </p>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Producto</h5>
              <ul className="space-y-2 text-sm">
                <li><Link href="/dashboard/theory" className="hover:text-white transition">Tests</Link></li>
                <li><Link href="/dashboard/exam-simulation" className="hover:text-white transition">Simulacros</Link></li>
                <li><Link href="/asistente-estudio" className="hover:text-white transition">Asistente IA</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition">Precios</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Legal</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Términos y Condiciones</a></li>
                <li><a href="#" className="hover:text-white transition">Política de Privacidad</a></li>
                <li><a href="#" className="hover:text-white transition">Cookies</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Contacto</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:info@opositappss.com" className="hover:text-white transition">info@opositappss.com</a></li>
                <li><a href="#" className="hover:text-white transition">Soporte</a></li>
                <li><a href="#" className="hover:text-white transition">FAQ</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-500">
            © 2026 opositAPPSS. Todos los derechos reservados.
          </div>
        </div>
      </footer>

      {/* Google AdSense Script */}
      <script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
        crossOrigin="anonymous"
      />
    </div>
  )
}

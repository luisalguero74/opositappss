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

      {/* Testimonios Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              Lo que dicen nuestros usuarios
            </h3>
            <p className="text-xl text-gray-600">
              Miles de opositores ya confían en OpositApp para su preparación
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl shadow-lg border border-blue-100">
              <div className="flex items-center gap-1 text-yellow-500 text-xl mb-4">
                ⭐⭐⭐⭐⭐
              </div>
              <p className="text-gray-700 italic mb-4">
                &quot;OpositApp me ha cambiado la forma de estudiar. El asistente IA resuelve todas mis dudas 
                al instante y los tests personalizados me ayudan a centrarme en mis puntos débiles.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  MC
                </div>
                <div>
                  <p className="font-semibold text-gray-900">María Carmen R.</p>
                  <p className="text-sm text-gray-600">Opositora 2025</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl shadow-lg border border-purple-100">
              <div className="flex items-center gap-1 text-yellow-500 text-xl mb-4">
                ⭐⭐⭐⭐⭐
              </div>
              <p className="text-gray-700 italic mb-4">
                &quot;Los simulacros son exactamente igual que el examen real. Gracias a practicar con ellos, 
                el día del examen no tuve ningún nervio y conseguí mi plaza.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  JL
                </div>
                <div>
                  <p className="font-semibold text-gray-900">José Luis M.</p>
                  <p className="text-sm text-gray-600">Plaza conseguida 2025</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl shadow-lg border border-green-100">
              <div className="flex items-center gap-1 text-yellow-500 text-xl mb-4">
                ⭐⭐⭐⭐⭐
              </div>
              <p className="text-gray-700 italic mb-4">
                &quot;El repositorio legal siempre actualizado es oro puro. Las estadísticas me muestran 
                claramente mi progreso y qué temas necesito repasar más.&quot;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                  AR
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Ana R.</p>
                  <p className="text-sm text-gray-600">Usuario Premium</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo Funciona Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              Empieza en 3 pasos simples
            </h3>
            <p className="text-xl text-gray-600">
              Tu preparación organizada y efectiva en minutos
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg">
                  1
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-4">Crea tu cuenta</h4>
                <p className="text-gray-600">
                  Regístrate gratis en menos de 1 minuto. Sin tarjeta de crédito, sin compromisos.
                </p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-4xl text-blue-300">
                →
              </div>
            </div>

            <div className="relative">
              <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg">
                  2
                </div>
                <h4 className="text-2xl font-bold text-gray-900 mb-4">Elige tu plan</h4>
                <p className="text-gray-600">
                  Empieza gratis o elige Premium para acceso completo a todas las funcionalidades.
                </p>
              </div>
              <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 text-4xl text-indigo-300">
                →
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-6 shadow-lg">
                3
              </div>
              <h4 className="text-2xl font-bold text-gray-900 mb-4">Empieza a estudiar</h4>
              <p className="text-gray-600">
                Accede a tests, simulacros, asistente IA y todo el material para conseguir tu plaza.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link 
              href="/register" 
              className="inline-block bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-10 py-4 rounded-lg text-lg font-bold hover:from-blue-700 hover:to-indigo-800 transition shadow-2xl"
            >
              Empezar ahora gratis →
            </Link>
          </div>
        </div>
      </section>

      {/* Comparación Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              ¿Por qué elegir OpositApp?
            </h3>
            <p className="text-xl text-gray-600">
              Comparamos con métodos tradicionales de estudio
            </p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full bg-white shadow-2xl rounded-xl overflow-hidden">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-lg font-bold">Característica</th>
                  <th className="px-6 py-4 text-center text-lg font-bold">OpositApp</th>
                  <th className="px-6 py-4 text-center text-lg font-bold">Academias tradicionales</th>
                  <th className="px-6 py-4 text-center text-lg font-bold">Estudio por cuenta propia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr className="hover:bg-blue-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">Tests interactivos ilimitados</td>
                  <td className="px-6 py-4 text-center text-2xl text-green-500">✓</td>
                  <td className="px-6 py-4 text-center text-2xl text-red-500">✗</td>
                  <td className="px-6 py-4 text-center text-2xl text-red-500">✗</td>
                </tr>
                <tr className="hover:bg-blue-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">Asistente IA 24/7</td>
                  <td className="px-6 py-4 text-center text-2xl text-green-500">✓</td>
                  <td className="px-6 py-4 text-center text-2xl text-red-500">✗</td>
                  <td className="px-6 py-4 text-center text-2xl text-red-500">✗</td>
                </tr>
                <tr className="hover:bg-blue-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">Actualización automática contenido</td>
                  <td className="px-6 py-4 text-center text-2xl text-green-500">✓</td>
                  <td className="px-6 py-4 text-center text-2xl text-yellow-500">~</td>
                  <td className="px-6 py-4 text-center text-2xl text-red-500">✗</td>
                </tr>
                <tr className="hover:bg-blue-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">Estudia desde cualquier lugar</td>
                  <td className="px-6 py-4 text-center text-2xl text-green-500">✓</td>
                  <td className="px-6 py-4 text-center text-2xl text-red-500">✗</td>
                  <td className="px-6 py-4 text-center text-2xl text-green-500">✓</td>
                </tr>
                <tr className="hover:bg-blue-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">Estadísticas de progreso</td>
                  <td className="px-6 py-4 text-center text-2xl text-green-500">✓</td>
                  <td className="px-6 py-4 text-center text-2xl text-red-500">✗</td>
                  <td className="px-6 py-4 text-center text-2xl text-red-500">✗</td>
                </tr>
                <tr className="hover:bg-blue-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">Precio mensual</td>
                  <td className="px-6 py-4 text-center"><span className="text-green-600 font-bold">29€/mes</span></td>
                  <td className="px-6 py-4 text-center"><span className="text-red-600 font-bold">150-300€/mes</span></td>
                  <td className="px-6 py-4 text-center"><span className="text-blue-600 font-bold">Variable</span></td>
                </tr>
                <tr className="hover:bg-blue-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">Simulacros examen real</td>
                  <td className="px-6 py-4 text-center text-2xl text-green-500">✓</td>
                  <td className="px-6 py-4 text-center text-2xl text-green-500">✓</td>
                  <td className="px-6 py-4 text-center text-2xl text-red-500">✗</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              ✓ Incluido | ~ Parcialmente | ✗ No incluido
            </p>
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
                <li><Link href="/terms" className="hover:text-white transition">Términos y Condiciones</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition">Política de Privacidad</Link></li>
                <li><Link href="/cookies" className="hover:text-white transition">Cookies</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Más</h5>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white transition">Sobre Nosotros</Link></li>
                <li><Link href="/faq" className="hover:text-white transition">Preguntas Frecuentes</Link></li>
                <li><Link href="/contact" className="hover:text-white transition">Contacto</Link></li>
                <li><Link href="/help" className="hover:text-white transition">Ayuda</Link></li>
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

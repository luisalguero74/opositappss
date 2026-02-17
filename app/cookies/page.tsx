import Link from 'next/link'

export const metadata = {
  title: 'Política de Cookies | OpositApp',
  description: 'Información sobre el uso de cookies en OpositApp',
}

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-6 shadow-lg">
        <div className="max-w-4xl mx-auto px-4">
          <Link 
            href="/landing" 
            className="inline-flex items-center text-white/90 hover:text-white mb-4 transition"
          >
            ← Volver al inicio
          </Link>
          <h1 className="text-4xl font-bold">
            Política de Cookies
          </h1>
          <p className="text-blue-100 mt-2">
            Última actualización: 17 de febrero de 2026
          </p>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 space-y-8">
          
          {/* Introducción */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              1. ¿Qué son las cookies?
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo 
              (ordenador, tableta o móvil) cuando visitas un sitio web. Las cookies permiten 
              que el sitio web reconozca tu dispositivo y recuerde información sobre tu visita, 
              como tus preferencias de idioma y otras configuraciones.
            </p>
            <p className="text-gray-700 leading-relaxed">
              En <strong>OpositApp</strong> utilizamos cookies para mejorar tu experiencia de 
              usuario, mantener tu sesión activa, analizar el uso del sitio y mostrar publicidad 
              relevante a través de Google AdSense.
            </p>
          </section>

          {/* Tipos de cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              2. Tipos de cookies que utilizamos
            </h2>
            
            <div className="space-y-4">
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  2.1 Cookies Estrictamente Necesarias
                </h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  Estas cookies son esenciales para el funcionamiento del sitio web y no pueden 
                  ser desactivadas. Incluyen:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Cookies de sesión de autenticación (para mantener tu sesión iniciada)</li>
                  <li>Cookies de seguridad (protección CSRF)</li>
                  <li>Cookies de preferencias de consentimiento</li>
                </ul>
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Duración:</strong> Sesión o hasta 30 días
                </p>
              </div>

              <div className="border-l-4 border-green-500 pl-4 py-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  2.2 Cookies de Funcionalidad
                </h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  Permiten recordar tus preferencias y mejorar la experiencia:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Tema visual preferido (claro/oscuro)</li>
                  <li>Configuración de idioma</li>
                  <li>Tamaño de texto y otras preferencias de accesibilidad</li>
                </ul>
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Duración:</strong> Hasta 1 año
                </p>
              </div>

              <div className="border-l-4 border-yellow-500 pl-4 py-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  2.3 Cookies Analíticas
                </h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  Nos ayudan a entender cómo los usuarios interactúan con el sitio:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Páginas más visitadas</li>
                  <li>Tiempo de permanencia</li>
                  <li>Origen del tráfico</li>
                  <li>Dispositivos y navegadores utilizados</li>
                </ul>
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Proveedor:</strong> Google Analytics (opcional)<br/>
                  <strong>Duración:</strong> Hasta 2 años
                </p>
              </div>

              <div className="border-l-4 border-red-500 pl-4 py-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  2.4 Cookies de Publicidad (Google AdSense)
                </h3>
                <p className="text-gray-700 leading-relaxed mb-2">
                  Google AdSense utiliza cookies para:
                </p>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Mostrar anuncios relevantes basados en tus intereses</li>
                  <li>Limitar el número de veces que ves un anuncio</li>
                  <li>Medir la efectividad de las campañas publicitarias</li>
                  <li>Evitar anuncios fraudulentos</li>
                </ul>
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Proveedor:</strong> Google LLC<br/>
                  <strong>Duración:</strong> Variable (hasta 2 años)<br/>
                  <strong>Más información:</strong>{' '}
                  <a 
                    href="https://policies.google.com/technologies/ads" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Políticas de publicidad de Google
                  </a>
                </p>
              </div>
            </div>
          </section>

          {/* Cookies específicas */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              3. Lista de cookies utilizadas
            </h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Propósito</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duración</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">next-auth.session-token</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Necesaria</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Autenticación de sesión</td>
                    <td className="px-4 py-3 text-sm text-gray-700">30 días</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">cookie_consent</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Necesaria</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Almacena preferencias de cookies</td>
                    <td className="px-4 py-3 text-sm text-gray-700">1 año</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">_ga</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Analítica</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Google Analytics - ID único</td>
                    <td className="px-4 py-3 text-sm text-gray-700">2 años</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">_gid</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Analítica</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Google Analytics - ID de sesión</td>
                    <td className="px-4 py-3 text-sm text-gray-700">24 horas</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">_gat</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Analítica</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Google Analytics - Throttling</td>
                    <td className="px-4 py-3 text-sm text-gray-700">1 minuto</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">__gads</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Publicidad</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Google AdSense - Anuncios personalizados</td>
                    <td className="px-4 py-3 text-sm text-gray-700">13 meses</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">__gpi</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Publicidad</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Google AdSense - Info de impresiones</td>
                    <td className="px-4 py-3 text-sm text-gray-700">13 meses</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">IDE</td>
                    <td className="px-4 py-3 text-sm text-gray-700">Publicidad</td>
                    <td className="px-4 py-3 text-sm text-gray-700">DoubleClick - Seguimiento de conversiones</td>
                    <td className="px-4 py-3 text-sm text-gray-700">13 meses</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Gestión de cookies */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              4. Cómo gestionar las cookies
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Tienes el derecho y la capacidad de controlar el uso de cookies. Puedes:
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                En nuestro sitio web:
              </h3>
              <p className="text-gray-700 text-sm mb-2">
                Puedes cambiar tus preferencias en cualquier momento haciendo clic en el banner 
                de cookies en la parte inferior de la página.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                En tu navegador:
              </h3>
              <p className="text-gray-700 text-sm mb-2">
                Todos los navegadores modernos permiten controlar las cookies a través de su configuración:
              </p>
              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4 text-sm">
                <li>
                  <strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies y otros datos de sitios
                </li>
                <li>
                  <strong>Firefox:</strong> Opciones → Privacidad y seguridad → Cookies y datos del sitio
                </li>
                <li>
                  <strong>Safari:</strong> Preferencias → Privacidad → Cookies y datos de sitios web
                </li>
                <li>
                  <strong>Edge:</strong> Configuración → Privacidad, búsqueda y servicios → Cookies
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Para anuncios personalizados de Google:
              </h3>
              <p className="text-gray-700 text-sm mb-2">
                Puedes configurar tus preferencias de anuncios en:
              </p>
              <a 
                href="https://adssettings.google.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-sm font-medium"
              >
                Configuración de anuncios de Google →
              </a>
            </div>

            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Importante:</strong> Si bloqueas o eliminas las cookies, algunas 
                funcionalidades del sitio pueden verse limitadas, como mantener tu sesión 
                iniciada o recordar tus preferencias.
              </p>
            </div>
          </section>

          {/* Consentimiento */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              5. Tu consentimiento
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Al utilizar nuestro sitio web, aceptas el uso de cookies de acuerdo con esta 
              Política de Cookies. Cuando visitas nuestro sitio por primera vez, te mostramos 
              un banner de cookies que te permite:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Aceptar todas las cookies</li>
              <li>Rechazar cookies no esenciales</li>
              <li>Personalizar qué tipos de cookies quieres permitir</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Puedes cambiar tu consentimiento en cualquier momento accediendo a la configuración 
              de cookies desde el footer de nuestra página.
            </p>
          </section>

          {/* Terceros */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              6. Cookies de terceros
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Utilizamos servicios de terceros que establecen sus propias cookies:
            </p>
            
            <div className="space-y-3">
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Google AdSense</h3>
                <p className="text-sm text-gray-700 mb-2">
                  Para mostrar anuncios relevantes y medir su rendimiento.
                </p>
                <a 
                  href="https://policies.google.com/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  Ver política de privacidad →
                </a>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Google Analytics</h3>
                <p className="text-sm text-gray-700 mb-2">
                  Para análisis estadístico del uso del sitio.
                </p>
                <a 
                  href="https://policies.google.com/privacy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  Ver política de privacidad →
                </a>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-4 italic">
              No tenemos control sobre las cookies establecidas por terceros. 
              Te recomendamos revisar sus políticas de privacidad para más información.
            </p>
          </section>

          {/* Actualizaciones */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              7. Actualizaciones de esta política
            </h2>
            <p className="text-gray-700 leading-relaxed">
              Podemos actualizar esta Política de Cookies ocasionalmente para reflejar cambios 
              en nuestra tecnología, legislación o prácticas comerciales. Te recomendamos revisar 
              esta página periódicamente. La fecha de la última actualización se muestra al inicio 
              de esta política.
            </p>
          </section>

          {/* Contacto */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              8. Contacto
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Si tienes preguntas sobre esta Política de Cookies o sobre cómo utilizamos las cookies, 
              puedes contactarnos en:
            </p>
            <div className="bg-gray-50 rounded-lg p-4 border">
              <p className="text-gray-700">
                <strong>Email:</strong>{' '}
                <a href="mailto:info@opositapp.com" className="text-blue-600 hover:underline">
                  info@opositapp.com
                </a>
              </p>
              <p className="text-gray-700 mt-2">
                <strong>Titular:</strong> Luis Enrique Algueró Martín
              </p>
            </div>
          </section>

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
          <Link href="/cookies" className="text-blue-600 hover:underline font-medium">
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

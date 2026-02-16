import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidad | OpositApp',
  description: 'Política de privacidad y protección de datos de OpositApp',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-lg p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Política de Privacidad
          </h1>
          
          <p className="text-gray-600 mb-8">
            <strong>Última actualización:</strong> 16 de febrero de 2026
          </p>

          <div className="space-y-8 text-gray-700">
            {/* Introducción */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Introducción
              </h2>
              <p className="leading-relaxed">
                En OpositApp, nos comprometemos a proteger tu privacidad y tus datos personales. 
                Esta Política de Privacidad describe cómo recopilamos, usamos, almacenamos y 
                protegemos tu información cuando utilizas nuestra plataforma de preparación de oposiciones.
              </p>
            </section>

            {/* Datos que recopilamos */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Información que Recopilamos
              </h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                2.1 Información que nos proporcionas
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Nombre y apellidos</li>
                <li>Dirección de correo electrónico</li>
                <li>Número de teléfono (opcional)</li>
                <li>Información de cuenta y contraseña</li>
                <li>Preferencias de estudio y oposición</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
                2.2 Información recopilada automáticamente
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Dirección IP y datos de conexión</li>
                <li>Tipo de navegador y dispositivo</li>
                <li>Páginas visitadas y tiempo de permanencia</li>
                <li>Resultados de tests y estadísticas de rendimiento</li>
                <li>Interacciones con el asistente de IA</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
                2.3 Cookies y tecnologías similares
              </h3>
              <p className="leading-relaxed">
                Utilizamos cookies para mejorar tu experiencia, mantener tu sesión activa, 
                recordar tus preferencias y analizar el uso de la plataforma. Puedes configurar 
                tu navegador para rechazar cookies, aunque esto puede limitar algunas funcionalidades.
              </p>
            </section>

            {/* Uso de la información */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. Cómo Usamos tu Información
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Proporcionar y mejorar nuestros servicios educativos</li>
                <li>Personalizar tu experiencia de estudio</li>
                <li>Generar estadísticas y análisis de rendimiento</li>
                <li>Enviar notificaciones importantes sobre tu cuenta</li>
                <li>Responder a tus consultas y solicitudes de soporte</li>
                <li>Detectar y prevenir fraudes o usos no autorizados</li>
                <li>Cumplir con obligaciones legales</li>
              </ul>
            </section>

            {/* Google AdSense */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Publicidad y Google AdSense
              </h2>
              <p className="leading-relaxed mb-4">
                OpositApp utiliza <strong>Google AdSense</strong> para mostrar anuncios personalizados. 
                Google utiliza cookies para servir anuncios basados en visitas previas a nuestro sitio web 
                u otros sitios web.
              </p>
              <p className="leading-relaxed mb-4">
                Los usuarios pueden inhabilitar la publicidad personalizada visitando la página de 
                <a 
                  href="https://www.google.com/settings/ads" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline ml-1"
                >
                  Configuración de anuncios de Google
                </a>.
              </p>
              <p className="leading-relaxed">
                Para más información sobre cómo Google utiliza los datos cuando usas sitios web de 
                nuestros partners, visita 
                <a 
                  href="https://policies.google.com/technologies/partner-sites" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline ml-1"
                >
                  policies.google.com/technologies/partner-sites
                </a>.
              </p>
            </section>

            {/* Compartir información */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Compartir Información
              </h2>
              <p className="leading-relaxed mb-4">
                No vendemos ni alquilamos tu información personal a terceros. Podemos compartir 
                información limitada con:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Proveedores de servicios:</strong> hosting, análisis, procesamiento de pagos</li>
                <li><strong>Socios publicitarios:</strong> como Google AdSense (según lo descrito arriba)</li>
                <li><strong>Autoridades legales:</strong> cuando sea requerido por ley</li>
              </ul>
            </section>

            {/* Seguridad */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Seguridad de los Datos
              </h2>
              <p className="leading-relaxed">
                Implementamos medidas de seguridad técnicas y organizativas para proteger tu información 
                personal contra acceso no autorizado, pérdida, destrucción o alteración. Esto incluye 
                cifrado de datos, acceso restringido y auditorías de seguridad regulares.
              </p>
            </section>

            {/* Tus derechos */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Tus Derechos (RGPD)
              </h2>
              <p className="leading-relaxed mb-4">
                Según el Reglamento General de Protección de Datos (RGPD), tienes derecho a:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Acceso:</strong> solicitar una copia de tus datos personales</li>
                <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos</li>
                <li><strong>Supresión:</strong> solicitar la eliminación de tus datos</li>
                <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado</li>
                <li><strong>Oposición:</strong> oponerte al procesamiento de tus datos</li>
                <li><strong>Limitación:</strong> restringir el procesamiento en ciertos casos</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Para ejercer estos derechos, contacta con nosotros en{' '}
                <Link href="/contact" className="text-blue-600 hover:underline">
                  la página de contacto
                </Link>.
              </p>
            </section>

            {/* Retención */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. Retención de Datos
              </h2>
              <p className="leading-relaxed">
                Conservamos tu información personal durante el tiempo necesario para proporcionar 
                nuestros servicios y cumplir con nuestras obligaciones legales. Si eliminas tu cuenta, 
                borraremos tus datos personales dentro de 30 días, excepto aquellos que debamos 
                conservar por ley.
              </p>
            </section>

            {/* Menores */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Menores de Edad
              </h2>
              <p className="leading-relaxed">
                OpositApp está dirigido a personas mayores de 16 años. No recopilamos intencionadamente 
                información de menores de 16 años sin consentimiento parental.
              </p>
            </section>

            {/* Cambios */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. Cambios en esta Política
              </h2>
              <p className="leading-relaxed">
                Podemos actualizar esta Política de Privacidad ocasionalmente. Te notificaremos 
                cualquier cambio significativo publicando la nueva política en esta página y 
                actualizando la fecha de "Última actualización".
              </p>
            </section>

            {/* Contacto */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. Contacto
              </h2>
              <p className="leading-relaxed">
                Si tienes preguntas sobre esta Política de Privacidad o sobre cómo manejamos tus datos, 
                contáctanos a través de nuestra{' '}
                <Link href="/contact" className="text-blue-600 hover:underline">
                  página de contacto
                </Link>.
              </p>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white mt-12 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-sm">
              © 2026 OpositApp. Todos los derechos reservados.
            </p>
            <div className="flex gap-6 text-sm">
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacidad
              </Link>
              <Link href="/terms" className="text-gray-600 hover:text-blue-600">
                Términos
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

import Link from 'next/link'

export const metadata = {
  title: 'Términos y Condiciones | OpositApp',
  description: 'Términos y condiciones de uso de OpositApp',
}

export default function TermsPage() {
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
            Términos y Condiciones de Uso
          </h1>
          
          <p className="text-gray-600 mb-8">
            <strong>Última actualización:</strong> 16 de febrero de 2026
          </p>

          <div className="space-y-8 text-gray-700">
            {/* Introducción */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                1. Aceptación de los Términos
              </h2>
              <p className="leading-relaxed">
                Al acceder y utilizar OpositApp ("el Servicio", "la Plataforma"), aceptas estar 
                vinculado por estos Términos y Condiciones, todas las leyes y regulaciones aplicables, 
                y aceptas que eres responsable del cumplimiento de las leyes locales aplicables. 
                Si no estás de acuerdo con alguno de estos términos, no uses este servicio.
              </p>
            </section>

            {/* Descripción del servicio */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                2. Descripción del Servicio
              </h2>
              <p className="leading-relaxed mb-4">
                OpositApp es una plataforma digital de preparación de oposiciones que ofrece:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Tests de temario con preguntas clasificadas por temas</li>
                <li>Supuestos prácticos y casos reales</li>
                <li>Simulacros de examen cronometrados</li>
                <li>Asistente de estudio con inteligencia artificial</li>
                <li>Análisis de rendimiento y estadísticas avanzadas</li>
                <li>Sistema de repaso inteligente con repetición espaciada</li>
                <li>Repositorio legal de normativa actualizada</li>
              </ul>
            </section>

            {/* Registro y cuenta */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                3. Registro y Cuenta de Usuario
              </h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                3.1 Requisitos de registro
              </h3>
              <p className="leading-relaxed mb-4">
                Para utilizar OpositApp, debes:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Tener al menos 16 años de edad</li>
                <li>Proporcionar información precisa y completa</li>
                <li>Mantener la seguridad de tu contraseña</li>
                <li>Actualizar tu información cuando sea necesario</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6">
                3.2 Responsabilidad de la cuenta
              </h3>
              <p className="leading-relaxed">
                Eres responsable de todas las actividades que ocurran bajo tu cuenta. Debes notificarnos 
                inmediatamente de cualquier uso no autorizado de tu cuenta o cualquier otra violación de 
                seguridad.
              </p>
            </section>

            {/* Planes y pagos */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                4. Planes de Suscripción y Pagos
              </h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                4.1 Plan Gratuito
              </h3>
              <p className="leading-relaxed mb-4">
                El Plan Gratuito incluye acceso limitado a funcionalidades básicas y contiene publicidad 
                mediante Google AdSense.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                4.2 Planes de Pago
              </h3>
              <p className="leading-relaxed mb-4">
                Los planes de pago (Basic, Pro, Premium) ofrecen funcionalidades adicionales sin publicidad. 
                Los precios y características están disponibles en la{' '}
                <Link href="/pricing" className="text-blue-600 hover:underline">
                  página de precios
                </Link>.
              </p>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                4.3 Renovación y cancelación
              </h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Las suscripciones se renuevan automáticamente</li>
                <li>Puedes cancelar en cualquier momento desde tu panel de usuario</li>
                <li>No se realizan reembolsos por períodos parciales</li>
                <li>El acceso premium continúa hasta el final del período pagado</li>
              </ul>
            </section>

            {/* Uso aceptable */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                5. Uso Aceptable
              </h2>
              <p className="leading-relaxed mb-4">
                Al usar OpositApp, te comprometes a NO:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Copiar, distribuir o modificar el contenido sin autorización</li>
                <li>Usar el servicio para actividades ilegales o fraudulentas</li>
                <li>Compartir tu cuenta con terceros</li>
                <li>Intentar acceder a áreas restringidas del sistema</li>
                <li>Realizar ingeniería inversa del software</li>
                <li>Usar bots, scripts o herramientas automatizadas</li>
                <li>Sobrecargar o interferir con los servidores</li>
                <li>Suplantar la identidad de otros usuarios</li>
              </ul>
            </section>

            {/* Propiedad intelectual */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                6. Propiedad Intelectual
              </h2>
              <p className="leading-relaxed mb-4">
                Todo el contenido de OpositApp, incluyendo textos, gráficos, logos, preguntas, 
                supuestos prácticos, software y código, está protegido por derechos de autor y 
                otras leyes de propiedad intelectual.
              </p>
              <p className="leading-relaxed">
                Se te concede una licencia limitada, no exclusiva e intransferible para usar el 
                servicio exclusivamente para tu preparación personal de oposiciones.
              </p>
            </section>

            {/* Publicidad */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                7. Publicidad (Google AdSense)
              </h2>
              <p className="leading-relaxed mb-4">
                El Plan Gratuito incluye publicidad proporcionada por <strong>Google AdSense</strong>. 
                Al usar el servicio gratuito, aceptas:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Ver anuncios mientras usas la plataforma</li>
                <li>Que Google pueda usar cookies para personalizar anuncios</li>
                <li>Las políticas de privacidad de Google AdSense</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Puedes eliminar la publicidad actualizando a un plan de pago.
              </p>
            </section>

            {/* Contenido del usuario */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                8. Contenido Generado por el Usuario
              </h2>
              <p className="leading-relaxed mb-4">
                Si proporcionas feedback, sugerencias o reportas errores:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Conservas la propiedad de tus comentarios</li>
                <li>Nos concedes una licencia mundial, libre de regalías para usar ese contenido</li>
                <li>Garantizas que no violas derechos de terceros</li>
              </ul>
            </section>

            {/* Limitación de responsabilidad */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                9. Limitación de Responsabilidad
              </h2>
              <p className="leading-relaxed mb-4">
                OpositApp se proporciona "tal cual" y "según disponibilidad". No garantizamos que:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>El servicio esté siempre disponible o libre de errores</li>
                <li>Los resultados obtenidos garanticen el aprobado de la oposición</li>
                <li>Todo el contenido esté 100% actualizado en todo momento</li>
              </ul>
              <p className="leading-relaxed mt-4">
                En ningún caso seremos responsables por daños indirectos, incidentales, especiales o 
                consecuentes derivados del uso o imposibilidad de uso del servicio.
              </p>
            </section>

            {/* Modificaciones */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                10. Modificaciones del Servicio
              </h2>
              <p className="leading-relaxed">
                Nos reservamos el derecho de modificar, suspender o discontinuar cualquier parte del 
                servicio en cualquier momento, con o sin previo aviso. No seremos responsables ante ti 
                o terceros por cualquier modificación, suspensión o discontinuación del servicio.
              </p>
            </section>

            {/* Terminación */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                11. Terminación
              </h2>
              <p className="leading-relaxed mb-4">
                Podemos suspender o terminar tu acceso al servicio inmediatamente si:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Violas estos Términos y Condiciones</li>
                <li>Detectamos actividad fraudulenta o sospechosa</li>
                <li>Lo requiere la ley</li>
              </ul>
              <p className="leading-relaxed mt-4">
                Puedes cancelar tu cuenta en cualquier momento desde el panel de configuración.
              </p>
            </section>

            {/* Ley aplicable */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                12. Ley Aplicable y Jurisdicción
              </h2>
              <p className="leading-relaxed">
                Estos términos se rigen por las leyes de España. Cualquier disputa se resolverá en 
                los tribunales de [Ciudad], España, a menos que la ley del consumidor requiera otra 
                jurisdicción.
              </p>
            </section>

            {/* Divisibilidad */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                13. Divisibilidad
              </h2>
              <p className="leading-relaxed">
                Si alguna disposición de estos términos se considera inválida o inaplicable, las 
                disposiciones restantes continuarán en pleno vigor y efecto.
              </p>
            </section>

            {/* Cambios */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                14. Cambios en los Términos
              </h2>
              <p className="leading-relaxed">
                Podemos actualizar estos Términos y Condiciones ocasionalmente. Te notificaremos 
                cualquier cambio significativo mediante un aviso en la plataforma o por email. 
                El uso continuado del servicio después de los cambios constituye tu aceptación de 
                los nuevos términos.
              </p>
            </section>

            {/* Contacto */}
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                15. Contacto
              </h2>
              <p className="leading-relaxed">
                Si tienes preguntas sobre estos Términos y Condiciones, contáctanos a través de 
                nuestra{' '}
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
              <Link href="/privacy" className="text-gray-600 hover:text-blue-600">
                Privacidad
              </Link>
              <Link href="/terms" className="text-blue-600 hover:underline">
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

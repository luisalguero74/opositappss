'use client'

import { useState } from 'react'

export default function MonetizationManual() {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="mb-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-lg shadow-lg flex items-center gap-2 transition"
      >
        📖 Manual de Configuración
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold flex items-center gap-3">
                📖 Manual de Configuración
              </h2>
              <p className="text-blue-100 mt-2">
                Guía completa para configurar monetización sin suscripción
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 rounded-lg p-2 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Introducción */}
          <section>
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              🎯 Introducción
            </h3>
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
              <p className="text-gray-700 leading-relaxed">
                Este sistema te permite monetizar opositAPPSS sin que los usuarios tengan que pagar. 
                Puedes activar o desactivar cada opción de forma independiente según tus necesidades. 
                Los ingresos se generan a través de publicidad, comisiones por ventas, patrocinios y donaciones voluntarias.
              </p>
            </div>
          </section>

          {/* 1. Publicidad Google AdSense */}
          <section className="border-t pt-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              📺 1. Publicidad Contextual (Google AdSense)
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-5 rounded-xl">
                <h4 className="font-bold text-gray-800 mb-2">¿Qué es?</h4>
                <p className="text-gray-700 text-sm">
                  Google AdSense muestra anuncios automáticos relacionados con educación y oposiciones en tu plataforma. 
                  Ganas dinero cada vez que un usuario ve o hace clic en un anuncio.
                </p>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                <h4 className="font-bold text-gray-800 mb-2">💰 Ingresos Estimados</h4>
                <p className="text-gray-700 text-sm">€0.50 - €3 por cada 1000 visualizaciones de página</p>
                <p className="text-gray-600 text-xs mt-1">Ejemplo: Con 10,000 visitas/mes = €5-€30/mes</p>
              </div>

              <div className="bg-white border border-gray-200 p-5 rounded-xl">
                <h4 className="font-bold text-gray-800 mb-3">📋 Pasos para Configurar:</h4>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li className="flex gap-3">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                    <div>
                      <strong>Crea una cuenta en Google AdSense:</strong>
                      <br />
                      <a href="https://www.google.com/adsense" target="_blank" className="text-blue-600 hover:underline">
                        https://www.google.com/adsense
                      </a>
                      <p className="text-gray-600 text-xs mt-1">Necesitarás: email, sitio web, cuenta bancaria, DNI/pasaporte</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                    <div>
                      <strong>Envía tu sitio a revisión:</strong>
                      <br />
                      <p className="text-gray-600 text-xs mt-1">Google revisará tu contenido (puede tomar 1-2 semanas)</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                    <div>
                      <strong>Obtén tu ID de Cliente:</strong>
                      <br />
                      <p className="text-gray-600 text-xs mt-1">En AdSense → Cuenta → Información de la cuenta</p>
                      <p className="text-gray-600 text-xs">Formato: <code className="bg-gray-100 px-2 py-1 rounded">ca-pub-1234567890123456</code></p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
                    <div>
                      <strong>Pega tu ID aquí:</strong>
                      <br />
                      <p className="text-gray-600 text-xs mt-1">Activa el toggle y pega el ID completo (con ca-pub-)</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">5</span>
                    <div>
                      <strong>Guarda y espera aprobación:</strong>
                      <br />
                      <p className="text-gray-600 text-xs mt-1">Los anuncios aparecerán automáticamente en sidebar y fin de tests</p>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                <h4 className="font-bold text-red-800 mb-2">⚠️ Importante</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• No hagas clic en tus propios anuncios (puede suspender tu cuenta)</li>
                  <li>• Mínimo para cobro: €70</li>
                  <li>• Los pagos se hacen mensualmente si superas el mínimo</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 2. Marketing de Afiliados */}
          <section className="border-t pt-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              🔗 2. Marketing de Afiliados (Amazon)
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-5 rounded-xl">
                <h4 className="font-bold text-gray-800 mb-2">¿Qué es?</h4>
                <p className="text-gray-700 text-sm">
                  Recomiendas libros y recursos para oposiciones. Cuando alguien compra a través de tu enlace, 
                  recibes una comisión sin coste adicional para el comprador.
                </p>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                <h4 className="font-bold text-gray-800 mb-2">💰 Ingresos Estimados</h4>
                <p className="text-gray-700 text-sm">5-15% de comisión por venta</p>
                <p className="text-gray-600 text-xs mt-1">Ejemplo: Libro de €45 × 10% = €4.50 de comisión</p>
                <p className="text-gray-600 text-xs">Con 20 ventas/mes = €90/mes</p>
              </div>

              <div className="bg-white border border-gray-200 p-5 rounded-xl">
                <h4 className="font-bold text-gray-800 mb-3">📋 Pasos para Configurar:</h4>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li className="flex gap-3">
                    <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                    <div>
                      <strong>Regístrate en Amazon Associates:</strong>
                      <br />
                      <a href="https://afiliados.amazon.es" target="_blank" className="text-orange-600 hover:underline">
                        https://afiliados.amazon.es
                      </a>
                      <p className="text-gray-600 text-xs mt-1">Es gratis y rápido (5 minutos)</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                    <div>
                      <strong>Completa tu perfil:</strong>
                      <br />
                      <p className="text-gray-600 text-xs mt-1">Describe tu web: "Plataforma educativa para oposiciones"</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                    <div>
                      <strong>Obtén tu ID de Afiliado:</strong>
                      <br />
                      <p className="text-gray-600 text-xs mt-1">En el panel → Tracking ID</p>
                      <p className="text-gray-600 text-xs">Formato: <code className="bg-gray-100 px-2 py-1 rounded">tuusuario-21</code></p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
                    <div>
                      <strong>Pega tu ID aquí:</strong>
                      <br />
                      <p className="text-gray-600 text-xs mt-1">Activa el toggle y pega tu ID de afiliado</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">5</span>
                    <div>
                      <strong>Los libros aparecerán automáticamente:</strong>
                      <br />
                      <p className="text-gray-600 text-xs mt-1">Sección "Recursos Recomendados" en el dashboard</p>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                <h4 className="font-bold text-green-800 mb-2">💡 Consejo Pro</h4>
                <p className="text-sm text-green-700">
                  Puedes personalizar los libros recomendados editando el archivo 
                  <code className="bg-green-100 px-2 py-1 rounded mx-1">AffiliatesSection.tsx</code>
                  con los libros más vendidos de tu temario.
                </p>
              </div>
            </div>
          </section>

          {/* 3. Patrocinios */}
          <section className="border-t pt-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              🤝 3. Patrocinios Institucionales
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-5 rounded-xl">
                <h4 className="font-bold text-gray-800 mb-2">¿Qué es?</h4>
                <p className="text-gray-700 text-sm">
                  Academias, sindicatos u organizaciones pagan para que sus alumnos/afiliados accedan gratis a la plataforma. 
                  El logo del patrocinador aparece en la app (como el badge de ECAP que ya tienes).
                </p>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                <h4 className="font-bold text-gray-800 mb-2">💰 Ingresos Estimados</h4>
                <p className="text-gray-700 text-sm">€200 - €5,000 por mes y patrocinador</p>
                <p className="text-gray-600 text-xs mt-1">Depende del tamaño de la academia/organización</p>
              </div>

              <div className="bg-white border border-gray-200 p-5 rounded-xl">
                <h4 className="font-bold text-gray-800 mb-3">📋 Cómo Conseguir Patrocinadores:</h4>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li className="flex gap-3">
                    <span className="bg-emerald-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                    <div>
                      <strong>Identifica potenciales patrocinadores:</strong>
                      <br />
                      <ul className="text-gray-600 text-xs mt-1 ml-4 space-y-1">
                        <li>• Academias de oposiciones (ECAP, CEF, Adams, etc.)</li>
                        <li>• Sindicatos (CSIF, UGT, CC.OO.)</li>
                        <li>• Colegios profesionales</li>
                        <li>• Editoriales (MAD, Paraninfo)</li>
                      </ul>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-emerald-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                    <div>
                      <strong>Prepara tu propuesta:</strong>
                      <br />
                      <p className="text-gray-600 text-xs mt-1">
                        "Damos acceso gratuito a todos tus alumnos. A cambio, aparece tu logo en la plataforma."
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-emerald-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                    <div>
                      <strong>Negocia el precio:</strong>
                      <br />
                      <p className="text-gray-600 text-xs mt-1">Basado en número de alumnos:</p>
                      <ul className="text-gray-600 text-xs ml-4 mt-1">
                        <li>• 50-100 alumnos: €200-€400/mes</li>
                        <li>• 100-500 alumnos: €500-€1500/mes</li>
                        <li>• 500+ alumnos: €2000-€5000/mes</li>
                      </ul>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-emerald-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
                    <div>
                      <strong>Activa el toggle aquí:</strong>
                      <br />
                      <p className="text-gray-600 text-xs mt-1">Los badges de patrocinadores se mostrarán automáticamente</p>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                <h4 className="font-bold text-blue-800 mb-2">✉️ Email de Ejemplo</h4>
                <div className="bg-white p-3 rounded text-xs text-gray-700 mt-2">
                  <p className="font-bold mb-2">Asunto: Propuesta de colaboración - Acceso gratuito para tus alumnos</p>
                  <p className="mb-2">Estimado/a [Nombre],</p>
                  <p className="mb-2">
                    Soy desarrollador de opositAPPSS, una plataforma de preparación online para oposiciones de Seguridad Social.
                  </p>
                  <p className="mb-2">
                    Propongo ofrecer acceso 100% gratuito a todos tus alumnos a cambio de que [Academia] aparezca como patrocinador en la plataforma.
                  </p>
                  <p className="mb-2">
                    <strong>Beneficios para [Academia]:</strong><br/>
                    • Tus alumnos practican ilimitadamente sin coste<br/>
                    • Tu logo visible para todos los usuarios<br/>
                    • Estadísticas de uso de tus alumnos
                  </p>
                  <p className="mb-2">
                    Inversión: €[X]/mes<br/>
                    ¿Te interesa? Estoy disponible para comentarlo.
                  </p>
                  <p>Saludos,<br/>[Tu nombre]</p>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Donaciones */}
          <section className="border-t pt-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              ☕ 4. Donaciones Voluntarias
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-5 rounded-xl">
                <h4 className="font-bold text-gray-800 mb-2">¿Qué es?</h4>
                <p className="text-gray-700 text-sm">
                  Usuarios agradecidos pueden apoyar el proyecto voluntariamente con donaciones únicas o recurrentes.
                  Es opcional y no afecta al acceso.
                </p>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                <h4 className="font-bold text-gray-800 mb-2">💰 Ingresos Estimados</h4>
                <p className="text-gray-700 text-sm">€50 - €500 por mes (muy variable)</p>
                <p className="text-gray-600 text-xs mt-1">Depende del tamaño y compromiso de tu comunidad</p>
                <p className="text-gray-600 text-xs">1-3% de usuarios suelen donar algo</p>
              </div>

              <div className="bg-white border border-gray-200 p-5 rounded-xl">
                <h4 className="font-bold text-gray-800 mb-3">📋 Configurar Patreon:</h4>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li className="flex gap-3">
                    <span className="bg-pink-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                    <div>
                      <strong>Crea cuenta en Patreon:</strong>
                      <br />
                      <a href="https://www.patreon.com" target="_blank" className="text-pink-600 hover:underline">
                        https://www.patreon.com
                      </a>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-pink-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                    <div>
                      <strong>Crea tu página de creador:</strong>
                      <br />
                      <p className="text-gray-600 text-xs mt-1">Describe tu proyecto y los niveles de apoyo (€3, €5, €10/mes)</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-pink-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                    <div>
                      <strong>Copia tu URL:</strong>
                      <br />
                      <p className="text-gray-600 text-xs mt-1">Ejemplo: https://www.patreon.com/opositappss</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-pink-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
                    <div>
                      <strong>Pégala aquí y guarda</strong>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="bg-white border border-gray-200 p-5 rounded-xl">
                <h4 className="font-bold text-gray-800 mb-3">📋 Configurar Ko-fi (alternativa más simple):</h4>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li className="flex gap-3">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                    <div>
                      <strong>Crea cuenta en Ko-fi:</strong>
                      <br />
                      <a href="https://ko-fi.com" target="_blank" className="text-blue-600 hover:underline">
                        https://ko-fi.com
                      </a>
                      <p className="text-gray-600 text-xs mt-1">Más simple que Patreon, ideal para donaciones únicas</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                    <div>
                      <strong>Personaliza tu página:</strong>
                      <br />
                      <p className="text-gray-600 text-xs mt-1">Añade descripción y foto</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                    <div>
                      <strong>Copia tu URL y pégala aquí</strong>
                    </div>
                  </li>
                </ol>
              </div>

              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                <h4 className="font-bold text-green-800 mb-2">💡 Consejo Pro</h4>
                <p className="text-sm text-green-700">
                  Puedes usar ambos (Patreon para apoyos mensuales, Ko-fi para cafés únicos). 
                  Los botones aparecerán juntos en el dashboard.
                </p>
              </div>
            </div>
          </section>

          {/* 5. Contenido Premium */}
          <section className="border-t pt-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              ⭐ 5. Contenido Premium Opcional
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 p-5 rounded-xl">
                <h4 className="font-bold text-gray-800 mb-2">¿Qué es?</h4>
                <p className="text-gray-700 text-sm">
                  Ofreces contenido extra opcional de pago (simulacros oficiales, masterclasses, casos resueltos) 
                  mientras el contenido básico sigue siendo 100% gratuito.
                </p>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                <h4 className="font-bold text-gray-800 mb-2">💰 Ingresos Estimados</h4>
                <p className="text-gray-700 text-sm">€5 - €15 por contenido premium</p>
                <p className="text-gray-600 text-xs mt-1">Ejemplo: 50 usuarios × €10 = €500/mes</p>
              </div>

              <div className="bg-white border border-gray-200 p-5 rounded-xl">
                <h4 className="font-bold text-gray-800 mb-3">📋 Ideas de Contenido Premium:</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex gap-3">
                    <span className="text-purple-500">•</span>
                    <div>
                      <strong>Simulacros Oficiales Comentados</strong>
                      <p className="text-gray-600 text-xs">Exámenes reales anteriores con explicaciones detalladas</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-purple-500">•</span>
                    <div>
                      <strong>Masterclasses en Video</strong>
                      <p className="text-gray-600 text-xs">Expertos explican temas difíciles (1-2 horas)</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-purple-500">•</span>
                    <div>
                      <strong>Supuestos Prácticos Resueltos</strong>
                      <p className="text-gray-600 text-xs">Casos complejos paso a paso</p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-purple-500">•</span>
                    <div>
                      <strong>Pack de Esquemas y Resúmenes</strong>
                      <p className="text-gray-600 text-xs">PDFs descargables de todo el temario</p>
                    </div>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                <h4 className="font-bold text-blue-800 mb-2">🚀 Cómo Implementarlo</h4>
                <ol className="space-y-2 text-sm text-blue-700">
                  <li>1. Activa el toggle aquí</li>
                  <li>2. Aparecerá sección "Contenido Exclusivo" en dashboard</li>
                  <li>3. Sube contenido premium desde panel admin</li>
                  <li>4. Configura precios y acceso</li>
                </ol>
              </div>
            </div>
          </section>

          {/* Recomendaciones Finales */}
          <section className="border-t pt-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              🎯 Recomendaciones Finales
            </h3>
            
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 rounded-xl">
                <h4 className="font-bold text-gray-800 mb-3">✅ Estrategia Recomendada (Paso a Paso)</h4>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li className="flex gap-2">
                    <strong>Mes 1-2:</strong> Solo donaciones (Ko-fi). Construye comunidad sin ser intrusivo.
                  </li>
                  <li className="flex gap-2">
                    <strong>Mes 3-4:</strong> Añade afiliados. Ya tienes usuarios, pueden generar comisiones.
                  </li>
                  <li className="flex gap-2">
                    <strong>Mes 5-6:</strong> Busca 1-2 patrocinadores (academias pequeñas).
                  </li>
                  <li className="flex gap-2">
                    <strong>Mes 7+:</strong> Evalúa añadir publicidad o premium según necesites.
                  </li>
                </ol>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-lg">
                <h4 className="font-bold text-yellow-800 mb-2">⚠️ Qué NO Hacer</h4>
                <ul className="space-y-1 text-sm text-yellow-700">
                  <li>• No actives todo a la vez (abrumador para usuarios)</li>
                  <li>• No pongas anuncios intrusivos (molesta y reduce uso)</li>
                  <li>• No cambies contenido gratis a pago (rompe confianza)</li>
                  <li>• No olvides avisar a usuarios de cambios importantes</li>
                </ul>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
                <h4 className="font-bold text-blue-800 mb-2">📊 Monitoriza Resultados</h4>
                <p className="text-sm text-blue-700 mb-2">Después de activar cada opción, revisa mensualmente:</p>
                <ul className="space-y-1 text-sm text-blue-700">
                  <li>• ¿Cuánto has ganado?</li>
                  <li>• ¿Ha bajado el uso de la plataforma?</li>
                  <li>• ¿Los usuarios se quejan?</li>
                  <li>• ¿Vale la pena vs el esfuerzo?</li>
                </ul>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="border-t pt-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              ❓ Preguntas Frecuentes
            </h3>
            
            <div className="space-y-3">
              <details className="bg-gray-50 rounded-lg p-4">
                <summary className="font-bold text-gray-800 cursor-pointer">
                  ¿Puedo activar varias opciones a la vez?
                </summary>
                <p className="text-sm text-gray-700 mt-2">
                  Sí, pero empieza con 1-2 para no abrumar. Recomendamos: Donaciones + Afiliados primero.
                </p>
              </details>

              <details className="bg-gray-50 rounded-lg p-4">
                <summary className="font-bold text-gray-800 cursor-pointer">
                  ¿Los usuarios tienen que pagar por esto?
                </summary>
                <p className="text-sm text-gray-700 mt-2">
                  NO. Todo sigue gratis para usuarios. Los ingresos vienen de publicidad, comisiones y patrocinadores.
                </p>
              </details>

              <details className="bg-gray-50 rounded-lg p-4">
                <summary className="font-bold text-gray-800 cursor-pointer">
                  ¿Cuánto tiempo toma configurar cada opción?
                </summary>
                <p className="text-sm text-gray-700 mt-2">
                  • Donaciones: 10 minutos<br/>
                  • Afiliados: 15 minutos<br/>
                  • AdSense: 30 minutos + 1-2 semanas aprobación<br/>
                  • Patrocinios: Variable (negociación)
                </p>
              </details>

              <details className="bg-gray-50 rounded-lg p-4">
                <summary className="font-bold text-gray-800 cursor-pointer">
                  ¿Necesito facturar?
                </summary>
                <p className="text-sm text-gray-700 mt-2">
                  Sí, para patrocinios. Para AdSense/Amazon/Donaciones, ellos gestionan pagos (te hacen transferencia directa).
                </p>
              </details>

              <details className="bg-gray-50 rounded-lg p-4">
                <summary className="font-bold text-gray-800 cursor-pointer">
                  ¿Puedo desactivar algo después?
                </summary>
                <p className="text-sm text-gray-700 mt-2">
                  Sí, en cualquier momento. Solo desactiva el toggle y guarda. Los cambios son inmediatos.
                </p>
              </details>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t pt-6 text-center">
            <p className="text-gray-600 text-sm">
              ¿Más dudas? Consulta la documentación de cada plataforma o contacta con soporte.
            </p>
            <button
              onClick={() => setIsOpen(false)}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition"
            >
              Cerrar Manual
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

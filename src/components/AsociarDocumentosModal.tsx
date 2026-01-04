'use client'

import { useState, useEffect } from 'react'

interface DocumentoLegal {
  id: string
  nombre: string
  archivo: string
  tipo: string
  numeroPaginas: number
  fechaActualizacion: string
}

interface AsociarDocumentosModalProps {
  temaId: string
  temaNumero: number
  temaTitulo: string
  normativaBase?: string[]
  documentosYaAsociados?: string[]
  onClose: () => void
  onSave: (documentosIds: string[]) => Promise<void>
}

export default function AsociarDocumentosModal({
  temaId,
  temaNumero,
  temaTitulo,
  normativaBase = [],
  documentosYaAsociados = [],
  onClose,
  onSave
}: AsociarDocumentosModalProps) {
  const [documentos, setDocumentos] = useState<DocumentoLegal[]>([])
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set(documentosYaAsociados))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    cargarDocumentos()
  }, [])

  async function cargarDocumentos() {
    try {
      const res = await fetch('/api/biblioteca-legal')
      const data = await res.json()
      setDocumentos(data.documentos || [])
    } catch (error) {
      console.error('Error al cargar documentos:', error)
    } finally {
      setLoading(false)
    }
  }

  function toggleDocumento(docId: string) {
    const nuevaSeleccion = new Set(seleccionados)
    if (nuevaSeleccion.has(docId)) {
      nuevaSeleccion.delete(docId)
    } else {
      nuevaSeleccion.add(docId)
    }
    setSeleccionados(nuevaSeleccion)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await onSave(Array.from(seleccionados))
      onClose()
    } catch (error) {
      console.error('Error al guardar:', error)
      alert('Error al guardar asociaciones')
    } finally {
      setSaving(false)
    }
  }

  function esRecomendado(doc: DocumentoLegal): boolean {
    if (!normativaBase || normativaBase.length === 0) return false
    return normativaBase.some(norma => 
      doc.nombre.toLowerCase().includes(norma.toLowerCase().substring(0, 20))
    )
  }

  const documentosRecomendados = documentos.filter(esRecomendado)
  const otrosDocumentos = documentos.filter(doc => !esRecomendado(doc))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Asociar Documentos de Biblioteca
              </h2>
              <p className="text-gray-600 mt-1">
                Tema {temaNumero}: {temaTitulo}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Cargando documentos...</p>
            </div>
          ) : documentos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No hay documentos en la biblioteca</p>
              <a
                href="/admin/biblioteca-legal"
                target="_blank"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Ir a la Biblioteca Legal para agregar documentos
              </a>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Documentos Recomendados */}
              {documentosRecomendados.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-green-700 mb-3 flex items-center gap-2">
                    <span>⭐</span>
                    Recomendados según normativa base
                  </h3>
                  <div className="space-y-2">
                    {documentosRecomendados.map(doc => (
                      <label
                        key={doc.id}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${
                          seleccionados.has(doc.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={seleccionados.has(doc.id)}
                          onChange={() => toggleDocumento(doc.id)}
                          className="w-5 h-5 text-blue-600"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{doc.nombre}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {doc.tipo.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {doc.numeroPaginas} páginas
                            </span>
                            <span className="text-xs text-gray-500">
                              Actualizado: {doc.fechaActualizacion}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Otros Documentos */}
              {otrosDocumentos.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-700 mb-3">
                    Todos los documentos ({otrosDocumentos.length})
                  </h3>
                  <div className="space-y-2">
                    {otrosDocumentos.map(doc => (
                      <label
                        key={doc.id}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${
                          seleccionados.has(doc.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 bg-white'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={seleccionados.has(doc.id)}
                          onChange={() => toggleDocumento(doc.id)}
                          className="w-5 h-5 text-blue-600"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{doc.nombre}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {doc.tipo.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {doc.numeroPaginas} páginas
                            </span>
                            <span className="text-xs text-gray-500">
                              Actualizado: {doc.fechaActualizacion}
                            </span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {seleccionados.size} documento(s) seleccionado(s)
            </p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar Asociaciones'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

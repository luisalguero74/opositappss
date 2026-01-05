'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TEMARIO_OFICIAL, getEstadisticasTemario, TemaOficial } from '@/lib/temario-oficial'
import AsociarDocumentosModal from '@/components/AsociarDocumentosModal'

export default function TemarioManager() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [temasData, setTemasData] = useState(TEMARIO_OFICIAL)
  const [stats, setStats] = useState(getEstadisticasTemario())
  const [filtroCategoria, setFiltroCategoria] = useState<'todos' | 'general' | 'especifico'>('todos')
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'completo' | 'pendiente'>('todos')
  const [uploadingTema, setUploadingTema] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [temasSeleccionados, setTemasSeleccionados] = useState<Set<string>>(new Set())
  const [temaPreview, setTemaPreview] = useState<TemaOficial | null>(null)
  const [temaAsociandoBiblioteca, setTemaAsociandoBiblioteca] = useState<TemaOficial | null>(null)
  const [documentosBiblioteca, setDocumentosBiblioteca] = useState<{ [temaId: string]: string[] }>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated' || (session && session.user.role !== 'ADMIN')) {
      router.push('/dashboard')
    }
  }, [status, session, router])

  // Recalcular estadísticas cuando cambien temasData o documentosBiblioteca
  useEffect(() => {
    const conArchivo = temasData.filter(t => 
      (t.archivosAsociados && t.archivosAsociados.length > 0) || 
      t.archivoAsociado ||
      (documentosBiblioteca[t.id] && documentosBiblioteca[t.id].length > 0)
    ).length
    const sinArchivo = temasData.length - conArchivo
    const porcentajeCompletado = Math.round((conArchivo / temasData.length) * 100)
    
    setStats({
      total: temasData.length,
      conArchivo,
      sinArchivo,
      porcentajeCompletado,
      general: temasData.filter(t => t.categoria === 'general').length,
      especifico: temasData.filter(t => t.categoria === 'especifico').length
    })
  }, [temasData, documentosBiblioteca])

  // Cargar configuración persistente
  useEffect(() => {
    const cargarConfiguracion = async () => {
      try {
        const response = await fetch('/api/temario/config')
        const config = await response.json()
        
        if (config.temas && Object.keys(config.temas).length > 0) {
          // Actualizar directamente el estado con los archivos desde la configuración
          const temasActualizados = TEMARIO_OFICIAL.map(tema => {
            const temaConfig = config.temas[tema.id]
            if (temaConfig && temaConfig.archivos && temaConfig.archivos.length > 0) {
              return {
                ...tema,
                archivosAsociados: temaConfig.archivos
              }
            }
            return tema
          })
          
          setTemasData(temasActualizados)
        }
      } catch (error) {
        console.error('Error al cargar configuración:', error)
      } finally {
        setIsLoading(false)
      }
    }

    if (status === 'authenticated') {
      cargarConfiguracion()
      cargarAsociacionesBiblioteca()
    }
  }, [status])

  // Cargar asociaciones de biblioteca
  async function cargarAsociacionesBiblioteca() {
    try {
      const res = await fetch('/api/biblioteca-legal')
      const data = await res.json()
      if (data.relaciones) {
        setDocumentosBiblioteca(data.relaciones)
        // El useEffect se encargará de recalcular estadísticas automáticamente
      }
    } catch (error) {
      console.error('Error al cargar asociaciones de biblioteca:', error)
    }
  }

  // Guardar asociaciones de biblioteca
  async function guardarAsociacionesBiblioteca(temaId: string, documentosIds: string[]) {
    try {
      const res = await fetch('/api/biblioteca-legal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'asociar-tema',
          temaId,
          documentosIds
        })
      })

      if (res.ok) {
        setDocumentosBiblioteca(prev => ({ ...prev, [temaId]: documentosIds }))
        // El useEffect se encargará de recalcular estadísticas automáticamente
        alert('✅ Asociaciones guardadas correctamente')
      }
    } catch (error) {
      console.error('Error al guardar asociaciones:', error)
      throw error
    }
  }

  const temasFiltrados = temasData.filter(tema => {
    // Filtro por categoría
    if (filtroCategoria !== 'todos' && tema.categoria !== filtroCategoria) {
      return false
    }
    
    // Filtro por estado
    if (filtroEstado === 'completo' && !tema.archivoAsociado) {
      return false
    }
    if (filtroEstado === 'pendiente' && tema.archivoAsociado) {
      return false
    }
    
    // Filtro por búsqueda
    if (searchTerm && !tema.titulo.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !tema.descripcion.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    
    return true
  })

  const handleFileUpload = async (temaId: string, files: File[]) => {
    setUploadingTema(temaId)
    setUploadProgress({ ...uploadProgress, [temaId]: 0 })
    
    try {
      const tema = temasData.find(t => t.id === temaId)
      if (!tema) return

      const archivosSubidos: any[] = []
      const totalFiles = files.length
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('file', file)
        formData.append('temaId', temaId)
        formData.append('categoria', tema.categoria)

        // Actualizar progreso por archivo
        const baseProgress = (i / totalFiles) * 100
        setUploadProgress(prev => ({ ...prev, [temaId]: baseProgress }))

        const response = await fetch('/api/temario/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Error al subir ${file.name}`)
        }

        const data = await response.json()
        archivosSubidos.push({ nombre: data.fileName, numeroPaginas: data.numeroPaginas })
      }
      
      // Actualizar progreso a 100%
      setUploadProgress(prev => ({ ...prev, [temaId]: 100 }))

      // Actualizar el tema con los nuevos archivos
      setTemasData(prevTemas => 
        prevTemas.map(t => {
          if (t.id === temaId) {
            const archivosExistentes = t.archivosAsociados || []
            return { 
              ...t, 
              archivosAsociados: [...archivosExistentes, ...archivosSubidos]
            }
          }
          return t
        })
      )

      // Actualizar estadísticas
      setTimeout(() => {
        const temasActualizados = temasData.map(t => {
          if (t.id === temaId) {
            const archivosExistentes = t.archivosAsociados || []
            return { 
              ...t, 
              archivosAsociados: [...archivosExistentes, ...archivosSubidos]
            }
          }
          return t
        })
        const conArchivo = temasActualizados.filter(t => 
          (t.archivosAsociados && t.archivosAsociados.length > 0) || t.archivoAsociado
        ).length
        const sinArchivo = temasActualizados.length - conArchivo
        const porcentajeCompletado = Math.round((conArchivo / temasActualizados.length) * 100)
        
        setStats({
          total: temasActualizados.length,
          conArchivo,
          sinArchivo,
          porcentajeCompletado,
          general: temasActualizados.filter(t => t.categoria === 'general').length,
          especifico: temasActualizados.filter(t => t.categoria === 'especifico').length
        })
      }, 100)

      // Limpiar estado de subida
      setTimeout(() => {
        setUploadingTema(null)
        setUploadProgress(prev => {
          const newProgress = { ...prev }
          delete newProgress[temaId]
          return newProgress
        })
      }, 1000)

      const totalPaginas = archivosSubidos.reduce((sum, a) => sum + (a.numeroPaginas || 0), 0)
      alert(`✅ ${archivosSubidos.length} archivo(s) subido(s) correctamente\n📖 Total: ${totalPaginas} páginas`)
    } catch (error) {
      console.error('Error:', error)
      setUploadingTema(null)
      setUploadProgress(prev => {
        const newProgress = { ...prev }
        delete newProgress[temaId]
        return newProgress
      })
      alert('❌ Error al subir archivos. Inténtalo de nuevo.')
    }
  }

  const toggleSeleccionTema = (temaId: string) => {
    const nuevaSeleccion = new Set(temasSeleccionados)
    if (nuevaSeleccion.has(temaId)) {
      nuevaSeleccion.delete(temaId)
    } else {
      nuevaSeleccion.add(temaId)
    }
    setTemasSeleccionados(nuevaSeleccion)
  }

  const seleccionarTodos = () => {
    const todosLosIds = new Set(temasFiltrados.map(t => t.id))
    setTemasSeleccionados(todosLosIds)
  }

  const deseleccionarTodos = () => {
    setTemasSeleccionados(new Set())
  }

  const todosFiltradosSeleccionados = temasFiltrados.length > 0 && 
    temasFiltrados.every(tema => temasSeleccionados.has(tema.id))

  const abrirVistaPrevia = (tema: TemaOficial) => {
    setTemaPreview(tema)
  }

  const cerrarVistaPrevia = () => {
    setTemaPreview(null)
  }

  const handleDeleteFile = async (temaId: string, fileName: string, categoria: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${fileName}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/temario/delete?categoria=${categoria}&fileName=${encodeURIComponent(fileName)}&temaId=${temaId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Error al eliminar archivo')
      }

      // Actualizar el estado local
      setTemasData(prevTemas => 
        prevTemas.map(t => {
          if (t.id === temaId) {
            // Si tiene archivos múltiples
            if (t.archivosAsociados) {
              const nuevosArchivos = t.archivosAsociados.filter(a => a.nombre !== fileName)
              return { 
                ...t, 
                archivosAsociados: nuevosArchivos.length > 0 ? nuevosArchivos : undefined
              }
            }
            // Si es archivo único (formato antiguo)
            if (t.archivoAsociado === fileName) {
              return {
                ...t,
                archivoAsociado: undefined,
                numeroPaginas: undefined
              }
            }
          }
          return t
        })
      )

      // Actualizar estadísticas
      setTimeout(() => {
        const temasActualizados = temasData.map(t => {
          if (t.id === temaId) {
            if (t.archivosAsociados) {
              const nuevosArchivos = t.archivosAsociados.filter(a => a.nombre !== fileName)
              return { 
                ...t, 
                archivosAsociados: nuevosArchivos.length > 0 ? nuevosArchivos : undefined
              }
            }
            if (t.archivoAsociado === fileName) {
              return {
                ...t,
                archivoAsociado: undefined,
                numeroPaginas: undefined
              }
            }
          }
          return t
        })
        const conArchivo = temasActualizados.filter(t => 
          (t.archivosAsociados && t.archivosAsociados.length > 0) || t.archivoAsociado
        ).length
        const sinArchivo = temasActualizados.length - conArchivo
        const porcentajeCompletado = Math.round((conArchivo / temasActualizados.length) * 100)
        
        setStats({
          total: temasActualizados.length,
          conArchivo,
          sinArchivo,
          porcentajeCompletado,
          general: temasActualizados.filter(t => t.categoria === 'general').length,
          especifico: temasActualizados.filter(t => t.categoria === 'especifico').length
        })
      }, 100)

      alert(`✅ Archivo "${fileName}" eliminado correctamente`)
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al eliminar el archivo. Inténtalo de nuevo.')
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📚</div>
          <p className="text-gray-700 text-xl font-semibold">Cargando temas del gestor...</p>
          <div className="mt-4 flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin" className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block">
            ← Volver al Panel Admin
          </Link>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">📚</div>
              <h1 className="text-4xl font-bold text-white">Gestor de Temario Oficial</h1>
              <p className="text-blue-100 mt-2">
                Administra los 36 temas oficiales del temario de oposiciones
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-500">
            <div className="text-3xl mb-2">📊</div>
            <div className="text-gray-600 text-sm">Total Temas</div>
            <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-green-500">
            <div className="text-3xl mb-2">✅</div>
            <div className="text-gray-600 text-sm">Completos</div>
            <div className="text-3xl font-bold text-green-600">{stats.conArchivo}</div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-orange-500">
            <div className="text-3xl mb-2">⏳</div>
            <div className="text-gray-600 text-sm">Pendientes</div>
            <div className="text-3xl font-bold text-orange-600">{stats.sinArchivo}</div>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-purple-500">
            <div className="text-3xl mb-2">📈</div>
            <div className="text-gray-600 text-sm">Progreso</div>
            <div className="text-3xl font-bold text-purple-600">{stats.porcentajeCompletado}%</div>
          </div>
        </div>

        {/* Barra de progreso visual */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-8">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Progreso General</h3>
          <div className="relative w-full bg-gray-200 rounded-full h-8 overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 flex items-center justify-center"
              style={{ width: `${stats.porcentajeCompletado}%` }}
            >
              <span className="text-white font-bold text-sm">
                {stats.conArchivo} de {stats.total}
              </span>
            </div>
          </div>
          <div className="mt-2 text-sm text-gray-600 flex justify-between">
            <span>General: {temasData.filter(t => t.categoria === 'general' && t.archivoAsociado).length}/23</span>
            <span>Específico: {temasData.filter(t => t.categoria === 'especifico' && t.archivoAsociado).length}/13</span>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-xl p-6 shadow-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Buscar Tema</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por título o descripción..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría</label>
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">📚 Todos</option>
                <option value="general">📘 General (23 temas)</option>
                <option value="especifico">📙 Específico (13 temas)</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="todos">🔍 Todos</option>
                <option value="completo">✅ Completos</option>
                <option value="pendiente">⏳ Pendientes</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de temas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              Temas Encontrados: {temasFiltrados.length}
              {temasSeleccionados.size > 0 && (
                <span className="ml-3 text-blue-600">
                  ({temasSeleccionados.size} seleccionado{temasSeleccionados.size !== 1 ? 's' : ''})
                </span>
              )}
            </h2>
            
            <div className="flex gap-2">
              <button
                onClick={todosFiltradosSeleccionados ? deseleccionarTodos : seleccionarTodos}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  todosFiltradosSeleccionados
                    ? 'bg-gray-500 hover:bg-gray-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                {todosFiltradosSeleccionados ? '❌ Deseleccionar Todos' : '✅ Seleccionar Todos'}
              </button>
              
              {temasSeleccionados.size > 0 && (
                <button
                  onClick={() => alert(`Acción en lote con ${temasSeleccionados.size} temas seleccionados`)}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition"
                >
                  📤 Subir Archivos ({temasSeleccionados.size})
                </button>
              )}
            </div>
          </div>

          {temasFiltrados.map((tema) => (
            <div
              key={tema.id}
              className={`bg-white rounded-xl shadow-lg overflow-hidden transition-all hover:shadow-xl ${
                tema.archivoAsociado ? 'border-l-4 border-green-500' : 'border-l-4 border-orange-400'
              } ${temasSeleccionados.has(tema.id) ? 'ring-4 ring-blue-300' : ''}`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Checkbox de selección */}
                    <div className="flex items-center pt-1">
                      <input
                        type="checkbox"
                        checked={temasSeleccionados.has(tema.id)}
                        onChange={() => toggleSeleccionTema(tema.id)}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </div>
                    
                    <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        tema.categoria === 'general' 
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {tema.categoria === 'general' ? '📘 General' : '📙 Específico'} - Tema {tema.numero}
                      </span>
                      
                      {((tema.archivosAsociados && tema.archivosAsociados.length > 0) || 
                        tema.archivoAsociado || 
                        (documentosBiblioteca[tema.id] && documentosBiblioteca[tema.id].length > 0)) ? (
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-green-100 text-green-700">
                          ✅ Completo
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-sm font-bold bg-orange-100 text-orange-700">
                          ⏳ Pendiente
                        </span>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-gray-800 mb-2">{tema.titulo}</h3>
                    <p className="text-gray-600 mb-4">{tema.descripcion}</p>

                    {tema.normativaBase && tema.normativaBase.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-700 mb-2">📋 Normativa Base:</p>
                        <div className="space-y-1">
                          {tema.normativaBase.map((norma, index) => (
                            <div key={index} className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                              • {norma}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Archivos múltiples (nuevo formato) */}
                    {tema.archivosAsociados && tema.archivosAsociados.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-green-700">📄 Archivos ({tema.archivosAsociados.length}):</p>
                        {tema.archivosAsociados.map((archivo, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                            <code className="flex-1">{archivo.nombre}</code>
                            {archivo.numeroPaginas && (
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold">
                                📖 {archivo.numeroPaginas} pág.
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteFile(tema.id, archivo.nombre, tema.categoria)}
                              className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-semibold transition"
                              title="Eliminar archivo"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Archivo único (retrocompatibilidad) */}
                    {tema.archivoAsociado && !tema.archivosAsociados && (
                      <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">
                        <span className="font-semibold">📄 Archivo:</span>
                        <code className="flex-1">{tema.archivoAsociado}</code>
                        {tema.numeroPaginas && (
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-semibold">
                            📖 {tema.numeroPaginas} páginas
                          </span>
                        )}
                        <button
                          onClick={() => handleDeleteFile(tema.id, tema.archivoAsociado || '', tema.categoria)}
                          className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-semibold transition"
                          title="Eliminar archivo"
                        >
                          🗑️
                        </button>
                      </div>
                    )}

                    {/* Documentos de biblioteca asociados */}
                    {documentosBiblioteca[tema.id] && documentosBiblioteca[tema.id].length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-sm font-semibold text-purple-700">⚖️ Documentos de Biblioteca ({documentosBiblioteca[tema.id].length}):</p>
                        <div className="text-xs text-purple-600 bg-purple-50 px-3 py-2 rounded-lg">
                          {documentosBiblioteca[tema.id].length} documento(s) legal(es) compartido(s)
                        </div>
                      </div>
                    )}
                  </div>
                  </div>

                  <div className="ml-4 flex flex-col gap-2">
                    {/* Botón para asociar de biblioteca */}
                    <button
                      onClick={() => setTemaAsociandoBiblioteca(tema)}
                      className="w-40 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition text-center"
                    >
                      📚 Biblioteca
                      {documentosBiblioteca[tema.id]?.length > 0 && (
                        <span className="ml-1 px-2 py-0.5 bg-white text-purple-700 rounded-full text-xs">
                          {documentosBiblioteca[tema.id].length}
                        </span>
                      )}
                    </button>

                    <div className="w-40">
                      <label
                        htmlFor={`file-${tema.id}`}
                        className={`px-4 py-2 rounded-lg font-semibold text-white cursor-pointer transition text-center block ${
                          uploadingTema === tema.id
                            ? 'bg-gray-400 cursor-not-allowed'
                            : (tema.archivosAsociados && tema.archivosAsociados.length > 0) || tema.archivoAsociado
                            ? 'bg-blue-500 hover:bg-blue-600'
                            : 'bg-green-500 hover:bg-green-600'
                        }`}
                      >
                        {uploadingTema === tema.id ? '⏳ Subiendo...' : ((tema.archivosAsociados && tema.archivosAsociados.length > 0) || tema.archivoAsociado) ? '➕ Añadir Más' : '📤 Subir'}
                      </label>
                      <input
                        id={`file-${tema.id}`}
                        type="file"
                        accept=".pdf,.txt,.epub,.doc,.docx"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          const files = e.target.files
                          if (files && files.length > 0) {
                            handleFileUpload(tema.id, Array.from(files))
                          }
                        }}
                        disabled={uploadingTema === tema.id}
                      />
                      
                      {/* Barra de progreso */}
                      {uploadingTema === tema.id && uploadProgress[tema.id] !== undefined && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-gray-600">Subiendo</span>
                            <span className="text-xs font-semibold text-blue-600">
                              {Math.round(uploadProgress[tema.id])}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300 ease-out"
                              style={{ width: `${uploadProgress[tema.id]}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {((tema.archivosAsociados && tema.archivosAsociados.length > 0) || tema.archivoAsociado) && (
                      <button
                        onClick={() => abrirVistaPrevia(tema)}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-semibold transition w-40"
                      >
                        👁️ Vista Previa
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {temasFiltrados.length === 0 && (
            <div className="bg-white rounded-xl p-12 text-center shadow-lg">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-xl text-gray-600">No se encontraron temas con los filtros aplicados</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Vista Previa */}
      {temaPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header del modal */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      temaPreview.categoria === 'general' 
                        ? 'bg-white/20 text-white'
                        : 'bg-white/20 text-white'
                    }`}>
                      {temaPreview.categoria === 'general' ? '📘 General' : '📙 Específico'} - Tema {temaPreview.numero}
                    </span>
                    {temaPreview.archivosAsociados && temaPreview.archivosAsociados.length > 0 ? (
                      <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-bold">
                        📄 {temaPreview.archivosAsociados.length} archivos • {temaPreview.archivosAsociados.reduce((sum, a) => sum + (a.numeroPaginas || 0), 0)} pág.
                      </span>
                    ) : temaPreview.numeroPaginas && (
                      <span className="px-3 py-1 bg-white/20 text-white rounded-full text-sm font-bold">
                        📖 {temaPreview.numeroPaginas} páginas
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold">{temaPreview.titulo}</h2>
                  <p className="text-purple-100 mt-2">{temaPreview.descripcion}</p>
                </div>
                <button
                  onClick={cerrarVistaPrevia}
                  className="ml-4 text-white hover:bg-white/20 rounded-lg p-2 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Información de archivos múltiples */}
              {temaPreview.archivosAsociados && temaPreview.archivosAsociados.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">📄 Archivos Asociados ({temaPreview.archivosAsociados.length})</h3>
                  <div className="space-y-3">
                    {temaPreview.archivosAsociados.map((archivo, index) => (
                      <div key={index} className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <code className="text-sm text-green-700 font-semibold">{archivo.nombre}</code>
                            {archivo.numeroPaginas && (
                              <p className="text-xs text-gray-600 mt-1">📖 {archivo.numeroPaginas} páginas</p>
                            )}
                          </div>
                          <a
                            href={`/api/temario/download?categoria=${temaPreview.categoria}&fileName=${encodeURIComponent(archivo.nombre)}`}
                            download={archivo.nombre}
                            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition text-sm"
                          >
                            ⬇️
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Información del archivo único (retrocompatibilidad) */}
              {temaPreview.archivoAsociado && !temaPreview.archivosAsociados && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-green-800 mb-1">📄 Archivo</p>
                      <code className="text-sm text-green-700">{temaPreview.archivoAsociado}</code>
                    </div>
                    <a
                      href={`/api/temario/download?categoria=${temaPreview.categoria}&fileName=${encodeURIComponent(temaPreview.archivoAsociado)}`}
                      download={temaPreview.archivoAsociado}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition text-sm"
                    >
                      ⬇️ Descargar
                    </a>
                  </div>
                </div>
              )}

              {/* Normativa Base */}
              {temaPreview.normativaBase && temaPreview.normativaBase.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">📋 Normativa Base</h3>
                  <div className="space-y-2">
                    {temaPreview.normativaBase.map((norma, index) => (
                      <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <p className="text-gray-700">• {norma}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vista previa del contenido */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 mb-3">📖 Vista Previa del Contenido</h3>
                <div className="border border-gray-300 rounded-lg p-6 bg-gray-50 min-h-[300px]">
                  {(temaPreview.archivosAsociados && temaPreview.archivosAsociados.length > 0) || temaPreview.archivoAsociado ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                          <div className="text-6xl mb-4">📄</div>
                          {temaPreview.archivosAsociados && temaPreview.archivosAsociados.length > 0 ? (
                            <>
                              <p className="text-gray-600 mb-2"><strong>{temaPreview.archivosAsociados.length} documentos</strong> asociados</p>
                              <p className="text-gray-500 text-sm">
                                Total: {temaPreview.archivosAsociados.reduce((sum, a) => sum + (a.numeroPaginas || 0), 0)} páginas
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-gray-600 mb-2">Documento: <strong>{temaPreview.archivoAsociado}</strong></p>
                              {temaPreview.numeroPaginas && (
                                <p className="text-gray-500 text-sm">{temaPreview.numeroPaginas} páginas</p>
                              )}
                            </>
                          )}
                          <p className="text-gray-500 text-sm mt-4">La vista previa completa estará disponible próximamente</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">📭</div>
                      <p className="text-gray-500">No hay documentos asociados a este tema</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer del modal */}
            <div className="border-t border-gray-200 p-4 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={cerrarVistaPrevia}
                className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition"
              >
                Cerrar
              </button>
              {temaPreview.archivoAsociado && (
                <a
                  href={`/api/temario/download?categoria=${temaPreview.categoria}&fileName=${encodeURIComponent(temaPreview.archivoAsociado)}`}
                  download={temaPreview.archivoAsociado}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition"
                >
                  ⬇️ Descargar Documento
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de asociación de biblioteca */}
      {temaAsociandoBiblioteca && (
        <AsociarDocumentosModal
          temaId={temaAsociandoBiblioteca.id}
          temaNumero={temaAsociandoBiblioteca.numero}
          temaTitulo={temaAsociandoBiblioteca.titulo}
          normativaBase={temaAsociandoBiblioteca.normativaBase}
          documentosYaAsociados={documentosBiblioteca[temaAsociandoBiblioteca.id] || []}
          onClose={() => setTemaAsociandoBiblioteca(null)}
          onSave={(documentosIds) => guardarAsociacionesBiblioteca(temaAsociandoBiblioteca.id, documentosIds)}
        />
      )}
    </div>
  )
}

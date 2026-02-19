'use client'

import { useState, useEffect } from 'react'

import { AlertTriangle, Trash2, CheckCircle, Eye } from 'lucide-react'

// Componentes simples inline
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>{children}</div>
)

const Badge = ({ children, variant = 'default' }: { children: React.ReactNode, variant?: string }) => {
  const variants = {
    default: 'bg-blue-100 text-blue-800',
    outline: 'border border-gray-300 text-gray-700',
    destructive: 'bg-red-100 text-red-800'
  }
  return <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${variants[variant as keyof typeof variants] || variants.default}`}>{children}</span>
}

const Button = ({ children, onClick, disabled, size = 'default', variant = 'default', className = '' }: any) => {
  const sizes: Record<string, string> = { sm: 'px-2 py-1 text-xs', default: 'px-4 py-2 text-sm' }
  const variants2: Record<string, string> = {
    default: 'bg-blue-600 hover:bg-blue-700 text-white',
    destructive: 'bg-red-600 hover:bg-red-700 text-white',
    outline: 'border border-gray-300 hover:bg-gray-100'
  }
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${sizes[size]} ${variants2[variant]} rounded font-medium disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  )
}

interface Duplicate {
  id1: string
  id2: string
  texto1: string
  texto2: string
  similaridad: number
  justificacion: string
}

export default function DuplicatesPage() {
  const [duplicates, setDuplicates] = useState<Duplicate[]>([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)

  const loadDuplicates = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/detect-duplicates')
      const data = await res.json()
      setDuplicates(data.duplicados || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDuplicates()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta pregunta? La acción no se puede deshacer.')) return
    
    try {
      await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' })
      alert('Pregunta eliminada')
      loadDuplicates()
    } catch (error) {
      console.error(error)
      alert('Error al eliminar')
    }
  }

  const handleMarkValid = (id1: string, id2: string) => {
    // Marcar como variantes válidas (implementar en futuro)
    setDuplicates(prev => prev.filter(d => !(d.id1 === id1 && d.id2 === id2)))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">🔍 Detección de Duplicados</h1>
          <p className="text-gray-600">Encontrados {duplicates.length} posibles duplicados</p>
        </div>
        <Button 
          onClick={loadDuplicates}
          disabled={scanning}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {scanning ? 'Escaneando...' : '🔄 Re-escanear'}
        </Button>
      </div>

      {duplicates.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">¡No se encontraron duplicados!</h2>
          <p className="text-gray-600">El banco está limpio</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {duplicates.map((dup, idx) => (
            <Card key={idx} className="p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-1" />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="destructive">{dup.similaridad}% similar</Badge>
                    <span className="text-sm text-gray-600">{dup.justificacion}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Pregunta 1 */}
                    <div className="border rounded-lg p-4 bg-red-50">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">Pregunta 1</Badge>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(dup.id1)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                      <p className="text-sm">{dup.texto1}</p>
                      <p className="text-xs text-gray-500 mt-2">ID: {dup.id1}</p>
                    </div>

                    {/* Pregunta 2 */}
                    <div className="border rounded-lg p-4 bg-red-50">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant="outline">Pregunta 2</Badge>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(dup.id2)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Eliminar
                        </Button>
                      </div>
                      <p className="text-sm">{dup.texto2}</p>
                      <p className="text-xs text-gray-500 mt-2">ID: {dup.id2}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex justify-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleMarkValid(dup.id1, dup.id2)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Marcar como variantes válidas
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

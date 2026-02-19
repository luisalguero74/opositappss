'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle, TrendingUp, BarChart3 } from 'lucide-react'

// Componentes simples inline
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-lg shadow-md ${className}`}>{children}</div>
)

const Badge = ({ children, variant = 'default', className = '' }: { children: React.ReactNode, variant?: string, className?: string }) => {
  const variants = {
    default: 'bg-blue-100 text-blue-800',
    outline: 'border border-gray-300 text-gray-700',
    secondary: 'bg-gray-100 text-gray-800',
    destructive: 'bg-red-100 text-red-800'
  }
  return <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${variants[variant as keyof typeof variants] || variants.default} ${className}`}>{children}</span>
}

interface BancoStats {
  total: number
  validadas: number
  pendientes: number
  sinTema: number
  porTema: {
    tema: string
    titulo: string
    total: number
    validadas: number
    facil: number
    media: number
    dificil: number
  }[]
  dificultad: {
    facil: number
    media: number
    dificil: number
  }
  tendencia: {
    fecha: string
    total: number
  }[]
}

export default function BancoStatusPage() {
  const [stats, setStats] = useState<BancoStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/banco-status')
      .then(res => res.json())
      .then(data => {
        setStats(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!stats) return <div>Error cargando estadísticas</div>

  const porcentajeValidadas = ((stats.validadas / stats.total) * 100).toFixed(1)
  const porcentajeSinTema = ((stats.sinTema / stats.total) * 100).toFixed(1)

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">📊 Salud del Banco de Preguntas</h1>
        <p className="text-gray-600">Análisis completo del estado del banco</p>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-blue-900">Total Preguntas</h3>
            <BarChart3 className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-blue-900">{stats.total.toLocaleString()}</p>
          <p className="text-xs text-blue-700 mt-1">En el banco completo</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-green-900">Validadas</h3>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-green-900">{stats.validadas.toLocaleString()}</p>
          <p className="text-xs text-green-700 mt-1">{porcentajeValidadas}% del total</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-50 to-orange-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-orange-900">Pendientes</h3>
            <AlertCircle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-orange-900">{stats.pendientes.toLocaleString()}</p>
          <p className="text-xs text-orange-700 mt-1">Requieren revisión</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-50 to-red-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-red-900">Sin Tema</h3>
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-red-900">{stats.sinTema.toLocaleString()}</p>
          <p className="text-xs text-red-700 mt-1">{porcentajeSinTema}% sin clasificar</p>
        </Card>
      </div>

      {/* Distribución de Dificultad */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Distribución por Dificultad</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-green-600">{stats.dificultad.facil}</div>
            <div className="text-sm text-gray-600">Fácil</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ width: `${(stats.dificultad.facil / stats.total) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-yellow-600">{stats.dificultad.media}</div>
            <div className="text-sm text-gray-600">Media</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-yellow-600 h-2 rounded-full" 
                style={{ width: `${(stats.dificultad.media / stats.total) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-red-600">{stats.dificultad.dificil}</div>
            <div className="text-sm text-gray-600">Difícil</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-red-600 h-2 rounded-full" 
                style={{ width: `${(stats.dificultad.dificil / stats.total) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </Card>

      {/* Cobertura por Tema */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Cobertura por Tema</h2>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {stats.porTema.map(tema => {
            const porcentaje = tema.total > 0 ? ((tema.validadas / tema.total) * 100).toFixed(0) : 0
            return (
              <div key={tema.tema} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{tema.tema}</Badge>
                      <span className="font-medium">{tema.titulo}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-600">{tema.total} preguntas</span>
                    <Badge variant={Number(porcentaje) > 80 ? 'default' : 'secondary'}>
                      {porcentaje}% validadas
                    </Badge>
                  </div>
                </div>
                
                {/* Barra de progreso */}
                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                  <div 
                    className={`h-2 rounded-full ${
                      Number(porcentaje) > 80 ? 'bg-green-600' : 
                      Number(porcentaje) > 50 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${porcentaje}%` }}
                  ></div>
                </div>

                {/* Distribución de dificultad */}
                <div className="flex gap-4 text-xs text-gray-600">
                  <span>🟢 Fácil: {tema.facil}</span>
                  <span>🟡 Media: {tema.media}</span>
                  <span>🔴 Difícil: {tema.dificil}</span>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

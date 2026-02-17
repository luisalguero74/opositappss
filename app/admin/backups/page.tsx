'use client'

// Sistema de Backups - Actualizado 2026-02-17

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Session } from 'next-auth'

interface BackupInfo {
  id: string
  type: string
  status: string
  size?: number
  duration?: number
  timestamp: string
  downloadUrl?: string
}

export default function AdminBackups() {
  const { data: session, status } = useSession() as { data: Session | null; status: string }
  const router = useRouter()
  const [backups, setBackups] = useState<BackupInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [backupType, setBackupType] = useState<'data' | 'full'>('data')
  const [message, setMessage] = useState({ type: '', text: '' })

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/login')
      return
    }
    if (session.user && String(session.user.role || '').toLowerCase() !== 'admin') {
      router.push('/dashboard')
    }
  }, [session, status, router])

  useEffect(() => {
    fetchBackups()
  }, [])

  const fetchBackups = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/backups')
      if (res.ok) {
        const data = await res.json()
        setBackups(data.backups || [])
      }
    } catch (error) {
      console.error('Error fetching backups:', error)
    } finally {
      setLoading(false)
    }
  }

  const createBackup = async () => {
    try {
      setCreating(true)
      setMessage({ type: '', text: '' })

      const res = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'manual', backupType })
      })

      if (res.ok) {
        const data = await res.json()
        setMessage({ type: 'success', text: 'Backup creado exitosamente' })
        
        // Descargar automáticamente
        if (data.downloadUrl) {
          const link = document.createElement('a')
          link.href = data.downloadUrl
          link.download = data.filename
          link.click()
        }

        fetchBackups()
      } else {
        setMessage({ type: 'error', text: 'Error al crear backup' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' })
    } finally {
      setCreating(false)
    }
  }

  const downloadBackup = (backup: BackupInfo) => {
    if (backup.downloadUrl) {
      window.open(backup.downloadUrl, '_blank')
    }
  }

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'N/A'
    const kb = bytes / 1024
    const mb = kb / 1024
    if (mb > 1) return `${mb.toFixed(2)} MB`
    return `${kb.toFixed(2)} KB`
  }

  if (!session || !session.user || String(session.user.role || '').toLowerCase() !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/admin" className="text-blue-600 hover:text-blue-700 font-semibold mb-4 inline-block">
            ← Volver al Panel Admin
          </Link>
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-5xl mb-3">💾</div>
                <h1 className="text-4xl font-bold text-white">Sistema de Backups</h1>
                <p className="text-blue-100 mt-2">Gestión de copias de seguridad y recuperación</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { setBackupType('data'); createBackup(); }}
                  disabled={creating}
                  className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {creating && backupType === 'data' ? '⏳ Creando...' : '📊 Backup de Datos'}
                </button>
                <button
                  onClick={() => { setBackupType('full'); createBackup(); }}
                  disabled={creating}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                >
                  {creating && backupType === 'full' ? '⏳ Creando...' : '📦 Backup Completo'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {message.text && (
          <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Historial de Backups</h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Cargando backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-xl mb-4">📦 No hay backups disponibles</p>
              <p className="text-sm">Crea tu primer backup manual haciendo clic en el botón arriba</p>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup) => (
                <div
                  key={backup.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          backup.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : backup.status === 'in_progress'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {backup.status === 'completed' ? '✅ Completado' : backup.status === 'in_progress' ? '⏳ En progreso' : '⏸️ Pendiente'}
                        </span>
                        <span className="text-sm text-gray-600">
                          {new Date(backup.timestamp).toLocaleString('es-ES')}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Tipo:</span>
                          <span className="ml-2 font-semibold text-gray-800">{backup.type}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Tamaño:</span>
                          <span className="ml-2 font-semibold text-gray-800">{formatBytes(backup.size)}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Duración:</span>
                          <span className="ml-2 font-semibold text-gray-800">
                            {backup.duration ? `${backup.duration}s` : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {backup.downloadUrl && (
                      <button
                        onClick={() => downloadBackup(backup)}
                        className="ml-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                      >
                        📥 Descargar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-blue-800 mb-2 flex items-center gap-2">
              <span>📊</span>
              <span>Backup de Datos</span>
            </h3>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Solo datos de la base de datos (JSON)</li>
              <li>Incluye: Usuarios, Preguntas, Cuestionarios, Respuestas</li>
              <li>Tamaño: ~1-10 MB (según datos)</li>
              <li>Tiempo: 5-30 segundos</li>
              <li>Ideal para respaldos rápidos diarios</li>
            </ul>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-purple-800 mb-2 flex items-center gap-2">
              <span>📦</span>
              <span>Backup Completo</span>
            </h3>
            <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside">
              <li>Base de datos + código fuente completo</li>
              <li>Incluye: Todo el proyecto (ZIP)</li>
              <li>Tamaño: ~50-200 MB</li>
              <li>Tiempo: 1-3 minutos</li>
              <li>Ideal para recuperación total del sistema</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-yellow-800 mb-2">⚠️ Información Importante</h3>
          <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
            <li>Se exportan en formato compatible con importación</li>
            <li>Guarda los backups en un lugar seguro fuera del servidor</li>
            <li>Los backups automáticos se programan cada 24 horas (próximamente)</li>
            <li>Para restaurar un backup completo, contacta al administrador del sistema</li>
            <li>El backup de datos puede restaurarse mediante scripts de importación</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

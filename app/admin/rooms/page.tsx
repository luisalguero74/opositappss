'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Participant {
  identity: string
  name: string
  sid: string
  isMuted: boolean
  isCameraOff: boolean
}

interface RoomInfo {
  name: string
  sid: string
  numParticipants: number
  participants: Participant[]
}

export default function AdminRooms() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [rooms, setRooms] = useState<RoomInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
    if (session && String(session.user.role || '').toLowerCase() !== 'admin') {
      router.push('/dashboard')
    }
  }, [session, status, router])

  useEffect(() => {
    loadRooms()
    const interval = setInterval(loadRooms, 5000)
    return () => clearInterval(interval)
  }, [])

  const loadRooms = async () => {
    try {
      const res = await fetch('/api/livekit/rooms')
      if (res.ok) {
        const data = await res.json()
        setRooms(data.rooms || [])
        setLoadError(null)
      } else {
        const data = await res.json().catch(() => ({}))
        const base = String(data?.error || `HTTP ${res.status}`)
        const details = data?.details
          ? `\n\nDetalles: host=${String(data.details.host || '')}` +
            ` | keyLength=${Number(data.details.keyLength || 0)}` +
            (data.details.rawKeyLength != null ? ` (raw=${Number(data.details.rawKeyLength || 0)})` : '') +
            ` | secretLength=${Number(data.details.secretLength || 0)}` +
            (data.details.rawSecretLength != null ? ` (raw=${Number(data.details.rawSecretLength || 0)})` : '') +
            (data.details.rawKeyHasWhitespace != null ? ` | keyHasWhitespace=${String(Boolean(data.details.rawKeyHasWhitespace))}` : '') +
            (data.details.rawSecretHasWhitespace != null ? ` | secretHasWhitespace=${String(Boolean(data.details.rawSecretHasWhitespace))}` : '')
          : ''
        setLoadError(base + details)
      }
    } catch (error) {
      console.error('Error loading rooms:', error)
      setLoadError('Error de red cargando salas de LiveKit')
    } finally {
      setLoading(false)
    }
  }

  const createRoom = async (name: string) => {
    if (!name.trim()) return
    try {
      const res = await fetch('/api/livekit/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: name })
      })
      if (res.ok) {
        setSelectedRoom(name)
        loadRooms()
      } else {
        alert('Error al crear la sala')
      }
    } catch (error) {
      console.error('Error creating room:', error)
    }
  }

  const muteParticipant = async (roomName: string, identity: string) => {
    try {
      const res = await fetch('/api/livekit/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, identity, action: 'mute' })
      })
      if (res.ok) {
        loadRooms()
      } else {
        alert('Error al silenciar participante')
      }
    } catch (error) {
      console.error('Error muting participant:', error)
    }
  }

  const unmuteParticipant = async (roomName: string, identity: string) => {
    try {
      const res = await fetch('/api/livekit/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, identity, action: 'unmute' })
      })
      if (res.ok) {
        loadRooms()
      } else {
        alert('Error al activar micrófono')
      }
    } catch (error) {
      console.error('Error unmuting participant:', error)
    }
  }

  const disableCamera = async (roomName: string, identity: string) => {
    try {
      const res = await fetch('/api/livekit/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, identity, action: 'disableCamera' })
      })
      if (res.ok) {
        loadRooms()
      } else {
        alert('Error al desactivar cámara')
      }
    } catch (error) {
      console.error('Error disabling camera:', error)
    }
  }

  const enableCamera = async (roomName: string, identity: string) => {
    try {
      const res = await fetch('/api/livekit/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, identity, action: 'enableCamera' })
      })
      if (res.ok) {
        loadRooms()
      } else {
        alert('Error al activar cámara')
      }
    } catch (error) {
      console.error('Error enabling camera:', error)
    }
  }

  const kickParticipant = async (roomName: string, identity: string) => {
    if (!confirm('¿Estás seguro de expulsar a este participante?')) return
    try {
      const res = await fetch('/api/livekit/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, identity, action: 'kick' })
      })
      if (res.ok) {
        loadRooms()
      } else {
        alert('Error al expulsar participante')
      }
    } catch (error) {
      console.error('Error kicking participant:', error)
    }
  }

  const deleteRoom = async (roomName: string) => {
    if (!confirm('¿Cerrar esta sala y expulsar a todos los participantes?')) return
    try {
      const res = await fetch('/api/livekit/rooms', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName })
      })
      if (res.ok) {
        loadRooms()
        setSelectedRoom(null)
      } else {
        alert('Error al cerrar sala')
      }
    } catch (error) {
      console.error('Error deleting room:', error)
    }
  }

  // Global controls
  const muteAll = async (roomName: string) => {
    try {
      const res = await fetch('/api/livekit/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, action: 'muteAll' })
      })
      if (res.ok) loadRooms()
    } catch (e) {
      console.error('Error muting all:', e)
    }
  }

  const unmuteAll = async (roomName: string) => {
    try {
      const res = await fetch('/api/livekit/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, action: 'unmuteAll' })
      })
      if (res.ok) loadRooms()
    } catch (e) {
      console.error('Error unmuting all:', e)
    }
  }

  const disableAllCameras = async (roomName: string) => {
    try {
      const res = await fetch('/api/livekit/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, action: 'disableAllCameras' })
      })
      if (res.ok) loadRooms()
    } catch (e) {
      console.error('Error disabling all cameras:', e)
    }
  }

  const enableAllCameras = async (roomName: string) => {
    try {
      const res = await fetch('/api/livekit/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName, action: 'enableAllCameras' })
      })
      if (res.ok) loadRooms()
    } catch (e) {
      console.error('Error enabling all cameras:', e)
    }
  }

  const getJoinUrl = (roomName: string) => {
    const safeName = encodeURIComponent(String(roomName || ''))
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return {
      relative: `/room/${safeName}`,
      absolute: origin ? `${origin}/room/${safeName}` : `/room/${safeName}`
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Enlace copiado')
    } catch {
      alert('No se pudo copiar el enlace')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-orange-900 to-red-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-4xl font-bold text-white">Panel de Moderación</h1>
          <Link href="/admin" className="text-orange-200 hover:text-white font-semibold">← Panel Admin</Link>
        </div>

        {loadError && (
          <div className="mb-6 bg-red-500/20 border border-red-300/30 text-red-50 rounded-xl p-4">
            <div className="font-semibold">No se pudieron cargar las salas</div>
            <div className="text-sm opacity-90 mt-1">{loadError}</div>
            <div className="text-sm opacity-90 mt-2">
              {String(loadError).includes('Unauthorized')
                ? 'Asegúrate de estar logueado como admin (rol admin) y vuelve a cargar.'
                : 'Revisa que estén configuradas las variables LIVEKIT_URL, LIVEKIT_API_KEY y LIVEKIT_API_SECRET en producción.'}
            </div>
          </div>
        )}
        {/* Moderation Menu */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20 mb-6">
          <h2 className="text-2xl font-bold text-white mb-6">Menú de Moderación</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Room */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Crear nueva sala</h3>
              <div className="flex gap-2 mb-3">
                <button onClick={() => createRoom('moderation')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold">Crear canal de moderación</button>
                {rooms.find(r => r.name === 'moderation') && (
                  <span className="px-3 py-2 bg-emerald-800/30 text-emerald-200 rounded">Activo</span>
                )}
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); const name = (e.currentTarget.elements.namedItem('roomName') as HTMLInputElement).value; createRoom(name); }}
                className="flex gap-2"
              >
                <input name="roomName" placeholder="Nombre de la sala" className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white placeholder-white/50 border border-white/20 focus:outline-none focus:border-orange-300" />
                <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold">Crear</button>
              </form>
            </div>

            {/* Room Global Controls */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Controles globales de sala</h3>
              {!selectedRoom ? (
                <p className="text-white/70">Selecciona una sala para habilitar controles</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => muteAll(selectedRoom)} className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded">Silenciar todos</button>
                  <button onClick={() => unmuteAll(selectedRoom)} className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded">Activar todos</button>
                  <button onClick={() => disableAllCameras(selectedRoom)} className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded">Apagar cámaras</button>
                  <button onClick={() => enableAllCameras(selectedRoom)} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Encender cámaras</button>
                  <button onClick={() => deleteRoom(selectedRoom)} className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded col-span-2">Cerrar sala</button>
                </div>
              )}
            </div>

            {/* Help */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">Guía rápida</h3>
              <ul className="text-white/80 text-sm space-y-2">
                <li>• Crea una sala y compártela con usuarios</li>
                <li>• Selecciona una sala para ver participantes</li>
                <li>• Usa controles globales para moderación masiva</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Active Rooms */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">Salas Activas ({rooms.length})</h2>

          {rooms.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-300 text-lg">No hay salas activas en este momento</p>
            </div>
          ) : (
            <div className="space-y-4">
              {rooms.map(room => (
                <div key={room.sid} className="bg-white/5 rounded-xl p-6 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{room.name}</h3>
                      <p className="text-gray-300">{room.numParticipants} participante(s)</p>
                      <div className="mt-2 text-sm text-white/80">
                        <div>Enlace para usuarios: <span className="font-mono">{getJoinUrl(room.name).relative}</span></div>
                        <div className="mt-1 flex gap-2">
                          <button
                            onClick={() => copyToClipboard(getJoinUrl(room.name).absolute)}
                            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs font-semibold transition"
                            type="button"
                          >
                            Copiar enlace
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedRoom(selectedRoom === room.name ? null : room.name)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
                      >
                        {selectedRoom === room.name ? 'Ocultar' : 'Ver participantes'}
                      </button>
                      <button
                        onClick={() => deleteRoom(room.name)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
                      >
                        Cerrar sala
                      </button>
                    </div>
                  </div>

                  {selectedRoom === room.name && room.participants && room.participants.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <h4 className="text-lg font-semibold text-white">Participantes:</h4>
                      {room.participants.map(p => (
                        <div key={p.sid} className="bg-white/5 rounded-lg p-4 flex items-center justify-between">
                          <div>
                            <p className="text-white font-semibold">{p.identity}</p>
                            <p className="text-sm text-gray-400">Participante activo</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => muteParticipant(room.name, p.identity)}
                              className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm font-semibold transition"
                            >
                              Silenciar
                            </button>
                            <button
                              onClick={() => unmuteParticipant(room.name, p.identity)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-semibold transition"
                            >
                              Activar micrófono
                            </button>
                            <button
                              onClick={() => disableCamera(room.name, p.identity)}
                              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-semibold transition"
                            >
                              Desactivar cámara
                            </button>
                            <button
                              onClick={() => enableCamera(room.name, p.identity)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition"
                            >
                              Activar cámara
                            </button>
                            <button
                              onClick={() => kickParticipant(room.name, p.identity)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold transition"
                            >
                              Expulsar
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-6 border border-white/20">
          <h3 className="text-lg font-bold text-white mb-4">💡 Información de moderación</h3>
          <ul className="text-gray-300 space-y-2">
            <li>• <strong>Silenciar:</strong> Desactiva el micrófono del participante</li>
            <li>• <strong>Desactivar cámara:</strong> Apaga la cámara del participante</li>
            <li>• <strong>Expulsar:</strong> Elimina al participante de la sala</li>
            <li>• <strong>Cerrar sala:</strong> Finaliza la sala y expulsa a todos los participantes</li>
            <li>• La lista se actualiza automáticamente cada 5 segundos</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

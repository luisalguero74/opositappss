'use client'

import { use, useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const JitsiMeeting = dynamic(
  () => import('@jitsi/react-sdk').then((mod) => mod.JitsiMeeting),
  { ssr: false }
)

interface ClassroomData {
  id: string
  name: string
  description: string | null
  roomId: string
  active: boolean
  participant: {
    role: string
    joinedAt: string
  }
  sessions?: any[]
  _count: {
    participants: number
  }
}

export default function ClassroomRoom({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [classroom, setClassroom] = useState<ClassroomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [leaveReason, setLeaveReason] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)

  useEffect(() => {
    if (!session?.user) {
      router.push('/login')
      return
    }
    loadClassroom()
  }, [session, router, id])

  const loadClassroom = async () => {
    try {
      // Primero intentar con API de usuario
      let res = await fetch('/api/classrooms')
      if (res.ok) {
        const classrooms = await res.json()
        const found = classrooms.find((c: ClassroomData) => c.id === id)
        
        if (found) {
          setClassroom(found)
          setLoading(false)
          return
        }
      }

      // Si no se encuentra, intentar con API de admin (para cuando el admin entra sin ser participante)
      res = await fetch(`/api/admin/classrooms/${id}`)
      if (res.ok) {
        const data = await res.json()
        // Transformar el formato de admin al formato esperado
        const adminClassroom: ClassroomData = {
          id: data.id,
          name: data.name,
          description: data.description,
          roomId: data.roomId,
          active: data.active,
          participant: {
            role: 'moderator', // Admin siempre es moderador
            joinedAt: new Date().toISOString()
          },
          _count: {
            participants: data._count?.participants || 0
          },
          sessions: data.sessions || []
        }
        setClassroom(adminClassroom)
        setLoading(false)
        return
      }

      setError('No tienes acceso a esta aula')
      setLoading(false)
    } catch (error) {
      console.error('Error:', error)
      setError('Error de conexión')
      setLoading(false)
    }
  }

  const handleJoin = () => {
    setShowPasswordPrompt(false)
    setJoined(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-xl text-white">Cargando aula...</p>
      </div>
    )
  }

  if (error || !classroom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <p className="text-xl text-white mb-4">{error || 'Aula no encontrada'}</p>
          <Link
            href="/dashboard/classrooms"
            className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition inline-block"
          >
            Volver a Mis Aulas
          </Link>
        </div>
      </div>
    )
  }

  // Prompt de contraseña
  if (showPasswordPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-blue-900">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 mx-4">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{classroom.name}</h2>
            <p className="text-gray-600">Esta aula está protegida con contraseña</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Introduce la contraseña"
                autoFocus
              />
            </div>

            <button
              onClick={handleJoin}
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg hover:from-purple-700 hover:to-pink-700 transition"
            >
              Entrar al Aula
            </button>

            <Link
              href="/dashboard/classrooms"
              className="block text-center text-gray-600 hover:text-gray-800 font-semibold"
            >
              Cancelar
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Sala Jitsi
  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-blue-900">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-8 mx-4">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🎓</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{classroom.name}</h2>
            {classroom.description && (
              <p className="text-gray-600 mb-4">{classroom.description}</p>
            )}
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <span className={`px-3 py-1 rounded-full ${
                classroom.participant.role === 'moderator' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {classroom.participant.role === 'moderator' ? '👑 Moderador' : '👤 Estudiante'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4 text-sm">
              <p className="font-semibold text-blue-900 mb-2">ℹ️ Antes de entrar:</p>
              <ul className="space-y-1 text-blue-700">
                <li>• Asegúrate de tener una buena conexión a internet</li>
                <li>• Permite el acceso a tu cámara y micrófono</li>
                <li>• Utiliza auriculares para evitar eco</li>
              </ul>
            </div>

            <button
              onClick={handleJoin}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold text-lg rounded-lg hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
            >
              Entrar al Aula Virtual
            </button>

            <Link
              href="/dashboard/classrooms"
              className="block text-center text-gray-600 hover:text-gray-800 font-semibold"
            >
              Volver a Mis Aulas
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (sessionEnded) {
    const backUrl = classroom.participant.role === 'moderator' ? '/admin/classrooms' : '/dashboard/classrooms'
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white px-4">
        <div className="max-w-xl w-full bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-4 text-center">
          <div className="text-6xl mb-2">👋</div>
          <h2 className="text-2xl font-bold">Sesión finalizada</h2>
          <p className="text-gray-300">{leaveReason || 'La conexión del aula virtual se ha cerrado.'}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <Link
              href={backUrl}
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold"
            >
              Volver a mis aulas
            </Link>
            <Link
              href="/dashboard"
              className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold"
            >
              Ir al panel
            </Link>
          </div>
          {classroom.participant.role === 'moderator' && (
            <Link
              href="/admin"
              className="block mt-2 text-sm text-purple-200 hover:text-white font-semibold"
            >
              Ir al panel de administración →
            </Link>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-gray-900 relative">
      {/* Botón flotante para salir */}
      <button
        onClick={() => {
          setSessionEnded(true)
          setLeaveReason('Has cerrado el aula manualmente')
        }}
        className="absolute top-4 right-4 z-50 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-lg transition"
        title="Cerrar aula"
      >
        ✕ Cerrar
      </button>

      <JitsiMeeting
        domain="meet.jit.si"
        roomName={classroom.roomId}
        configOverwrite={{
          startWithAudioMuted: classroom.participant.role !== 'moderator',
          startWithVideoMuted: classroom.participant.role !== 'moderator',
          disableModeratorIndicator: false,
          startScreenSharing: false,
          enableEmailInStats: false,
          enableNoisyMicDetection: true,
          enableWelcomePage: false,
          prejoinPageEnabled: false,
          hideConferenceSubject: false,
          hideConferenceTimer: false,
          disableInviteFunctions: classroom.participant.role !== 'moderator',
          toolbarButtons: [
            'camera',
            'chat',
            'closedcaptions',
            'desktop',
            'download',
            'embedmeeting',
            'etherpad',
            'feedback',
            'filmstrip',
            'fullscreen',
            'hangup',
            'help',
            'highlight',
            'invite',
            'linktosalesforce',
            'livestreaming',
            'microphone',
            'noisesuppression',
            'participants-pane',
            'profile',
            'raisehand',
            'recording',
            'security',
            'select-background',
            'settings',
            'shareaudio',
            'sharedvideo',
            'shortcuts',
            'stats',
            'tileview',
            'toggle-camera',
            'videoquality',
            'whiteboard'
          ]
        }}
        interfaceConfigOverwrite={{
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
          DISABLE_PRESENCE_STATUS: false,
          DISPLAY_WELCOME_PAGE_CONTENT: false,
          DISPLAY_WELCOME_PAGE_TOOLBAR_ADDITIONAL_CONTENT: false,
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          BRAND_WATERMARK_LINK: '',
          SHOW_POWERED_BY: false,
          MOBILE_APP_PROMO: false,
          TOOLBAR_ALWAYS_VISIBLE: false,
          TOOLBAR_TIMEOUT: 4000,
          DEFAULT_BACKGROUND: '#474747',
          DEFAULT_REMOTE_DISPLAY_NAME: 'Usuario',
          DEFAULT_LOCAL_DISPLAY_NAME: session?.user?.name || 'Yo',
          FILM_STRIP_MAX_HEIGHT: 120,
          SUPPORT_URL: '',
          SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar', 'sounds', 'more']
        }}
        userInfo={{
          displayName: session?.user?.name || 'Usuario',
          email: session?.user?.email || ''
        }}
        onApiReady={(externalApi) => {
          console.log('Jitsi API ready')
          
          // Configurar permisos según rol
          if (classroom.participant.role === 'moderator') {
            console.log('Usuario es moderador')
          }

          let hasJoined = false

          // Eventos de sala
          externalApi.addEventListener('participantJoined', ((event: any) => {
            console.log('Participant joined:', event)
          }) as any)

          externalApi.addEventListener('participantLeft', ((event: any) => {
            console.log('Participant left:', event)
          }) as any)

          externalApi.addEventListener('videoConferenceJoined', () => {
            console.log('Joined conference successfully')
            hasJoined = true
          })

          externalApi.addEventListener('videoConferenceLeft', () => {
            console.log('Left conference - setting sessionEnded to true')
            setSessionEnded(true)
            setLeaveReason('Has salido del aula virtual')
          })

          externalApi.addEventListener('readyToClose', () => {
            console.log('Ready to close - setting sessionEnded to true')
            setSessionEnded(true)
            setLeaveReason('La sesión ha finalizado')
          })

          // Capturar errores de Jitsi
          externalApi.addEventListener('errorOccurred', ((error: any) => {
            // Solo mostrar errores que tengan contenido real
            if (error && Object.keys(error).length > 0) {
              console.error('Jitsi error:', error)
            }
          }) as any)
        }}
        getIFrameRef={(iframe) => {
          if (iframe) {
            iframe.style.height = '100vh'
            iframe.style.width = '100vw'
          }
        }}
      />
    </div>
  )
}

'use client'

import { use, useCallback, useMemo, useRef, useState, useEffect } from 'react'
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
  requiresPassword?: boolean
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
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [classroom, setClassroom] = useState<ClassroomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [joined, setJoined] = useState(false)
  const [jitsiLoading, setJitsiLoading] = useState(true)
  const [jitsiError, setJitsiError] = useState('')
  const [iframeLoaded, setIframeLoaded] = useState(false)
  const [jitsiApiReady, setJitsiApiReady] = useState(false)
  const [sessionEnded, setSessionEnded] = useState(false)
  const [leaveReason, setLeaveReason] = useState('')
  const [passwordInput, setPasswordInput] = useState('')
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [passwordVerified, setPasswordVerified] = useState(false)

  const didConferenceJoinRef = useRef(false)
  const conferenceJoinedAtMsRef = useRef<number | null>(null)
  const connectStartedAtMsRef = useRef<number | null>(null)
  const [connectElapsedSec, setConnectElapsedSec] = useState(0)

  // IMPORTANT: `@jitsi/react-sdk` may tear down/recreate the iframe if these props change.
  // Keep them stable to avoid "me veo y luego me expulsa" caused by a re-render.
  const jitsiConfigOverwrite = useMemo(() => {
    const role = classroom?.participant.role
    const isModerator = role === 'moderator'
    return {
      startWithAudioMuted: !isModerator,
      startWithVideoMuted: !isModerator,
      disableModeratorIndicator: false,
      startScreenSharing: false,
      enableEmailInStats: false,
      enableNoisyMicDetection: true,
      enableWelcomePage: false,
      prejoinPageEnabled: false,
      hideConferenceSubject: false,
      hideConferenceTimer: false,
      disableInviteFunctions: !isModerator,
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
    }
  }, [classroom?.participant.role])

  const jitsiInterfaceConfigOverwrite = useMemo(() => {
    return {
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
      DEFAULT_BACKGROUND: '#1a1a1a',
      DEFAULT_REMOTE_DISPLAY_NAME: 'Usuario',
      DEFAULT_LOCAL_DISPLAY_NAME: session?.user?.name || 'Yo',
      FILM_STRIP_MAX_HEIGHT: 120,
      SUPPORT_URL: '',
      SETTINGS_SECTIONS: ['devices', 'language', 'moderator', 'profile', 'calendar', 'sounds', 'more']
    }
  }, [session?.user?.name])

  const jitsiUserInfo = useMemo(() => {
    return {
      displayName: session?.user?.name || 'Usuario',
      email: session?.user?.email || ''
    }
  }, [session?.user?.email, session?.user?.name])

  useEffect(() => {
    if (!joined) return
    if (!classroom) return

    if (!connectStartedAtMsRef.current) {
      connectStartedAtMsRef.current = Date.now()
      setConnectElapsedSec(0)
    }

    const interval = window.setInterval(() => {
      const start = connectStartedAtMsRef.current
      if (!start) return
      setConnectElapsedSec(Math.floor((Date.now() - start) / 1000))
    }, 250)

    // Global timeout: covers the common case where `onApiReady` never fires
    // (external_api blocked by CSP/adblock or network issues).
    const t = setTimeout(() => {
      if (jitsiApiReady) return

      const hasExternalApi = typeof (globalThis as any)?.JitsiMeetExternalAPI === 'function'
      const hint = hasExternalApi
        ? 'El API de Jitsi está disponible, pero no termina de iniciar la reunión.'
        : 'El API de Jitsi no ha cargado (posible CSP/AdBlock/red).'

      setJitsiError(
        `${hint}\n\n` +
          'Prueba: permitir cámara/micrófono, desactivar AdBlock/Brave Shields, o abrir la sala en una pestaña nueva.'
      )
    }, 15000)

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message =
        typeof (event as any)?.reason?.message === 'string'
          ? (event as any).reason.message
          : typeof (event as any)?.reason === 'string'
            ? (event as any).reason
            : ''
      if (message) {
        setJitsiError(`Error en carga de la videollamada: ${message}`)
      }
    }

    window.addEventListener('unhandledrejection', onUnhandledRejection)
    return () => {
      clearTimeout(t)
      window.clearInterval(interval)
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
    }
  }, [joined, classroom, jitsiApiReady])

  useEffect(() => {
    if (!joined) return
    if (!jitsiLoading) return
    if (jitsiError) return

    // Failsafe: never allow an infinite "Conectando...".
    // If we reach 20s without a join, show a clear message.
    if (connectElapsedSec >= 20) {
      const hasExternalApi = typeof (globalThis as any)?.JitsiMeetExternalAPI === 'function'
      const apiHint = jitsiApiReady
        ? 'El API de Jitsi está listo, pero no termina de unirse.'
        : hasExternalApi
          ? 'El API de Jitsi parece estar disponible, pero no llega a iniciar la reunión.'
          : 'El API de Jitsi no parece haber cargado (posible AdBlock/Brave Shields/CSP/red).'

      setJitsiError(
        `${apiHint}\n\n` +
          'Prueba: desactivar AdBlock/Brave Shields, desactivar VPN, permitir cámara/micrófono y abrir en una pestaña nueva.'
      )
    }
  }, [joined, jitsiLoading, jitsiError, connectElapsedSec, jitsiApiReady])

  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (!session?.user) {
      router.push('/login')
      return
    }
    loadClassroom()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, session?.user?.email, router, id])

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
    if (classroom?.requiresPassword && classroom.participant.role !== 'moderator' && !passwordVerified) {
      setShowPasswordPrompt(true)
      return
    }
    setShowPasswordPrompt(false)
    setJitsiLoading(true)
    setJitsiError('')
    setIframeLoaded(false)
    setJitsiApiReady(false)
    connectStartedAtMsRef.current = Date.now()
    setConnectElapsedSec(0)
    didConferenceJoinRef.current = false
    conferenceJoinedAtMsRef.current = null
    setJoined(true)
  }

  const handleApiReady = useCallback(
    (externalApi: any) => {
      console.log('Jitsi API ready')

      setJitsiApiReady(true)

      // Mantener el loader hasta que realmente se una a la conferencia.
      // Si la unión falla (adblock/CSP/permisos/red), mostramos un error en vez de dejar pantalla negra.

      if (classroom?.participant.role === 'moderator') {
        console.log('Usuario es moderador')
      }

      let hasJoined = false

      const joinTimeout = setTimeout(() => {
        if (hasJoined) return
        setJitsiError(
          'La videollamada no ha terminado de cargar.\n\n' +
            'Prueba: permitir cámara/micrófono, desactivar AdBlock/Brave Shields, o abrir la sala en una pestaña nueva.'
        )
      }, 15000)

      externalApi.addEventListener(
        'participantJoined',
        ((event: any) => {
          console.log('Participant joined:', event)
        }) as any
      )

      externalApi.addEventListener(
        'participantLeft',
        ((event: any) => {
          console.log('Participant left:', event)
        }) as any
      )

      externalApi.addEventListener('videoConferenceJoined', () => {
        console.log('Joined conference successfully')
        hasJoined = true
        didConferenceJoinRef.current = true
        conferenceJoinedAtMsRef.current = Date.now()
        connectStartedAtMsRef.current = null
        setJitsiLoading(false)
        setJitsiError('')
        clearTimeout(joinTimeout)
      })

      externalApi.addEventListener(
        'connectionFailed',
        ((evt: any) => {
          console.error('Jitsi connectionFailed:', evt)
          setJitsiError('Conexión fallida con el servidor de videollamada (red/firewall/adblock).')
        }) as any
      )

      externalApi.addEventListener(
        'iceConnectionFailed',
        ((evt: any) => {
          console.error('Jitsi iceConnectionFailed:', evt)
          setJitsiError('Fallo estableciendo conexión de audio/vídeo (ICE). Prueba otra red o desactiva VPN.')
        }) as any
      )

      externalApi.addEventListener('videoConferenceLeft', () => {
        console.log('Left conference')

        const joinedAt = conferenceJoinedAtMsRef.current
        const aliveMs = joinedAt ? Date.now() - joinedAt : null
        const leftVeryEarly = !didConferenceJoinRef.current || (typeof aliveMs === 'number' && aliveMs < 5000)

        if (leftVeryEarly) {
          // When Jitsi closes immediately, presenting it as a normal "session ended" is misleading.
          // This is usually caused by AdBlock/Brave shields, third-party restrictions, VPN/firewall, or CSP.
          setJitsiLoading(false)
          setJitsiError(
            'La videollamada se ha cerrado automáticamente al iniciar.\n\n' +
              'Causas típicas: AdBlock/Brave Shields, VPN/firewall, restricciones del navegador, o red corporativa.\n\n' +
              'Prueba: abrir en pestaña nueva (botón), desactivar AdBlock/Brave Shields, o probar otra red.'
          )
          setLeaveReason('')
          return
        }

        setSessionEnded(true)
        setLeaveReason('Se ha cerrado la conexión con el aula virtual')
        clearTimeout(joinTimeout)
      })

      externalApi.addEventListener(
        'conferenceFailed',
        ((evt: any) => {
          console.error('Jitsi conferenceFailed:', evt)
          const reason =
            typeof evt?.error === 'string'
              ? evt.error
              : typeof evt?.message === 'string'
                ? evt.message
                : ''
          if (reason) {
            setJitsiError(`No se pudo iniciar la conferencia: ${reason}`)
          } else {
            setJitsiError('No se pudo iniciar la conferencia (posible bloqueo de red/permisos)')
          }
        }) as any
      )

      externalApi.addEventListener('readyToClose', () => {
        console.log('Ready to close - setting sessionEnded to true')
        setSessionEnded(true)
        setLeaveReason('La sesión ha finalizado')
        clearTimeout(joinTimeout)
      })

      externalApi.addEventListener(
        'errorOccurred',
        ((error: any) => {
          if (error && Object.keys(error).length > 0) {
            console.error('Jitsi error:', error)
            const message =
              typeof error?.message === 'string'
                ? error.message
                : typeof error?.error === 'string'
                  ? error.error
                  : 'Error de Jitsi (revisa permisos/cortafuegos/adblock)'
            setJitsiError(message)
          }
        }) as any
      )
    },
    [classroom?.participant.role]
  )

  const handleIFrameRef = useCallback((node: any) => {
    if (!node) return

    const root = node as any
    const iframeEl: any =
      root?.tagName === 'IFRAME' ? root : (root?.querySelector?.('iframe') as any)

    root.style.height = '100vh'
    root.style.width = '100vw'
    if (iframeEl?.style) {
      iframeEl.style.height = '100vh'
      iframeEl.style.width = '100vw'
    }

    if (iframeEl?.addEventListener) {
      iframeEl.addEventListener(
        'load',
        () => {
          setIframeLoaded(true)
        },
        { once: true }
      )
    }

    if (iframeEl?.setAttribute) {
      iframeEl.setAttribute(
        'allow',
        'camera; microphone; display-capture; autoplay; fullscreen; clipboard-read; clipboard-write'
      )
    }
  }, [])

  const verifyPasswordAndJoin = async () => {
    if (!classroom) return
    try {
      const res = await fetch(`/api/classrooms/${classroom.id}/verify-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.error || 'Contraseña incorrecta')
        return
      }
      setPasswordVerified(true)
      setError('')
      setShowPasswordPrompt(false)
      setJoined(true)
    } catch (e) {
      setError('Error verificando contraseña')
    }
  }

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-xl text-white">Cargando sesión...</p>
      </div>
    )
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
                onChange={(e) => {
                  setPasswordInput(e.target.value)
                  if (error) setError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') verifyPasswordAndJoin()
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Introduce la contraseña"
                autoFocus
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 font-semibold">{error}</div>
            )}

            <button
              onClick={verifyPasswordAndJoin}
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
    <div className="h-screen w-screen bg-black relative">
      {/* Indicador de carga de Jitsi */}
      {jitsiLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-40">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-lg font-semibold">Conectando al aula virtual...</p>
            <p className="text-sm text-gray-400 mt-2">
              Preparando cámara y micrófono{connectElapsedSec > 0 ? ` · ${connectElapsedSec}s` : ''}
            </p>
            {jitsiError && (
              <div className="mt-4 max-w-md text-left bg-gray-800/60 border border-gray-700 rounded-lg p-4">
                <p className="text-sm font-semibold text-red-300 mb-2">No se ha podido conectar</p>
                <p className="text-xs text-gray-200 whitespace-pre-wrap">{jitsiError}</p>
                <div className="mt-3 flex items-center justify-center gap-3">
                  <a
                    href={`https://meet.jit.si/${encodeURIComponent(classroom.roomId)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-semibold"
                  >
                    Abrir en Jitsi
                  </a>
                  <button
                    onClick={() => {
                      setSessionEnded(true)
                      setLeaveReason('No se pudo conectar al aula virtual')
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold"
                  >
                    Volver
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-gray-400">
                  Sala: {classroom.roomId} · Iframe: {iframeLoaded ? 'cargado' : 'no cargado'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Errores de Jitsi visibles incluso después de entrar */}
      {!jitsiLoading && jitsiError && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-[92vw] bg-gray-900/85 border border-red-500/40 rounded-xl p-4 text-white shadow-2xl">
          <p className="text-sm font-semibold text-red-300 mb-1">Problema en el aula virtual</p>
          <p className="text-xs text-gray-200 whitespace-pre-wrap">{jitsiError}</p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <a
              href={`https://meet.jit.si/${encodeURIComponent(classroom.roomId)}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-semibold"
            >
              Abrir en Jitsi
            </a>
            <button
              onClick={() => {
                setJitsiError('')
              }}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold"
            >
              Cerrar aviso
            </button>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            Sala: {classroom.roomId} · Iframe: {iframeLoaded ? 'cargado' : 'no cargado'}
          </p>
        </div>
      )}
      
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
        configOverwrite={jitsiConfigOverwrite as any}
        interfaceConfigOverwrite={jitsiInterfaceConfigOverwrite as any}
        userInfo={jitsiUserInfo}
        onApiReady={handleApiReady}
        getIFrameRef={handleIFrameRef}
      />
    </div>
  )
}

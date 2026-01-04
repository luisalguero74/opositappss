'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Room, RoomEvent, Track, LocalParticipant, RemoteParticipant } from 'livekit-client'
import Link from 'next/link'

export default function VideoRoom() {
  const params = useParams<{ roomId: string }>()
  const router = useRouter()
  const roomId = params?.roomId as string
  const [room, setRoom] = useState<Room | null>(null)
  const [connected, setConnected] = useState(false)
  const [participants, setParticipants] = useState<(LocalParticipant | RemoteParticipant)[]>([])
  const [micEnabled, setMicEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; message: string }>>([])
  const [chatInput, setChatInput] = useState('')
  const videoContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!roomId) return

    const connectRoom = async () => {
      try {
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName: roomId })
        })

        if (!res.ok) {
          const error = await res.json()
          console.error('Token error:', error)
          alert('Error: ' + (error.error || 'No se pudo obtener token'))
          router.push('/forum')
          return
        }

        const data = await res.json()
        if (!data.token || !data.wsUrl) {
          console.error('Invalid response:', data)
          alert('Error: Respuesta inválida del servidor')
          router.push('/forum')
          return
        }

        const { token, wsUrl } = data
      const newRoom = new Room({
        adaptiveStream: true,
        dynacast: true,
      })

        newRoom.on(RoomEvent.ParticipantConnected, () => updateParticipants(newRoom))
        newRoom.on(RoomEvent.ParticipantDisconnected, () => updateParticipants(newRoom))
        newRoom.on(RoomEvent.TrackSubscribed, handleTrackSubscribed)
        newRoom.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed)
        newRoom.on(RoomEvent.DataReceived, handleDataReceived)

        await newRoom.connect(wsUrl, token)
        setRoom(newRoom)
        setConnected(true)
        updateParticipants(newRoom)

        // Enable camera and mic
        await newRoom.localParticipant.setCameraEnabled(true)
        await newRoom.localParticipant.setMicrophoneEnabled(true)
      } catch (error) {
        console.error('Error connecting to room:', error)
        alert('Error: No se pudo conectar a la videollamada')
        router.push('/forum')
      }
      if (room) {
        room.disconnect()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId])

  const updateParticipants = (r?: Room) => {
    const currentRoom = r || room
    if (!currentRoom) return
    const allParticipants = [currentRoom.localParticipant, ...Array.from(currentRoom.remoteParticipants.values())]
    setParticipants(allParticipants)
  }

  const handleTrackSubscribed = (track: any, _publication: any, participant: RemoteParticipant) => {
    if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
      const element = track.attach()
      const container = document.getElementById(`participant-${participant.identity}`)
      if (container) {
        container.appendChild(element)
      }
    }
  }

  const handleTrackUnsubscribed = (track: any) => {
    track.detach().forEach((el: HTMLElement) => el.remove())
  }

  const handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => {
    const decoder = new TextDecoder()
    const message = decoder.decode(payload)
    const sender = participant?.identity || 'Yo'
    setChatMessages(prev => [...prev, { sender, message }])
  }

  const toggleMic = async () => {
    if (!room) return
    const enabled = !micEnabled
    await room.localParticipant.setMicrophoneEnabled(enabled)
    setMicEnabled(enabled)
  }

  const toggleCamera = async () => {
    if (!room) return
    const enabled = !cameraEnabled
    await room.localParticipant.setCameraEnabled(enabled)
    setCameraEnabled(enabled)
  }

  const sendMessage = () => {
    if (!room || !chatInput.trim()) return
    const encoder = new TextEncoder()
    const data = encoder.encode(chatInput)
    room.localParticipant.publishData(data, { reliable: true })
    setChatMessages(prev => [...prev, { sender: 'Yo', message: chatInput }])
    setChatInput('')
  }

  const leaveRoom = () => {
    if (room) {
      room.disconnect()
    }
    router.push('/forum')
  }

  useEffect(() => {
    if (!room) return
    const localTrack = room.localParticipant.videoTrackPublications.values().next().value?.track
    if (localTrack) {
      const element = localTrack.attach()
      const container = document.getElementById(`participant-${room.localParticipant.identity}`)
      if (container) {
        container.innerHTML = ''
        container.appendChild(element)
      }
    }
    updateParticipants()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, participants.length])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Sala: {roomId}</h1>
            <p className="text-gray-400">{connected ? '🟢 Conectado' : '🔴 Desconectado'}</p>
          </div>
          <Link href="/forum" className="text-blue-400 hover:text-blue-300 font-semibold">← Salir</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div ref={videoContainerRef} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {participants.map(p => (
                <div key={p.identity} className="bg-slate-800 rounded-xl overflow-hidden relative aspect-video">
                  <div id={`participant-${p.identity}`} className="w-full h-full"></div>
                  <div className="absolute bottom-2 left-2 bg-black/70 px-3 py-1 rounded text-white text-sm">
                    {p.identity} {p instanceof LocalParticipant && '(Tú)'}
                  </div>
                </div>
              ))}
            </div>

            {/* Controls */}
            <div className="bg-slate-800 rounded-xl p-4 flex items-center justify-center gap-4">
              <button
                onClick={toggleMic}
                className={`px-6 py-3 rounded-lg font-semibold ${micEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'} text-white transition`}
              >
                {micEnabled ? '🎤 Micrófono' : '🔇 Silenciado'}
              </button>
              <button
                onClick={toggleCamera}
                className={`px-6 py-3 rounded-lg font-semibold ${cameraEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'} text-white transition`}
              >
                {cameraEnabled ? '📹 Cámara' : '📵 Sin cámara'}
              </button>
              <button
                onClick={leaveRoom}
                className="px-6 py-3 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white transition"
              >
                ❌ Salir
              </button>
            </div>
          </div>

          {/* Chat */}
          <div className="bg-slate-800 rounded-xl p-4 flex flex-col h-[600px]">
            <h2 className="text-xl font-bold text-white mb-4">💬 Chat</h2>
            <div className="flex-1 overflow-y-auto space-y-2 mb-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className="bg-slate-700 rounded p-3">
                  <div className="text-blue-400 text-sm font-semibold">{msg.sender}</div>
                  <div className="text-white">{msg.message}</div>
                </div>
              ))}
              {chatMessages.length === 0 && (
                <div className="text-gray-500 text-center mt-8">No hay mensajes aún</div>
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Escribe un mensaje..."
                className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={sendMessage}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

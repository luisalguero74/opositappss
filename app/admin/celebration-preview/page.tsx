'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Confetti from 'react-confetti'

export default function CelebrationPreview() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [showCelebration, setShowCelebration] = useState(true)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [soundEnabled, setSoundEnabled] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }
    
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const playVictorySound = () => {
    try {
      const audio = new Audio('/sounds/fanfarria.mp3')
      audio.volume = 0.7
      audio.play()
        .then(() => setSoundEnabled(true))
        .catch(err => {
          console.log('Audio play failed:', err)
          setSoundEnabled(false)
        })
    } catch (error) {
      console.log('Audio playback not supported:', error)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-gray-700">Cargando...</p>
      </div>
    )
  }

  if (!session || session.user.role !== 'admin') {
    router.push('/dashboard')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <Link href="/admin" className="text-orange-600 hover:text-orange-700 font-semibold mb-4 inline-block">
            ← Volver al Panel de Administrador
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">Vista Previa de Celebración 100%</h1>
          <p className="text-gray-600 mt-2">
            Esta es la celebración que verán los usuarios cuando consigan el 100% de aciertos en cualquier cuestionario.
          </p>
        </div>

        {/* Demo Section */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Elementos de la Celebración</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">✓</div>
              <div>
                <p className="font-semibold text-gray-800">Confetí Virtual Animado</p>
                <p className="text-sm text-gray-600">500 piezas de confetí caen por la pantalla durante unos segundos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">✓</div>
              <div>
                <p className="font-semibold text-gray-800">Fanfarria de Victoria</p>
                <p className="text-sm text-gray-600">Sonido de celebración que se reproduce automáticamente</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">✓</div>
              <div>
                <p className="font-semibold text-gray-800">Ventana Modal Animada</p>
                <p className="text-sm text-gray-600">Trofeo dorado, mensaje de felicitación y frase motivadora</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold">✓</div>
              <div>
                <p className="font-semibold text-gray-800">Mensaje Motivador</p>
                <p className="text-sm text-gray-600">"¡Sigue así y tu plaza estará más cerca!"</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trigger Button */}
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Probar Celebración</h2>
          <p className="text-gray-600 mb-6">Haz clic en el botón para ver la celebración en acción</p>
          <button
            onClick={() => setShowCelebration(true)}
            className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-lg hover:from-green-600 hover:to-emerald-700 shadow-lg transition text-lg"
          >
            🎉 Mostrar Celebración
          </button>
        </div>

        {/* Celebration Modal */}
        {showCelebration && (
          <>
            <Confetti
              width={windowSize.width}
              height={windowSize.height}
              recycle={false}
              numberOfPieces={800}
              gravity={0.25}
              colors={['#FFD700', '#FFA500', '#FF6347', '#90EE90', '#87CEEB', '#FF69B4']}
            />
            <div 
              className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 px-4 backdrop-blur-sm"
              onClick={() => setShowCelebration(false)}
            >
              <div 
                className="bg-gradient-to-br from-white via-yellow-50 to-orange-50 rounded-3xl shadow-2xl p-10 max-w-xl w-full text-center relative overflow-hidden"
                style={{ animation: 'slideIn 0.5s ease-out' }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Decorative stars */}
                <div className="absolute top-4 left-4 text-yellow-400 text-3xl animate-pulse">⭐</div>
                <div className="absolute top-4 right-4 text-yellow-400 text-3xl animate-pulse" style={{ animationDelay: '0.2s' }}>⭐</div>
                <div className="absolute bottom-4 left-8 text-orange-400 text-2xl animate-pulse" style={{ animationDelay: '0.4s' }}>✨</div>
                <div className="absolute bottom-4 right-8 text-orange-400 text-2xl animate-pulse" style={{ animationDelay: '0.6s' }}>✨</div>
                
                {/* Trophy with glow effect */}
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 blur-xl bg-yellow-400 opacity-50 rounded-full"></div>
                  <div className="text-9xl relative animate-pulse">🏆</div>
                </div>
                
                <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 mb-4 drop-shadow-lg">
                  ¡PERFECTO!
                </h2>
                
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className="h-1 w-12 bg-gradient-to-r from-transparent to-yellow-400 rounded"></div>
                  <p className="text-3xl font-bold text-gray-800">
                    100% de aciertos
                  </p>
                  <div className="h-1 w-12 bg-gradient-to-l from-transparent to-yellow-400 rounded"></div>
                </div>
                
                <div className="bg-gradient-to-r from-green-100 via-emerald-100 to-green-100 rounded-2xl p-6 mb-8 border-2 border-green-300 shadow-inner">
                  <p className="text-2xl font-bold text-green-800 leading-relaxed">
                    ¡Sigue así y tu plaza estará más cerca!
                  </p>
                </div>
                
                <div className="flex flex-col gap-3 items-center">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowCelebration(false)}
                      className="px-10 py-4 bg-gradient-to-r from-green-500 via-emerald-500 to-green-600 text-white font-bold text-lg rounded-xl hover:from-green-600 hover:via-emerald-600 hover:to-green-700 shadow-xl transition-all transform hover:scale-105 active:scale-95"
                    >
                      ¡Genial! 🎉
                    </button>
                    <button
                      onClick={playVictorySound}
                      className={`px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition-all transform hover:scale-105 active:scale-95 text-white ${
                        soundEnabled
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                          : 'bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600'
                      }`}
                    >
                      {soundEnabled ? '🔊 Sonido listo' : '🔈 Activar sonido'}
                    </button>
                    <button
                      onClick={() => router.push('/admin')}
                      className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold text-lg rounded-xl hover:from-orange-600 hover:to-red-600 shadow-xl transition-all transform hover:scale-105 active:scale-95"
                    >
                      ⚙️ Panel Admin
                    </button>
                  </div>
                  {!soundEnabled && (
                    <p className="text-sm text-gray-700 bg-white/60 px-3 py-2 rounded-lg border border-yellow-200">
                      Si no escuchas la fanfarria, pulsa "Activar sonido" (algunos navegadores bloquean el audio automático).
                    </p>
                  )}
                </div>
              </div>
            </div>
            <style jsx>{`
              @keyframes slideIn {
                from {
                  opacity: 0;
                  transform: translateY(-50px) scale(0.8);
                }
                to {
                  opacity: 1;
                  transform: translateY(0) scale(1);
                }
              }
            `}</style>
          </>
        )}
      </div>
    </div>
  )
}

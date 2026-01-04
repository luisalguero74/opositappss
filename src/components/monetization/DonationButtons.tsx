'use client'

interface DonationButtonsProps {
  patreonUrl?: string
  kofiUrl?: string
}

export default function DonationButtons({ patreonUrl, kofiUrl }: DonationButtonsProps) {
  if (!patreonUrl && !kofiUrl) return null

  return (
    <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl p-6 my-6 border-2 border-pink-200">
      <div className="text-center">
        <span className="text-4xl mb-3 block">☕💖</span>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">
          ¿Te está ayudando opositAPPSS?
        </h3>
        <p className="text-gray-600 mb-6 max-w-xl mx-auto">
          Esta plataforma es completamente gratuita. Si quieres apoyar su desarrollo y mantenimiento, 
          puedes hacerlo con una donación voluntaria. ¡Cualquier ayuda es muy apreciada!
        </p>
        
        <div className="flex flex-wrap justify-center gap-4">
          {patreonUrl && (
            <a
              href={patreonUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M15.386.524c-4.764 0-8.64 3.876-8.64 8.64 0 4.75 3.876 8.613 8.64 8.613 4.75 0 8.614-3.864 8.614-8.613C24 4.4 20.136.524 15.386.524M.003 23.537h4.22V.524H.003"/>
              </svg>
              Apoyar en Patreon
            </a>
          )}
          
          {kofiUrl && (
            <a
              href={kofiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/>
              </svg>
              Invítame un café en Ko-fi
            </a>
          )}
        </div>
        
        <p className="text-xs text-gray-500 mt-4">
          100% voluntario. Tu donación ayuda a mantener la plataforma gratuita para todos.
        </p>
      </div>
    </div>
  )
}

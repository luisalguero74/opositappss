import React from 'react'

interface LogoProps {
  variant?: 'default' | 'white'
}

export default function Logo({ variant = 'default' }: LogoProps) {
  const textColor = variant === 'white' ? 'text-white' : 'text-blue-600'
  const accentColor = variant === 'white' ? 'text-white' : 'text-green-600'
  const subtitleColor = variant === 'white' ? 'text-white opacity-90' : 'text-gray-600'
  
  return (
    <div className="flex flex-col items-center justify-center mb-8">
      <div className={`text-4xl font-bold ${textColor}`}>
        oposi<span className={accentColor}>tAPPSS</span>
      </div>
      <div className={`text-sm mt-2 ${subtitleColor}`}>
        Prepara tu oposición Administrativo SS C1
      </div>
    </div>
  )
}
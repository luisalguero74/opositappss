'use client'

interface ProgressCircleProps {
  percentage: number
  size?: number
  strokeWidth?: number
  label?: string
  color?: string
}

export default function ProgressCircle({ 
  percentage, 
  size = 120, 
  strokeWidth = 10,
  label = '',
  color = '#3b82f6'
}: ProgressCircleProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold dark:text-white">{Math.round(percentage)}%</span>
        </div>
      </div>
      {label && <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{label}</span>}
    </div>
  )
}

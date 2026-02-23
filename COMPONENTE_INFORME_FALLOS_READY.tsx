// ==========================================
// GENERADOR DE INFORMES DE FALLOS
// ==========================================
// Componente React para generar informes HTML de preguntas falladas
// Ubicación sugerida: /components/FailedQuestionsReport.tsx

'use client'

import { useState } from 'react'

interface Question {
  id: string
  text: string
  options: string[] | string
  correctAnswer: string
  explanation?: string
  temaTitulo?: string
  temaCodigo?: string
}

interface UserAnswer {
  questionId: string
  selectedAnswer: string
  isCorrect: boolean
}

interface FailedQuestionsReportProps {
  questions: Question[]
  userAnswers: UserAnswer[]
  quizTitle?: string
  userName?: string
  completedAt?: Date
  score?: number
  totalQuestions?: number
}

export default function FailedQuestionsReport({
  questions,
  userAnswers,
  quizTitle = 'Cuestionario',
  userName = 'Usuario',
  completedAt = new Date(),
  score = 0,
  totalQuestions = 0
}: FailedQuestionsReportProps) {
  const [generating, setGenerating] = useState(false)

  // Filtrar preguntas falladas
  const failedAnswers = userAnswers.filter(ua => !ua.isCorrect)
  const failedQuestions = failedAnswers.map(fa => {
    const question = questions.find(q => q.id === fa.questionId)
    return {
      question,
      userAnswer: fa.selectedAnswer,
      correctAnswer: question?.correctAnswer
    }
  }).filter(fq => fq.question)

  const generateHTMLReport = () => {
    const failedCount = failedQuestions.length
    const correctCount = totalQuestions - failedCount
    const percentage = totalQuestions > 0 ? ((correctCount / totalQuestions) * 100).toFixed(1) : '0'

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informe de Fallos - ${quizTitle}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }
        
        .container {
            max-width: 900px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
        }
        
        .header p {
            font-size: 1.1em;
            opacity: 0.95;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
            border-bottom: 3px solid #e9ecef;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
        }
        
        .stat-number {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .stat-label {
            color: #6c757d;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .correct { color: #28a745; }
        .failed { color: #dc3545; }
        .percentage { color: #667eea; }
        
        .content {
            padding: 40px;
        }
        
        .section-title {
            font-size: 1.8em;
            color: #667eea;
            margin-bottom: 30px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
        }
        
        .question-card {
            background: #fff;
            border: 2px solid #e9ecef;
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            transition: all 0.3s ease;
        }
        
        .question-card:hover {
            box-shadow: 0 8px 15px rgba(0,0,0,0.1);
            border-color: #667eea;
        }
        
        .question-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .question-number {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 25px;
            font-weight: bold;
            font-size: 0.9em;
        }
        
        .question-tema {
            background: #e9ecef;
            color: #495057;
            padding: 6px 12px;
            border-radius: 15px;
            font-size: 0.85em;
        }
        
        .question-text {
            font-size: 1.2em;
            font-weight: 500;
            color: #212529;
            margin-bottom: 20px;
            line-height: 1.6;
        }
        
        .options {
            margin: 20px 0;
        }
        
        .option {
            padding: 15px 20px;
            margin: 10px 0;
            border-radius: 10px;
            border: 2px solid #e9ecef;
            background: #f8f9fa;
            transition: all 0.3s ease;
        }
        
        .option-letter {
            font-weight: bold;
            margin-right: 10px;
            display: inline-block;
            width: 30px;
            height: 30px;
            line-height: 30px;
            text-align: center;
            border-radius: 50%;
            background: white;
        }
        
        .option-correct {
            background: #d4edda;
            border-color: #28a745;
            color: #155724;
        }
        
        .option-correct .option-letter {
            background: #28a745;
            color: white;
        }
        
        .option-incorrect {
            background: #f8d7da;
            border-color: #dc3545;
            color: #721c24;
        }
        
        .option-incorrect .option-letter {
            background: #dc3545;
            color: white;
        }
        
        .answer-label {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: bold;
            margin-left: 10px;
        }
        
        .label-correct {
            background: #28a745;
            color: white;
        }
        
        .label-wrong {
            background: #dc3545;
            color: white;
        }
        
        .explanation {
            background: linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%);
            padding: 25px;
            border-radius: 12px;
            margin-top: 20px;
            border-left: 5px solid #667eea;
        }
        
        .explanation-title {
            font-weight: bold;
            color: #667eea;
            margin-bottom: 15px;
            font-size: 1.1em;
            display: flex;
            align-items: center;
        }
        
        .explanation-title::before {
            content: "💡";
            margin-right: 10px;
            font-size: 1.3em;
        }
        
        .explanation-text {
            color: #495057;
            line-height: 1.8;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 30px;
            text-align: center;
            color: #6c757d;
            border-top: 3px solid #e9ecef;
        }
        
        .footer p {
            margin: 5px 0;
        }
        
        .no-failures {
            text-align: center;
            padding: 60px 40px;
            color: #28a745;
        }
        
        .no-failures-icon {
            font-size: 5em;
            margin-bottom: 20px;
        }
        
        .no-failures h2 {
            font-size: 2em;
            margin-bottom: 10px;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .container {
                box-shadow: none;
            }
            
            .question-card {
                page-break-inside: avoid;
            }
        }
        
        @media (max-width: 768px) {
            .header h1 {
                font-size: 1.8em;
            }
            
            .stats {
                grid-template-columns: 1fr;
            }
            
            .content {
                padding: 20px;
            }
            
            .question-card {
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>📊 Informe de Fallos</h1>
            <p>${quizTitle}</p>
        </div>
        
        <!-- Estadísticas -->
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number correct">${correctCount}</div>
                <div class="stat-label">Correctas</div>
            </div>
            <div class="stat-card">
                <div class="stat-number failed">${failedCount}</div>
                <div class="stat-label">Falladas</div>
            </div>
            <div class="stat-card">
                <div class="stat-number percentage">${percentage}%</div>
                <div class="stat-label">Porcentaje</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalQuestions}</div>
                <div class="stat-label">Total</div>
            </div>
        </div>
        
        <!-- Contenido -->
        <div class="content">
            ${failedCount === 0 ? `
                <div class="no-failures">
                    <div class="no-failures-icon">🎉</div>
                    <h2>¡Excelente trabajo!</h2>
                    <p>No has cometido ningún fallo en este cuestionario.</p>
                </div>
            ` : `
                <h2 class="section-title">🔍 Preguntas Falladas (${failedCount})</h2>
                
                ${failedQuestions.map((fq, index) => {
                    const question = fq.question!
                    const options = Array.isArray(question.options) 
                        ? question.options 
                        : JSON.parse(question.options as string)
                    
                    return `
                        <div class="question-card">
                            <div class="question-header">
                                <span class="question-number">Pregunta ${index + 1}</span>
                                ${question.temaTitulo || question.temaCodigo ? `
                                    <span class="question-tema">
                                        ${question.temaCodigo || ''} ${question.temaTitulo || ''}
                                    </span>
                                ` : ''}
                            </div>
                            
                            <div class="question-text">
                                ${question.text}
                            </div>
                            
                            <div class="options">
                                ${options.map((opt: string, idx: number) => {
                                    const letter = String.fromCharCode(65 + idx)
                                    const isCorrect = letter === fq.correctAnswer
                                    const isUserAnswer = letter === fq.userAnswer
                                    
                                    let className = 'option'
                                    let label = ''
                                    
                                    if (isCorrect) {
                                        className += ' option-correct'
                                        label = '<span class="answer-label label-correct">✓ Correcta</span>'
                                    } else if (isUserAnswer) {
                                        className += ' option-incorrect'
                                        label = '<span class="answer-label label-wrong">✗ Tu respuesta</span>'
                                    }
                                    
                                    return `
                                        <div class="${className}">
                                            <span class="option-letter">${letter}</span>
                                            ${opt}
                                            ${label}
                                        </div>
                                    `
                                }).join('')}
                            </div>
                            
                            ${question.explanation ? `
                                <div class="explanation">
                                    <div class="explanation-title">Explicación y Fundamentación Legal</div>
                                    <div class="explanation-text">
                                        ${question.explanation.replace(/\n/g, '<br>')}
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    `
                }).join('')}
            `}
        </div>
        
        <!-- Footer -->
        <div class="footer">
            <p><strong>Usuario:</strong> ${userName}</p>
            <p><strong>Fecha:</strong> ${completedAt.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}</p>
            <p style="margin-top: 20px; color: #667eea; font-weight: bold;">
                OpositApp - Tu plataforma de preparación de oposiciones
            </p>
        </div>
    </div>
</body>
</html>
    `

    return html
  }

  const handleGenerateReport = () => {
    setGenerating(true)

    try {
      const html = generateHTMLReport()
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `informe-fallos-${quizTitle.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generando informe:', error)
      alert('Error al generar el informe. Por favor, inténtalo de nuevo.')
    } finally {
      setGenerating(false)
    }
  }

  if (failedQuestions.length === 0) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h3 className="text-xl font-bold text-green-800 mb-2">
          ¡Perfecto! Sin fallos
        </h3>
        <p className="text-green-700">
          Has respondido correctamente todas las preguntas.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleGenerateReport}
        disabled={generating}
        className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg hover:from-red-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg transition-all transform hover:scale-105 flex items-center justify-center gap-3"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {generating ? 'Generando informe...' : `📄 Generar Informe de Fallos (${failedQuestions.length})`}
      </button>
      
      <p className="text-sm text-gray-600 mt-3">
        El informe incluirá las {failedQuestions.length} preguntas falladas con sus explicaciones detalladas.
      </p>
    </div>
  )
}

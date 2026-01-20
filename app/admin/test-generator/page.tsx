'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TopicDifficultySelector from '@/components/TopicDifficultySelector'

interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: string
  tema: string
}

export default function AdminTestGenerator() {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [questionCount, setQuestionCount] = useState(20)
  const [selectedTopics, setSelectedTopics] = useState({
    generalTopics: [] as string[],
    specificTopics: [] as string[],
    difficulty: 'todas' as 'todas' | 'facil' | 'media' | 'dificil'
  })
  const [testQuestions, setTestQuestions] = useState<Question[]>([])
  const [testGenerated, setTestGenerated] = useState(false)
  const [questionStats, setQuestionStats] = useState({ general: 0, specific: 0, total: 0 })
  const [publishing, setPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)

  // Cargar estadísticas de preguntas disponibles
  useEffect(() => {
    fetchQuestionStats()
  }, [])

  const fetchQuestionStats = async () => {
    try {
      const res = await fetch('/api/custom-test/topics')
      if (res.ok) {
        const data = await res.json()
        const allTopics = Array.isArray(data) ? data : Array.isArray(data?.all) ? data.all : []
        const general = allTopics.filter((t: any) => t.id.toLowerCase().startsWith('g')).reduce((sum: number, t: any) => sum + t.count, 0)
        const specific = allTopics.filter((t: any) => t.id.toLowerCase().startsWith('e')).reduce((sum: number, t: any) => sum + t.count, 0)
        setQuestionStats({ general, specific, total: general + specific })
      }
    } catch (error) {
      console.error('Error fetching question stats:', error)
    }
  }

  // Check admin access
  if (session?.user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Acceso Restringido</h1>
          <p className="text-gray-600 mb-6">Solo administradores pueden acceder a esta página</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Volver al Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const generateTest = async () => {
    if (selectedTopics.generalTopics.length === 0 && selectedTopics.specificTopics.length === 0) {
      alert('Debes seleccionar al menos un tema')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/custom-test/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generalTopics: selectedTopics.generalTopics,
          specificTopics: selectedTopics.specificTopics,
          questionCount,
          difficulty: selectedTopics.difficulty
        })
      })

      if (res.ok) {
        const data = await res.json()
        setTestQuestions(data.questions)
        setTestGenerated(true)
      } else {
        const error = await res.json()
        alert(error.error || 'Error al generar test')
      }
    } catch (error) {
      console.error('Error generating test:', error)
      alert('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const downloadHTML = () => {
    if (testQuestions.length === 0) return

    const html = generateInteractiveHTML()
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `test-oposiciones-${Date.now()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const publishAsQuestionnaire = async () => {
    if (testQuestions.length === 0) return

    if (!confirm(`¿Publicar este test como cuestionario con ${testQuestions.length} preguntas?`)) {
      return
    }

    const parteRaw = prompt(
      '¿En qué bloque del temario quieres publicar este cuestionario? Escribe "general" o "especifico".',
      'general'
    )

    if (parteRaw === null) {
      // Usuario ha cancelado el prompt
      return
    }

    const parteNormalizedInput = parteRaw.trim().toLowerCase()

    let temaParte: 'GENERAL' | 'ESPECÍFICO'
    if (parteNormalizedInput.startsWith('e')) {
      temaParte = 'ESPECÍFICO'
    } else if (parteNormalizedInput.startsWith('g')) {
      temaParte = 'GENERAL'
    } else {
      alert('Debes escribir "general" o "especifico" para continuar.')
      return
    }

    setPublishing(true)
    try {
      const res = await fetch('/api/admin/questionnaires/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Test Personalizado - ${new Date().toLocaleDateString('es-ES')}`,
          type: 'theory',
          temaParte,
          questions: testQuestions.map(q => ({
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            temaCodigo: q.tema
          }))
        })
      })

      if (res.ok) {
        setPublishSuccess(true)
        alert('✅ Test publicado como cuestionario exitosamente')
      } else {
        const error = await res.json()
        alert(error.error || 'Error al publicar cuestionario')
      }
    } catch (error) {
      console.error('Error publishing questionnaire:', error)
      alert('Error de conexión')
    } finally {
      setPublishing(false)
    }
  }

  const generateInteractiveHTML = () => {
    const questionsData = JSON.stringify(testQuestions.map(q => ({
      text: q.text,
      options: q.options,
      correctAnswer: q.correctAnswer,
      tema: q.tema
    })))

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test de Oposiciones - OpositAPP</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
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
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        
        .progress-bar {
            background: #f0f0f0;
            height: 8px;
            position: relative;
            overflow: hidden;
        }
        
        .progress-fill {
            background: linear-gradient(90deg, #667eea, #764ba2);
            height: 100%;
            width: 0%;
            transition: width 0.3s ease;
        }
        
        .question-container {
            padding: 40px;
        }
        
        .question-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f0f0f0;
        }
        
        .question-number {
            font-size: 1.2rem;
            font-weight: bold;
            color: #667eea;
        }
        
        .question-tema {
            background: #e0e7ff;
            color: #667eea;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 600;
        }
        
        .question-text {
            font-size: 1.3rem;
            line-height: 1.6;
            color: #1a202c;
            margin-bottom: 30px;
            font-weight: 500;
        }
        
        .options {
            display: flex;
            flex-direction: column;
            gap: 15px;
        }
        
        .option {
            background: #f8f9fa;
            border: 3px solid transparent;
            padding: 20px;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            font-size: 1.1rem;
        }
        
        .option:hover {
            background: #e9ecef;
            transform: translateX(5px);
        }
        
        .option input[type="radio"] {
            margin-right: 15px;
            width: 20px;
            height: 20px;
            cursor: pointer;
        }
        
        .option.selected {
            border-color: #667eea;
            background: #e0e7ff;
        }
        
        .option.correct {
            border-color: #10b981;
            background: #d1fae5;
        }
        
        .option.incorrect {
            border-color: #ef4444;
            background: #fee2e2;
        }
        
        .buttons {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            gap: 15px;
        }
        
        button {
            padding: 15px 30px;
            font-size: 1.1rem;
            font-weight: bold;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            flex: 1;
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
        }
        
        .btn-secondary {
            background: #e5e7eb;
            color: #374151;
        }
        
        .btn-secondary:hover {
            background: #d1d5db;
        }
        
        .btn-primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .results {
            text-align: center;
            padding: 60px 40px;
        }
        
        .results h2 {
            font-size: 3rem;
            margin-bottom: 20px;
            color: #1a202c;
        }
        
        .score {
            font-size: 5rem;
            font-weight: bold;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 20px 0;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin: 40px 0;
        }
        
        .stat {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: bold;
            color: #667eea;
        }
        
        .stat-label {
            color: #6b7280;
            margin-top: 5px;
        }
        
        .celebration {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 9999;
        }
        
        .celebration.active {
            display: block;
        }
        
        @keyframes confetti-fall {
            to {
                transform: translateY(100vh) rotate(720deg);
            }
        }
        
        .confetti {
            position: absolute;
            width: 10px;
            height: 10px;
            background: #667eea;
            animation: confetti-fall 3s linear;
        }
        
        .review-list {
            margin-top: 30px;
            text-align: left;
        }
        
        .review-item {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 15px;
            border-left: 4px solid #667eea;
        }
        
        .review-item.correct {
            border-left-color: #10b981;
        }
        
        .review-item.incorrect {
            border-left-color: #ef4444;
        }
        
        .review-question {
            font-weight: bold;
            margin-bottom: 10px;
            color: #1a202c;
        }
        
        .review-answer {
            margin: 5px 0;
            padding: 10px;
            border-radius: 6px;
        }
        
        .review-answer.correct {
            background: #d1fae5;
            color: #065f46;
        }
        
        .review-answer.user {
            background: #fee2e2;
            color: #991b1b;
        }
    </style>
</head>
<body>
    <div class="celebration" id="celebration"></div>
    
    <div class="container">
        <div class="header">
            <h1>📚 Test de Oposiciones</h1>
            <p>OpositAPP - Sistema de Evaluación</p>
        </div>
        
        <div class="progress-bar">
            <div class="progress-fill" id="progressBar"></div>
        </div>
        
        <div id="questionSection" class="question-container">
            <!-- Questions will be rendered here -->
        </div>
        
        <div id="resultsSection" class="results" style="display: none;">
            <!-- Results will be shown here -->
        </div>
    </div>

    <script>
        const questions = ${questionsData};
        let currentQuestion = 0;
        let userAnswers = [];
        let showingResults = false;

        function renderQuestion() {
            const q = questions[currentQuestion];
            const section = document.getElementById('questionSection');
            
            section.innerHTML = \`
                <div class="question-header">
                    <div class="question-number">Pregunta \${currentQuestion + 1} de \${questions.length}</div>
                    <div class="question-tema">\${q.tema}</div>
                </div>
                
                <div class="question-text">\${q.text}</div>
                
                <div class="options">
                    \${q.options.map((option, index) => \`
                        <label class="option" data-index="\${index}">
                            <input type="radio" name="answer" value="\${option}">
                            <span>\${option}</span>
                        </label>
                    \`).join('')}
                </div>
                
                <div class="buttons">
                    \${currentQuestion > 0 ? '<button class="btn-secondary" onclick="previousQuestion()">← Anterior</button>' : '<div></div>'}
                    <button class="btn-primary" id="nextBtn" onclick="nextQuestion()" disabled>
                        \${currentQuestion === questions.length - 1 ? 'Finalizar Test →' : 'Siguiente →'}
                    </button>
                </div>
            \`;
            
            // Add event listeners to options
            const options = section.querySelectorAll('.option');
            options.forEach(option => {
                option.addEventListener('click', function() {
                    options.forEach(o => o.classList.remove('selected'));
                    this.classList.add('selected');
                    const radio = this.querySelector('input[type="radio"]');
                    radio.checked = true;
                    document.getElementById('nextBtn').disabled = false;
                });
            });
            
            // Restore previous answer if exists
            if (userAnswers[currentQuestion]) {
                const selectedOption = Array.from(options).find(opt => 
                    opt.querySelector('input').value === userAnswers[currentQuestion]
                );
                if (selectedOption) {
                    selectedOption.classList.add('selected');
                    selectedOption.querySelector('input').checked = true;
                    document.getElementById('nextBtn').disabled = false;
                }
            }
            
            updateProgress();
        }

        function nextQuestion() {
            const selected = document.querySelector('input[name="answer"]:checked');
            if (selected) {
                userAnswers[currentQuestion] = selected.value;
                
                if (currentQuestion < questions.length - 1) {
                    currentQuestion++;
                    renderQuestion();
                } else {
                    showResults();
                }
            }
        }

        function previousQuestion() {
            if (currentQuestion > 0) {
                currentQuestion--;
                renderQuestion();
            }
        }

        function updateProgress() {
            const progress = ((currentQuestion + 1) / questions.length) * 100;
            document.getElementById('progressBar').style.width = progress + '%';
        }

        function showResults() {
            let correct = 0;
            questions.forEach((q, i) => {
                if (userAnswers[i] === q.correctAnswer) {
                    correct++;
                }
            });
            
            const percentage = (correct / questions.length) * 100;
            
            // Show celebration if 100%
            if (percentage === 100) {
                createConfetti();
            }
            
            const resultsSection = document.getElementById('resultsSection');
            resultsSection.innerHTML = \`
                <h2>\${percentage === 100 ? '🎉 ¡PERFECTO!' : percentage >= 70 ? '✅ ¡Aprobado!' : '📚 Sigue Practicando'}</h2>
                <div class="score">\${percentage.toFixed(1)}%</div>
                
                <div class="stats">
                    <div class="stat">
                        <div class="stat-value">\${correct}</div>
                        <div class="stat-label">Correctas</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${questions.length - correct}</div>
                        <div class="stat-label">Incorrectas</div>
                    </div>
                    <div class="stat">
                        <div class="stat-value">\${questions.length}</div>
                        <div class="stat-label">Total</div>
                    </div>
                </div>
                
                <div class="review-list">
                    <h3 style="margin-bottom: 20px; font-size: 1.5rem;">📋 Revisión de Respuestas</h3>
                    \${questions.map((q, i) => {
                        const isCorrect = userAnswers[i] === q.correctAnswer;
                        return \`
                            <div class="review-item \${isCorrect ? 'correct' : 'incorrect'}">
                                <div class="review-question">
                                    \${i + 1}. \${q.text}
                                    <span style="float: right;">\${isCorrect ? '✅' : '❌'}</span>
                                </div>
                                <div class="review-answer correct">✓ Correcta: \${q.correctAnswer}</div>
                                \${!isCorrect ? \`<div class="review-answer user">✗ Tu respuesta: \${userAnswers[i] || 'Sin respuesta'}</div>\` : ''}
                            </div>
                        \`;
                    }).join('')}
                </div>
                
                <button class="btn-primary" onclick="location.reload()" style="margin-top: 30px;">
                    🔄 Reiniciar Test
                </button>
            \`;
            
            document.getElementById('questionSection').style.display = 'none';
            resultsSection.style.display = 'block';
        }

        function createConfetti() {
            const celebration = document.getElementById('celebration');
            celebration.classList.add('active');
            
            for (let i = 0; i < 100; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.background = ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 5)];
                confetti.style.animationDelay = Math.random() * 3 + 's';
                celebration.appendChild(confetti);
            }
            
            setTimeout(() => {
                celebration.classList.remove('active');
                celebration.innerHTML = '';
            }, 5000);
        }

        // Initialize
        renderQuestion();
    </script>
</body>
</html>`;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <Link href="/admin" className="text-purple-600 hover:text-purple-700 font-semibold mb-2 inline-block">
            ← Volver a Admin
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">🎯 Generador de Tests HTML</h1>
          <p className="text-gray-600 mt-1">Crea tests interactivos descargables con corrección automática</p>
          
          {/* Estadísticas de preguntas disponibles */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{questionStats.general}</div>
              <div className="text-sm text-blue-700">📘 Temario General</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{questionStats.specific}</div>
              <div className="text-sm text-orange-700">📕 Temario Específico</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{questionStats.total}</div>
              <div className="text-sm text-purple-700">📚 Total Disponibles</div>
            </div>
          </div>
        </div>

        {!testGenerated ? (
          <>
            {/* Configuration */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">⚙️ Configuración del Test</h2>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de preguntas
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value) || 20)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Entre 5 y 100 preguntas</p>
              </div>
            </div>

            {/* Topic Selector */}
            <TopicDifficultySelector 
              onSelectionChange={setSelectedTopics}
              showDifficulty={true}
            />

            {/* Generate Button */}
            <div className="text-center mt-8">
              <button
                onClick={generateTest}
                disabled={loading || (selectedTopics.generalTopics.length === 0 && selectedTopics.specificTopics.length === 0)}
                className="px-12 py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-xl rounded-lg hover:from-blue-700 hover:to-purple-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '⏳ Generando...' : '🚀 Generar Test'}
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Test Generado</h2>
              <p className="text-gray-600">
                {testQuestions.length} preguntas listas para descargar
              </p>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📦 Características del HTML:</h3>
              <ul className="space-y-2 text-gray-700">
                <li>✅ Completamente autónomo (sin dependencias externas)</li>
                <li>✅ Corrección automática al finalizar</li>
                <li>✅ Revisión detallada de respuestas</li>
                <li>✅ Animación de celebración al 100% de aciertos</li>
                <li>✅ Barra de progreso visual</li>
                <li>✅ Diseño responsivo y profesional</li>
                <li>✅ Compatible con todos los navegadores</li>
              </ul>
            </div>

            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={downloadHTML}
                className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-lg rounded-lg hover:from-green-700 hover:to-emerald-700 transition shadow-lg"
              >
                📥 Descargar HTML
              </button>
              
              <button
                onClick={publishAsQuestionnaire}
                disabled={publishing || publishSuccess}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold text-lg rounded-lg hover:from-blue-700 hover:to-purple-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {publishing ? '⏳ Publicando...' : publishSuccess ? '✅ Publicado' : '📚 Publicar como Cuestionario'}
              </button>
              
              <button
                onClick={() => {
                  setTestGenerated(false)
                  setTestQuestions([])
                  setPublishSuccess(false)
                }}
                className="px-8 py-4 bg-gray-600 text-white font-bold text-lg rounded-lg hover:bg-gray-700 transition shadow-lg"
              >
                🔄 Generar Otro
              </button>
            </div>

            {publishSuccess && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <p className="text-green-700 font-semibold">
                  ✅ Test publicado exitosamente. Los usuarios pueden verlo en "Cuestionarios"
                </p>
              </div>
            )}

            {/* Preview */}
            <div className="mt-8 border-t pt-8">
              <h3 className="text-xl font-bold text-gray-900 mb-4">👁️ Vista Previa de Preguntas</h3>
              <div className="max-h-96 overflow-y-auto space-y-3">
                {testQuestions.slice(0, 5).map((q, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-blue-600">#{i + 1}</span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{q.tema}</span>
                    </div>
                    <p className="text-gray-800 font-medium">{q.text}</p>
                  </div>
                ))}
                {testQuestions.length > 5 && (
                  <p className="text-center text-gray-500 text-sm">
                    ... y {testQuestions.length - 5} preguntas más
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

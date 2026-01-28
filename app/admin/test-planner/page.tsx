"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import TopicDifficultySelector from "@/components/TopicDifficultySelector"

interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: string
  tema: string
  explanation?: string
}

type PublishTarget = "none" | "GENERAL" | "ESPECÍFICO"

type Step = 1 | 2 | 3

export default function AdminTestPlanner() {
  const { data: session } = useSession()
  const router = useRouter()

  const [step, setStep] = useState<Step>(1)
  const [questionCount, setQuestionCount] = useState(20)
  const [publishTarget, setPublishTarget] = useState<PublishTarget>("none")
  const [questionnaireTitle, setQuestionnaireTitle] = useState("")

  const [selectedTopics, setSelectedTopics] = useState({
    generalTopics: [] as string[],
    specificTopics: [] as string[],
    difficulty: "todas" as "todas" | "facil" | "media" | "dificil"
  })

  const [generating, setGenerating] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [testQuestions, setTestQuestions] = useState<Question[]>([])
  const [generationError, setGenerationError] = useState<string | null>(null)

  if (session?.user?.role !== "admin") {
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

  const handleNextFromStep1 = () => {
    if (questionCount < 5 || questionCount > 100) {
      alert("El número de preguntas debe estar entre 5 y 100")
      return
    }
    setStep(2)
  }

  const handleGenerateTest = async () => {
    if (selectedTopics.generalTopics.length === 0 && selectedTopics.specificTopics.length === 0) {
      alert("Debes seleccionar al menos un tema (general o específico)")
      return
    }

    setGenerating(true)
    setGenerationError(null)

    try {
      const res = await fetch("/api/custom-test/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generalTopics: selectedTopics.generalTopics,
          specificTopics: selectedTopics.specificTopics,
          questionCount,
          difficulty: selectedTopics.difficulty
        })
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        setGenerationError(error.error || "Error al generar el test personalizado")
        return
      }

      const data = await res.json()
      setTestQuestions(data.questions || [])
      setStep(3)
    } catch (error) {
      console.error("Error generating custom test:", error)
      setGenerationError("Error de conexión al generar el test")
    } finally {
      setGenerating(false)
    }
  }

  const generateInteractiveHTML = () => {
    const questionsData = JSON.stringify(
      testQuestions.map((q) => ({
        text: q.text,
        options: q.options,
        correctAnswer: q.correctAnswer,
        tema: q.tema,
        explanation: q.explanation || ""
      }))
    )

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
    const LETTERS = ['A', 'B', 'C', 'D'];

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
            <label class="option" data-index="${index}">
              <input type="radio" name="answer" value="${LETTERS[index]}">
              <span>(${LETTERS[index]}) ${option}</span>
            </label>\`).join('')}
        </div>

        <div class="buttons">
          \${currentQuestion > 0 ? '<button class="btn-secondary" onclick="previousQuestion()">← Anterior</button>' : '<div></div>'}
          <button class="btn-primary" id="nextBtn" onclick="nextQuestion()" disabled>
            \${currentQuestion === questions.length - 1 ? 'Finalizar Test →' : 'Siguiente →'}
          </button>
        </div>
      \`;

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
      let blanks = 0;

      questions.forEach((q, i) => {
        if (!userAnswers[i]) {
          blanks++;
        } else if (userAnswers[i] === q.correctAnswer) {
          correct++;
        }
      });

      const total = questions.length;
      const incorrect = total - correct - blanks;
      const percentage = (correct / total) * 100;

      if (percentage === 100 && total > 0) {
        createConfetti();
      }

      const resultsSection = document.getElementById('resultsSection');
      resultsSection.innerHTML = \`
        <h2>\${percentage === 100 ? '🎉 ¡PERFECTO!' : percentage >= 70 ? '✅ ¡Aprobado!' : '📚 Sigue Practicando'}</h2>
        <div class="score">\${percentage.toFixed(1)}%</div>

        <div class="stats">
          <div class="stat">
            <div class="stat-value">\${correct}</div>
            <div class="stat-label">Preguntas correctas</div>
          </div>
          <div class="stat">
            <div class="stat-value">\${incorrect}</div>
            <div class="stat-label">Preguntas incorrectas</div>
          </div>
          <div class="stat">
            <div class="stat-value">\${blanks}</div>
            <div class="stat-label">Preguntas en blanco</div>
          </div>
        </div>

        <div class="review-list">
          \${questions.map((q, i) => {
            const isCorrect = userAnswers[i] === q.correctAnswer;
            const hasAnswer = !!userAnswers[i];
            const itemClass = isCorrect
              ? 'review-item correct'
              : hasAnswer
              ? 'review-item incorrect'
              : 'review-item';

            const correctIndex = LETTERS.indexOf(q.correctAnswer);
            const correctLetter = correctIndex >= 0 ? LETTERS[correctIndex] : '';
            const correctText = correctIndex >= 0 ? (q.options[correctIndex] || '') : '';
            const correctLabel = correctLetter ? correctLetter + ') ' + correctText : correctText;

            const userLetter = userAnswers[i] || '';
            const userIndex = LETTERS.indexOf(userLetter);
            const userText = userIndex >= 0 ? (q.options[userIndex] || '') : '';
            const userLabel = userLetter && userText
              ? userLetter + ') ' + userText
              : (hasAnswer ? userLetter : '');

            return '<div class="' + itemClass + '">' +
              '<div class="review-question">' + (i + 1) + '. ' + q.text + '</div>' +
              '<div class="review-answer correct">✅ Correcta: ' + (correctLabel || q.correctAnswer) + '</div>' +
              '<div class="review-answer user">' +
                (hasAnswer
                  ? '💡 Tu respuesta: ' + (userLabel || userAnswers[i])
                  : '⚪ Sin respuesta') +
              '</div>' +
              (q.explanation
                ? '<div class="review-answer" style="background:#e0f2fe;color:#1e40af;white-space:pre-wrap;">💬 Explicación: ' + q.explanation + '</div>'
                : '') +
            '</div>';
          }).join('')}
        </div>
      \`;

      document.getElementById('questionSection').style.display = 'none';
      resultsSection.style.display = 'block';
    }

    function createConfetti() {
      const celebration = document.getElementById('celebration');
      celebration.classList.add('active');

      for (let i = 0; i < 150; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.top = '-10px';
        confetti.style.backgroundColor = ['#667eea', '#764ba2', '#10b981', '#f59e0b'][
          Math.floor(Math.random() * 4)
        ];
        confetti.style.animationDuration = 2 + Math.random() * 3 + 's';
        celebration.appendChild(confetti);

        setTimeout(() => {
          confetti.remove();
        }, 5000);
      }

      setTimeout(() => {
        celebration.classList.remove('active');
      }, 5000);
    }

    renderQuestion();
  </script>
</body>
</html>`
  }

  const downloadHTML = () => {
    if (testQuestions.length === 0) return

    const html = generateInteractiveHTML()
    const blob = new Blob([html], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `test-oposiciones-${Date.now()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const publishAsQuestionnaire = async () => {
    if (testQuestions.length === 0) return
    if (publishTarget === "none") {
      alert("Has seleccionado 'Sin publicar'. Cambia la opción de publicación en el Paso 1 si quieres publicarlo.")
      return
    }

    const titleToUse = (questionnaireTitle || "Test Personalizado - " + new Date().toLocaleDateString("es-ES")).trim()

    if (!confirm(`¿Publicar este test como cuestionario con ${testQuestions.length} preguntas?`)) {
      return
    }

    setPublishing(true)
    try {
      const res = await fetch("/api/admin/questionnaires/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleToUse,
          type: "theory",
          temaParte: publishTarget,
          questions: testQuestions.map((q) => ({
            text: q.text,
            options: q.options,
            correctAnswer: q.correctAnswer,
            temaCodigo: q.tema
          }))
        })
      })

      if (res.ok) {
        alert("✅ Test publicado como cuestionario exitosamente")
      } else {
        const error = await res.json().catch(() => ({}))
        alert(error.error || error.details || "Error al publicar cuestionario")
      }
    } catch (error) {
      console.error("Error publishing questionnaire:", error)
      alert("Error de conexión al publicar el cuestionario")
    } finally {
      setPublishing(false)
    }
  }

  const hasAnyTopicSelected =
    selectedTopics.generalTopics.length > 0 || selectedTopics.specificTopics.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/admin"
            className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-2"
          >
            <span>← Volver al Panel Admin</span>
          </Link>
          <div className="text-sm text-gray-500">
            Nuevo asistente · El generador antiguo sigue disponible en "Generador de Tests HTML"
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧮 Asistente de Tests Personalizados
          </h1>
          <p className="text-gray-600 mb-4">
            Define el tamaño del test, el tipo de temario y la mezcla de temas. Después podrás
            publicarlo como cuestionario o descargarlo como HTML interactivo.
          </p>

          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <span className={step === 1 ? "font-bold text-blue-700" : ""}>1️⃣ Configuración básica</span>
            <span>›</span>
            <span className={step === 2 ? "font-bold text-blue-700" : ""}>2️⃣ Temas y dificultad</span>
            <span>›</span>
            <span className={step === 3 ? "font-bold text-blue-700" : ""}>3️⃣ Vista previa y publicación</span>
          </div>
        </div>

        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Paso 1 · Configuración básica</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Número de preguntas del test
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value || "0", 10) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                />
                <p className="text-xs text-gray-500 mt-1">Entre 5 y 100 preguntas.</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Lugar de publicación (opcional)
                </label>
                <select
                  value={publishTarget}
                  onChange={(e) => setPublishTarget(e.target.value as PublishTarget)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="none">No publicar (solo descargar o usar en clase)</option>
                  <option value="GENERAL">Publicar como cuestionario en bloque GENERAL</option>
                  <option value="ESPECÍFICO">Publicar como cuestionario en bloque ESPECÍFICO</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Esto solo afecta al momento de publicarlo; la mezcla de temas la eliges en el Paso 2.
                </p>
              </div>
            </div>

            {publishTarget !== "none" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Título del cuestionario (opcional)
                </label>
                <input
                  type="text"
                  value={questionnaireTitle}
                  onChange={(e) => setQuestionnaireTitle(e.target.value)}
                  placeholder="Ej: Simulacro mixto 50 preguntas"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si lo dejas vacío, se usará un título automático con la fecha actual.
                </p>
              </div>
            )}

            <div className="flex justify-between mt-4">
              <button
                type="button"
                onClick={() => router.push("/admin/test-generator")}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:underline"
              >
                Ir al generador antiguo
              </button>
              <button
                type="button"
                onClick={handleNextFromStep1}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                Siguiente: elegir temas →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Paso 2 · Mezcla de temas y dificultad</h2>
            <p className="text-gray-600 text-sm mb-2">
              Selecciona libremente temas generales, específicos o ambos. El test se generará
              respetando este mix y el número total de preguntas del Paso 1.
            </p>

            <TopicDifficultySelector onSelectionChange={setSelectedTopics} showDifficulty={true} />

            <div className="flex flex-wrap items-center justify-between gap-4 mt-4 border-t pt-4">
              <div className="text-sm text-gray-600">
                <div>
                  Temas generales seleccionados: {selectedTopics.generalTopics.length}
                </div>
                <div>Temas específicos seleccionados: {selectedTopics.specificTopics.length}</div>
                <div>
                  Dificultad objetivo: {
                    selectedTopics.difficulty === "todas"
                      ? "Todas"
                      : selectedTopics.difficulty === "facil"
                      ? "Fácil"
                      : selectedTopics.difficulty === "media"
                      ? "Media"
                      : "Difícil"
                  }
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                >
                  ← Volver al Paso 1
                </button>
                <button
                  type="button"
                  onClick={handleGenerateTest}
                  disabled={generating || !hasAnyTopicSelected}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {generating ? "⏳ Generando test..." : `Generar test de ${questionCount} preguntas →`}
                </button>
              </div>
            </div>

            {generationError && (
              <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {generationError}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Paso 3 · Vista previa y acciones</h2>

            {testQuestions.length === 0 ? (
              <p className="text-gray-600 text-sm">
                No hay preguntas generadas. Vuelve al Paso 2 y genera el test de nuevo.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div className="text-sm text-gray-700">
                    <div>
                      Preguntas generadas: <span className="font-semibold">{testQuestions.length}</span>
                    </div>
                    <div>
                      Publicación seleccionada: {" "}
                      <span className="font-semibold">
                        {publishTarget === "none"
                          ? "Sin publicar (solo descarga / uso manual)"
                          : publishTarget === "GENERAL"
                          ? "Cuestionario en bloque GENERAL"
                          : "Cuestionario en bloque ESPECÍFICO"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={downloadHTML}
                      className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
                    >
                      ⬇️ Descargar HTML interactivo
                    </button>
                    <button
                      type="button"
                      onClick={publishAsQuestionnaire}
                      disabled={publishing || publishTarget === "none"}
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {publishing ? "⏳ Publicando..." : "✅ Publicar como cuestionario"}
                    </button>
                  </div>
                </div>

                <div className="border-t pt-4 mt-2">
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Vista previa rápida</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Lista compacta de preguntas para que compruebes el mix de temas. Para una edición
                    avanzada puedes usar luego la sección "Revisar y Gestionar Preguntas".
                  </p>

                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                    {testQuestions.map((q, index) => (
                      <div key={q.id ?? index} className="py-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-xs text-gray-500 font-mono">{q.tema}</div>
                          <div className="text-xs text-gray-400">#{index + 1}</div>
                        </div>
                        <p className="text-sm text-gray-900 font-medium">
                          {q.text.length > 220 ? `${q.text.slice(0, 220)}…` : q.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-between mt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    ← Volver al Paso 2
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:underline"
                  >
                    Empezar nueva configuración
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

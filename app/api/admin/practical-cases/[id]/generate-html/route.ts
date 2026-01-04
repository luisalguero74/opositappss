import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Resolver los parámetros dinámicos
    const resolvedParams = await params

    // Obtener el supuesto práctico con sus preguntas
    const practicalCase = await prisma.questionnaire.findUnique({
      where: { id: resolvedParams.id },
      include: {
        questions: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    if (!practicalCase) {
      return NextResponse.json({ error: 'Supuesto práctico no encontrado' }, { status: 404 })
    }

    if (practicalCase.questions.length === 0) {
      return NextResponse.json({ error: 'Este supuesto no tiene preguntas' }, { status: 400 })
    }

    // Generar el HTML interactivo
    let html: string
    try {
      html = generatePracticalCaseHTML(practicalCase)
    } catch (err) {
      console.error('[Generate Practical HTML] Render error:', err)
      console.error('[Generate Practical HTML] Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        questionsCount: practicalCase.questions.length,
        questionsData: practicalCase.questions.map(q => ({
          id: q.id,
          text: q.text?.substring(0, 100),
          hasOptions: !!q.options,
          correctAnswer: q.correctAnswer
        }))
      })
      return NextResponse.json({ 
        error: 'Error generando el HTML del supuesto. Revisa que las preguntas tengan opciones válidas.',
        details: err instanceof Error ? err.message : 'Unknown error'
      }, { status: 500 })
    }

    // Retornar como archivo descargable
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${practicalCase.title.replace(/[^a-z0-9]/gi, '_')}.html"`
      }
    })

  } catch (error) {
    console.error('[Generate Practical HTML] Error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error generando HTML' 
    }, { status: 500 })
  }
}

interface Question {
  id: string
  text: string
  options: Record<string, string> | string
  correctAnswer: string
  explanation?: string | null
}

interface PracticalCase {
  id: string
  title: string
  statement?: string | null
  questions: Question[]
}

// Escape HTML to prevent XSS and template issues
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
    '`': '&#x60;',
    '$': '&#36;'
  }
  return text.replace(/[&<>"'`$]/g, (m) => map[m])
}

function generatePracticalCaseHTML(practicalCase: PracticalCase): string {
  const safeParseOptions = (options: Record<string, string> | string | null | undefined) => {
    if (!options) return {}
    if (typeof options !== 'string') return options
    try {
      return JSON.parse(options)
    } catch (err) {
      console.error('[Generate Practical HTML] Error parsing options JSON', err)
      return {}
    }
  }

  const questions = practicalCase.questions.map((q) => {
    const rawOptions = safeParseOptions(q.options)

    // Normalizar a objeto A/B/C/D aunque venga como array
    const normalizedOptions: Record<string, string> = {}
    const letters = ['A', 'B', 'C', 'D']
    
    // Validar que rawOptions es un objeto o array
    if (Array.isArray(rawOptions)) {
      letters.forEach((letter, idx) => {
        normalizedOptions[letter] = String(rawOptions[idx] ?? '').trim()
      })
    } else if (typeof rawOptions === 'object' && rawOptions !== null) {
      letters.forEach((letter) => {
        normalizedOptions[letter] = String((rawOptions as Record<string, any>)[letter] ?? '').trim()
      })
    } else {
      // Si no es válido, crear opciones vacías
      letters.forEach((letter) => {
        normalizedOptions[letter] = ''
      })
    }

    // Asegurar que correctAnswer es válido
    const correctAnswer = ['A', 'B', 'C', 'D'].includes(String(q.correctAnswer ?? '')) 
      ? String(q.correctAnswer) 
      : 'A'

    return {
      ...q,
      options: normalizedOptions,
      correctAnswer: correctAnswer,
      explanation: q.explanation ? String(q.explanation).trim() : null
    }
  })

  // Generate questions HTML separately to avoid template string nesting issues
  const questionsHTML = questions.map((q, index) => {
    // Validar que tiene opciones
    if (!q.options || Object.keys(q.options).length === 0) {
      console.warn(`[Generate HTML] Question ${q.id} has no valid options`)
      return `
        <div class="question-card">
          <div class="question-header">
            <div class="question-number">${index + 1}</div>
            <div class="question-text">${escapeHtml(q.text)}</div>
          </div>
          <div class="error-message">❌ Esta pregunta no tiene opciones disponibles</div>
        </div>`
    }

    const optionsHTML = ['A', 'B', 'C', 'D'].map((option) => {
      const optionText = escapeHtml(q.options[option] || '')
      if (!optionText) {
        return `
              <div class="option disabled-option">
                <input type="radio" disabled>
                <label>${option}. (opción no disponible)</label>
              </div>`
      }
      return `
              <div class="option" data-question="${q.id}" data-option="${option}">
                <input 
                  type="radio" 
                  id="q${q.id}-${option}" 
                  name="q${q.id}" 
                  value="${option}"
                  onchange="updateProgress()"
                >
                <label for="q${q.id}-${option}">${option}. ${optionText}</label>
              </div>`
    }).join('')

    const explanationHTML = q.explanation 
      ? `
            <div class="explanation" id="explanation-${q.id}">
              <strong>💡 Explicación:</strong> ${escapeHtml(q.explanation)}
            </div>`
      : ''

    return `
        <div class="question-card">
          <div class="question-header">
            <div class="question-number">${index + 1}</div>
            <div class="question-text">${escapeHtml(q.text)}</div>
          </div>
          <div class="options">${optionsHTML}
          </div>${explanationHTML}
        </div>`
  }).join('')

  const statementHTML = practicalCase.statement 
    ? `
    <div class="statement-box">
      <h3>📄 Enunciado del Supuesto Práctico</h3>
      <p>${escapeHtml(practicalCase.statement).replace(/\n/g, '<br>')}</p>
    </div>`
    : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${practicalCase.title}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 10px;
    }

    .container {
      max-width: 1100px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      max-height: 90vh;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px 20px;
      text-align: center;
      flex-shrink: 0;
    }

    .header h1 {
      font-size: 1.5rem;
      margin-bottom: 10px;
      font-weight: 700;
    }

    .header .meta {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 15px;
      margin-top: 15px;
      font-size: 0.85rem;
      opacity: 0.95;
    }

    @media (min-width: 768px) {
      body {
        padding: 20px;
      }

      .header {
        padding: 40px 30px;
      }

      .header h1 {
        font-size: 2rem;
      }

      .header .meta {
        gap: 30px;
        font-size: 0.9rem;
      }
    }

    .statement-box {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 20px;
      margin: 0;
      border-radius: 0;
      line-height: 1.5;
      font-size: 0.9rem;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
      flex-shrink: 0;
    }

    .statement-box h3 {
      color: #ffffff;
      margin-bottom: 8px;
      font-size: 1rem;
      font-weight: 700;
    }

    .statement-box p {
      opacity: 0.95;
      word-break: break-word;
      margin: 0;
    }

    @media (min-width: 768px) {
      .statement-box {
        padding: 20px 30px;
        font-size: 0.95rem;
      }

      .statement-box h3 {
        margin-bottom: 10px;
        font-size: 1.1rem;
      }
    }

    .content {
      padding: 20px;
      flex: 1;
      overflow-y: auto;
    }

    @media (min-width: 768px) {
      .content {
        padding: 40px;
      }
    }

    .progress-bar {
      background: #e2e8f0;
      height: 8px;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 30px;
    }

    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      width: 0%;
      transition: width 0.3s ease;
    }

    .question-card {
      background: #ffffff;
      border: 2px solid #e2e8f0;
      border-radius: 15px;
      padding: 15px;
      margin-bottom: 20px;
      transition: all 0.3s ease;
    }

    @media (min-width: 768px) {
      .question-card {
        padding: 25px;
        margin-bottom: 25px;
      }
    }

    .question-card:hover {
      border-color: #667eea;
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.15);
    }

    .question-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 15px;
    }

    @media (min-width: 768px) {
      .question-header {
        gap: 15px;
        margin-bottom: 20px;
        align-items: center;
      }
    }

    .question-number {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      width: 35px;
      height: 35px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      flex-shrink: 0;
      font-size: 0.95rem;
    }

    @media (min-width: 768px) {
      .question-number {
        width: 40px;
        height: 40px;
        font-size: 1rem;
      }
    }

    .question-text {
      font-size: 1rem;
      color: #2d3748;
      line-height: 1.6;
      flex: 1;
    }

    @media (min-width: 768px) {
      .question-text {
        font-size: 1.1rem;
      }
    }

    .options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 20px;
    }

    .option {
      display: flex;
      align-items: center;
      padding: 12px 15px;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: white;
    }

    @media (min-width: 768px) {
      .option {
        padding: 15px 20px;
      }
    }

    .option:hover {
      border-color: #667eea;
      background: #f7fafc;
    }

    .option input[type="radio"] {
      margin-right: 12px;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #667eea;
      flex-shrink: 0;
    }

    @media (min-width: 768px) {
      .option input[type="radio"] {
        margin-right: 15px;
        width: 20px;
        height: 20px;
      }
    }

    .option label {
      cursor: pointer;
      flex: 1;
      font-size: 0.95rem;
      color: #4a5568;
      word-break: break-word;
    }

    @media (min-width: 768px) {
      .option label {
        font-size: 1rem;
      }
    }

    .option.disabled-option {
      background: #f0f0f0;
      border-color: #d0d0d0;
      cursor: not-allowed;
      opacity: 0.6;
    }

    .option.disabled-option input {
      cursor: not-allowed;
    }

    .option.disabled-option label {
      cursor: not-allowed;
      color: #999;
    }

    .error-message {
      background: #fed7d7;
      border-left: 4px solid #f56565;
      padding: 15px;
      border-radius: 8px;
      color: #c53030;
      font-weight: 600;
      margin-top: 10px;
    }

    .option.correct {
      background: #c6f6d5;
      border-color: #48bb78;
      animation: pulse 0.5s ease;
    }

    .option.incorrect {
      background: #fed7d7;
      border-color: #f56565;
      animation: shake 0.5s ease;
    }

    .explanation {
      margin-top: 15px;
      padding: 12px 15px;
      background: #edf2f7;
      border-left: 4px solid #4299e1;
      border-radius: 8px;
      font-size: 0.9rem;
      color: #2d3748;
      line-height: 1.6;
      display: none;
    }

    @media (min-width: 768px) {
      .explanation {
        padding: 15px 20px;
        font-size: 0.95rem;
      }
    }

    .explanation.show {
      display: block;
      animation: slideDown 0.3s ease;
    }

    .submit-btn {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 15px 30px;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 12px;
      cursor: pointer;
      width: 100%;
      transition: all 0.3s ease;
      margin-top: 20px;
    }

    @media (min-width: 768px) {
      .submit-btn {
        padding: 18px 40px;
        font-size: 1.1rem;
        margin-top: 30px;
      }
    }

    .submit-btn:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
    }

    .submit-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .results {
      display: none;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 25px 20px;
      border-radius: 15px;
      margin-top: 20px;
      text-align: center;
    }

    @media (min-width: 768px) {
      .results {
        padding: 40px;
        margin-top: 30px;
      }
    }

    .results.show {
      display: block;
      animation: slideDown 0.5s ease;
    }

    .results h2 {
      font-size: 1.5rem;
      margin-bottom: 20px;
    }

    @media (min-width: 768px) {
      .results h2 {
        font-size: 2rem;
        margin-bottom: 30px;
      }
    }

    .score-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
    }

    @media (min-width: 768px) {
      .score-grid {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }
    }

    .score-item {
      background: rgba(255,255,255,0.15);
      padding: 15px;
      border-radius: 12px;
      backdrop-filter: blur(10px);
    }

    @media (min-width: 768px) {
      .score-item {
        padding: 20px;
      }
    }

    .score-value {
      font-size: 2.5rem;
      font-weight: 700;
      display: block;
      margin-bottom: 5px;
    }

    .score-label {
      font-size: 0.9rem;
      opacity: 0.9;
    }

    .reset-btn {
      background: white;
      color: #667eea;
      border: none;
      padding: 15px 35px;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .reset-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 5px 20px rgba(255,255,255,0.3);
    }

    /* Celebration Modal */
    .celebration-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.95), rgba(118, 75, 162, 0.95));
      z-index: 1000;
      justify-content: center;
      align-items: center;
      backdrop-filter: blur(5px);
    }

    .celebration-modal.show {
      display: flex;
      animation: fadeIn 0.3s ease;
    }

    .celebration-content {
      background: white;
      padding: 60px 50px;
      border-radius: 30px;
      text-align: center;
      max-width: 600px;
      animation: bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      box-shadow: 0 30px 60px rgba(0,0,0,0.3);
    }

    .celebration-icon {
      font-size: 6rem;
      margin-bottom: 20px;
      animation: rotate 2s ease infinite;
      display: inline-block;
    }

    .celebration-content h2 {
      color: #667eea;
      font-size: 3rem;
      margin-bottom: 20px;
      font-weight: 800;
      letter-spacing: 2px;
      animation: slideDown 0.6s ease 0.2s both;
    }

    .celebration-content p {
      color: #4a5568;
      font-size: 1.3rem;
      margin-bottom: 30px;
      line-height: 1.8;
      animation: slideDown 0.6s ease 0.4s both;
    }

    .celebration-stats {
      background: #f7fafc;
      padding: 20px;
      border-radius: 15px;
      margin-bottom: 30px;
      animation: slideDown 0.6s ease 0.6s both;
    }

    .celebration-stats p {
      margin: 10px 0;
      font-size: 1.1rem;
      color: #2d3748;
    }

    .close-celebration {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      padding: 18px 50px;
      font-size: 1.2rem;
      font-weight: 700;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      animation: slideDown 0.6s ease 0.8s both;
    }

    .close-celebration:hover {
      transform: scale(1.08);
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
    }

    .close-celebration:active {
      transform: scale(0.95);
    }

    /* Confetti */
    .confetti {
      position: fixed;
      width: 10px;
      height: 10px;
      z-index: 1001;
      top: -10px;
      border-radius: 50%;
      animation: confetti-fall linear forwards;
    }

    @keyframes confetti-fall {
      to {
        transform: translateY(100vh) rotate(360deg);
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes bounceIn {
      0% { transform: scale(0.3); opacity: 0; }
      50% { transform: scale(1.05); }
      100% { transform: scale(1); opacity: 1; }
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }
      .submit-btn, .reset-btn {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 ${escapeHtml(practicalCase.title)}</h1>
      <div class="meta">
        <span>⏱️ <span id="timer">00:00</span></span>
        <span>📝 ${questions.length} preguntas</span>
        <span id="progress-text">0/${questions.length}</span>
      </div>
    </div>

    ${statementHTML}

    <div class="content">
      <div class="progress-bar">
        <div class="progress-fill" id="progressBar"></div>
      </div>

      ${questionsHTML}

      <button class="submit-btn" onclick="submitTest()" id="submitBtn">
        ✅ Enviar Respuestas
      </button>

      <div class="results" id="results">
        <h2>📊 Resultados del Supuesto Práctico</h2>
        <div class="score-grid">
          <div class="score-item">
            <span class="score-value" id="scorePercentage">0%</span>
            <span class="score-label">Puntuación</span>
          </div>
          <div class="score-item">
            <span class="score-value" id="correctCount">0</span>
            <span class="score-label">Correctas</span>
          </div>
          <div class="score-item">
            <span class="score-value" id="incorrectCount">0</span>
            <span class="score-label">Incorrectas</span>
          </div>
          <div class="score-item">
            <span class="score-value" id="unansweredCount">0</span>
            <span class="score-label">Sin responder</span>
          </div>
          <div class="score-item">
            <span class="score-value" id="finalTime">00:00</span>
            <span class="score-label">Tiempo</span>
          </div>
        </div>
        <button class="reset-btn" onclick="resetTest()">
          🔄 Reiniciar Supuesto
        </button>
      </div>
    </div>
  </div>

  <!-- Celebration Modal -->
  <div class="celebration-modal" id="celebrationModal">
    <div class="celebration-content">
      <div class="celebration-icon">🎉</div>
      <h2>¡PERFECTO!</h2>
      <p>¡Has acertado todas las preguntas!<br>¡Excelente desempeño! 🌟</p>
      <div class="celebration-stats">
        <!-- Stats will be filled by JavaScript -->
      </div>
      <button class="close-celebration" onclick="closeCelebration()">
        ✨ Continuar
      </button>
    </div>
  </div>

  <script>
    const questionsData = ${JSON.stringify(questions.map(q => ({
      id: q.id,
      text: q.text,
      options: q.options || {},
      correctAnswer: q.correctAnswer || 'A',
      explanation: q.explanation || null
    })))};
    let startTime = Date.now();
    let timerInterval;

    // Timer
    function startTimer() {
      timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('timer').textContent = 
          \`\${String(minutes).padStart(2, '0')}:\${String(seconds).padStart(2, '0')}\`;
      }, 1000);
    }

    // Update progress
    function updateProgress() {
      const answered = document.querySelectorAll('input[type="radio"]:checked').length;
      const total = questionsData.length;
      const percentage = (answered / total) * 100;
      
      document.getElementById('progressBar').style.width = percentage + '%';
      document.getElementById('progress-text').textContent = answered + '/' + total;
    }

    // Submit test
    function submitTest() {
      clearInterval(timerInterval);

      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;

      questionsData.forEach(q => {
        const selected = document.querySelector(\`input[name="q\${q.id}"]:checked\`);
        const options = document.querySelectorAll(\`[data-question="\${q.id}"]\`);
        
        if (!selected) {
          unanswered++;
          return;
        }

        const userAnswer = selected.value;
        const isCorrect = userAnswer === q.correctAnswer;

        if (isCorrect) {
          correct++;
        } else {
          incorrect++;
        }

        // Mark options
        options.forEach(option => {
          const optionValue = option.dataset.option;
          if (optionValue === q.correctAnswer) {
            option.classList.add('correct');
          } else if (optionValue === userAnswer && !isCorrect) {
            option.classList.add('incorrect');
          }
        });

        // Show explanation
        const explanationEl = document.getElementById(\`explanation-\${q.id}\`);
        if (explanationEl) {
          explanationEl.classList.add('show');
        }
      });

      // Disable inputs
      document.querySelectorAll('input[type="radio"]').forEach(input => {
        input.disabled = true;
      });

      // Show results
      const scorePercentage = questionsData.length > 0 ? Math.round((correct / questionsData.length) * 100) : 0;
      document.getElementById('correctCount').textContent = correct;
      document.getElementById('incorrectCount').textContent = incorrect;
      document.getElementById('unansweredCount').textContent = unanswered;
      document.getElementById('scorePercentage').textContent = scorePercentage + '%';
      document.getElementById('finalTime').textContent = document.getElementById('timer').textContent;
      document.getElementById('results').classList.add('show');
      document.getElementById('submitBtn').disabled = true;

      // Scroll to results
      document.getElementById('results').scrollIntoView({ behavior: 'smooth' });

      // Show celebration if 100%
      if (scorePercentage === 100) {
        setTimeout(() => {
          showCelebration();
        }, 1000);
      }
    }

    // Show celebration modal with confetti
    function showCelebration() {
      const scorePercentage = document.getElementById('scorePercentage').textContent;
      const correctCount = document.getElementById('correctCount').textContent;
      const finalTime = document.getElementById('finalTime').textContent;
      const total = questionsData.length;

      const modal = document.getElementById('celebrationModal');
      const stats = document.querySelector('.celebration-stats');
      
      if (stats) {
        stats.innerHTML = \`
          <p><strong>Respuestas correctas:</strong> \${correctCount}/\${total}</p>
          <p><strong>Tiempo utilizado:</strong> \${finalTime}</p>
          <p><strong>Puntuación final:</strong> \${scorePercentage}</p>
        \`;
      }
      
      modal.classList.add('show');
      createConfetti();
      
      // Agregar sonido opcional (si existe el archivo)
      // const audio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==');
      // audio.play().catch(e => console.log('Audio play failed'));
    }

    // Close celebration modal
    function closeCelebration() {
      document.getElementById('celebrationModal').classList.remove('show');
    }

    // Create confetti effect
    function createConfetti() {
      const colors = ['#FFD700', '#FFA500', '#FF6347', '#90EE90', '#87CEEB', '#FF69B4', '#FFB6C1', '#98FB98'];
      const confettiCount = 200;
      
      for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
          const confetti = document.createElement('div');
          confetti.className = 'confetti';
          confetti.style.left = Math.random() * 100 + '%';
          confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
          confetti.style.animationDelay = Math.random() * 2 + 's';
          confetti.style.animationDuration = (Math.random() * 4 + 3) + 's';
          document.body.appendChild(confetti);
          
          setTimeout(() => {
            confetti.remove();
          }, 7000);
        }, i * 20);
      }
    }

    // Reset test
    function resetTest() {
      // Clear selections
      document.querySelectorAll('input[type="radio"]').forEach(input => {
        input.checked = false;
        input.disabled = false;
      });

      // Remove correction classes
      document.querySelectorAll('.option').forEach(option => {
        option.classList.remove('correct', 'incorrect');
      });

      // Hide explanations
      document.querySelectorAll('.explanation').forEach(exp => {
        exp.classList.remove('show');
      });

      // Hide results
      document.getElementById('results').classList.remove('show');
      document.getElementById('submitBtn').disabled = false;

      // Reset timer
      startTime = Date.now();
      startTimer();

      // Reset progress
      updateProgress();

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Initialize
    startTimer();
    updateProgress();
  </script>
</body>
</html>`;
}

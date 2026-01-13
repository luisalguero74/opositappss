import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    const normalizeSecret = (value: string | null | undefined) =>
      String(value || '')
        .replace(/\\n/g, '')
        .replace(/\n/g, '')
        .trim()

    const expectedApiKey = normalizeSecret(process.env.ADMIN_API_KEY)
    const receivedApiKey = normalizeSecret((req as any)?.headers?.get?.('x-api-key') ?? null)
    const apiKeyOk = Boolean(expectedApiKey && receivedApiKey && expectedApiKey === receivedApiKey)
    const isAdminSession = Boolean(session && String(session.user?.role || '').toLowerCase() === 'admin')
    if (!isAdminSession && !apiKeyOk) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { questionIds, title, showExplanations, showDifficulty, randomizeOrder } = await req.json()

    if (!questionIds || questionIds.length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron preguntas' }, { status: 400 })
    }

    // Obtener las preguntas de la base de datos
    const questions = await prisma.generatedQuestion.findMany({
      where: {
        id: { in: questionIds },
        approved: true
      }
    })

    if (questions.length === 0) {
      return NextResponse.json({ error: 'No se encontraron preguntas' }, { status: 404 })
    }

    // Ordenar aleatoriamente si se solicita
    let orderedQuestions = [...questions]
    if (randomizeOrder) {
      orderedQuestions = orderedQuestions.sort(() => Math.random() - 0.5)
    }

    // Generar el HTML
    const html = generateInteractiveHTML(orderedQuestions, title, showExplanations, showDifficulty)

    // Retornar como archivo descargable
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="formulario-${Date.now()}.html"`
      }
    })

  } catch (error) {
    console.error('Error generating HTML form:', error)
    return NextResponse.json({ error: 'Error al generar el formulario' }, { status: 500 })
  }
}

function generateInteractiveHTML(
  questions: any[],
  title: string,
  showExplanations: boolean,
  showDifficulty: boolean
): string {
  const questionsData = questions.map((q, index) => {
    const options = JSON.parse(q.options)
    return {
      id: index + 1,
      text: q.text,
      options: options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      topic: q.topic
    }
  })

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
      padding: 20px;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
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
    }

    .header .subtitle {
      opacity: 0.9;
      font-size: 1.1em;
    }

    .controls {
      background: #f8f9fa;
      padding: 20px;
      border-bottom: 2px solid #e9ecef;
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      align-items: center;
      justify-content: space-between;
    }

    .timer {
      font-size: 1.5em;
      font-weight: bold;
      color: #667eea;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .controls button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 1em;
      font-weight: bold;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .controls button:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
    }

    .controls button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .progress-bar {
      background: #e9ecef;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      height: 100%;
      width: 0%;
      transition: width 0.3s ease;
    }

    .content {
      padding: 40px;
    }

    .question {
      margin-bottom: 40px;
      padding: 30px;
      background: #f8f9fa;
      border-radius: 15px;
      border-left: 5px solid #667eea;
    }

    .question-header {
      display: flex;
      align-items: flex-start;
      gap: 15px;
      margin-bottom: 20px;
    }

    .question-number {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      flex-shrink: 0;
    }

    .question-text-wrapper {
      flex: 1;
    }

    .question-text {
      font-size: 1.2em;
      font-weight: 600;
      color: #2d3748;
      line-height: 1.6;
    }

    .difficulty-badge {
      display: inline-block;
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.85em;
      font-weight: bold;
      margin-top: 10px;
    }

    .difficulty-easy {
      background: #d4edda;
      color: #155724;
    }

    .difficulty-medium {
      background: #fff3cd;
      color: #856404;
    }

    .difficulty-hard {
      background: #f8d7da;
      color: #721c24;
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
      gap: 15px;
      padding: 15px 20px;
      background: white;
      border: 2px solid #dee2e6;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .option:hover {
      border-color: #667eea;
      transform: translateX(5px);
    }

    .option input[type="radio"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .option-label {
      font-weight: bold;
      color: #667eea;
      min-width: 30px;
    }

    .option-text {
      flex: 1;
      color: #495057;
      line-height: 1.5;
    }

    .option.correct {
      background: #d4edda;
      border-color: #28a745;
    }

    .option.incorrect {
      background: #f8d7da;
      border-color: #dc3545;
    }

    .explanation {
      margin-top: 20px;
      padding: 20px;
      background: #e7f3ff;
      border-left: 4px solid #2196f3;
      border-radius: 10px;
      display: none;
    }

    .explanation.show {
      display: block;
    }

    .explanation-title {
      font-weight: bold;
      color: #1976d2;
      margin-bottom: 10px;
    }

    .explanation-text {
      color: #495057;
      line-height: 1.6;
    }

    .results {
      display: none;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      border-radius: 15px;
      text-align: center;
      margin-top: 30px;
    }

    .results.show {
      display: block;
    }

    .results h2 {
      font-size: 2.5em;
      margin-bottom: 20px;
    }

    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 30px;
    }

    .result-card {
      background: rgba(255, 255, 255, 0.2);
      padding: 20px;
      border-radius: 10px;
      backdrop-filter: blur(10px);
    }

    .result-card .value {
      font-size: 2.5em;
      font-weight: bold;
      margin: 10px 0;
    }

    .result-card .label {
      opacity: 0.9;
    }

    /* Celebration Modal for 100% */
    .celebration-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
      z-index: 9999;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.3s ease-out;
    }

    .celebration-modal.show {
      display: flex;
    }

    .celebration-content {
      background: linear-gradient(135deg, #fff 0%, #fffbeb 50%, #fed7aa 100%);
      border-radius: 30px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
      padding: 60px 40px;
      max-width: 600px;
      width: 100%;
      text-align: center;
      position: relative;
      overflow: hidden;
      animation: slideIn 0.5s ease-out;
    }

    .celebration-stars {
      position: absolute;
      font-size: 2em;
      animation: pulse 2s ease-in-out infinite;
    }

    .star-1 { top: 20px; left: 20px; }
    .star-2 { top: 20px; right: 20px; animation-delay: 0.2s; }
    .star-3 { bottom: 20px; left: 40px; animation-delay: 0.4s; }
    .star-4 { bottom: 20px; right: 40px; animation-delay: 0.6s; }

    .trophy {
      font-size: 8em;
      margin: 20px 0;
      animation: bounce 1s ease-in-out infinite;
      filter: drop-shadow(0 10px 20px rgba(255, 193, 7, 0.5));
    }

    .celebration-title {
      font-size: 4em;
      font-weight: 900;
      background: linear-gradient(135deg, #f59e0b, #ef4444, #dc2626);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
    }

    .celebration-subtitle {
      font-size: 2em;
      font-weight: bold;
      color: #1f2937;
      margin: 20px 0;
    }

    .celebration-message {
      background: linear-gradient(135deg, #d1fae5, #a7f3d0);
      border: 3px solid #10b981;
      border-radius: 20px;
      padding: 30px;
      margin: 30px 0;
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.2);
    }

    .celebration-message p {
      font-size: 1.5em;
      font-weight: bold;
      color: #065f46;
      line-height: 1.6;
    }

    .celebration-button {
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      padding: 20px 50px;
      font-size: 1.3em;
      font-weight: bold;
      border-radius: 15px;
      cursor: pointer;
      box-shadow: 0 10px 30px rgba(16, 185, 129, 0.4);
      transition: all 0.3s;
      margin-top: 20px;
    }

    .celebration-button:hover {
      transform: translateY(-3px);
      box-shadow: 0 15px 40px rgba(16, 185, 129, 0.6);
    }

    /* Confetti */
    .confetti {
      position: fixed;
      width: 10px;
      height: 10px;
      background: #f59e0b;
      position: absolute;
      animation: confetti-fall 3s linear forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

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

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-20px); }
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(1.2); }
    }

    @keyframes confetti-fall {
      to {
        transform: translateY(100vh) rotate(360deg);
        opacity: 0;
      }
    }

    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      border-top: 2px solid #e9ecef;
      color: #6c757d;
    }

    @media (max-width: 768px) {
      .header h1 {
        font-size: 1.8em;
      }

      .content {
        padding: 20px;
      }

      .question {
        padding: 20px;
      }

      .controls {
        flex-direction: column;
        align-items: stretch;
      }

      .results-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <p class="subtitle">📚 Total de preguntas: ${questions.length} | 🎯 Responde todas las preguntas y pulsa "Corregir Test"</p>
    </div>

    <div class="controls">
      <div class="timer">
        ⏱️ <span id="timer">00:00</span>
      </div>
      <div style="flex: 1; margin: 0 20px;">
        <div class="progress-bar">
          <div class="progress-fill" id="progressBar"></div>
        </div>
        <p style="text-align: center; margin-top: 5px; color: #6c757d; font-size: 0.9em;">
          <span id="answeredCount">0</span> / ${questions.length} respondidas
        </p>
      </div>
      <button onclick="submitTest()" id="submitBtn">✅ Corregir Test</button>
    </div>

    <div class="content" id="questionsContainer">
      ${questionsData.map(q => `
        <div class="question" data-question-id="${q.id}">
          <div class="question-header">
            <div class="question-number">${q.id}</div>
            <div class="question-text-wrapper">
              <div class="question-text">${q.text}</div>
              ${showDifficulty ? `
                <span class="difficulty-badge difficulty-${q.difficulty}">
                  ${q.difficulty === 'easy' ? '🟢 Fácil' : q.difficulty === 'hard' ? '🔴 Difícil' : '🟡 Medio'}
                </span>
              ` : ''}
            </div>
          </div>
          <div class="options">
            ${q.options.map((option: string, i: number) => `
              <label class="option" data-option="${String.fromCharCode(65 + i)}">
                <input type="radio" name="question-${q.id}" value="${String.fromCharCode(65 + i)}" onchange="updateProgress()">
                <span class="option-label">${String.fromCharCode(65 + i)})</span>
                <span class="option-text">${option}</span>
              </label>
            `).join('')}
          </div>
          ${showExplanations && q.explanation ? `
            <div class="explanation" id="explanation-${q.id}">
              <div class="explanation-title">💡 Explicación</div>
              <div class="explanation-text">${q.explanation}</div>
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>

    <div class="results" id="results">
      <h2>🎉 Resultados del Test</h2>
      <div class="results-grid">
        <div class="result-card">
          <div class="label">Correctas</div>
          <div class="value" id="correctCount">0</div>
        </div>
        <div class="result-card">
          <div class="label">Incorrectas</div>
          <div class="value" id="incorrectCount">0</div>
        </div>
        <div class="result-card">
          <div class="label">Sin responder</div>
          <div class="value" id="unansweredCount">0</div>
        </div>
        <div class="result-card">
          <div class="label">Puntuación</div>
          <div class="value" id="scorePercentage">0%</div>
        </div>
        <div class="result-card">
          <div class="label">Tiempo</div>
          <div class="value" id="finalTime">00:00</div>
        </div>
      </div>
      <button onclick="resetTest()" style="margin-top: 30px; background: white; color: #667eea; padding: 15px 40px;">
        🔄 Reiniciar Test
      </button>
    </div>

    <div class="footer">
      <p>© 2025 opositAPPSS - Desarrollado por Luis Enrique Algueró Martín</p>
      <p style="margin-top: 10px; font-size: 0.9em;">Todos los derechos reservados</p>
    </div>
  </div>

  <!-- Celebration Modal for 100% -->
  <div class="celebration-modal" id="celebrationModal">
    <div class="celebration-content">
      <div class="celebration-stars star-1">⭐</div>
      <div class="celebration-stars star-2">⭐</div>
      <div class="celebration-stars star-3">✨</div>
      <div class="celebration-stars star-4">✨</div>
      
      <div class="trophy">🏆</div>
      
      <h2 class="celebration-title">¡PERFECTO!</h2>
      
      <p class="celebration-subtitle">100% de aciertos</p>
      
      <div class="celebration-message">
        <p>
          Continúa así,<br />
          tu plaza está más cerca
        </p>
      </div>
      
      <button class="celebration-button" onclick="closeCelebration()">
        ¡Genial! 🎉
      </button>
    </div>
  </div>

  <script>
    const questionsData = ${JSON.stringify(questionsData)};
    let startTime = Date.now();
    let timerInterval;

    // Iniciar temporizador
    function startTimer() {
      timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        document.getElementById('timer').textContent = 
          \`\${String(minutes).padStart(2, '0')}:\${String(seconds).padStart(2, '0')}\`;
      }, 1000);
    }

    // Actualizar progreso
    function updateProgress() {
      const total = questionsData.length;
      const answered = document.querySelectorAll('input[type="radio"]:checked').length;
      document.getElementById('answeredCount').textContent = answered;
      const percentage = (answered / total) * 100;
      document.getElementById('progressBar').style.width = percentage + '%';
    }

    // Corregir test
    function submitTest() {
      clearInterval(timerInterval);
      
      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;

      questionsData.forEach(q => {
        const questionEl = document.querySelector(\`[data-question-id="\${q.id}"]\`);
        const selected = questionEl.querySelector('input[type="radio"]:checked');
        const options = questionEl.querySelectorAll('.option');

        // Siempre mostrar la respuesta correcta
        options.forEach(option => {
          const optionValue = option.dataset.option;
          if (optionValue === q.correctAnswer) {
            option.classList.add('correct');
          }
        });

        if (!selected) {
          unanswered++;
        } else {
          const userAnswer = selected.value;
          
          // Marcar como incorrecta si no es la correcta
          if (userAnswer !== q.correctAnswer) {
            options.forEach(option => {
              const optionValue = option.dataset.option;
              if (optionValue === userAnswer) {
                option.classList.add('incorrect');
              }
            });
            incorrect++;
          } else {
            correct++;
          }
        }

        // Mostrar explicación
        const explanationEl = document.getElementById(\`explanation-\${q.id}\`);
        if (explanationEl) {
          explanationEl.classList.add('show');
        }
      });

      // Deshabilitar inputs
      document.querySelectorAll('input[type="radio"]').forEach(input => {
        input.disabled = true;
      });

      // Mostrar resultados
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
      document.getElementById('celebrationModal').classList.add('show');
      createConfetti();
    }

    // Close celebration modal
    function closeCelebration() {
      document.getElementById('celebrationModal').classList.remove('show');
    }

    // Create confetti effect
    function createConfetti() {
      const colors = ['#FFD700', '#FFA500', '#FF6347', '#90EE90', '#87CEEB', '#FF69B4'];
      const confettiCount = 150;
      
      for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
          const confetti = document.createElement('div');
          confetti.className = 'confetti';
          confetti.style.left = Math.random() * 100 + '%';
          confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
          confetti.style.animationDelay = Math.random() * 3 + 's';
          confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
          document.body.appendChild(confetti);
          
          setTimeout(() => {
            confetti.remove();
          }, 5000);
        }, i * 30);
      }
    }

    // Reiniciar test
    function resetTest() {
      // Limpiar selecciones
      document.querySelectorAll('input[type="radio"]').forEach(input => {
        input.checked = false;
        input.disabled = false;
      });

      // Quitar clases de corrección
      document.querySelectorAll('.option').forEach(option => {
        option.classList.remove('correct', 'incorrect');
      });

      // Ocultar explicaciones
      document.querySelectorAll('.explanation').forEach(exp => {
        exp.classList.remove('show');
      });

      // Ocultar resultados
      document.getElementById('results').classList.remove('show');
      document.getElementById('submitBtn').disabled = false;

      // Reiniciar temporizador
      startTime = Date.now();
      startTimer();

      // Reiniciar progreso
      updateProgress();

      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Iniciar
    startTimer();
    updateProgress();
  </script>
</body>
</html>`
}

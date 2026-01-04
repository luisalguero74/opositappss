import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { 
      questions, 
      title, 
      showExplanations, 
      showDifficulty, 
      randomizeOrder,
      tema 
    } = await req.json()

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'Sin preguntas' }, { status: 400 })
    }

    let questionsData = [...questions]
    if (randomizeOrder) {
      questionsData = questionsData.sort(() => Math.random() - 0.5)
    }

    const html = generateInteractiveHTMLWithSolution(
      questionsData, 
      title, 
      showExplanations, 
      showDifficulty,
      tema
    )

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="test-${tema || 'general'}-${Date.now()}.html"`
      }
    })
  } catch (error) {
    console.error('Error generando HTML:', error)
    return NextResponse.json({ error: 'Error al generar HTML' }, { status: 500 })
  }
}

function generateInteractiveHTMLWithSolution(
  questions: any[],
  title: string,
  showExplanations: boolean,
  showDifficulty: boolean,
  tema: string = 'General'
): string {
  const questionsJSON = questions.map((q, i) => ({
    id: i + 1,
    text: q.text,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation || 'Sin explicación disponible',
    difficulty: q.difficulty || 'media'
  }))

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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

    .progress-bar {
      background: rgba(255,255,255,0.3);
      height: 8px;
      width: 100%;
    }

    .progress-bar-fill {
      height: 100%;
      background: #4ade80;
      width: 0%;
      transition: width 0.3s ease;
    }

    .content {
      padding: 40px;
    }

    .question-block {
      margin-bottom: 40px;
      padding: 25px;
      border: 2px solid #e9ecef;
      border-radius: 12px;
      background: #f8f9fa;
    }

    .question-block.answered {
      border-color: #4ade80;
      background: #f0fdf4;
    }

    .question-block.answered-wrong {
      border-color: #ef4444;
      background: #fef2f2;
    }

    .question-number {
      font-weight: bold;
      color: #667eea;
      margin-bottom: 10px;
      font-size: 0.9em;
    }

    .question-text {
      font-size: 1.1em;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 20px;
      line-height: 1.5;
    }

    .question-meta {
      display: flex;
      gap: 10px;
      margin-bottom: 15px;
      font-size: 0.85em;
    }

    .difficulty-badge {
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 500;
    }

    .difficulty-badge.facil {
      background: #dbeafe;
      color: #0369a1;
    }

    .difficulty-badge.media {
      background: #fef08a;
      color: #854d0e;
    }

    .difficulty-badge.dificil {
      background: #fee2e2;
      color: #b91c1c;
    }

    .options {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .option {
      padding: 15px;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      background: white;
      font-size: 1em;
    }

    .option:hover {
      border-color: #667eea;
      background: #f3f4f6;
    }

    .option.selected {
      border-color: #667eea;
      background: #eef2ff;
    }

    .option.correct {
      border-color: #4ade80;
      background: #f0fdf4;
      color: #166534;
    }

    .option.incorrect {
      border-color: #ef4444;
      background: #fef2f2;
      color: #991b1b;
    }

    .explanation {
      margin-top: 15px;
      padding: 15px;
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
      display: none;
    }

    .explanation.show {
      display: block;
    }

    .explanation h4 {
      margin-bottom: 8px;
      color: #92400e;
    }

    .explanation p {
      color: #78350f;
      line-height: 1.6;
    }

    .controls {
      background: #f8f9fa;
      padding: 20px 40px;
      display: flex;
      gap: 15px;
      justify-content: center;
      border-top: 2px solid #e9ecef;
    }

    button {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      font-size: 1em;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
    }

    .btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }

    .btn-secondary:hover {
      background: #d1d5db;
    }

    .results {
      display: none;
      text-align: center;
      padding: 60px 40px;
    }

    .results.show {
      display: block;
    }

    .score {
      font-size: 4em;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 20px;
    }

    .score.perfect {
      color: #4ade80;
    }

    .results h2 {
      font-size: 2em;
      color: #1f2937;
      margin-bottom: 30px;
    }

    .celebration-modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }

    .celebration-modal.show {
      display: flex;
    }

    .celebration-content {
      background: white;
      padding: 60px 40px;
      border-radius: 30px;
      text-align: center;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      animation: bounceIn 0.6s ease;
    }

    @keyframes bounceIn {
      0% { transform: scale(0.3); opacity: 0; }
      50% { opacity: 1; }
      70% { transform: scale(1.05); }
      100% { transform: scale(1); }
    }

    .trophy {
      font-size: 6em;
      margin-bottom: 20px;
      animation: bounce 1s ease infinite;
    }

    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-20px); }
    }

    .stars {
      font-size: 3em;
      margin-bottom: 20px;
      letter-spacing: 10px;
    }

    .celebration-message {
      font-size: 2em;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 30px;
      line-height: 1.4;
    }

    .celebration-button {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 40px;
      font-size: 1.1em;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      font-weight: bold;
    }

    .celebration-button:hover {
      transform: scale(1.05);
    }

    .stats {
      margin-top: 40px;
      padding-top: 40px;
      border-top: 2px solid #e9ecef;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      text-align: center;
    }

    .stat-item h3 {
      color: #6b7280;
      font-size: 0.9em;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .stat-item .value {
      font-size: 2.5em;
      font-weight: bold;
      color: #667eea;
    }

    .footer {
      background: #f8f9fa;
      padding: 20px 40px;
      text-align: center;
      color: #6b7280;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
      <div class="subtitle">📚 Tema: ${tema}</div>
      <div class="progress-bar">
        <div class="progress-bar-fill"></div>
      </div>
    </div>

    <div class="content">
      <div id="questionsContainer"></div>
    </div>

    <div class="controls">
      <button class="btn-primary" onclick="submitTest()">Corregir Test</button>
      <button class="btn-secondary" onclick="resetTest()">Reiniciar</button>
    </div>

    <div class="results" id="results">
      <div class="score" id="scoreValue">0%</div>
      <h2 id="scoreMessage">¡Buen intento!</h2>
      <div class="stats">
        <div class="stat-item">
          <h3>Correctas</h3>
          <div class="value" id="correctCount">0</div>
        </div>
        <div class="stat-item">
          <h3>Incorrectas</h3>
          <div class="value" id="incorrectCount">0</div>
        </div>
        <div class="stat-item">
          <h3>Total</h3>
          <div class="value" id="totalCount">0</div>
        </div>
      </div>
      <button class="btn-primary" style="margin-top: 40px;" onclick="location.reload()">
        Volver al Inicio
      </button>
    </div>
  </div>

  <div class="celebration-modal" id="celebrationModal">
    <div class="celebration-content">
      <div class="trophy">🏆</div>
      <div class="stars">⭐✨⭐</div>
      <div class="celebration-message">¡PERFECTO! ¡Sigue así y tu plaza estará más cerca!</div>
      <button class="celebration-button" onclick="closeCelebration()">Cerrar</button>
    </div>
  </div>

  <div class="footer">
    <p>Test Interactivo con Solucionario - OpositApp 2026</p>
  </div>

  <script>
    const QUESTIONS = ${JSON.stringify(questionsJSON)};
    const SHOW_EXPLANATIONS = ${showExplanations};
    const SHOW_DIFFICULTY = ${showDifficulty};
    let userAnswers = {};
    let soundPlayed = false;

    function initTest() {
      const container = document.getElementById('questionsContainer');
      container.innerHTML = QUESTIONS.map(q => \`
        <div class="question-block" id="question-\${q.id}">
          <div class="question-number">Pregunta \${q.id} de \${QUESTIONS.length}</div>
          <div class="question-text">\${q.text}</div>
          \${SHOW_DIFFICULTY ? \`
            <div class="question-meta">
              <span class="difficulty-badge \${q.difficulty}">\${q.difficulty === 'facil' ? '🟢 Fácil' : q.difficulty === 'dificil' ? '🔴 Difícil' : '🟡 Media'}</span>
            </div>
          \` : ''}
          <div class="options">
            \${q.options.map((opt, i) => \`
              <label class="option" onclick="selectAnswer(\${q.id}, '\${String.fromCharCode(65 + i)}')">
                <input type="radio" name="question-\${q.id}" value="\${String.fromCharCode(65 + i)}" style="margin-right: 10px;">
                <strong>\${String.fromCharCode(65 + i)})</strong> \${opt}
              </label>
            \`).join('')}
          </div>
          <div class="explanation" id="explanation-\${q.id}">
            <h4>Explicación:</h4>
            <p>\${q.explanation}</p>
          </div>
        </div>
      \`).join('');
    }

    function selectAnswer(questionId, answer) {
      userAnswers[questionId] = answer;
      const element = document.getElementById(\`question-\${questionId}\`);
      element.classList.add('answered');
      updateProgress();
    }

    function updateProgress() {
      const answered = Object.keys(userAnswers).length;
      const total = QUESTIONS.length;
      const percentage = (answered / total) * 100;
      document.querySelector('.progress-bar-fill').style.width = percentage + '%';
    }

    function submitTest() {
      let correct = 0;
      let incorrect = 0;
      const startTime = window.TEST_START_TIME || Date.now();

      QUESTIONS.forEach(q => {
        const element = document.getElementById(\`question-\${q.id}\`);
        const userAnswer = userAnswers[q.id];

        if (!userAnswer) {
          element.classList.add('answered-wrong');
          incorrect++;
        } else if (userAnswer === q.correctAnswer) {
          element.classList.add('answered');
          element.classList.remove('answered-wrong');
          correct++;
          if (SHOW_EXPLANATIONS) {
            element.querySelector(\`#explanation-\${q.id}\`).classList.add('show');
          }
        } else {
          element.classList.add('answered-wrong');
          incorrect++;
          if (SHOW_EXPLANATIONS) {
            element.querySelector(\`#explanation-\${q.id}\`).classList.add('show');
          }
        }
      });

      const percentage = (correct / QUESTIONS.length) * 100;
      const timeSpent = Math.round((Date.now() - startTime) / 1000);
      
      // Registrar estadísticas en servidor
      recordAttemptToServer(correct, incorrect, percentage, timeSpent);

      const scoreElement = document.getElementById('scoreValue');
      scoreElement.textContent = Math.round(percentage) + '%';
      
      if (percentage === 100) {
        scoreElement.classList.add('perfect');
        document.getElementById('scoreMessage').textContent = '¡PERFECTO! ¡Excelente resultado!';
        triggerCelebration();
      } else if (percentage >= 70) {
        document.getElementById('scoreMessage').textContent = '¡Muy bien! Sigue estudiando.';
      } else {
        document.getElementById('scoreMessage').textContent = 'Necesitas estudiar más. ¡Ánimo!';
      }

      document.getElementById('correctCount').textContent = correct;
      document.getElementById('incorrectCount').textContent = incorrect;
      document.getElementById('totalCount').textContent = QUESTIONS.length;

      document.getElementById('results').classList.add('show');
      document.querySelector('.controls').style.display = 'none';
      window.scrollTo(0, 0);
    }

    function triggerCelebration() {
      // Confetti
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });

      // Sonido
      playVictorySound();

      // Modal
      setTimeout(() => {
        document.getElementById('celebrationModal').classList.add('show');
      }, 500);
    }

    function playVictorySound() {
      if (soundPlayed) return;
      soundPlayed = true;
      const audio = new Audio('data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==');
      audio.play().catch(() => {});
    }

    function recordAttemptToServer(correct, incorrect, percentage, timeSpent) {
      // Buildanswers object
      const answers = {};
      QUESTIONS.forEach(q => {
        answers[q.id] = userAnswers[q.id] || 'sin_respuesta';
      });

      // Registrar intento en servidor (sin bloquear la UI)
      fetch('/api/admin/unified-questions/record-attempt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionIds: QUESTIONS.map(q => q.id),
          answers: answers,
          timeSpent: timeSpent,
          tema: '${tema}',
          totalCorrect: correct,
          totalQuestions: QUESTIONS.length,
          percentage: Math.round(percentage)
        })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          console.log('✅ Intento registrado:', data.attemptId);
        }
      })
      .catch(err => console.error('⚠️ Error registrando intento:', err));
    }

    function closeCelebration() {
      document.getElementById('celebrationModal').classList.remove('show');
    }

    function resetTest() {
      userAnswers = {};
      document.getElementById('results').classList.remove('show');
      document.querySelector('.controls').style.display = 'flex';
      initTest();
      updateProgress();
      window.scrollTo(0, 0);
    }

    // Inicializar al cargar
    initTest();
    window.TEST_START_TIME = Date.now();
  </script>
</body>
</html>`;
}

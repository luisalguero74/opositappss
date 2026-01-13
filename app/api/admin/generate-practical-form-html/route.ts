import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { title, theme, statement, questions } = await req.json()

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'No se proporcionaron preguntas' }, { status: 400 })
    }

    // Generar el HTML
    const html = generatePracticalCaseHTML(title, theme, statement, questions)

    // Retornar como archivo descargable
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="supuesto_practico_${Date.now()}.html"`
      }
    })

  } catch (error) {
    console.error('Error generating practical case HTML form:', error)
    return NextResponse.json({ error: 'Error al generar el formulario' }, { status: 500 })
  }
}

function generatePracticalCaseHTML(
  title: string,
  theme: string | null,
  statement: string | null,
  questions: any[]
): string {
  const questionsData = questions.map((q, index) => ({
    id: index + 1,
    text: q.text,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation
  }))

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
      background: linear-gradient(135deg, #EA580C 0%, #DC2626 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #EA580C 0%, #DC2626 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }

    .header h1 {
      font-size: 2.1em;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }

    .header .subtitle {
      opacity: 0.95;
      font-size: 1.1em;
      margin-top: 10px;
    }

    .theme-badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      padding: 8px 20px;
      border-radius: 20px;
      margin-top: 15px;
      font-weight: bold;
      backdrop-filter: blur(10px);
    }

    .statement-section {
      background: #FFF7ED;
      border-left: 5px solid #EA580C;
      padding: 30px;
      margin: 0;
      border-radius: 0;
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .statement-title {
      font-size: 1.3em;
      font-weight: bold;
      color: #EA580C;
      margin-bottom: 15px;
    }

    .statement-text {
      color: #4B5563;
      line-height: 1.6;
      font-size: 0.95em;
      white-space: pre-wrap;
    }

    .controls {
      background: #F9FAFB;
      padding: 20px 40px;
      border-bottom: 2px solid #E5E7EB;
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      align-items: center;
      justify-content: space-between;
    }

    .timer {
      font-size: 1.5em;
      font-weight: bold;
      color: #EA580C;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .controls button {
      background: linear-gradient(135deg, #EA580C 0%, #DC2626 100%);
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 1em;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 6px rgba(234, 88, 12, 0.3);
    }

    .controls button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(234, 88, 12, 0.4);
    }

    .controls button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .progress-info {
      display: flex;
      align-items: center;
      gap: 15px;
      font-weight: 600;
      color: #4B5563;
    }

    .progress-bar {
      background: #E5E7EB;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      width: 200px;
    }

    .progress-fill {
      background: linear-gradient(90deg, #EA580C 0%, #DC2626 100%);
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
      background: #F9FAFB;
      border-radius: 15px;
      border-left: 5px solid #EA580C;
      transition: all 0.3s;
    }

    .question:hover {
      box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    }

    .question-header {
      display: flex;
      align-items: flex-start;
      gap: 15px;
      margin-bottom: 20px;
    }

    .question-number {
      background: linear-gradient(135deg, #EA580C 0%, #DC2626 100%);
      color: white;
      width: 45px;
      height: 45px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      flex-shrink: 0;
      font-size: 1.2em;
      box-shadow: 0 4px 6px rgba(234, 88, 12, 0.3);
    }

    .question-text {
      font-size: 1.15em;
      font-weight: 600;
      color: #1F2937;
      line-height: 1.6;
      flex: 1;
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
      border: 2px solid #E5E7EB;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .option:hover {
      border-color: #EA580C;
      transform: translateX(5px);
      box-shadow: 0 2px 8px rgba(234, 88, 12, 0.2);
    }

    .option input[type="radio"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
      accent-color: #EA580C;
    }

    .option-label {
      font-weight: bold;
      color: #EA580C;
      min-width: 30px;
      font-size: 1.1em;
    }

    .option-text {
      flex: 1;
      color: #4B5563;
      line-height: 1.5;
    }

    .option.correct {
      background: #D1FAE5;
      border-color: #10B981;
      animation: correctPulse 0.5s ease;
    }

    .option.incorrect {
      background: #FEE2E2;
      border-color: #EF4444;
      animation: shake 0.5s ease;
    }

    @keyframes correctPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.02); }
    }

    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }

    .explanation {
      margin-top: 20px;
      padding: 20px;
      background: #EFF6FF;
      border-left: 4px solid #3B82F6;
      border-radius: 10px;
      display: none;
      animation: slideDown 0.3s ease;
    }

    .explanation.show {
      display: block;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .explanation-title {
      font-weight: bold;
      color: #1D4ED8;
      margin-bottom: 10px;
      font-size: 1.1em;
    }

    .explanation-text {
      color: #4B5563;
      line-height: 1.7;
      white-space: pre-wrap;
    }

    .results {
      display: none;
      background: linear-gradient(135deg, #EA580C 0%, #DC2626 100%);
      color: white;
      padding: 40px;
      border-radius: 15px;
      text-align: center;
      margin-top: 30px;
      box-shadow: 0 10px 30px rgba(234, 88, 12, 0.3);
    }

    .results.show {
      display: block;
      animation: fadeIn 0.5s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }

    .results h2 {
      font-size: 2.5em;
      margin-bottom: 20px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }

    .results-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 30px;
    }

    .result-card {
      background: rgba(255, 255, 255, 0.2);
      padding: 25px;
      border-radius: 15px;
      backdrop-filter: blur(10px);
      border: 2px solid rgba(255,255,255,0.3);
    }

    .result-card .value {
      font-size: 2.5em;
      font-weight: bold;
      margin: 10px 0;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }

    .result-card .label {
      opacity: 0.95;
      font-size: 1.1em;
    }

    /* Celebration Modal for 100% */
    .celebration-modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(10px);
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
      background: linear-gradient(135deg, #FFFBEB 0%, #FED7AA 50%, #FB923C 100%);
      border-radius: 30px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      padding: 60px 40px;
      max-width: 600px;
      width: 100%;
      text-align: center;
      position: relative;
      overflow: hidden;
      animation: celebrationBounce 0.6s ease-out;
    }

    @keyframes celebrationBounce {
      0% {
        transform: scale(0.3) rotate(-10deg);
        opacity: 0;
      }
      50% {
        transform: scale(1.05) rotate(5deg);
      }
      100% {
        transform: scale(1) rotate(0);
        opacity: 1;
      }
    }

    .celebration-stars {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      pointer-events: none;
    }

    .star {
      position: absolute;
      font-size: 2em;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); opacity: 1; }
      50% { transform: translateY(-20px) rotate(180deg); opacity: 0.8; }
    }

    .celebration-trophy {
      font-size: 6em;
      margin-bottom: 20px;
      animation: trophySpin 1s ease-out;
    }

    @keyframes trophySpin {
      0% { transform: rotateY(0deg) scale(0); }
      50% { transform: rotateY(180deg) scale(1.2); }
      100% { transform: rotateY(360deg) scale(1); }
    }

    .celebration-title {
      font-size: 3em;
      font-weight: bold;
      color: #EA580C;
      margin-bottom: 15px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
    }

    .celebration-message {
      font-size: 1.5em;
      color: #92400E;
      margin-bottom: 30px;
      line-height: 1.5;
    }

    .celebration-close {
      background: linear-gradient(135deg, #EA580C 0%, #DC2626 100%);
      color: white;
      border: none;
      padding: 15px 40px;
      border-radius: 50px;
      font-size: 1.2em;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 5px 15px rgba(234, 88, 12, 0.4);
    }

    .celebration-close:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 20px rgba(234, 88, 12, 0.5);
    }

    @media (max-width: 768px) {
      .header h1 {
        font-size: 1.5em;
      }

      .controls {
        flex-direction: column;
      }

      .question {
        padding: 20px;
      }

      .celebration-title {
        font-size: 2em;
      }

      .celebration-trophy {
        font-size: 4em;
      }
    }

    .retry-button {
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      margin-top: 20px;
    }

    .retry-button:hover {
      box-shadow: 0 6px 12px rgba(16, 185, 129, 0.4);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 ${title}</h1>
      ${theme ? `<div class="theme-badge">🎯 ${theme}</div>` : ''}
      <div class="subtitle">Supuesto Práctico Interactivo</div>
    </div>

    ${statement ? `
    <div class="statement-section">
      <div class="statement-title">📋 Enunciado del Supuesto Práctico</div>
      <div class="statement-text">${statement}</div>
    </div>
    ` : ''}

    <div class="controls">
      <div class="timer" id="timer">⏱️ <span id="time">00:00</span></div>
      <div class="progress-info">
        <span id="progress">0/${questionsData.length}</span>
        <div class="progress-bar">
          <div class="progress-fill" id="progressBar"></div>
        </div>
      </div>
      <button id="submitBtn" onclick="submitAnswers()">✅ Corregir Supuesto</button>
    </div>

    <div class="content">
      ${questionsData.map((q, index) => `
        <div class="question" id="question-${q.id}">
          <div class="question-header">
            <div class="question-number">${q.id}</div>
            <div class="question-text">${q.text}</div>
          </div>
          <div class="options">
            ${['A', 'B', 'C', 'D'].map((letter, optIndex) => `
              <label class="option" data-question="${q.id}" data-option="${letter}">
                <input 
                  type="radio" 
                  name="question-${q.id}" 
                  value="${letter}"
                  onchange="updateProgress()"
                >
                <span class="option-label">${letter}</span>
                <span class="option-text">${q.options[optIndex] || ''}</span>
              </label>
            `).join('')}
          </div>
          <div class="explanation" id="explanation-${q.id}">
            <div class="explanation-title">💡 Motivación Jurídica</div>
            <div class="explanation-text">${q.explanation}</div>
          </div>
        </div>
      `).join('')}

      <div class="results" id="results">
        <h2 id="resultsTitle">Resultados</h2>
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
            <div class="value" id="scorePercent">0%</div>
          </div>
          <div class="result-card">
            <div class="label">Tiempo</div>
            <div class="value" id="finalTime">00:00</div>
          </div>
        </div>
        <button class="controls button retry-button" onclick="retryQuiz()">🔄 Reintentar</button>
      </div>
    </div>
  </div>

  <!-- Celebration Modal -->
  <div class="celebration-modal" id="celebrationModal">
    <div class="celebration-content">
      <div class="celebration-stars">
        <div class="star" style="top: 10%; left: 10%;">⭐</div>
        <div class="star" style="top: 20%; right: 15%; animation-delay: 0.5s;">🌟</div>
        <div class="star" style="bottom: 15%; left: 20%; animation-delay: 1s;">✨</div>
        <div class="star" style="bottom: 25%; right: 10%; animation-delay: 1.5s;">⭐</div>
        <div class="star" style="top: 50%; left: 5%; animation-delay: 0.7s;">🌟</div>
        <div class="star" style="top: 60%; right: 5%; animation-delay: 1.2s;">✨</div>
      </div>
      <div class="celebration-trophy">🏆</div>
      <div class="celebration-title">¡PERFECTO!</div>
      <div class="celebration-message">
        Has demostrado un dominio excepcional<br>
        <strong>100% de respuestas correctas</strong>
      </div>
      <button class="celebration-close" onclick="closeCelebration()">Continuar</button>
    </div>
  </div>

  <script>
    const questionsData = ${JSON.stringify(questionsData)};
    let startTime = Date.now();
    let timerInterval;
    let submitted = false;

    // Timer
    function updateTimer() {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      document.getElementById('time').textContent = 
        \`\${String(minutes).padStart(2, '0')}:\${String(seconds).padStart(2, '0')}\`;
    }

    timerInterval = setInterval(updateTimer, 1000);

    // Progress tracking
    function updateProgress() {
      const totalQuestions = questionsData.length;
      const answeredQuestions = document.querySelectorAll('input[type="radio"]:checked').length;
      document.getElementById('progress').textContent = \`\${answeredQuestions}/\${totalQuestions}\`;
      const progressPercent = (answeredQuestions / totalQuestions) * 100;
      document.getElementById('progressBar').style.width = \`\${progressPercent}%\`;
    }

    // Submit answers
    function submitAnswers() {
      if (submitted) return;

      submitted = true;
      clearInterval(timerInterval);

      let correct = 0;
      let incorrect = 0;
      let unanswered = 0;

      questionsData.forEach(q => {
        const selectedOption = document.querySelector(\`input[name="question-\${q.id}"]:checked\`);
        const selectedValue = selectedOption ? selectedOption.value : null;
        const optionElements = document.querySelectorAll(\`label[data-question="\${q.id}"]\`);
        
        // Siempre mostrar la respuesta correcta
        optionElements.forEach(opt => {
          const optLetter = opt.getAttribute('data-option');
          if (optLetter === q.correctAnswer) {
            opt.classList.add('correct');
          }
        });

        if (selectedValue) {
          // Marcar incorrecta si aplica
          if (selectedValue !== q.correctAnswer) {
            optionElements.forEach(opt => {
              const optLetter = opt.getAttribute('data-option');
              if (selectedValue === optLetter) {
                opt.classList.add('incorrect');
              }
            });
            incorrect++;
          } else {
            correct++;
          }
        } else {
          unanswered++;
        }

        // Show explanation
        document.getElementById(\`explanation-\${q.id}\`).classList.add('show');
      });

      // Disable all inputs
      document.querySelectorAll('input[type="radio"]').forEach(input => {
        input.disabled = true;
      });

      // Show results
      const scorePercent = Math.round((correct / questionsData.length) * 100);
      document.getElementById('correctCount').textContent = correct;
      document.getElementById('incorrectCount').textContent = incorrect;
      document.getElementById('unansweredCount').textContent = unanswered;
      document.getElementById('scorePercent').textContent = \`\${scorePercent}%\`;
      document.getElementById('finalTime').textContent = document.getElementById('time').textContent;
      document.getElementById('results').classList.add('show');
      document.getElementById('submitBtn').disabled = true;

      // Scroll to results
      document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Perfect score celebration
      if (scorePercent === 100) {
        setTimeout(() => {
          playCelebrationSound();
          document.getElementById('celebrationModal').classList.add('show');
        }, 800);
      }
    }

    // Celebration sound
    function playCelebrationSound() {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Play ascending notes
      const notes = [523.25, 587.33, 659.25, 783.99, 880.00];
      notes.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + index * 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + index * 0.1 + 0.5);
        
        oscillator.start(audioContext.currentTime + index * 0.1);
        oscillator.stop(audioContext.currentTime + index * 0.1 + 0.5);
      });
    }

    function closeCelebration() {
      document.getElementById('celebrationModal').classList.remove('show');
    }

    function retryQuiz() {
      location.reload();
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !submitted) {
        submitAnswers();
      }
    });
  </script>
</body>
</html>`
}

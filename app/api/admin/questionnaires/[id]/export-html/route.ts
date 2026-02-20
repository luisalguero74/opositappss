import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/src/lib/auth'
import prisma from '@/src/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params

    // Obtener el cuestionario con sus preguntas
    const questionnaire = await prisma.questionnaire.findUnique({
      where: { id },
      include: {
        questionnaireQuestions: {
          include: {
            question: true
          },
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    if (!questionnaire) {
      return NextResponse.json({ error: 'Cuestionario no encontrado' }, { status: 404 })
    }

    if (questionnaire.questionnaireQuestions.length === 0) {
      return NextResponse.json({ error: 'El cuestionario no tiene preguntas' }, { status: 400 })
    }

    // Generar el HTML interactivo
    const html = generateInteractiveQuestionnaireHTML(questionnaire)

    // Retornar como archivo descargable
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `attachment; filename="${questionnaire.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${Date.now()}.html"`
      }
    })

  } catch (error) {
    console.error('Error generating questionnaire HTML:', error)
    return NextResponse.json({ error: 'Error al generar el HTML' }, { status: 500 })
  }
}

function generateInteractiveQuestionnaireHTML(questionnaire: any): string {
  const questions = questionnaire.questionnaireQuestions.map((qq: any) => {
    const q = qq.question
    return {
      id: q.id,
      text: q.text,
      options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || 'Sin explicación disponible',
      temaCodigo: q.temaCodigo || 'General'
    }
  })

  const questionsData = JSON.stringify(questions)

  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${questionnaire.title} - OpositAPPSS</title>
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
        
        .timer {
            background: rgba(255,255,255,0.2);
            padding: 15px 30px;
            border-radius: 30px;
            font-size: 1.5rem;
            font-weight: bold;
            display: inline-block;
            margin-top: 15px;
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
        
        .explanation {
            margin-top: 20px;
            padding: 20px;
            background: #fffbeb;
            border-left: 4px solid #f59e0b;
            border-radius: 8px;
            display: none;
        }
        
        .explanation.show {
            display: block;
        }
        
        .explanation-title {
            font-weight: bold;
            color: #92400e;
            margin-bottom: 10px;
            font-size: 1.1rem;
        }
        
        .explanation-text {
            color: #78350f;
            line-height: 1.6;
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
            display: none;
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
            background-clip: text;
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
            padding: 8px 12px;
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
        
        .review-explanation {
            margin-top: 10px;
            padding: 12px;
            background: #fffbeb;
            border-left: 3px solid #f59e0b;
            border-radius: 6px;
            font-size: 0.95rem;
            color: #78350f;
        }
        
        @media (max-width: 768px) {
            .header h1 {
                font-size: 1.8rem;
            }
            
            .question-text {
                font-size: 1.1rem;
            }
            
            .stats {
                grid-template-columns: 1fr;
            }
            
            .buttons {
                flex-direction: column;
            }
        }
    </style>
</head>
<body>
    <div id="celebration" class="celebration"></div>
    
    <div class="container">
        <div class="header">
            <h1>📚 ${questionnaire.title}</h1>
            <p>${questions.length} preguntas · ${questionnaire.type === 'theory' ? 'Teoría' : 'Práctico'}</p>
            <div class="timer" id="timer">⏱️ 45:00</div>
        </div>
        
        <div class="progress-bar">
            <div class="progress-fill" id="progressBar"></div>
        </div>
        
        <div id="questionSection" class="question-container">
            <!-- Questions will be rendered here -->
        </div>
        
        <div id="resultsSection" class="results">
            <!-- Results will be shown here -->
        </div>
    </div>

    <script>
        const questions = ${questionsData};
        let currentQuestion = 0;
        let userAnswers = new Array(questions.length).fill(null);
        let timeLeft = 45 * 60; // 45 minutos
        let timerInterval;

        function startTimer() {
            timerInterval = setInterval(() => {
                timeLeft--;
                const minutes = Math.floor(timeLeft / 60);
                const seconds = timeLeft % 60;
                document.getElementById('timer').textContent = 
                    \`⏱️ \${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`;
                
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    submitTest();
                }
            }, 1000);
        }

        function selectOption(questionIndex, option) {
            userAnswers[questionIndex] = option;
            document.querySelectorAll('.option').forEach(opt => {
                opt.classList.remove('selected');
                opt.querySelector('input[type="radio"]').checked = false;
            });
            event.target.closest('.option').classList.add('selected');
            event.target.closest('.option').querySelector('input[type="radio"]').checked = true;
        }

        function renderQuestion() {
            const q = questions[currentQuestion];
            const progress = ((currentQuestion + 1) / questions.length) * 100;
            document.getElementById('progressBar').style.width = progress + '%';

            const questionHTML = \`
                <div class="question-header">
                    <div class="question-number">Pregunta \${currentQuestion + 1} de \${questions.length}</div>
                    <div class="question-tema">\${q.temaCodigo || 'General'}</div>
                </div>
                
                <div class="question-text">\${q.text}</div>
                
                <div class="options">
                    \${q.options.map((option, index) => {
                        const letter = String.fromCharCode(65 + index);
                        const isSelected = userAnswers[currentQuestion] === letter;
                        return \`
                            <label class="option \${isSelected ? 'selected' : ''}" onclick="selectOption(\${currentQuestion}, '\${letter}')">
                                <input type="radio" name="q\${currentQuestion}" value="\${letter}" \${isSelected ? 'checked' : ''}>
                                <span><strong>\${letter})</strong> \${option}</span>
                            </label>
                        \`;
                    }).join('')}
                </div>
                
                <div class="buttons">
                    <button class="btn-secondary" onclick="previousQuestion()" \${currentQuestion === 0 ? 'disabled' : ''}>
                        ← Anterior
                    </button>
                    
                    \${currentQuestion < questions.length - 1 ? 
                        \`<button class="btn-primary" onclick="nextQuestion()">Siguiente →</button>\` :
                        \`<button class="btn-primary" onclick="submitTest()">✅ Finalizar y Corregir</button>\`
                    }
                </div>
            \`;

            document.getElementById('questionSection').innerHTML = questionHTML;
        }

        function nextQuestion() {
            if (currentQuestion < questions.length - 1) {
                currentQuestion++;
                renderQuestion();
            }
        }

        function previousQuestion() {
            if (currentQuestion > 0) {
                currentQuestion--;
                renderQuestion();
            }
        }

        function submitTest() {
            clearInterval(timerInterval);
            
            let correct = 0;
            questions.forEach((q, i) => {
                if (userAnswers[i] === q.correctAnswer) {
                    correct++;
                }
            });

            const percentage = Math.round((correct / questions.length) * 100);
            const resultsSection = document.getElementById('resultsSection');
            
            const getMessage = (pct) => {
                if (pct === 100) return '🎉 ¡PERFECTO! ¡100% de aciertos!';
                if (pct >= 80) return '🌟 ¡Excelente trabajo!';
                if (pct >= 60) return '👍 ¡Buen resultado!';
                if (pct >= 40) return '📚 Sigue estudiando';
                return '💪 ¡No te rindas!';
            };

            resultsSection.innerHTML = \`
                <h2>\${getMessage(percentage)}</h2>
                <div class="score">\${percentage}%</div>
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
                    <h3 style="margin-bottom: 20px; font-size: 1.5rem;">📋 Revisión Detallada</h3>
                    \${questions.map((q, i) => {
                        const isCorrect = userAnswers[i] === q.correctAnswer;
                        const userOption = userAnswers[i] ? 
                            \`<div class="review-answer user">❌ Tu respuesta: \${userAnswers[i]}) \${q.options[userAnswers[i].charCodeAt(0) - 65]}</div>\` : 
                            '<div class="review-answer user">⚠️ Sin respuesta</div>';
                        
                        return \`
                            <div class="review-item \${isCorrect ? 'correct' : 'incorrect'}">
                                <div class="review-question">
                                    \${i + 1}. \${q.text}
                                    <span style="float: right;">\${isCorrect ? '✅' : '❌'}</span>
                                </div>
                                <div class="review-answer correct">✅ Correcta: \${q.correctAnswer}) \${q.options[q.correctAnswer.charCodeAt(0) - 65]}</div>
                                \${!isCorrect ? userOption : ''}
                                <div class="review-explanation">
                                    💡 <strong>Explicación:</strong> \${q.explanation}
                                </div>
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

            // ¡CELEBRACIÓN AL 100%!
            if (percentage === 100) {
                createConfetti();
            }
        }

        function createConfetti() {
            const celebration = document.getElementById('celebration');
            celebration.classList.add('active');
            
            for (let i = 0; i < 150; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = Math.random() * 100 + '%';
                confetti.style.background = ['#667eea', '#764ba2', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'][Math.floor(Math.random() * 7)];
                confetti.style.animationDelay = Math.random() * 2 + 's';
                confetti.style.animationDuration = (2 + Math.random() * 2) + 's';
                celebration.appendChild(confetti);
            }
            
            setTimeout(() => {
                celebration.classList.remove('active');
                celebration.innerHTML = '';
            }, 6000);
        }

        // Inicializar
        renderQuestion();
        startTimer();
    </script>
</body>
</html>`;
}

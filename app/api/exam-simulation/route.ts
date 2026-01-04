import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Crear nuevo simulacro
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Get filter parameters
    const body = await req.json().catch(() => ({}))
    const { generalTopics = [], specificTopics = [], difficulty = 'todas' } = body

    // Build topic filter
    const topicCodes = [...generalTopics, ...specificTopics].map(t => t.toUpperCase())
    const hasTopicFilter = topicCodes.length > 0

    // Build difficulty filter
    const difficultyFilter = difficulty && difficulty !== 'todas' ? { difficulty } : {}

    // Obtener 70 preguntas aleatorias de test de temario
    // Incluir tanto preguntas manuales como preguntas IA aprobadas
    const manualQuestions = await prisma.question.findMany({
      where: {
        ...(hasTopicFilter ? { temaCodigo: { in: topicCodes } } : {}),
        ...difficultyFilter
      },
      include: {
        questionnaire: true
      }
    })

    const aiQuestionsApproved = await prisma.generatedQuestion.findMany({
      where: {
        approved: true,
        ...(hasTopicFilter ? { temaCodigo: { in: topicCodes } } : {}),
        ...difficultyFilter
      },
      include: {
        document: true
      }
    })

    // Filtrar solo preguntas de test de temario (excluyendo prácticos)
    const theoryQuestions = manualQuestions.filter(q => 
      q.questionnaire.title.toLowerCase().includes('tema') ||
      !q.questionnaire.title.toLowerCase().includes('práctico')
    )

    // Convertir preguntas IA al formato estándar
    const aiTheoryQuestions = aiQuestionsApproved.map(q => ({
      id: q.id,
      text: q.text,
      options: JSON.parse(q.options),
      correctAnswer: q.correctAnswer,
      questionnaireId: null, // No tiene cuestionario asociado
      questionnaireName: q.document.title,
      isAI: true // Marcar como pregunta IA
    }))

    // Combinar preguntas manuales y IA
    const allTheoryQuestions = [
      ...theoryQuestions.map(q => ({
        id: q.id,
        text: q.text,
        options: JSON.parse(q.options),
        correctAnswer: q.correctAnswer,
        questionnaireId: q.questionnaireId,
        questionnaireName: q.questionnaire.title,
        isAI: false
      })),
      ...aiTheoryQuestions
    ]

    if (allTheoryQuestions.length < 70) {
      return NextResponse.json({ 
        error: `No hay suficientes preguntas de teoría (${allTheoryQuestions.length}/70 requeridas)` 
      }, { status: 400 })
    }

    // Seleccionar 70 aleatorias con distribución balanceada
    const manualCount = Math.min(42, theoryQuestions.length) // 60% manuales
    const aiCount = 70 - manualCount // El resto de IA

    const shuffledManual = [...theoryQuestions].sort(() => Math.random() - 0.5)
    const shuffledAI = [...aiTheoryQuestions].sort(() => Math.random() - 0.5)

    const selectedManual = shuffledManual.slice(0, manualCount).map(q => ({
      id: q.id,
      text: q.text,
      options: JSON.parse(q.options),
      correctAnswer: q.correctAnswer,
      questionnaireId: q.questionnaireId,
      questionnaireName: q.questionnaire.title,
      isAI: false
    }))

    const selectedAI = shuffledAI.slice(0, aiCount)

    const selected70 = [...selectedManual, ...selectedAI].sort(() => Math.random() - 0.5)

    // Crear supuesto práctico de ejemplo
    const practicalCase = {
      enunciado: `SUPUESTO PRÁCTICO: PRESTACIONES DE LA SEGURIDAD SOCIAL
      
Don Juan Pérez García, nacido el 15 de marzo de 1960, ha trabajado en el Régimen General de la Seguridad Social durante 38 años continuados. El 1 de octubre de 2024 sufrió un accidente laboral que le ha causado una incapacidad permanente absoluta.

Su base reguladora es de 2.800 euros mensuales. Tiene reconocida una lesión permanente no invalidante por un accidente anterior que le supuso una indemnización.

Está casado con Doña María López Sánchez, de 58 años, que nunca ha trabajado fuera del hogar. Tienen dos hijos: Pedro, de 25 años, estudiante universitario, y Ana, de 22 años, que trabaja a tiempo parcial.

Juan percibía un complemento de gran invalidez desde hace 2 años por una enfermedad profesional anterior.

DATOS ADICIONALES:
- Última cotización: 3.200 euros
- Años cotizados al Régimen General: 38 años
- Base de cotización durante los últimos 24 meses: 2.750 euros de media
- Tiene reconocido un grado de discapacidad del 65%`,
      
      questions: [
        {
          text: "¿Qué prestación le corresponde a Juan por el accidente laboral?",
          options: [
            "Incapacidad temporal",
            "Incapacidad permanente absoluta",
            "Jubilación anticipada",
            "Lesión permanente no invalidante"
          ],
          correctAnswer: "Incapacidad permanente absoluta"
        },
        {
          text: "¿Cuál es el porcentaje de la base reguladora que percibirá Juan?",
          options: [
            "55%",
            "75%",
            "100%",
            "120%"
          ],
          correctAnswer: "100%"
        },
        {
          text: "¿María tiene derecho a pensión de viudedad en este momento?",
          options: [
            "Sí, porque está casada con Juan",
            "No, porque Juan no ha fallecido",
            "Sí, si demuestra dependencia económica",
            "No, porque no ha cotizado"
          ],
          correctAnswer: "No, porque Juan no ha fallecido"
        },
        {
          text: "¿El hijo Pedro puede ser beneficiario de alguna prestación?",
          options: [
            "Sí, pensión de orfandad hasta los 26 años si estudia",
            "No, porque es mayor de 21 años",
            "Sí, complemento por hijo a cargo",
            "Solo si tiene discapacidad"
          ],
          correctAnswer: "Sí, pensión de orfandad hasta los 26 años si estudia"
        },
        {
          text: "¿Qué organismo gestiona la incapacidad permanente absoluta?",
          options: [
            "Mutua colaboradora",
            "Instituto Nacional de la Seguridad Social (INSS)",
            "Servicio Público de Empleo Estatal (SEPE)",
            "Instituto de Mayores y Servicios Sociales (IMSERSO)"
          ],
          correctAnswer: "Instituto Nacional de la Seguridad Social (INSS)"
        },
        {
          text: "¿Juan puede compatibilizar la prestación con un trabajo?",
          options: [
            "Sí, sin restricciones",
            "No, en ningún caso",
            "Sí, si el trabajo es compatible con su incapacidad",
            "Solo trabajos por cuenta ajena"
          ],
          correctAnswer: "No, en ningún caso"
        },
        {
          text: "¿Cuánto tiempo tiene Juan para solicitar la prestación desde el accidente?",
          options: [
            "3 meses",
            "6 meses",
            "1 año",
            "No hay plazo"
          ],
          correctAnswer: "No hay plazo"
        },
        {
          text: "¿La base reguladora se calcula sobre qué período?",
          options: [
            "Últimos 12 meses",
            "Últimos 24 meses",
            "Últimos 96 meses divididos por 112",
            "Base de cotización del momento del accidente"
          ],
          correctAnswer: "Últimos 24 meses"
        },
        {
          text: "¿Juan tiene derecho a complemento por gran invalidez?",
          options: [
            "Sí, automáticamente",
            "No, la absoluta no incluye gran invalidez",
            "Solo si necesita ayuda de tercera persona",
            "Depende de la base reguladora"
          ],
          correctAnswer: "Solo si necesita ayuda de tercera persona"
        },
        {
          text: "¿La pensión de incapacidad permanente absoluta está sujeta a IRPF?",
          options: [
            "No, está exenta",
            "Sí, tributa como rendimiento del trabajo",
            "Solo si supera el SMI",
            "Depende del grado de discapacidad"
          ],
          correctAnswer: "Sí, tributa como rendimiento del trabajo"
        },
        {
          text: "¿Qué ocurre si Juan se recupera de su incapacidad?",
          options: [
            "Nada, la pensión es vitalicia",
            "Puede ser revisada y retirada",
            "Se convierte en parcial",
            "Solo se revisa cada 10 años"
          ],
          correctAnswer: "Puede ser revisada y retirada"
        },
        {
          text: "¿Ana puede percibir la pensión de orfandad?",
          options: [
            "Sí, hasta los 25 años si estudia",
            "No, porque trabaja",
            "Solo si el padre fallece",
            "Sí, pero reducida al 50%"
          ],
          correctAnswer: "Solo si el padre fallece"
        },
        {
          text: "¿Cuál es el período mínimo de cotización exigido para la incapacidad permanente absoluta derivada de accidente laboral?",
          options: [
            "15 años",
            "No se exige período mínimo",
            "1800 días",
            "5 años"
          ],
          correctAnswer: "No se exige período mínimo"
        },
        {
          text: "¿La indemnización por lesión permanente no invalidante anterior afecta a la nueva prestación?",
          options: [
            "Sí, se descuenta",
            "No, son prestaciones independientes",
            "Solo si fue del mismo accidente",
            "Reduce la base reguladora"
          ],
          correctAnswer: "No, son prestaciones independientes"
        },
        {
          text: "¿Juan tiene derecho a asistencia sanitaria con esta prestación?",
          options: [
            "No, debe solicitar tarjeta sanitaria aparte",
            "Sí, mantiene la asistencia sanitaria",
            "Solo durante el primer año",
            "Depende de la Comunidad Autónoma"
          ],
          correctAnswer: "Sí, mantiene la asistencia sanitaria"
        }
      ]
    }

    // Mezclar opciones de cada pregunta del práctico
    practicalCase.questions = practicalCase.questions.map(q => ({
      ...q,
      options: [...q.options].sort(() => Math.random() - 0.5)
    }))

    // Crear simulacro en la base de datos
    const simulation = await prisma.examSimulation.create({
      data: {
        userId: session.user.id,
        theoryQuestions: JSON.stringify(selected70),
        practicalCase: JSON.stringify(practicalCase),
        userAnswers: JSON.stringify({ theory: [], practical: [] }),
        score: 0,
        theoryScore: 0,
        practicalScore: 0,
        timeSpent: 0
      }
    })

    console.log(`[Exam Simulation] Creado simulacro para usuario ${session.user.email}`)

    return NextResponse.json({
      id: simulation.id,
      theoryQuestions: selected70,
      practicalCase
    })
  } catch (error) {
    console.error('[Exam Simulation] Error:', error)
    return NextResponse.json({ error: 'Error al crear simulacro' }, { status: 500 })
  }
}

// Obtener simulacros del usuario
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const simulations = await prisma.examSimulation.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(simulations)
  } catch (error) {
    console.error('[Exam Simulation] Error:', error)
    return NextResponse.json({ error: 'Error al obtener simulacros' }, { status: 500 })
  }
}

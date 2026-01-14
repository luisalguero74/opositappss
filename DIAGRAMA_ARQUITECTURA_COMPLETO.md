# DIAGRAMA DETALLADO DE ARQUITECTURA - OPOSITAPP

## 1. ARQUITECTURA GENERAL DEL SISTEMA

```
╔════════════════════════════════════════════════════════════════════════════════╗
║                          INTERNET / USUARIOS                                  ║
║                                                                                ║
║  [Navegador Web]  [App Mobile PWA]  [Tablet]  [Desktop]                      ║
╚════════════════════════╤═════════════════════════════════════════════════════╝
                         │ HTTPS/TLS
                         │
╔════════════════════════▼═════════════════════════════════════════════════════╗
║                     CLOUDFLARE / CDN (Vercel)                               ║
║  - Cache estático (CSS, JS, imágenes)                                       ║
║  - Compresión gzip/brotli                                                   ║
║  - DDoS protection                                                           ║
║  - Certificados SSL/TLS automáticos                                         ║
╚════════════════════════╤═════════════════════════════════════════════════════╝
                         │ HTTPS REST/gRPC
                         │
╔════════════════════════▼═════════════════════════════════════════════════════╗
║                    VERCEL SERVERLESS PLATFORM                               ║
║                                                                                ║
║  ┌────────────────────────────────────────────────────────────────────────┐ ║
║  │                     NEXT.JS 16.1.1 RUNTIME                             │ ║
║  │                      (Turbopack Compiler)                              │ ║
║  │                                                                         │ ║
║  │  ┌─────────────────────────────────────────────────────────────────┐  ║
║  │  │ PAGE ROUTES (React Server Components + Client Components)      │  ║
║  │  │                                                                  │  ║
║  │  │  /admin/*                     - Panel administrativo (14+ páginas) │  ║
║  │  │  /admin/exam-official        - Gestión exámenes oficiales        │  ║
║  │  │  /admin/exam-official/create - Formulario 70+15 preguntas        │  ║
║  │  │  /dashboard/*                - Dashboard usuario                  │  ║
║  │  │  /quiz/[id]                  - Cuestionarios dinámicos            │  ║
║  │  │  /exam-mode                  - Examen oficial (70+15 preguntas)   │  ║
║  │  │  /exam-mode/ranking          - Ranking global con podium          │  ║
║  │  │  /statistics                 - Estadísticas usuario               │  ║
║  │  │  /room/[roomId]              - Aulas virtuales LiveKit            │  ║
║  │  │  /forum                      - Foro de discusión                  │  ║
║  │  │  /                           - Landing page                       │  ║
║  │  │  /login, /register           - Auth pages                         │  ║
║  │  └─────────────────────────────────────────────────────────────────┘  ║
║  │                                                                         │  ║
║  │  ┌─────────────────────────────────────────────────────────────────┐  ║
║  │  │ API ROUTES (Node.js Serverless Functions)                       │  ║
║  │  │                                                                  │  ║
║  │  │  /api/auth/*                   - NextAuth endpoints              │  ║
║  │  │  /api/statistics               - Cálculo estadísticas            │  ║
║  │  │  /api/submit-answers           - Guardar respuestas             │  ║
║  │  │  /api/admin/analytics          - Analytics avanzado              │  ║
║  │  │  /api/admin/audit-logs         - Registro auditoría              │  ║
║  │  │  /api/admin/backups            - Gestión backups               │  ║
║  │  │  /api/admin/quality-control    - Validación preguntas           │  ║
║  │  │  /api/admin/exam-official      - CRUD exámenes oficiales        │  ║
║  │  │  /api/exam-official            - GET exam activo (usuario)      │  ║
║  │  │  /api/exam-official/submit     - POST submit (scoring -0.25)    │  ║
║  │  │  /api/exam-official/ranking    - GET ranking global             │  ║
║  │  │  /api/ai/generate-questions    - Generación IA                  │  ║
║  │  │  /api/ai/batch-process         - Procesamiento masivo           │  ║
║  │  │  /api/livekit/token            - Tokens videollamada            │  ║
║  │  │  /api/health                   - Health check                    │  ║
║  │  │                                                                  │  ║
║  │  │  ... 35+ más endpoints                                           │  ║
║  │  └─────────────────────────────────────────────────────────────────┘  ║
║  │                                                                         │  ║
║  └─────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                ║
║  ┌────────────────────────────────────────────────────────────────────────┐ ║
║  │                  MIDDLEWARE & REQUEST HANDLING                          │ ║
║  │                                                                         │  ║
║  │  - Route protection                                                   │  ║
║  │  - Session validation                                                 │  ║
║  │  - CORS configuration                                                 │  ║
║  │  - Rate limiting                                                      │  ║
║  │  - Error handling                                                     │  ║
║  └────────────────────────────────────────────────────────────────────────┘ ║
║                                                                                ║
╚════════════════════════╤═════════════════════════════════════════════════════╝
                         │
         ┌───────────────┼───────────────┬──────────────────┐
         │               │               │                  │
         │               │               │                  │
    ┌────▼────┐   ┌─────▼─────┐   ┌────▼─────┐   ┌───────▼────────┐
    │ DATABASE│   │  EXTERNAL  │   │   FILES  │   │  REAL-TIME     │
    │PostgreSQL  │   SERVICES   │   │ STORAGE  │   │  SERVICES      │
    └────┬────┘   └─────┬─────┘   └────┬─────┘   └───────┬────────┘
         │               │              │                │
    ┌────▼─────────┐    │              │            ┌────▼────────┐
    │ SUPABASE     │    │              │            │  LIVEKIT     │
    │ PostgreSQL   │    │              │            │ Videoconf.   │
    │             │    │              │            │              │
    │ 20+ tablas  │    │              │            │  - Rooms      │
    │ Normalizadas│    │              │            │  - Streaming  │
    │             │    │              │            │  - Recording  │
    │ Índices opt.│    │              │            │              │
    │ Full-text   │    │              │            │  wss://      │
    │ search      │    │              │            │              │
    └─────────────┘    │              │            └──────────────┘
                       │              │
                   ┌───┴──┬────┬─────────┴────────┐
                   │      │    │                  │
            ┌──────▼┐  ┌──▼──┐ │  ┌──────────────▼───┐
            │ GROQ  │  │OPENAI │  │  S3/R2 Backups   │
            │ API   │  │ API   │  │  (Cloudflare)    │
            │ (IA)  │  │(IA)   │  │                  │
            └───────┘  └────┬──┘  │  - Encrypted     │
                           │      │  - Versioned     │
                      ┌────┴──┐  └──────────────────┘
                      │       │
                ┌─────▼┐  ┌───▼──────┐
                │STRIPE│  │RESEND    │
                │ API  │  │ EMAIL    │
                │(Pay) │  │(Transac.)│
                └──────┘  └──────────┘
```

---

## 2. FLUJO DE DATOS DE ESTADÍSTICAS

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      USUARIO RESPONDE PREGUNTA                               │
│                    (Quiz o Simulacro en Dashboard)                           │
└──────────────────┬───────────────────────────────────────────────────────────┘
                   │
                   │ POST /api/submit-answers
                   │ Body: { questionId, answer, questionnaireId, attemptId }
                   │
      ┌────────────▼────────────────────────────────────────┐
      │                                                      │
      │  1. VALIDAR RESPUESTA                              │
      │     ├─ Usuario autenticado                         │
      │     ├─ Pregunta existe                             │
      │     └─ Cuestionario es válido                      │
      │                                                      │
      │  2. GUARDAR EN DATABASE                            │
      │     ├─ INSERT UserAnswer {                         │
      │     │   userId, questionId,                        │
      │     │   answer, isCorrect,                         │
      │     │   createdAt                                  │
      │     │ }                                            │
      │     │                                              │
      │     └─ UPDATE QuestionnaireAttempt {               │
      │         correctAnswers++,                          │
      │         timeSpent += elapsed                       │
      │       }                                            │
      │                                                      │
      │  3. CALCULAR PUNTUACIÓN                            │
      │     ├─ score = (correctAnswers / totalQuestions)*100
      │     └─ UPDATE score en attempt                    │
      │                                                      │
      │  4. EXTRAER FUNDAMENTO LEGAL                       │
      │     ├─ Parse explicación                           │
      │     ├─ Buscar patrón artículo/ley                 │
      │     └─ Guardar referencia                          │
      │                                                      │
      │  5. GENERAR RECOMENDACIÓN                          │
      │     ├─ Si errorRate > 50%: Estudiar más          │
      │     ├─ Si 30% < errorRate < 50%: Consolidar      │
      │     └─ Si errorRate < 30%: Buen rendimiento      │
      │                                                      │
      │  6. RETORNAR RESPUESTA                             │
      │     ├─ { isCorrect, explanation, legalArticle }   │
      │     └─ Status 200 OK                              │
      │                                                      │
      └────────────┬───────────────────────────────────────┘
                   │
                   │ Response enviado al navegador
                   │
      ┌────────────▼──────────────────────────────────────────┐
      │                                                        │
      │  GET /api/statistics (cuando usuario abre stats)      │
      │                                                        │
      │  PIPELINE DE CÁLCULO:                                 │
      │                                                        │
      │  1. VALIDAR USUARIO ────────────────────────┐         │
      │     └─ getServerSession(authOptions)       │         │
      │        Obtener user.id                     │         │
      │                                             │         │
      │  2. CONSULTAS A BD ────────────────────────┤         │
      │     ├─ SELECT * FROM UserAnswer            │         │
      │     │  WHERE userId = ? LIMIT 10000        │         │
      │     │                                       │         │
      │     ├─ SELECT * FROM Question WHERE ...    │         │
      │     │                                       │         │
      │     ├─ SELECT * FROM Questionnaire         │         │
      │     │                                       │         │
      │     └─ SELECT * FROM QuestionnaireAttempt  │         │
      │                                             │         │
      │  3. AGREGACIÓN DE DATOS ───────────────────┤         │
      │     ├─ Total respuestas correctas          │         │
      │     ├─ Porcentaje acierto por tema         │         │
      │     ├─ Preguntas fallidas (marcar)         │         │
      │     ├─ Tiempo promedio respuesta           │         │
      │     ├─ Tasa de mejora semanal              │         │
      │     └─ Distribución dificultad             │         │
      │                                             │         │
      │  4. EXTRACCIÓN FUNDAMENTOS ────────────────┤         │
      │     ├─ Para cada respuesta fallida:        │         │
      │     │  - Extraer artículo de explicación   │         │
      │     │  - Normalizar formato                │         │
      │     │  - Guardar en resultado              │         │
      │     └─ Resultado: array de artículos       │         │
      │                                             │         │
      │  5. CÁLCULO MÉTRICAS AVANZADAS ────────────┤         │
      │     ├─ Racha de aciertos                   │         │
      │     ├─ Temas en los que fallo              │         │
      │     ├─ Progreso histórico                  │         │
      │     └─ Recomendaciones personalizadas      │         │
      │                                             │         │
      │  6. FORMATEAR RESPUESTA JSON ──────────────┤         │
      │     ├─ {                                   │         │
      │     │   "general": { score, attempts, ... }│         │
      │     │   "byTheme": { tema1, tema2, ... }  │         │
      │     │   "failedQuestions": [ ... ],        │         │
      │     │   "recommendations": [ ... ]         │         │
      │     │ }                                    │         │
      │     └─ Status 200 OK                      │         │
      │                                             │         │
      │  7. CACHÉ RESPUESTA (opcional) ────────────┤         │
      │     └─ Cache-Control: max-age=300         │         │
      │                                             │         │
      │  FALLBACK EN CASO DE ERROR:                │         │
      │  Si select con 'answer' falla:             │         │
      │  └─ Re-intentar sin campo específico      │         │
      │     Usar isCorrect + selectedAnswer       │         │
      │                                             │         │
      └──────────────┬────────────────────────────────────────┘
                     │
                     │ Datos enviados a Dashboard
                     │
      ┌──────────────▼────────────────────────────────────────┐
      │                                                        │
      │  MOSTRAR EN INTERFAZ (React)                          │
      │  └─ StatisticsChart.tsx                              │
      │     ├─ Gráficos con Chart.js                         │
      │     ├─ Tablas de resumen                             │
      │     ├─ Progreso visual                               │
      │     └─ Recomendaciones personalizadas                │
      │                                                        │
      └────────────────────────────────────────────────────────┘
```

---

## 3. DIAGRAMA BASES DE DATOS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL SCHEMA                                   │
│                      (Supabase - AWS eu-west-1)                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─ USUARIOS ────────────────────┐    ┌─ CONTENIDO ──────────────┐
│ User (15 campos)              │    │ Question (20 campos)     │
│ ├─ id (PK)                   │    │ ├─ id (PK)               │
│ ├─ email (UNIQUE)            │    │ ├─ text                  │
│ ├─ name                      │    │ ├─ options (JSON)        │
│ ├─ password (hashed)         │    │ ├─ correctAnswer         │
│ ├─ role (admin/user)         │    │ ├─ explanation           │
│ ├─ createdAt                 │    │ ├─ temaCodigo (FK)       │
│ └─ ...                       │    │ ├─ difficulty            │
│                              │    │ └─ ...                   │
│ Account (OAuth)              │    │                          │
│ Session (Sessions)           │    │ Questionnaire (6 campos) │
└──────────────────────────────┘    │ ├─ id (PK)               │
                                     │ ├─ title                │
     ┌─ RESPUESTAS ────────────────┐ │ ├─ type                │
     │ UserAnswer (8 campos)       │ │ ├─ published            │
     │ ├─ id (PK)                 │ │ └─ ...                  │
     │ ├─ userId (FK → User)      │ │                        │
     │ ├─ questionId (FK → Q)     │ │ Solution (3 campos)     │
     │ ├─ answer                  │ │ ├─ id (PK)              │
     │ ├─ isCorrect               │ │ ├─ content              │
     │ ├─ createdAt               │ │ └─ ...                 │
     │ └─ ...                     │ │                        │
     │                             │ │ LegalDocument           │
     │ QuestionnaireAttempt (8)   │ │ DocumentSection         │
     │ ├─ id (PK)                │ │ GeneratedQuestion       │
     │ ├─ userId (FK)            │ │                        │
     │ ├─ score                  │ │ TemaOficial             │
     │ ├─ correctAnswers         │ │ └─ 36 temas españoles  │
     │ └─ ...                    │ │                        │
     └─────────────────────────────┘ └──────────────────────────┘

┌─ SUSCRIPCIÓN ─────────────────┐    ┌─ CONFIGURACIÓN ──────────┐
│ Subscription (6 campos)       │    │ AppSettings (15 campos)  │
│ ├─ userId (FK) UNIQUE        │    │ ├─ monetization enabled  │
│ ├─ plan (free/basic/premium) │    │ ├─ adsense config        │
│ ├─ status                    │    │ ├─ affiliate config      │
│ └─ ...                       │    │ ├─ kofi URL              │
│                              │    │ ├─ patreon URL           │
│ Subscription tracking        │    │ └─ ...                  │
└──────────────────────────────┘    └─────────────────────────┘

┌─ AULAS VIRTUALES ─────────────┐    ┌─ AUDITORÍA ────────────────┐
│ VirtualClassroom (6 campos)   │    │ AuditLog (10 campos)       │
│ ├─ id (PK)                   │    │ ├─ id (PK)                 │
│ ├─ name                      │    │ ├─ action (CREATE/UPDATE)  │
│ ├─ roomId (Unique)           │    │ ├─ entity                  │
│ ├─ createdById (FK → User)   │    │ ├─ adminId (FK)            │
│ └─ ...                       │    │ ├─ timestamp               │
│                              │    │ └─ ...                    │
│ ClassSession (8 campos)      │    │                           │
└──────────────────────────────┘    │ SystemError (6 campos)     │
                                     └───────────────────────────┘

┌─ EXÁMENES OFICIALES ──────────────────────────────────────────────────────┐
│ ExamOfficial (8 campos)            Sistema de puntuación -0.25           │
│ ├─ id (PK)                        70 preguntas test + 15 supuesto        │
│ ├─ title                          Correcta: +1, Incorrecta: -0.25         │
│ ├─ description                     Transformación: /50 puntos por parte   │
│ ├─ testQuestions (JSON[70])                                              │
│ │   ├─ text, options[4], correctAnswer, explanation                       │
│ ├─ practicalCase (JSON)                                                   │
│ │   ├─ statement (enunciado)                                             │
│ │   └─ questions[15] (misma estructura)                                   │
│ ├─ published (boolean)                                                    │
│ ├─ active (boolean)                Solo 1 examen activo a la vez         │
│ └─ createdAt                                                              │
│                                                                           │
│ ExamOfficialAttempt (15 campos)     Registro de intentos de usuario      │
│ ├─ id (PK)                                                                │
│ ├─ userId (FK → User)                                                     │
│ ├─ examId (FK → ExamOfficial)                                            │
│ ├─ testCorrect, testIncorrect, testBlank                                  │
│ ├─ testRawScore (correct - incorrect*0.25)                               │
│ ├─ testScore (rawScore/70 * 50)                                          │
│ ├─ practicalCorrect, practicalIncorrect, practicalBlank                  │
│ ├─ practicalRawScore (correct - incorrect*0.25)                          │
│ ├─ practicalScore (rawScore/15 * 50)                                     │
│ ├─ totalScore (testScore + practicalScore) /100                          │
│ ├─ timeSpent (segundos)                                                   │
│ └─ completedAt                                                            │
│                                                                           │
│ ExamRanking (6 campos)              Ranking global ordenado por score    │
│ ├─ id (PK)                                                                │
│ ├─ userId (FK → User) UNIQUE       Un usuario, un puesto                 │
│ ├─ examId (FK → ExamOfficial)                                            │
│ ├─ attemptId (FK → Attempt)        Mejor intento del usuario             │
│ ├─ rank (calculado)                 Recalculado tras cada submit          │
│ ├─ totalScore                       Denormalizado para performance       │
│ └─ userName (denormalizado)         Optimización de queries              │
│ ClassroomParticipant (7)     │    │ SystemError (10 campos)    │
│ LiveKit stream recording     │    │ ├─ errorType              │
└───────────────────────────────┘    │ ├─ severity               │
                                     │ └─ ...                   │
                                     └───────────────────────────┘

┌─ RELACIONES PRINCIPALES ──────────────────────────────────────┐
│                                                               │
│  User (1) ──────── (many) UserAnswer                         │
│       │                        │                             │
│       │                        └──> Question (many)          │
│       │                             │                        │
│       └────── (1) Subscription      │                        │
│       │                             └──> Questionnaire       │
│       │                                                       │
│       └──> (many) QuestionnaireAttempt                       │
│       │                                                       │
│       └──> (many) VirtualClassroom (creator)                │
│       │                                                       │
│       └──> (many) ClassroomParticipant                      │
│       │                                                       │
│       └──> (many) ExamSimulation                            │
│       │                                                       │
│       └──> (many) AuditLog (admin actions)                 │
│                                                               │
│  Questionnaire (1) ──── (many) Question                     │
│       │                                                      │
│       ├──> (1) Solution                                     │
│       │                                                      │
│       └──> (many) QuestionnaireAttempt                      │
│                                                               │
│  LegalDocument (1) ────── (many) DocumentSection            │
│       │                                                      │
│       └──> (many) GeneratedQuestion                        │
│                                                               │
│  TemaOficial (1) ─────── (many) TemaLegalDocument          │
│                          (many-to-many con LegalDocument)  │
│                                                               │
└───────────────────────────────────────────────────────────────┘

ÍNDICES CRÍTICOS:
• UserAnswer(userId, createdAt) - Búsquedas estadísticas
• UserAnswer(questionId, isCorrect) - Análisis por pregunta
• Question(questionnaireId, difficulty) - Filtros temáticos
• QuestionnaireAttempt(userId, completedAt) - Historial usuario
• User(email) - Login rápido
• ForumThread(userId) - Hilos por usuario
```

---

## 4. FLUJO DE GENERACIÓN IA DE PREGUNTAS

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    ADMIN: GENERADOR IA DE PREGUNTAS                          │
│                       /admin/create-formulario                               │
└──────────────┬───────────────────────────────────────────────────────────────┘
               │
    ┌──────────▼──────────────────────────────────────────────┐
    │                                                          │
    │  1. SELECCIONAR DOCUMENTO PDF                           │
    │     ├─ Input file upload                               │
    │     └─ Max size: 50MB                                  │
    │                                                          │
    │  2. PROCESAR PDF (OCR)                                 │
    │     ├─ OCRModal component                              │
    │     ├─ Extraer texto con PDFBox                        │
    │     ├─ Mantener estructura                             │
    │     └─ Guardar en LegalDocument                        │
    │                                                          │
    │  3. SEGMENTAR CONTENIDO                                │
    │     ├─ Detectar artículos/secciones                    │
    │     ├─ Crear DocumentSection por cada parte            │
    │     ├─ Extraer embeddings (opcional)                   │
    │     └─ Full-text index para búsqueda                   │
    │                                                          │
    │  4. GENERAR PROMPTS PARA IA                            │
    │     ├─ Groq API (rápido, económico)                   │
    │     ├─ OpenAI API (más inteligente)                   │
    │     │                                                   │
    │     └─ Prompt template:                                │
    │        "Basándote en este texto legal:                 │
    │         [TEXTO AQUÍ]                                   │
    │         Crea 5 preguntas de opción múltiple para       │
    │         oposición. Incluye respuesta correcta y        │
    │         explicación detallada."                        │
    │                                                          │
    │  5. LLAMAR API IA (Groq/OpenAI)                       │
    │     ├─ POST /api/ai/generate-questions                │
    │     │  ├─ Body: { text, topic, difficulty, count }    │
    │     │  └─ Response: { questions: [...] }              │
    │     │                                                   │
    │     └─ Timeout: 60s                                    │
    │                                                          │
    │  6. PARSEAR RESPUESTA IA                               │
    │     ├─ Validar formato JSON                           │
    │     ├─ Extraer:                                        │
    │     │  - text (pregunta)                              │
    │     │  - options (array 4 opciones)                   │
    │     │  - correctAnswer (A/B/C/D)                      │
    │     │  - explanation (fundamento)                     │
    │     └─ Validar integridad                             │
    │                                                          │
    │  7. GUARDAR EN DATABASE                                │
    │     ├─ INSERT GeneratedQuestion {                     │
    │     │   documentId: FK,                               │
    │     │   text,                                         │
    │     │   options: JSON.stringify(),                    │
    │     │   correctAnswer,                                │
    │     │   explanation,                                  │
    │     │   difficulty,                                   │
    │     │   reviewed: false                               │
    │     │ }                                               │
    │     │                                                  │
    │     └─ CREATE Question FROM GeneratedQuestion        │
    │        cuando admin aprueba                           │
    │                                                        │
    │  8. MOSTRAR PARA REVISIÓN                             │
    │     ├─ Vista previa de preguntas generadas           │
    │     ├─ Admin puede:                                   │
    │     │  - Editar pregunta/opciones                    │
    │     │  - Cambiar respuesta correcta                  │
    │     │  - Mejorar explicación                         │
    │     │  - Eliminar si es mala                         │
    │     │  - Publicar cuando está bien                   │
    │     └─ Guardar cambios en DB                          │
    │                                                         │
    │  9. AGREGAR A CUESTIONARIO                            │
    │     ├─ Crear Questionnaire {                         │
    │     │   title: "Tema X - Preguntas IA",              │
    │     │   type: "theory"                               │
    │     │ }                                              │
    │     │                                                 │
    │     └─ Vincular Questions al Questionnaire           │
    │                                                         │
    │  10. PUBLICAR                                         │
    │     ├─ UPDATE Questionnaire SET published = true     │
    │     ├─ Notificar usuarios                            │
    │     └─ Disponible en /dashboard/theory              │
    │                                                         │
    └──────────────┬──────────────────────────────────────────┘
                   │
     ┌─────────────▼──────────────────────────────┐
     │ BATCH PROCESSING (masivo) - /api/ai/batch │
     │                                             │
     │ ├─ Procesar 50 PDFs simultáneamente        │
     │ ├─ Generar 500 preguntas                   │
     │ ├─ Ejecutar de noche (cron job)            │
     │ ├─ Distribuir carga en Groq/OpenAI        │
     │ └─ Guardar progreso en JobLog              │
     │                                             │
     └─────────────────────────────────────────────┘
```

---

## 5. CICLO DE AUTENTICACIÓN Y SESIÓN

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         LOGIN FLOW                                           │
└──────────────────────┬───────────────────────────────────────────────────────┘
                       │
    ┌──────────────────▼───────────────────────────────┐
    │                                                   │
    │  1. USUARIO VA A /login                          │
    │     └─ app/login/page.tsx (Client Component)    │
    │        Muestra formulario o botones OAuth        │
    │                                                   │
    │  2. DOS OPCIONES:                                │
    │                                                   │
    │     A) LOGIN CON CREDENCIALES                    │
    │        ├─ Email + Password                       │
    │        ├─ POST /api/auth/callback/credentials   │
    │        │  ├─ Validar email existe               │
    │        │  ├─ Bcrypt.compare(password, hash)     │
    │        │  ├─ Crear JWT token                    │
    │        │  └─ Guardar en cookie (httpOnly)       │
    │        │                                         │
    │        └─ Redirect a /dashboard                 │
    │                                                   │
    │     B) LOGIN CON OAuth (GitHub/Google)          │
    │        ├─ Redirigir a proveedor OAuth          │
    │        ├─ Usuario autoriza en GitHub/Google    │
    │        ├─ Callback: POST /api/auth/callback/[provider]
    │        │  ├─ Recibir token OAuth               │
    │        │  ├─ Consultar perfil en proveedor    │
    │        │  ├─ Buscar/crear User en DB           │
    │        │  │  - Si existe: actualizar           │
    │        │  │  - Si no existe: crear nuevo       │
    │        │  ├─ Crear sesión JWT                  │
    │        │  └─ Guardar en cookie httpOnly        │
    │        │                                         │
    │        └─ Redirect a /dashboard                 │
    │                                                   │
    │  3. GUARDAR SESIÓN                              │
    │     ├─ JWT Token en cookie: next-auth.session  │
    │     │  └─ { user: { id, email, name, role } }  │
    │     ├─ Firmado con NEXTAUTH_SECRET (env)       │
    │     ├─ HttpOnly: true (no accesible desde JS)  │
    │     └─ Secure: true (solo HTTPS en prod)       │
    │                                                   │
    │  4. MIDDLEWARE VALIDA CADA REQUEST              │
    │     ├─ middleware.ts intercepta todas las rutas │
    │     ├─ Valida JWT en cookie                    │
    │     ├─ Si válido: permite acceso               │
    │     │  ├─ Si /admin: verifica role = "admin"  │
    │     │  └─ Si /dashboard: verifica role = "user" or "admin"
    │     ├─ Si inválido/expirado:                   │
    │     │  ├─ Intenta refrescar sesión             │
    │     │  └─ Si no: redirige a /login             │
    │     └─ Agrega user.id a request.user           │
    │                                                   │
    │  5. CADA API ROUTE VALIDA SESSION               │
    │     ├─ getServerSession(authOptions)           │
    │     ├─ Si null: retorna 401 Unauthorized       │
    │     ├─ Si existe:                              │
    │     │  ├─ Obtiene User desde session.user.id   │
    │     │  └─ Ejecuta operación con ese usuario    │
    │     └─ Logging: quién hizo qué cuándo          │
    │                                                   │
    │  6. LOGOUT                                      │
    │     ├─ Botón "Cerrar sesión"                  │
    │     ├─ POST /api/auth/signout                 │
    │     │  ├─ Invalidar JWT                        │
    │     │  ├─ Limpiar cookies                      │
    │     │  ├─ Log en AuditLog                      │
    │     │  └─ Limpiar sesión servidor              │
    │     └─ Redirect a /login                       │
    │                                                   │
    │  TOKENS EXPIRACIÓN:                             │
    │  ├─ Session: 30 días                            │
    │  ├─ JWT: 24 horas (refresh automático)         │
    │  └─ Refresh token: 60 días                      │
    │                                                   │
    └────────────────────────────────────────────────────┘
```

---

## 6. ESTRUCTURA DE COMPONENTES REACT

```
App Layout
├── RootLayout (Metadata, Fonts)
│   ├── AuthProvider (NextAuth Session)
│   ├── Navbar
│   │   ├── Logo
│   │   ├── NavLinks
│   │   ├── UserMenu (si logueado)
│   │   │   ├─ ProfileButton
│   │   │   ├─ SettingsButton
│   │   │   └─ LogoutButton
│   │   └── HelpButton (flotante)
│   │
│   ├── PageContent (según ruta)
│   │   │
│   │   ├─ DASHBOARD
│   │   │  └─ StatisticsChart
│   │   │     ├─ ProgressCard
│   │   │     ├─ StatsTable
│   │   │     └─ RecommendationsList
│   │   │
│   │   ├─ QUIZ PAGE
│   │   │  └─ QuestionDisplay
│   │   │     ├─ QuestionText
│   │   │     ├─ OptionsList
│   │   │     │  ├─ OptionButton (cada una)
│   │   │     │  └─ SelectedIndicator
│   │   │     ├─ Timer
│   │   │     └─ SubmitButton
│   │   │
│   │   ├─ EXAM MODE
│   │   │  └─ ExamContainer
│   │   │     ├─ ExamHeader (tiempo, progreso)
│   │   │     ├─ QuestionDisplay
│   │   │     ├─ QuestionNavigation
│   │   │     └─ ExamCelebration (si 100%)
│   │   │
│   │   ├─ VIDEO ROOM
│   │   │  └─ VideoRoom
│   │   │     ├─ RemoteParticipants
│   │   │     ├─ LocalParticipant
│   │   │     ├─ ControlBar (mute, camera, etc)
│   │   │     ├─ ChatPanel
│   │   │     └─ ParticipantsList
│   │   │
│   │   └─ ADMIN PANEL
│   │      ├─ AdminNavigation
│   │      ├─ AdminCard (cada tarjeta)
│   │      │  ├─ CardIcon
│   │      │  ├─ CardTitle
│   │      │  └─ CardButton
│   │      │
│   │      ├─ Analytics Page
│   │      │  ├─ MetricCard (usuarios, preguntas, etc)
│   │      │  ├─ Chart (Chart.js)
│   │      │  └─ Table (resultados)
│   │      │
│   │      ├─ Audit Logs Page
│   │      │  ├─ FilterBar
│   │      │  └─ LogTable (rows dinamicas)
│   │      │
│   │      ├─ Backups Page
│   │      │  ├─ CreateButton
│   │      │  └─ BackupList
│   │      │     └─ BackupCard (cada backup)
│   │      │
│   │      └─ Quality Control
│   │         ├─ AnalysisButton
│   │         └─ IssueLists
│   │            └─ IssueCard (por severidad)
│   │
│   └── Footer
│       ├─ Links
│       ├─ Copyright
│       └─ SocialLinks

HOOKS CUSTOM:
├─ useStatistics()         - Fetch stats
├─ useAuth()              - Get current user
├─ useErrorReporter()     - Report errors
├─ useLocalStorage()      - Persist data
└─ useMediaQuery()        - Responsive
```

---

**Diagrama completo de arquitectura - OpositAPP v1.0**
**Confidencial - Uso interno y registro de propiedad intelectual**

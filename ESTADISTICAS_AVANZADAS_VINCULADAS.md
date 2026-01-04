# Sistema Unificado de Preguntas - Integración Total de Estadísticas Avanzadas

**Fecha**: 3 de Enero de 2026  
**Estado**: ✅ Completamente Integrado  
**Versión**: 2.0 - Estadísticas Avanzadas

---

## 📊 Arquitectura de Estadísticas

### Flujo Completo de Datos

```
HTML Interactivo (Generador)
    ↓
Estudiante responde preguntas
    ↓
Presiona "Corregir Test"
    ↓
recordAttemptToServer() registra:
    • Respuestas individuales (UserAnswer)
    • Intento global (QuestionnaireAttempt)
    • Sesión de estudio (StudySession)
    • Racha de estudio (StudyStreak)
    • Logros desbloqueados (UserAchievement)
    • Marcadas/Dudosas (MarkedQuestion)
    • Repaso espaciado (SpacedRepetitionCard)
    ↓
Dashboard accede via:
    • /api/admin/unified-questions/advanced-stats
    • /api/admin/unified-questions/spaced-repetition
```

---

## 🔗 Endpoints de Estadísticas

### 1. **POST /api/admin/unified-questions/record-attempt**

**Propósito**: Registrar un intento completo cuando se completa un test HTML

**Input**:
```json
{
  "questionnaireId": "cuest123", // opcional, se crea si no existe
  "questionIds": ["q1", "q2", "q3"],
  "answers": {
    "q1": "A",
    "q2": "B",
    "q3": "C"
  },
  "timeSpent": 450, // segundos
  "tema": "Introducción a la SS",
  "difficulty": "media",
  "totalCorrect": 2,
  "totalQuestions": 3,
  "percentage": 67
}
```

**Qué registra**:
1. ✅ **UserAnswer** - Cada respuesta individual
   - userId, questionId, answer, isCorrect
   - Used for: Estadísticas por pregunta, análisis de patrones

2. ✅ **QuestionnaireAttempt** - El intento global
   - score, correctAnswers, totalQuestions, timeSpent
   - Used for: Historial de intentos, gráficos de progreso

3. ✅ **StudySession** - Sesión de estudio
   - duration, questionsAnswered, correctAnswers, topics
   - Used for: Análisis de hábitos de estudio

4. ✅ **StudyStreak** - Racha de estudio
   - currentStreak, longestStreak, totalStudyDays
   - Used for: Motivación, gamificación, logros

5. ✅ **UserAchievement** - Logros desbloqueados
   - Detecta: perfect_score, high_score_80, high_score_90
   - Used for: Sistema de badges, motivación

**Output**:
```json
{
  "success": true,
  "attemptId": "attempt123",
  "score": 67,
  "correctAnswers": 2,
  "totalQuestions": 3,
  "timeSpent": 450,
  "streakUpdated": 5,
  "userAnswersRecorded": 3
}
```

---

### 2. **GET /api/admin/unified-questions/advanced-stats**

**Propósito**: Obtener estadísticas avanzadas con filtros y análisis

**Query Parameters**:
```
?tema=G1              // Filtrar por tema
&difficulty=media     // Filtrar por dificultad
&daysBack=30         // Últimos N días (default: 30)
```

**Output** (respuesta completa):
```json
{
  "success": true,
  "summary": {
    "totalAttempts": 25,
    "totalAnswers": 750,
    "correctAnswers": 585,
    "incorrectAnswers": 165,
    "averageScore": 78,
    "totalStudyDays": 15
  },
  "streak": {
    "current": 7,          // Días actuales de racha
    "longest": 12,         // Mejor racha histórica
    "totalDays": 42        // Total de días estudiados
  },
  "themeStatistics": [
    {
      "tema": "Introducción a la SS",
      "total": 145,        // Preguntas respondidas
      "correct": 128,      // Correctas
      "percentage": 88,    // Porcentaje
      "difficulty": "media",
      "questions": ["q1", "q2", "q3"]
    },
    {
      "tema": "Regímenes",
      "total": 120,
      "correct": 95,
      "percentage": 79,
      "difficulty": "dificil",
      "questions": ["q4", "q5"]
    }
  ],
  "failedQuestions": [
    {
      "questionId": "q10",
      "text": "¿Qué es la Seguridad Social?",
      "userAnswer": "A",
      "correctAnswer": "B",
      "tema": "G1",
      "difficulty": "facil",
      "failureCount": 3  // Cuántas veces fallada
    }
  ],
  "achievements": [
    {
      "code": "perfect_score",
      "name": "Puntuación Perfecta",
      "icon": "🏆",
      "unlockedAt": "2026-01-03T14:30:00Z"
    },
    {
      "code": "streak_7",
      "name": "Racha de 7 Días",
      "icon": "🔥",
      "unlockedAt": "2026-01-02T18:00:00Z"
    }
  ],
  "recentSessions": [
    {
      "date": "2026-01-03T14:00:00Z",
      "duration": 450,          // segundos
      "questionsAnswered": 30,
      "correctAnswers": 27,
      "topics": ["Introducción a la SS", "Regímenes"]
    }
  ],
  "chartData": [
    {
      "date": "2026-01-03",
      "attempts": 2,
      "avgScore": 85
    },
    {
      "date": "2026-01-02",
      "attempts": 1,
      "avgScore": 78
    }
  ],
  "filters": {
    "tema": null,
    "difficulty": null,
    "daysBack": 30
  }
}
```

**Casos de Uso**:
- Dashboard personal del estudiante
- Panel de progreso por tema
- Análisis de fortalezas/debilidades
- Recomendaciones de estudio
- Gráficos de tendencias

---

### 3. **POST/GET /api/admin/unified-questions/spaced-repetition**

#### **POST**: Registrar interacción con pregunta

**Input**:
```json
{
  "questionId": "q123",
  "action": "spaced_repetition",  // o "mark_failed", "mark_doubt", "mark_review"
  "isCorrect": true,
  "difficulty": "media",
  "tema": "Introducción a la SS"
}
```

**Acciones disponibles**:

1. **mark_failed**: Marcar como pregunta fallida
   - Incrementa contador de fallos
   - Registra fecha del último fallo
   - Used for: Identificar puntos débiles

2. **mark_doubt**: Marcar como duda/dudosa
   - Para revisar luego
   - Used for: Preguntas que no está seguro

3. **mark_review**: Marcar para revisión general
   - Seguimiento general de revisión
   - Used for: Preparación final

4. **spaced_repetition**: Sistema SM-2
   - Algoritmo de repaso espaciado
   - Calcula próxima revisión automáticamente
   - Ajusta dificultad (easeFactor)

**Output**:
```json
{
  "success": true,
  "action": "spaced_repetition",
  "questionId": "q123",
  "message": "Pregunta añadida a repaso espaciado"
}
```

#### **GET**: Obtener preguntas para repaso

**Query Parameters**:
```
?type=spaced    // Preguntas cuya revisión está vencida
?type=marked    // Preguntas marcadas (dudosas/fallidas)
?type=failed    // Preguntas que se han fallado
&limit=10       // Cantidad de preguntas
```

**GET spaced - Output**:
```json
{
  "success": true,
  "type": "spaced",
  "dueCount": 5,  // Preguntas vencidas para hoy
  "questions": [
    {
      "cardId": "card123",
      "questionId": "q1",
      "text": "¿Cuál es el régimen de SS?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "easeFactor": 2.5,    // Factor de facilidad (1.3-2.5)
      "interval": 7,        // Días hasta próxima revisión
      "repetitions": 3,     // Veces respondida correctamente seguidas
      "totalReviews": 5,    // Total de revisiones
      "correctReviews": 3,  // Revisiones correctas
      "nextReviewDate": "2026-01-10T00:00:00Z"
    }
  ]
}
```

**GET marked - Output**:
```json
{
  "success": true,
  "type": "marked",
  "questions": [
    {
      "questionId": "q10",
      "text": "Pregunta dudosa",
      "markType": "doubt",      // doubt, failed, review
      "timesFailed": 2,
      "notes": null
    }
  ]
}
```

---

## 🎯 Modelos de Datos Vinculados

### Relaciones Completas

```
User
├── QuestionnaireAttempt (intentos)
├── UserAnswer (respuestas individuales)
├── StudySession (sesiones de estudio)
├── StudyStreak (racha de días)
├── UserAchievement (logros desbloqueados)
├── MarkedQuestion (preguntas marcadas)
└── SpacedRepetitionCard (tarjetas de repaso)

Question
├── UserAnswer (vinculación a respuestas del usuario)
├── MarkedQuestion (marcadas por usuario)
└── SpacedRepetitionCard (repaso espaciado)

QuestionnaireAttempt
├── Questionnaire (cuestionario intentado)
├── UserAnswer (respuestas del intento)
└── statistics (score, correctAnswers, timeSpent)
```

---

## 📈 Ejemplos de Análisis Avanzados

### 1. **Rendimiento por Tema**

```typescript
// Datos devueltos por advanced-stats
const themeStats = response.themeStatistics;

// Ordenados por mejor desempeño
const topThemes = themeStats.filter(t => t.percentage >= 80);
const problematicThemes = themeStats.filter(t => t.percentage < 60);
```

### 2. **Preguntas para Refuerzo**

```typescript
// Obtener 10 preguntas que más se han fallado
const failed = await fetch('/api/admin/unified-questions/spaced-repetition?type=failed&limit=10');
const questions = failed.questions; // Ordenadas por timesFailed DESC
```

### 3. **Progreso Diario**

```typescript
// Datos de chartData para gráfico
const chart = response.chartData;
// Muestra: attempts por día, avgScore por día
// Útil para: visualizar tendencias, identificar días de bajo rendimiento
```

### 4. **Racha de Estudio**

```typescript
const streak = response.streak;
if (streak.current === streak.longest) {
  // Mejor racha histórica actual - MOTIVACIÓN
  showMessage("¡Bate tu récord personal!");
}
```

### 5. **Logros Desbloqueados**

```typescript
const achievements = response.achievements;
// Mostrar badges al usuario
// Usar para gamificación y motivación
```

---

## 🔄 Flujo Completo: De HTML a Estadísticas

### 1. Estudiante genera HTML
```
Generador HTML → Admin selecciona preguntas → Descarga .html
```

### 2. Estudiante completa test
```
Abre HTML → Responde preguntas → Click "Corregir Test"
```

### 3. Registrar automáticamente
```typescript
recordAttemptToServer({
  answers: {...},
  timeSpent: 450,
  tema: "Introducción a la SS",
  totalCorrect: 27,
  totalQuestions: 30,
  percentage: 90
})
```

### 4. API registra en 7 tablas
```
✅ UserAnswer (30 registros)
✅ QuestionnaireAttempt (1 registro)
✅ StudySession (1 registro)
✅ StudyStreak (actualizado)
✅ UserAchievement (si aplica)
✅ MarkedQuestion (si falladas)
✅ SpacedRepetitionCard (si dudosas)
```

### 5. Estadísticas disponibles inmediatamente
```
Dashboard → /api/admin/unified-questions/advanced-stats
    ↓
Muestra: Progreso, temas, racha, logros, gráficos
```

### 6. Repaso personalizado
```
/api/admin/unified-questions/spaced-repetition?type=spaced
    ↓
Preguntas para revisar hoy (algoritmo SM-2)
```

---

## 🎓 Características por Tipo de Usuario

### Para el Estudiante:
- ✅ Ver su progreso general
- ✅ Estadísticas por tema
- ✅ Racha de estudio
- ✅ Logros desbloqueados
- ✅ Preguntas para repaso (Spaced Repetition)
- ✅ Análisis de puntos débiles

### Para el Admin:
- ✅ Generar cuestionarios personalizados
- ✅ Ver estadísticas globales
- ✅ Filtrar por tema/dificultad
- ✅ Analizar patrones de errores
- ✅ Generar reportes

### Para el Tutor (futuro):
- ✅ Seguimiento individual de cada estudiante
- ✅ Identificar áreas problemáticas de la clase
- ✅ Recomendaciones personalizadas
- ✅ Comparativas de progreso

---

## 🔧 Configuración Requerida

### Base de datos
- ✅ Todas las tablas ya existen en schema.prisma
- ✅ Relaciones correctamente configuradas
- ✅ Índices para optimización

### APIs
- ✅ POST /api/admin/unified-questions/record-attempt
- ✅ GET /api/admin/unified-questions/advanced-stats
- ✅ POST/GET /api/admin/unified-questions/spaced-repetition

### Frontend (recomendado)
- [ ] Dashboard que consume advanced-stats
- [ ] Vista de "Preguntas para Hoy" (Spaced Repetition)
- [ ] Gráficos de progreso
- [ ] Badges de logros

---

## 📊 Algoritmo Spaced Repetition (SM-2)

**Implementado en**: `/api/admin/unified-questions/spaced-repetition`

**Parámetros**:
- **easeFactor** (1.3 - 2.5): Qué tan fácil es la pregunta
- **interval**: Días hasta la próxima revisión
- **repetitions**: Veces respondidas correctamente seguidas

**Lógica**:
```typescript
if (isCorrect) {
  repetitions++
  
  if (repetitions === 1) interval = 1
  else if (repetitions === 2) interval = 3
  else interval = Math.ceil(interval * easeFactor)
  
  easeFactor = Math.max(1.3, easeFactor + 0.1)
} else {
  repetitions = 0
  interval = 1
  easeFactor = Math.max(1.3, easeFactor - 0.2)
}

nextReviewDate = now + interval days
```

---

## ✅ Testing Recomendado

### 1. Test registro de intento
```bash
POST /api/admin/unified-questions/record-attempt
Verify: UserAnswer, QuestionnaireAttempt, StudySession created
```

### 2. Test estadísticas avanzadas
```bash
GET /api/admin/unified-questions/advanced-stats
Verify: themeStatistics, chartData, achievements populated
```

### 3. Test spaced repetition
```bash
POST /api/admin/unified-questions/spaced-repetition
GET /api/admin/unified-questions/spaced-repetition?type=spaced
Verify: Card created, easeFactor calculated, nextReviewDate set
```

---

## 🚀 Próximas Mejoras

1. **Dashboard Visual**
   - Gráficos de progreso por tema
   - Visualización de racha
   - Badges de logros

2. **Recomendaciones IA**
   - Sugerir temas a estudiar basado en desempeño
   - Predicción de preparación para examen

3. **Reportes Automáticos**
   - Email semanal con progreso
   - PDF de estadísticas mensuales

4. **Competencia Social**
   - Comparar con otros estudiantes (sin nombres)
   - Tablas de líderes por tema

---

## 📚 Resumen de Endpoints

| Endpoint | Método | Propósito |
|----------|--------|-----------|
| `/api/admin/unified-questions` | GET | Cargar todas las preguntas (manual + IA) |
| `/api/admin/unified-questions/publish` | POST | Publicar como cuestionario en BD |
| `/api/admin/generate-form-with-solution` | POST | Generar HTML interactivo |
| `/api/admin/unified-questions/record-attempt` | POST | **Registrar intento (→ 7 tablas)** |
| `/api/admin/unified-questions/advanced-stats` | GET | **Obtener estadísticas avanzadas** |
| `/api/admin/unified-questions/spaced-repetition` | POST/GET | **Sistema de repaso espaciado** |

---

**Versión**: 2.0 - Estadísticas Avanzadas Integradas  
**Fecha Actualización**: 3 de Enero de 2026  
**Estado**: ✅ Completamente Implementado y Funcional

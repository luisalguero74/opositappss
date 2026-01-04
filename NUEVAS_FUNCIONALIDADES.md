# 🚀 Nuevas Funcionalidades OpositApp

Este documento describe todas las nuevas funcionalidades implementadas en la plataforma.

## 📊 1. Sistema de Estadísticas Avanzadas

**Ruta:** `/analytics-dashboard`

**Funcionalidades:**
- Dashboard completo con métricas de rendimiento
- Gráfica de progreso de los últimos 30 días
- Desglose por tema con porcentajes de acierto
- Top 5 preguntas más falladas
- Historial de intentos recientes

**API Endpoint:** `GET /api/user/analytics`

## ❌ 2. Banco de Preguntas Falladas

**Ruta:** `/failed-questions`

**Funcionalidades:**
- Listado de todas las preguntas falladas
- Contador de veces que se ha fallado cada pregunta
- Vista detallada con explicaciones
- Opción de ver/ocultar respuestas correctas

**API Endpoint:** `GET /api/user/failed-questions`

## 📌 3. Sistema de Marcado de Preguntas

**Ruta:** `/marked-questions`

**Funcionalidades:**
- Marcar preguntas como: Duda, Repasar, Importante
- Filtros por tipo de marca
- Agregar notas personalizadas a preguntas
- Eliminar marcas
- Vista organizada por categorías

**API Endpoints:**
- `POST /api/user/marked-questions` - Marcar pregunta
- `GET /api/user/marked-questions?type=doubt` - Obtener marcadas
- `DELETE /api/user/marked-questions?questionId=xxx` - Eliminar marca

## 🧠 4. Repetición Espaciada (Spaced Repetition)

**Ruta:** `/spaced-repetition`

**Funcionalidades:**
- Algoritmo SM-2 para optimizar el aprendizaje
- Tarjetas de repaso con intervalos inteligentes
- Calificación de 0-5 según facilidad de recuerdo
- Priorización de preguntas según fecha de revisión
- Seguimiento de intervalos y repeticiones

**Características:**
- Factor de facilidad ajustable
- Intervalos de repaso calculados automáticamente
- Sistema de repeticiones acumulativas

**API Endpoints:**
- `GET /api/user/spaced-repetition` - Obtener tarjetas pendientes (máx 20)
- `POST /api/user/spaced-repetition` - Actualizar tarjeta con calidad de respuesta

**Calificación:**
- 0: No recordé nada → Intervalo reinicia a 1 día
- 1-2: Difícil → Intervalo se reduce
- 3: Bien → Intervalo se mantiene o aumenta ligeramente
- 4-5: Fácil/Muy fácil → Intervalo aumenta significativamente

## 🔥 5. Sistema de Rachas de Estudio

**Funcionalidades:**
- Racha actual de días consecutivos
- Racha más larga histórica
- Total de días de estudio
- Actualización automática diaria
- Reinicio de racha si se salta un día

**API Endpoints:**
- `GET /api/user/streak` - Obtener racha actual
- `POST /api/user/streak` - Actualizar racha (se llama al completar cuestionarios)

**Lógica:**
- Estudiar hoy: No cambia racha
- Estudiar día consecutivo: Racha +1
- Saltar un día: Racha reinicia a 1

## 🏆 6. Sistema de Logros y Badges

**Ruta:** `/achievements`

**Funcionalidades:**
- 12 logros predefinidos
- Sistema de puntos por logro
- Visualización de logros desbloqueados/bloqueados
- Categorías: Estudio, Exámenes, Social
- Requisitos específicos por logro

**Logros Disponibles:**
1. 🎯 Primera Pregunta (10 pts)
2. 🔥 Racha de 3 días (50 pts)
3. ⭐ Racha de 7 días (100 pts)
4. 💪 Racha de 30 días (500 pts)
5. 📚 100 Preguntas correctas (100 pts)
6. 🎓 500 Preguntas correctas (250 pts)
7. 🏆 1000 Preguntas correctas (500 pts)
8. 💯 Test perfecto (150 pts)
9. ✅ Examen aprobado (200 pts)
10. 👑 Maestro del Temario (1000 pts)
11. 📖 10 horas de estudio (300 pts)
12. 🎖️ 90% precisión global (400 pts)

**API Endpoints:**
- `GET /api/user/achievements` - Obtener logros
- `POST /api/user/achievements` - Desbloquear logro

**Inicialización:**
```bash
npx tsx scripts/seed-achievements.ts
```

## ⏱️ 7. Modo Examen con Cronómetro

**Ruta:** `/exam-mode`

**Funcionalidades:**
- 85 preguntas (70 generales + 15 específicas)
- Límite de tiempo: 120 minutos
- Cronómetro descendente visible
- No se puede volver a preguntas anteriores
- Una sola oportunidad por pregunta
- Finalización automática al terminar el tiempo
- Evaluación y desglose al finalizar
- Indicador de aprobado/suspenso (50% mínimo)

**Características:**
- Barra de progreso visual
- Contador de preguntas
- Alerta visual cuando quedan menos de 10 minutos
- Resultados detallados: correctas, incorrectas, en blanco
- Opción de repetir examen

**API Endpoint:**
- `GET /api/questions/random?count=85` - Obtener preguntas aleatorias

## 📝 8. Registro de Sesiones de Estudio

**Funcionalidades:**
- Tracking de duración de sesiones
- Contador de preguntas respondidas por sesión
- Tipos de sesión: quiz, exam, review, spaced-repetition
- Historial de últimas 30 sesiones

**API Endpoints:**
- `POST /api/user/study-sessions` - Registrar sesión
- `GET /api/user/study-sessions` - Obtener historial

**Datos registrados:**
```typescript
{
  duration: number,        // en segundos
  questionsAnswered: number,
  type: 'quiz' | 'exam' | 'review' | 'spaced-repetition'
}
```

## 🎯 Integración en Dashboard

El dashboard principal ahora incluye tarjetas para acceder a:
- ❌ Preguntas Falladas
- 📌 Preguntas Marcadas
- 🧠 Repaso Inteligente (Repetición Espaciada)
- 🏆 Logros
- ⏱️ Modo Examen

## 📊 Modelos de Base de Datos

### StudyStreak
```prisma
model StudyStreak {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId])
  currentStreak Int      @default(0)
  longestStreak Int      @default(0)
  totalStudyDays Int     @default(0)
  lastStudyDate DateTime?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### MarkedQuestion
```prisma
model MarkedQuestion {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId])
  questionId String
  question   Question @relation(fields: [questionId])
  type       String   // "doubt", "review", "important"
  notes      String?
  markedAt   DateTime @default(now())
  
  @@unique([userId, questionId])
}
```

### SpacedRepetitionCard
```prisma
model SpacedRepetitionCard {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId])
  questionId      String
  question        Question @relation(fields: [questionId])
  easeFactor      Float    @default(2.5)
  interval        Int      @default(1)
  repetitions     Int      @default(0)
  nextReviewDate  DateTime
  lastReviewedAt  DateTime?
  createdAt       DateTime @default(now())
  
  @@unique([userId, questionId])
}
```

### Achievement
```prisma
model Achievement {
  id          String   @id @default(cuid())
  code        String   @unique
  name        String
  description String
  icon        String
  category    String
  requirement String   @db.Text
  points      Int      @default(0)
  createdAt   DateTime @default(now())
  userAchievements UserAchievement[]
}
```

### UserAchievement
```prisma
model UserAchievement {
  id            String      @id @default(cuid())
  userId        String
  user          User        @relation(fields: [userId])
  achievementId String
  achievement   Achievement @relation(fields: [achievementId])
  unlockedAt    DateTime    @default(now())
  progress      Int         @default(100)
  
  @@unique([userId, achievementId])
}
```

### StudySession
```prisma
model StudySession {
  id                String   @id @default(cuid())
  userId            String
  user              User     @relation(fields: [userId])
  duration          Int
  questionsAnswered Int
  type              String
  startedAt         DateTime @default(now())
  completedAt       DateTime?
}
```

## 🔄 Flujo de Uso Recomendado

1. **Inicio de Sesión** → Dashboard
2. **Completar Cuestionario** → Actualiza racha automáticamente
3. **Marcar Preguntas Dudosas** → Durante el cuestionario
4. **Revisar Falladas** → Banco de preguntas falladas
5. **Repaso Espaciado** → Sistema inteligente de repetición
6. **Modo Examen** → Simulacro real antes del examen oficial
7. **Ver Estadísticas** → Analizar progreso y áreas débiles
8. **Desbloquear Logros** → Motivación gamificada

## 🛠️ Comandos de Mantenimiento

```bash
# Sincronizar base de datos
npx prisma db push

# Generar cliente Prisma
npx prisma generate

# Sembrar logros iniciales
npx tsx scripts/seed-achievements.ts

# Verificar estado del sistema
npx tsx scripts/verify-system-health.ts
```

## 📈 Métricas y KPIs

El sistema ahora rastrea:
- Precisión global por usuario
- Precisión por tema
- Racha de estudio actual y máxima
- Total de preguntas respondidas
- Total de preguntas correctas
- Tiempo dedicado al estudio
- Progreso diario (últimos 30 días)
- Temas completados
- Logros desbloqueados
- Puntos acumulados

## 🔐 Seguridad

Todas las APIs requieren:
- Sesión autenticada con NextAuth
- Validación de usuario activo
- Autorización por usuario (no se pueden ver datos de otros)

## 📱 Responsive Design

Todas las nuevas páginas están optimizadas para:
- Desktop (1920x1080+)
- Tablet (768px+)
- Mobile (375px+)

## 🎨 Paleta de Colores por Funcionalidad

- **Estadísticas:** Indigo/Purple gradient
- **Falladas:** Red/Rose gradient
- **Marcadas:** Purple/Violet gradient
- **Repetición Espaciada:** Indigo/Blue gradient
- **Logros:** Yellow/Amber gradient
- **Modo Examen:** Orange/Red gradient

## 🚧 Funcionalidades Futuras Planificadas

- [ ] PWA (Progressive Web App)
- [ ] Exportar estadísticas a PDF
- [ ] Notificaciones push
- [ ] Grupos de estudio
- [ ] Ranking global
- [ ] Flashcards interactivas
- [ ] Chatbot tutor con IA
- [ ] Generación nocturna automática

## 📞 Soporte

Para issues o sugerencias, contactar al equipo de desarrollo.

---

**Última actualización:** Diciembre 2024  
**Versión:** 2.0.0

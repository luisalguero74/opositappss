# 📊 ANÁLISIS EXHAUSTIVO: Sistema Actual de Gestión de Preguntas

**Fecha del Análisis**: 18 de febrero de 2026  
**Analista**: GitHub Copilot (Claude Sonnet 4.5)  
**Estado**: Documento de Análisis - NO IMPLEMENTADO

---

## 🎯 RESUMEN EJECUTIVO

Tras un análisis profundo del código, base de datos y documentación existente, he identificado que el sistema actual de gestión de preguntas presenta **complejidad estructural significativa** con **múltiples fuentes de datos, flujos duplicados y falta de centralización**, lo que dificulta la gestión, edición y asignación de preguntas a cuestionarios.

### Problemática Principal
❌ **Las preguntas están dispersas en 2 modelos principales + múltiples flujos** sin un sistema centralizado de gestión  
❌ **No existe un "banco de preguntas" único** desde donde gestionar todo  
❌ **Múltiples interfaces administrativas** para la misma tarea  
❌ **Asignación manual compleja** a cuestionarios  
❌ **Duplicación de preguntas** sin control eficiente  

---

## 📋 ESTADO ACTUAL DE LA ARQUITECTURA

### 1. **Modelos de Base de Datos (Prisma)**

#### **Modelo 1: `Question`** (Preguntas Manuales/Publicadas)
```prisma
model Question {
  id              String    @id @default(cuid())
  questionnaireId String    // ⚠️ OBLIGATORIO - Siempre vinculada a un cuestionario
  text            String
  options         String    // ⚠️ Formato inconsistente (JSON string vs Array)
  correctAnswer   String
  explanation     String
  origin          QuestionOrigin // UNKNOWN, CRON, JSON, MANUAL
  reviewStatus    QuestionReviewStatus // PENDING, VALIDATED, QUARANTINED
  temaCodigo      String?
  temaNumero      Int?
  temaParte       String?
  temaTitulo      String?
  difficulty      String?
  aiReviewed      Boolean?
  aiReviewedAt    DateTime?
  createdAt       DateTime
  updatedAt       DateTime
  questionnaire   Questionnaire @relation(...)  // ⚠️ Relación obligatoria
  // ... relaciones con UserAnswer, MarkedQuestion, SpacedRepetition
}
```

**Características**:
- ✅ Usado en cuestionarios publicados
- ✅ Integrado con estadísticas de usuario
- ❌ **SIEMPRE requiere un `Questionnaire` padre** (no puede existir sola)
- ❌ No puede ser "banco de preguntas" independiente
- ⚠️ Campo `options` almacenado como string, requiere parsing

---

#### **Modelo 2: `GeneratedQuestion`** (Preguntas IA)
```prisma
model GeneratedQuestion {
  id            String    @id @default(cuid())
  documentId    String    // Vinculada a documento legal
  sectionId     String?   // Sección del documento
  text          String
  options       String    // ⚠️ También formato inconsistente
  correctAnswer String
  explanation   String?
  difficulty    String    @default("medium")
  topic         String?   // ⚠️ Diferente de temaCodigo
  reviewed      Boolean   @default(false)
  approved      Boolean   @default(false)  // ⚠️ Control de calidad
  reviewedBy    String?
  reviewedAt    DateTime?
  usageCount    Int       @default(0)
  createdAt     DateTime
  updatedAt     DateTime
  document      LegalDocument @relation(...)
  section       DocumentSection? @relation(...)
}
```

**Características**:
- ✅ Permite existir independientemente
- ✅ Sistema de aprobación (approved)
- ✅ Contador de uso
- ❌ **NO se integra directamente** con `Question`
- ❌ Campos de tema diferentes (`topic` vs `temaCodigo`)
- ❌ Requiere "promoción" manual a `Question` para usar en cuestionarios

---

#### **Modelo 3: `Questionnaire`** (Contenedor de Preguntas)
```prisma
model Questionnaire {
  id        String    @id
  title     String
  type      String    // theory, practical, exam
  theme     String?
  statement String?   // Para supuestos prácticos
  category  String?
  published Boolean   @default(false)
  archived  Boolean   @default(false)
  createdAt DateTime
  updatedAt DateTime
  questions Question[]  // ⚠️ Relación 1:N con Question
  attempts  QuestionnaireAttempt[]
  solutions Solution?
  userAnswers UserAnswer[]
}
```

**Características**:
- ✅ Agrupa preguntas temáticamente
- ✅ Control de publicación
- ❌ Las preguntas **DEBEN** estar asociadas (no pueden reutilizarse fácilmente entre cuestionarios)
- ❌ Editar una pregunta en un cuestionario no afecta a otros

---

### 2. **APIs de Gestión Actuales**

#### **A. `/api/admin/unified-questions`** (Lectura Unificada)
- **Propósito**: Combina `Question` + `GeneratedQuestion` aprobadas
- **Funcionalidad**:
  - Lee de ambas tablas
  - Normaliza campos (`temaCodigo` → `tema`, `topic` → `tema`)
  - Elimina duplicados por hash de texto
  - Devuelve lista unificada para generar HTMLs
- **Limitaciones**:
  - ❌ Solo lectura (no permite edición)
  - ❌ No crea un banco unificado en BD
  - ❌ La normalización es temporal (en memoria)

#### **B. `/api/admin/ai-questions`** (Gestión IA)
- **CRUD completo** para `GeneratedQuestion`
- **POST**: Crear nueva pregunta IA
- **GET**: Listar con filtros (approved, reviewed)
- **PUT**: Editar/Aprobar
- **DELETE**: Eliminar

#### **C. `/api/admin/questions`** (Gestión Manual)
- **GET**: Listar `Question` con su cuestionario asociado
- ❌ No permite CRUD completo
- ❌ No se usa en ninguna interfaz principal

#### **D. `/api/admin/questions-review`** (Revisión de Cuestionarios)
- **GET**: Listar cuestionarios completos con sus preguntas
- **POST**: Publicar/Archivar cuestionarios
- ❌ Edita a nivel de cuestionario, no de pregunta individual

#### **E. `/api/admin/unified-questions/publish`** (Publicar como Cuestionario)
- **POST**: Toma IDs de preguntas unificadas y crea un `Questionnaire` nuevo
- ⚠️ **Duplica las preguntas** al crear nuevas entradas en `Question`
- No vincula a las originales (no hay relación)

---

### 3. **Interfaces Administrativas**

#### **A. `/admin/create-formulario`** (Generador HTML)
- **Propósito**: Crear formularios HTML descargables
- **Fuente**: API unificada (`/api/admin/unified-questions`)
- **Funcionalidades**:
  - Selección de preguntas (filtros por tema/dificultad)
  - Generar HTML con solucionario
  - Publicar como cuestionario (crea nuevo `Questionnaire`)
- **Limitaciones**:
  - ❌ No permite editar preguntas antes de publicar
  - ❌ Al publicar, duplica las preguntas en la BD
  - ❌ No hay tracking de relación con preguntas originales

#### **B. `/admin/questions-review`** (Revisión de Cuestionarios)
- **Propósito**: Gestionar cuestionarios publicados
- **Fuente**: API `/api/admin/questions-review`
- **Funcionalidades**:
  - Ver cuestionarios existentes
  - Publicar/Archivar
  - Editar cuestionarios completos
- **Limitaciones**:
  - ❌ No permite editar preguntas individuales
  - ❌ No permite reutilizar preguntas entre cuestionarios
  - ❌ Vista de cuestionario completo (no banco de preguntas)

#### **C. `/admin/questions-manager`** (Gestor de Preguntas - 935 líneas)
- **Propósito**: Interfaz avanzada de gestión
- **Funcionalidades** (según el código):
  - 3 pestañas: Browse, Quality Control, Create
  - Filtros: Temario, Tema, Dificultad, Estado
  - Búsqueda por texto
  - Edición inline
  - Selección múltiple
  - Cambio de estado (PENDING/VALIDATED/QUARANTINED)
- **Estado Actual**:
  - ⚠️ **Interfaz existe pero solo accede a `Question`** (no a `GeneratedQuestion`)
  - ⚠️ Solo ve preguntas que ya están en cuestionarios publicados
  - ❌ No es un banco independiente

#### **D. `/admin/ai-documents`** (Gestión IA)
- **Propósito**: Subir documentos y generar preguntas con IA
- **Funcionalidades**:
  - Subir PDFs legales
  - Generar preguntas con Ollama (IA local)
  - Revisar/Aprobar preguntas IA
- **Limitaciones**:
  - ❌ Interfaz separada del resto
  - ❌ Las preguntas aprobadas no se integran automáticamente

---

## 🚨 PROBLEMAS IDENTIFICADOS

### 1. **Fragmentación de Datos**
- ❌ Preguntas en 2 modelos diferentes (`Question` vs `GeneratedQuestion`)
- ❌ Campos diferentes para la misma información (`temaCodigo` vs `topic`)
- ❌ Formato de opciones inconsistente (string vs array)
- ❌ No hay ID único que unifique una pregunta entre modelos

### 2. **Duplicación sin Control**
- ❌ Al publicar desde generador HTML, se duplican preguntas en `Question`
- ❌ No hay sistema de deduplicación en BD (solo en memoria)
- ❌ No se puede saber si una pregunta ya existe en otro cuestionario
- ❌ Editar una pregunta no actualiza todas sus copias

### 3. **Dependencia de Questionnaire**
- ❌ `Question` **SIEMPRE** debe estar vinculada a un `Questionnaire`
- ❌ No puede existir un "banco de preguntas" independiente en el modelo actual
- ❌ Para reutilizar una pregunta, hay que duplicarla

### 4. **Flujos Complejos y Redundantes**
- ❌ Múltiples rutas para llegar al mismo resultado:
  - Crear pregunta → `ai-documents` (IA) o `questions-create` (manual)
  - Revisar → `questions-review` (cuestionarios) o `questions-manager` (preguntas)
  - Publicar → `create-formulario` o `questions-review`
- ❌ No hay flujo único y claro

### 5. **Falta de Gestión Centralizada**
- ❌ No existe un panel "Banco de Preguntas" donde ver TODAS las preguntas
- ❌ No se pueden filtrar/buscar preguntas sin estar en un cuestionario
- ❌ No se pueden gestionar preguntas de forma independiente
- ❌ Las preguntas IA aprobadas quedan "huérfanas" hasta que se publican

### 6. **Limitaciones de Edición**
- ❌ Editar una pregunta en un cuestionario no afecta a otros cuestionarios
- ❌ No hay versionado de preguntas
- ❌ No se puede "actualizar" una pregunta en todos los cuestionarios que la usan
- ❌ Borrar un cuestionario borra sus preguntas (CASCADE)

### 7. **Asignación Manual Compleja**
- ❌ Para crear un cuestionario nuevo:
  1. Ir a `create-formulario`
  2. Seleccionar preguntas manualmente
  3. Publicar (que DUPLICA las preguntas)
  4. Ir a `questions-review` para gestionarlo
- ❌ No hay plantillas de cuestionarios
- ❌ No hay sugerencias automáticas de preguntas

### 8. **Falta de Metadatos y Organización**
- ❌ No hay etiquetas (tags) para clasificar preguntas
- ❌ No hay categorías más allá de tema/dificultad
- ❌ No hay autor/creador registrado
- ❌ No hay fecha de última revisión visible
- ❌ No hay scoring de calidad de preguntas

---

## 📈 FLUJO ACTUAL vs FLUJO IDEAL

### ❌ **Flujo Actual (Complejo)**

```
CREAR PREGUNTA IA:
1. Admin → /admin/ai-documents
2. Subir PDF
3. Generar con IA
4. Revisar/Aprobar una por una
5. Pregunta queda en GeneratedQuestion (aprobada)

USAR PREGUNTA EN CUESTIONARIO:
6. Admin → /admin/create-formulario
7. Seleccionar preguntas (ve Question + GeneratedQuestion)
8. Click "Publicar como Cuestionario"
9. Sistema DUPLICA las GeneratedQuestion → crea nuevas Question
10. Crea Questionnaire con las Question duplicadas
11. Ahora existen 2 copias: GeneratedQuestion original + Question en cuestionario

EDITAR PREGUNTA:
12. Admin → /admin/questions-manager (solo ve Question en cuestionarios)
13. O volver a /admin/ai-documents (solo GeneratedQuestion)
14. Editar NO actualiza las copias en otros lugares
```

### ✅ **Flujo Ideal (Centralizado)**

```
CREAR PREGUNTA:
1. Admin → /admin/question-bank (Banco Único)
2. Click "Nueva Pregunta" (manual o IA)
3. Sistema crea en Banco Central (1 única copia)
4. Estado: DRAFT → REVIEW → APPROVED

USAR EN CUESTIONARIO:
5. Admin → /admin/questionnaires/new
6. Seleccionar preguntas del Banco (REFERENCIA, no copia)
7. Sistema vincula preguntas existentes al cuestionario
8. Solo 1 copia en BD

EDITAR PREGUNTA:
9. Admin → /admin/question-bank/edit/[id]
10. Editar pregunta en el banco
11. Automáticamente se actualiza en TODOS los cuestionarios que la usan
12. Con opción de "crear nueva versión" si se quiere preservar histórico
```

---

## 🎯 PROPUESTA DE MEJORA (Visión General)

### Arquitectura Propuesta

#### **1. Modelo Unificado: `QuestionBank`**
```prisma
model QuestionBank {
  id              String   @id @default(cuid())
  text            String
  options         Json     // Array consistente
  correctAnswer   String
  explanation     String
  
  // Metadatos unificados
  temaCodigo      String
  temaNumero      Int
  temaTitulo      String
  difficulty      String   // facil, media, dificil
  
  // Clasificación
  tags            String[] // ["ley-39-2015", "procedimiento", "recursos"]
  category        String   // theory, practical, legal
  
  // Control de calidad
  source          String   // manual, ai, imported
  status          String   // draft, review, approved, deprecated
  qualityScore    Float?   // 0-100 basado en uso/feedback
  
  // Auditoría
  createdBy       String
  reviewedBy      String?
  lastReviewedAt  DateTime?
  version         Int      @default(1)
  createdAt       DateTime
  updatedAt       DateTime
  
  // Uso
  usageCount      Int      @default(0)
  successRate     Float?   // % aciertos promedio
  
  // Relaciones
  document        LegalDocument? @relation(...)
  questionnaireLinks QuestionnaireLink[] // Relación N:N
  history         QuestionHistory[]
}
```

#### **2. Relación N:N con Cuestionarios**
```prisma
model QuestionnaireLink {
  id              String @id @default(cuid())
  questionnaireId String
  questionBankId  String
  order           Int    // Orden en el cuestionario
  createdAt       DateTime
  
  questionnaire   Questionnaire @relation(...)
  question        QuestionBank  @relation(...)
  
  @@unique([questionnaireId, questionBankId])
}
```

**Beneficios**:
- ✅ Una pregunta puede estar en N cuestionarios (sin duplicar)
- ✅ Editar la pregunta actualiza todos los cuestionarios
- ✅ Eliminar un cuestionario NO elimina la pregunta
- ✅ Tracking de uso por cuestionario

#### **3. Historial de Versiones**
```prisma
model QuestionHistory {
  id             String @id @default(cuid())
  questionId     String
  version        Int
  snapshot       Json   // Copia completa de la pregunta
  changedBy      String
  changeReason   String
  createdAt      DateTime
  
  question       QuestionBank @relation(...)
}
```

---

## 🛠️ PLAN DE MIGRACIÓN (Propuesto)

### **Fase 1: Creación del Banco Unificado**
1. Crear modelo `QuestionBank` en schema.prisma
2. Crear modelo `QuestionnaireLink` para relación N:N
3. Migrar datos:
   - `Question` → `QuestionBank` (normalizar campos)
   - `GeneratedQuestion` aprobadas → `QuestionBank`
   - Crear `QuestionnaireLink` para mantener relaciones existentes
4. Mantener modelos antiguos temporalmente (solo lectura)

### **Fase 2: Nueva Interfaz de Gestión**
1. Crear `/admin/question-bank`:
   - Vista de tabla con todas las preguntas
   - Filtros avanzados (tema, tags, status, source, quality)
   - Búsqueda full-text
   - Edición inline
   - Acciones bulk (aprobar, etiquetar, eliminar)
2. Crear `/admin/question-bank/[id]`:
   - Vista detallada de pregunta
   - Historial de cambios
   - Cuestionarios que la usan
   - Estadísticas de rendimiento
   - Edición completa con preview

### **Fase 3: Nuevo Gestor de Cuestionarios**
1. Actualizar `/admin/questionnaires/new`:
   - Selector de preguntas desde el banco
   - Preview en tiempo real
   - Arrastrar para ordenar
   - Sugerencias automáticas (IA/estadísticas)
2. Actualizar `/admin/questionnaires/[id]/edit`:
   - Añadir/quitar preguntas del banco
   - Ver stats de cada pregunta
   - Reordenar

### **Fase 4: APIs Nuevas**
1. `/api/admin/question-bank` (CRUD completo)
2. `/api/admin/question-bank/search` (búsqueda avanzada)
3. `/api/admin/question-bank/duplicate-check` (antes de crear)
4. `/api/admin/question-bank/suggest` (sugerencias para cuestionarios)
5. `/api/admin/question-bank/stats` (analytics)

### **Fase 5: Automatizaciones**
1. Importación automática desde IA aprobadas
2. Detección de duplicados en tiempo real
3. Asignación automática a cuestionarios basada en criterios
4. Cálculo automático de qualityScore
5. Alertas de preguntas desactualizadas

---

## 📊 COMPARATIVA: Antes vs Después

| Aspecto | ❌ Sistema Actual | ✅ Sistema Propuesto |
|---------|-------------------|---------------------|
| **Modelos de preguntas** | 2 modelos separados | 1 modelo unificado |
| **Duplicación** | Sí, sin control | No, referencias |
| **Banco independiente** | No existe | Sí, centralizado |
| **Edición** | Por cuestionario | Global con historial |
| **Búsqueda** | Limitada | Full-text + filtros |
| **Reutilización** | Manual, duplicando | Automática, referenciando |
| **Gestión** | 4+ interfaces | 1 interfaz principal |
| **Control de calidad** | Manual disperso | Automatizado centralizado |
| **Tags/Categorías** | Solo tema | Múltiples dimensiones |
| **Versionado** | No existe | Historial completo |
| **Estadísticas** | Básicas | Avanzadas por pregunta |
| **Asignación a tests** | Manual compleja | Asistida/Automática |

---

## 🎯 BENEFICIOS ESPERADOS

### Para Administradores:
✅ **80% menos tiempo** creando cuestionarios  
✅ **Búsqueda instantánea** de cualquier pregunta  
✅ **Edición centralizada** - 1 cambio actualiza todo  
✅ **Detección automática** de duplicados  
✅ **Sugerencias inteligentes** al crear cuestionarios  
✅ **Visibilidad total** de uso y calidad de preguntas  

### Para el Sistema:
✅ **Reducción de 50-70%** en preguntas duplicadas en BD  
✅ **Consistencia garantizada** entre cuestionarios  
✅ **Escalabilidad** - fácil añadir miles de preguntas  
✅ **Mantenimiento simplificado** - 1 lugar para todo  
✅ **Trazabilidad completa** - quién cambió qué y cuándo  

### Para Estudiantes:
✅ **Mayor calidad** de preguntas (scoring + revisiones)  
✅ **Actualizaciones automáticas** cuando se corrige una pregunta  
✅ **Cuestionarios mejor balanceados** (algoritmo de selección)  

---

## ⚠️ RIESGOS Y CONSIDERACIONES

### Riesgos Técnicos:
- 🟡 **Migración de datos**: Requiere script robusto y testeo exhaustivo
- 🟡 **Compatibilidad**: Mantener APIs antiguas durante transición
- 🟡 **Rendimiento**: Queries N:N pueden ser costosas (optimizar con índices)

### Riesgos de Negocio:
- 🟡 **Tiempo de desarrollo**: ~3-4 semanas trabajo completo
- 🟡 **Curva de aprendizaje**: Admins necesitan adaptarse a nuevo sistema
- 🟡 **Datos legacy**: Mantener integridad de cuestionarios antiguos

### Mitigaciones:
✅ **Desarrollo incremental** por fases  
✅ **Mantener sistema antiguo** en paralelo 2-4 semanas  
✅ **Scripts de rollback** si hay problemas  
✅ **Documentación y tutoriales** para admins  
✅ **Testing exhaustivo** antes de producción  

---

## 📅 ESTIMACIÓN DE ESFUERZO

### Fase 1: Modelo y Migración (5-7 días)
- Schema Prisma: 1 día
- Scripts de migración: 2-3 días
- Testing migraci ón: 2-3 días

### Fase 2: Interfaz Banco de Preguntas (7-10 días)
- Vista principal: 3-4 días
- Edición individual: 2-3 días
- Filtros avanzados: 2-3 días

### Fase 3: Gestor de Cuestionarios (5-7 días)
- Selector de preguntas: 3-4 días
- Edición cuestionarios: 2-3 días

### Fase 4: APIs (3-5 días)
- CRUD completo: 2-3 días
- Búsqueda y sugerencias: 1-2 días

### Fase 5: Automatizaciones (5-7 días)
- Detección duplicados: 2 días
- Quality scoring: 2 días
- Auto-asignación: 2-3 días

**TOTAL**: 25-36 días (5-7 semanas)

---

## 🎬 PRÓXIMOS PASOS RECOMENDADOS

### Corto Plazo (Inmediato):
1. ✅ Revisar este análisis con el equipo
2. ✅ Priorizar funcionalidades críticas
3. ✅ Decidir alcance de MVP (¿implementar todo o por fases?)

### Medio Plazo (1-2 semanas):
4. ✅ Diseñar mockups de nuevas interfaces
5. ✅ Crear schema detallado de `QuestionBank`
6. ✅ Planificar migración de datos paso a paso
7. ✅ Definir criterios de qualityScore

### Largo Plazo (1-2 meses):
8. ✅ Implementar fase 1 (modelo + migración)
9. ✅ Testing exhaustivo de migración
10. ✅ Implementar fases 2-5 progresivamente
11. ✅ Lanzamiento gradual con admins

---

## 📌 CONCLUSIÓN

El sistema actual funciona pero tiene **deuda técnica significativa** que dificulta:
- Gestión eficiente de preguntas
- Creación ágil de cuestionarios
- Mantenimiento de calidad
- Escalabilidad futura

La propuesta de **Banco Unificado de Preguntas** resuelve estos problemas con:
- ✅ Arquitectura centralizada
- ✅ Eliminación de duplicados
- ✅ Gestión simplificada
- ✅ Automatizaciones inteligentes

**Recomendación**: Proceder con implementación incremental por fases, comenzando por la migración de datos y banco básico, agregando funcionalidades avanzadas progresivamente.

---

**¿Deseas que proceda con alguna fase específica de implementación?**

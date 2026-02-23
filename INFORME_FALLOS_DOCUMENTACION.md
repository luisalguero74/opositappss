# 📊 SISTEMA DE INFORMES DE FALLOS - DOCUMENTACIÓN

**Versión:** 1.0  
**Fecha:** 23 de febrero de 2026  
**Estado:** ✅ LISTO PARA IMPLEMENTAR

---

## 📋 Descripción

Sistema que permite a los usuarios generar un informe HTML profesional con todas las preguntas que han fallado en un cuestionario, incluyendo:
- ✅ Respuestas correctas e incorrectas marcadas visualmente
- ✅ Explicaciones legales completas
- ✅ Estadísticas del test
- ✅ Diseño profesional responsive
- ✅ Descarga directa en formato HTML

---

## 🎨 Características Visuales

### Diseño del Informe

```
┌─────────────────────────────────────┐
│  📊 Informe de Fallos               │
│  Cuestionario: Seguridad Social     │
├─────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐│
│  │  45  │ │  5   │ │ 90%  │ │  50  ││
│  │✅Cor │ │❌Fal │ │  %   │ │Total ││
│  └──────┘ └──────┘ └──────┘ └──────┘│
├─────────────────────────────────────┤
│  🔍 Preguntas Falladas (5)          │
│                                     │
│  ┌─ Pregunta 1 ──────────┐ Tema:X  │
│  │ ¿Texto pregunta...?            │
│  │                                 │
│  │ ⬜ A) Opción 1                  │
│  │ ❌ B) Opción 2  ✗ Tu respuesta │
│  │ ✅ C) Opción 3  ✓ Correcta     │
│  │ ⬜ D) Opción 4                  │
│  │                                 │
│  │ 💡 Explicación:                │
│  │ Según art. X de la Ley...      │
│  └─────────────────────────────────┘
│                                     │
│  [Más preguntas...]                 │
├─────────────────────────────────────┤
│  Usuario: Juan Pérez                │
│  Fecha: 23 feb 2026, 15:30          │
│  OpositApp                          │
└─────────────────────────────────────┘
```

### Colores y Estilos

- **Header:** Gradiente morado (667eea → 764ba2)
- **Correctas:** Verde (#28a745)
- **Falladas:** Rojo (#dc3545)
- **Explicación:** Fondo azul claro con borde morado
- **Tarjetas:** Sombras suaves, bordes redondeados
- **Hover:** Efectos de elevación

---

## 🔧 Implementación

### Archivo Creado

**[COMPONENTE_INFORME_FALLOS_READY.tsx](COMPONENTE_INFORME_FALLOS_READY.tsx)**

### Ubicación Sugerida

```
/components/FailedQuestionsReport.tsx
```

### Dependencias

Ninguna adicional - Solo React y Tailwind CSS (ya instalado)

---

## 📝 Cómo Integrar

### 1. Copiar Componente

```bash
cp COMPONENTE_INFORME_FALLOS_READY.tsx components/FailedQuestionsReport.tsx
```

### 2. Importar en Página de Resultados

**Ejemplo en `/app/quiz/[id]/page.tsx`:**

```typescript
import FailedQuestionsReport from '@/components/FailedQuestionsReport'

// En tu componente de resultados:
{showResults && (
  <div>
    {/* ... resultados existentes ... */}
    
    <FailedQuestionsReport
      questions={questions}
      userAnswers={userAnswers}
      quizTitle={questionnaire?.title}
      userName={session?.user?.name || 'Usuario'}
      completedAt={new Date()}
      score={score}
      totalQuestions={questions.length}
    />
  </div>
)}
```

### 3. Props del Componente

```typescript
interface FailedQuestionsReportProps {
  questions: Question[]           // Array de preguntas del test
  userAnswers: UserAnswer[]       // Respuestas del usuario
  quizTitle?: string              // Título del cuestionario
  userName?: string               // Nombre del usuario
  completedAt?: Date              // Fecha/hora completado
  score?: number                  // Puntuación (opcional)
  totalQuestions?: number         // Total de preguntas
}
```

---

## 🎯 Lugares de Integración

### 1. Página de Quiz (`/quiz/[id]`)

**Ubicación:** Después de mostrar resultados

**Código a agregar:**
```typescript
{showResults && (
  <>
    {/* Resultados actuales */}
    <div className="results">...</div>
    
    {/* NUEVO: Botón informe */}
    <FailedQuestionsReport
      questions={questions}
      userAnswers={userAnswers}
      quizTitle={questionnaire?.title}
      userName={session?.user?.name}
      completedAt={new Date()}
      totalQuestions={questions.length}
    />
  </>
)}
```

---

### 2. Modo Examen (`/exam-mode`)

**Ubicación:** Pantalla de resultados finales

**Código a agregar:**
```typescript
{examCompleted && (
  <div className="exam-results">
    {/* Estadísticas existentes */}
    
    <FailedQuestionsReport
      questions={questions}
      userAnswers={userAnswers}
      quizTitle="Modo Examen"
      userName={session?.user?.name}
      completedAt={new Date()}
      score={correctAnswers}
      totalQuestions={questions.length}
    />
  </div>
)}
```

---

### 3. Práctica Rápida (`/practica-rapida`)

**Código a agregar:**
```typescript
<FailedQuestionsReport
  questions={questions}
  userAnswers={answers}
  quizTitle="Práctica Rápida"
  userName={session?.user?.name}
  completedAt={new Date()}
  totalQuestions={10}
/>
```

---

### 4. Casos Prácticos (`/practical-cases/[id]`)

**Código a agregar:**
```typescript
<FailedQuestionsReport
  questions={practicalCase.questions}
  userAnswers={userAnswers}
  quizTitle={practicalCase.title}
  userName={session?.user?.name}
  completedAt={new Date()}
  totalQuestions={practicalCase.questions.length}
/>
```

---

### 5. Examen Oficial (`/dashboard/exam-simulation/results/[id]`)

**Código a agregar:**
```typescript
<FailedQuestionsReport
  questions={allQuestions}
  userAnswers={userAnswers}
  quizTitle={`Simulacro Oficial ${examData.date}`}
  userName={session?.user?.name}
  completedAt={examData.completedAt}
  score={examData.score}
  totalQuestions={examData.totalQuestions}
/>
```

---

## 🔍 Ejemplo de Uso Completo

```typescript
'use client'

import { useState } from 'react'
import FailedQuestionsReport from '@/components/FailedQuestionsReport'

export default function QuizResults() {
  // Datos del quiz
  const questions = [
    {
      id: '1',
      text: '¿Cuál es la estructura de la Seguridad Social?',
      options: ['RG y RE', 'Solo RG', 'Solo RE', 'Ninguna'],
      correctAnswer: 'A',
      explanation: 'Según art. 9 LGSS...',
      temaCodigo: '01.01',
      temaTitulo: 'Estructura SS'
    },
    // ... más preguntas
  ]

  const userAnswers = [
    { questionId: '1', selectedAnswer: 'B', isCorrect: false },
    { questionId: '2', selectedAnswer: 'A', isCorrect: true },
    // ... más respuestas
  ]

  return (
    <div>
      <h1>Resultados del Test</h1>
      
      {/* Estadísticas */}
      <div className="stats">...</div>
      
      {/* Botón para generar informe */}
      <FailedQuestionsReport
        questions={questions}
        userAnswers={userAnswers}
        quizTitle="Tema 1: Seguridad Social"
        userName="Juan Pérez"
        completedAt={new Date()}
        score={8}
        totalQuestions={10}
      />
    </div>
  )
}
```

---

## ✨ Características Técnicas

### Generación HTML

- ✅ **Standalone:** No requiere CSS externo
- ✅ **Responsive:** Se adapta a móviles y tablets
- ✅ **Imprimible:** Optimizado para impresión
- ✅ **Offline:** Funciona sin conexión una vez descargado

### Nombre del Archivo

Formato: `informe-fallos-{titulo}-{fecha}.html`

Ejemplo: `informe-fallos-tema-1-seguridad-social-2026-02-23.html`

### Tamaño del Archivo

- Típico: 50-200 KB
- Con muchas preguntas (50+): hasta 500 KB
- Sin imágenes, solo texto y estilos CSS inline

---

## 🎨 Personalización

### Cambiar Colores

En el CSS generado, buscar y modificar:

```css
/* Gradiente principal */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Correctas */
.correct { color: #28a745; }

/* Falladas */
.failed { color: #dc3545; }
```

### Añadir Logo

En la sección `<div class="header">`:

```html
<img src="https://tu-dominio.com/logo.png" alt="Logo" style="max-width: 150px; margin-bottom: 20px;">
```

### Modificar Fuentes

```css
body {
    font-family: 'Tu Fuente', sans-serif;
}
```

---

## 📊 Casos de Uso

### Caso 1: Estudiante revisa errores

**Flujo:**
1. Usuario completa test
2. Ve resultados en pantalla
3. Clic en "Generar Informe de Fallos"
4. Descarga HTML
5. Abre archivo en navegador
6. Estudia explicaciones offline

**Beneficio:** Puede revisar tranquilamente sus errores sin estar conectado

---

### Caso 2: Preparador evalúa estudiante

**Flujo:**
1. Estudiante completa test
2. Genera informe
3. Envía HTML al preparador
4. Preparador revisa fallos
5. Da feedback personalizado

**Beneficio:** Comunicación asíncrona efectiva

---

### Caso 3: Archivo histórico

**Flujo:**
1. Usuario hace test cada semana
2. Genera informe cada vez
3. Guarda en carpeta "Evolución"
4. Compara progresos

**Beneficio:** Trazabilidad del aprendizaje

---

## 🔒 Privacidad y Seguridad

- ✅ **Sin servidor:** Todo se genera en el navegador
- ✅ **Sin subida:** Nada se envía a servidores externos
- ✅ **Offline:** El HTML funciona sin internet
- ✅ **Sin tracking:** No hay scripts de analítica
- ✅ **Datos locales:** El usuario controla sus archivos

---

## 🧪 Testing

### Pruebas Manuales

1. **Sin fallos:**
   - Resultado: Mensaje "¡Perfecto! Sin fallos"
   - Botón no se muestra

2. **Con fallos (1-5):**
   - Resultado: Informe compacto
   - Todas las explicaciones visibles

3. **Con muchos fallos (>20):**
   - Resultado: Informe largo pero navegable
   - Scroll suave

4. **Responsive:**
   - Mobile: Columnas apiladas
   - Tablet: Grid 2 columnas
   - Desktop: Grid 4 columnas

### Pruebas de Descarga

```javascript
// Verificar que el archivo se descarga correctamente
const handleTest = () => {
  // Simular datos
  const testData = { ... }
  
  // Generar informe
  generateReport(testData)
  
  // Verificar en Downloads folder
}
```

---

## 🚀 Próximas Mejoras (Opcionales)

### 1. Envío por Email

```typescript
const sendReportByEmail = async (html: string) => {
  await fetch('/api/send-report', {
    method: 'POST',
    body: JSON.stringify({ html, email: user.email })
  })
}
```

### 2. Gráficos de Estadísticas

Añadir Chart.js para visualizar:
- Distribución de fallos por tema
- Evolución temporal
- Comparativa con otros usuarios

### 3. Exportar a PDF

Usar librería como `html2pdf.js`:

```typescript
import html2pdf from 'html2pdf.js'

const exportToPDF = () => {
  const element = document.getElementById('report')
  html2pdf().from(element).save()
}
```

### 4. Compartir en Redes

Botón para compartir logros:

```typescript
const shareResults = () => {
  if (navigator.share) {
    navigator.share({
      title: 'Mis resultados en OpositApp',
      text: `He completado el test con ${score}% de aciertos`
    })
  }
}
```

---

## 📝 Checklist de Implementación

- [ ] Copiar componente a `/components/FailedQuestionsReport.tsx`
- [ ] Importar en página de resultados del quiz
- [ ] Probar con datos de prueba
- [ ] Verificar descarga del HTML
- [ ] Abrir HTML generado en navegador
- [ ] Verificar responsive (mobile/tablet/desktop)
- [ ] Probar impresión (Ctrl+P)
- [ ] Verificar con 0 fallos (mensaje de éxito)
- [ ] Verificar con 1 fallo
- [ ] Verificar con muchos fallos (>20)
- [ ] Integrar en otros contextos (exam-mode, práctica rápida, etc.)
- [ ] Documentar en manual de usuario
- [ ] Deploy a producción

---

## 💡 Tips de UX

1. **Posicionamiento del botón:**
   - Después de las estadísticas
   - Antes de "Volver a intentar"
   - Destacado con color llamativo

2. **Mensajes:**
   - "Generando informe..." mientras procesa
   - "Descargado" cuando termina
   - Error claro si falla

3. **Icono:**
   - 📄 Documento
   - ⬇️ Descarga
   - 🔍 Revisar

4. **Color:**
   - Rojo/Rosa para "fallos" (negativo pero constructivo)
   - Verde para "sin fallos" (positivo)

---

## 🆘 Troubleshooting

### Problema: "No se descarga el archivo"

**Solución:**
- Verificar permisos del navegador
- Revisar bloqueador de pop-ups
- Probar en modo incógnito

### Problema: "HTML no se ve bien"

**Solución:**
- Verificar encoding UTF-8
- Comprobar que el CSS está inline
- Abrir en navegador actualizado

### Problema: "Opciones no se muestran correctamente"

**Solución:**
- Verificar que `options` es array o JSON string válido
- Parsear correctamente con `JSON.parse()` si necesario

---

**✅ TODO LISTO PARA IMPLEMENTAR**

**Tiempo estimado de integración:** 10-15 minutos por contexto  
**Complejidad:** Baja  
**Valor para usuario:** Alto ⭐⭐⭐⭐⭐

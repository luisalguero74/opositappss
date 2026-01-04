# 📚 Sistema de Recomendaciones de Estudio

## Nueva Funcionalidad Implementada

Se ha añadido una nueva pestaña **"Recomendaciones de Estudio"** en la sección de Estadísticas de Aprendizaje.

## 🎯 Características

### 1. **Análisis de Temas con Alto Índice de Errores**

El sistema identifica automáticamente los temas donde el usuario tiene más dificultades:

- **Filtro inteligente**: Solo muestra temas con tasa de error > 30% y al menos 3 errores
- **Clasificación por prioridad**:
  - 🔴 **URGENTE** (≥70% errores): Requiere estudio completo desde cero
  - 🟠 **ALTA PRIORIDAD** (≥50% errores): Necesita refuerzo general
  - 🟡 **ATENCIÓN** (≥30% errores): Conceptos por consolidar
  - 🟢 **BUEN RENDIMIENTO** (<30% errores): Repaso puntual

- **Información mostrada**:
  - Nombre del tema
  - Número de errores vs preguntas totales
  - Tasa de error en porcentaje
  - Barra visual de progreso
  - Recomendación personalizada según nivel de error

### 2. **Fundamento Legal de Errores**

Para cada pregunta fallada, el sistema muestra:

- **Pregunta completa** que se ha fallado
- **Respuesta correcta**
- **Artículo legal** donde se encuentra la respuesta
- **Número de veces** que se ha fallado
- **Consejo de estudio** para profundizar

### 3. **Extracción Automática de Artículos**

El sistema busca automáticamente en las explicaciones y respuestas:

- Artículo X de la Ley Y
- Real Decreto Legislativo X/XXXX
- Referencias a normativa (LGSS, ET, CE, etc.)
- Artículos específicos con formato art. X.Y

Si no encuentra referencia legal explícita, recomienda revisar el temario correspondiente.

## 📊 Cómo Funciona

### Algoritmo de Recomendaciones

1. **Recopilación de datos**: Analiza todas las respuestas del usuario
2. **Agrupación por tema**: Calcula errores por cuestionario/tema
3. **Cálculo de tasas**: Determina porcentaje de error
4. **Priorización**: Ordena temas de mayor a menor tasa de error
5. **Extracción legal**: Busca artículos en explicaciones usando regex
6. **Generación de consejos**: Crea recomendaciones personalizadas

### Patrones de Búsqueda de Artículos

El sistema reconoce:
- `artículo 123`
- `art. 45.2`
- `según el artículo 78`
- `conforme al artículo 12`
- `Ley 14/2015`
- `Real Decreto Legislativo 8/2015`
- `RDL 2/2015`

## 🎨 Interfaz Visual

### Pestaña de Recomendaciones

4 pestañas disponibles:
1. 📊 **Vista General** - Resumen de progreso
2. ❌ **Fallos Recientes** - Últimos 20 errores
3. 🔄 **Errores Repetidos** - Preguntas con múltiples fallos
4. 📚 **Recomendaciones** ← NUEVA

### Diseño de Tarjetas

**Temas a Repasar**:
- Fondo degradado rojo-naranja según urgencia
- Métricas destacadas (errores/total)
- Barra de progreso visual
- Caja de recomendación con icono 💡

**Fundamento Legal**:
- Fondo azul claro
- Badge si se falló múltiples veces
- Sección de pregunta en blanco
- Respuesta correcta en verde
- Artículo legal en caja ámbar con icono ⚖️
- Consejo adicional al final

## 📈 Beneficios para el Usuario

✅ **Estudio dirigido**: Sabe exactamente qué temas necesitan más atención  
✅ **Fundamento jurídico**: Conoce dónde buscar la respuesta en la legislación  
✅ **Priorización clara**: Códigos de color según urgencia  
✅ **Seguimiento personalizado**: Basado en su historial real  
✅ **Prevención de errores**: Refuerza artículos específicos fallados  

## 🔧 Archivos Modificados

### Frontend
- **`app/statistics/page.tsx`**:
  - Añadida pestaña "Recomendaciones"
  - Nuevo tipo `studyRecommendations` en interface
  - Renderizado de temas a repasar
  - Renderizado de fundamentos legales

### Backend
- **`app/api/statistics/route.ts`**:
  - Función `extractLegalArticle()` - Extrae artículos con regex
  - Función `generateRecommendation()` - Genera consejos personalizados
  - Lógica de agrupación por tema
  - Cálculo de tasas de error
  - Filtrado de temas críticos (>30% error, ≥3 fallos)

## 💡 Ejemplos de Recomendaciones

### Tema con 75% de errores:
> ⚠️ URGENTE: Este tema requiere estudio completo desde cero. Has fallado 15 de 20 preguntas (75%). Dedica varias sesiones de estudio exclusivas a este tema, lee la normativa base y realiza esquemas.

### Tema con 55% de errores:
> 🔴 ALTA PRIORIDAD: Necesitas reforzar este tema. Revisa los artículos legales principales, realiza resúmenes y vuelve a hacer los tests después de estudiar la teoría.

### Tema con 35% de errores:
> 🟡 ATENCIÓN NECESARIA: Tienes conceptos que consolidar. Repasa las partes específicas donde has fallado, consulta la normativa y practica con más ejercicios.

## 🚀 Uso

1. Inicia sesión en opositAPPSS
2. Ve a **Dashboard** → **Estadísticas de Aprendizaje**
3. Click en la pestaña **📚 Recomendaciones**
4. Revisa tus temas críticos y fundamentos legales
5. Estudia los artículos señalados
6. Vuelve a practicar los cuestionarios

---

**Nota**: Las recomendaciones se actualizan automáticamente con cada nuevo cuestionario completado, proporcionando siempre datos actualizados sobre tu progreso.

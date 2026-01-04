# Sistema de Ayuda Interactivo - opositAPPSS

## 📋 Descripción

Sistema de ayuda contextual e interactivo que permite a los usuarios resolver sus dudas de forma autónoma mediante búsqueda inteligente y tutoriales visuales paso a paso.

## 🎯 Características

### Botón Flotante
- ✅ Visible en todas las páginas del usuario
- ✅ Posición fija en esquina inferior derecha
- ✅ Animación de pulso para llamar la atención
- ✅ Tooltip informativo al pasar el ratón
- ✅ Acceso con un solo clic

### Modal de Ayuda
- ✅ Buscador inteligente con autocompletado
- ✅ Búsqueda por palabras clave
- ✅ Categorización de temas
- ✅ Tutoriales paso a paso
- ✅ Consejos útiles
- ✅ Interfaz intuitiva y visual

### Sistema de Búsqueda
- ✅ Búsqueda en tiempo real
- ✅ Coincidencia por:
  - Pregunta completa
  - Palabras clave
  - Contenido de respuesta
- ✅ Filtrado por categorías
- ✅ Resultados instantáneos

## 📚 Temas de Ayuda Disponibles

### 🎓 Aulas Virtuales
1. **¿Cómo entro a un aula virtual?**
   - Navegación desde dashboard
   - Acceso a lista de aulas
   - Proceso de entrada
   - Permisos de cámara/micrófono
   
2. **¿Qué controles tengo en el aula virtual?**
   - Cámara y micrófono
   - Compartir pantalla
   - Chat y levantar mano
   - Configuración avanzada

### 📝 Simulacros de Examen
**¿Cómo funcionan los simulacros de examen?**
- Acceso al simulacro
- Condiciones del examen (70+15 preguntas, 120 min)
- Cronómetro automático
- Revisión de resultados
- Gestión del tiempo

### 📚 Cuestionarios
**¿Cómo hacer cuestionarios de teoría o prácticos?**
- Selección de tipo de cuestionario
- Proceso de realización
- Envío de respuestas
- Revisión de explicaciones
- Sin límite de tiempo

### 📊 Estadísticas
**¿Dónde veo mis estadísticas y progreso?**
- Acceso al panel de estadísticas
- Métricas disponibles
- Análisis de errores
- Evolución temporal
- Identificación de áreas de mejora

### 🗣️ Foro
**¿Cómo usar el foro de supuestos?**
- Navegación del foro
- Creación de hilos
- Respuesta a otros usuarios
- Búsqueda de temas existentes

### 💰 Suscripción
**¿Cómo gestiono mi suscripción?**
- Acceso a gestión
- Cambio de plan
- Cancelación
- Proceso de pago con Stripe

### 🔐 Cuenta
1. **¿Olvidé mi contraseña, cómo la recupero?**
   - Proceso de recuperación
   - Email de restablecimiento
   - Creación de nueva contraseña
   
2. **¿Cómo verifico mi email?**
   - Email de verificación
   - Activación de cuenta
   - Solución de problemas

### 🔧 Problemas Técnicos
**Tengo un problema técnico, ¿qué hago?**
- Pasos de diagnóstico
- Limpieza de caché
- Pruebas en otros navegadores
- Contacto con soporte

### 📱 Móvil
**¿Puedo usar opositAPPSS desde el móvil?**
- Compatibilidad responsive
- Navegadores recomendados
- Instalación como app
- Optimizaciones para móvil

## 🏗️ Arquitectura Técnica

### Componentes

#### HelpButton.tsx
```typescript
- Botón flotante fijo
- Posición: bottom-6 right-6
- z-index: 40
- Animación de pulso
- Control de estado del modal
```

#### HelpModal.tsx
```typescript
- Modal full-screen overlay
- Sistema de búsqueda en tiempo real
- Navegación por categorías
- Vista de lista y vista de detalle
- Almacenamiento local de temas
```

### Datos de Ayuda

#### Estructura HelpTopic
```typescript
interface HelpTopic {
  id: string                // Identificador único
  category: string          // Categoría visual (con emoji)
  keywords: string[]        // Palabras clave para búsqueda
  question: string          // Pregunta principal
  answer: string            // Respuesta resumida
  steps?: string[]          // Pasos numerados
  tips?: string[]           // Consejos útiles
  video?: string            // URL de video tutorial (futuro)
}
```

### Sistema de Búsqueda

**Lógica de Filtrado:**
1. Si hay texto de búsqueda:
   - Buscar en `question` (case-insensitive)
   - Buscar en `answer` (case-insensitive)
   - Buscar en array `keywords` (includes)
   - Devolver coincidencias

2. Si hay categoría activa:
   - Filtrar por `category` exacta
   - Mantener orden original

3. Sin búsqueda ni filtros:
   - Mostrar todos los temas
   - Orden predefinido

### Estilos y UX

**Colores:**
- Header: Gradiente azul-índigo
- Botón flotante: Gradiente azul-índigo
- Categoría activa: bg-blue-100
- Pasos: Gradiente azul-índigo numerado
- Tips: bg-yellow-50

**Animaciones:**
- Hover en botón: scale-110
- Pulso en botón: animate-ping
- Transiciones suaves: 300ms

**Responsive:**
- Modal: max-w-4xl
- Sidebar: w-64
- Altura: max-h-[90vh]
- Overflow: scroll automático

## 🎨 Guía de Uso

### Para Usuarios

1. **Abrir Ayuda:**
   - Busca el botón azul flotante (esquina inferior derecha)
   - Tiene un icono de interrogación
   - Haz clic para abrir

2. **Buscar una Duda:**
   - Escribe tu pregunta en el buscador
   - Ejemplos:
     - "cómo entrar aula"
     - "simulacro examen"
     - "olvidé contraseña"
   - Los resultados aparecen instantáneamente

3. **Explorar Categorías:**
   - Haz clic en una categoría del menú lateral
   - Ver todos los temas de esa categoría
   - O haz clic en "Todos los temas"

4. **Ver Tutorial:**
   - Haz clic en cualquier pregunta
   - Lee la explicación
   - Sigue los pasos numerados
   - Revisa los consejos útiles
   - Vuelve atrás para ver más temas

5. **Contactar Soporte:**
   - Si no resuelves tu duda
   - Usa el enlace de contacto
   - Envía email a soporte

### Para Desarrolladores

**Añadir Nuevo Tema:**

1. Edita `HelpModal.tsx`
2. Añade objeto al array `HELP_TOPICS`:

```typescript
{
  id: 'unique-id',
  category: '🔧 Categoría',
  keywords: ['palabra1', 'palabra2', 'palabra3'],
  question: '¿Pregunta del usuario?',
  answer: 'Respuesta breve introductoria',
  steps: [
    'Paso 1: Descripción',
    'Paso 2: Descripción',
    '...'
  ],
  tips: [
    'Consejo 1',
    'Consejo 2',
    '...'
  ]
}
```

3. **Buenas prácticas:**
   - ID único y descriptivo
   - Mínimo 5 keywords relevantes
   - Pregunta en formato usuario real
   - Respuesta clara y concisa
   - Pasos accionables (verbos)
   - Tips útiles y prácticos

**Integrar en Nueva Página:**

```typescript
import HelpButton from '@/components/HelpButton'

export default function MiPagina() {
  return (
    <div>
      <HelpButton />
      {/* Resto del contenido */}
    </div>
  )
}
```

## 📊 Métricas de Uso

**Posibles Mejoras Futuras:**

1. **Analytics:**
   - Búsquedas más comunes
   - Temas más consultados
   - Temas sin resolver
   - Tiempo de navegación

2. **Mejoras:**
   - Videos tutoriales embebidos
   - GIFs animados para pasos
   - Capturas de pantalla
   - Chat en vivo
   - IA para respuestas dinámicas
   - Votación de utilidad
   - Comentarios en temas

## 🔧 Mantenimiento

### Actualización de Contenido

**Frecuencia:** Revisar mensualmente

**Tareas:**
1. Añadir nuevas funcionalidades
2. Actualizar pasos obsoletos
3. Corregir información incorrecta
4. Añadir keywords según búsquedas
5. Mejorar explicaciones poco claras

### Monitoreo de Calidad

**Checklist:**
- [ ] Todos los enlaces funcionan
- [ ] Pasos son accionables
- [ ] No hay información contradictoria
- [ ] Keywords cubren casos de uso
- [ ] Categorías bien organizadas
- [ ] Responsive en móvil
- [ ] Accesibilidad (ARIA labels)

## 🚀 Extensiones Futuras

### Videos Tutorial
```typescript
{
  id: 'classroom-join',
  // ... otros campos
  video: 'https://youtube.com/watch?v=xxx'
}
```

Renderizar:
```tsx
{selectedTopic.video && (
  <div className="mb-6">
    <iframe 
      src={selectedTopic.video}
      className="w-full aspect-video rounded-xl"
    />
  </div>
)}
```

### Chat Bot IA

Integración con OpenAI:
```typescript
const getAIResponse = async (question: string) => {
  const response = await fetch('/api/help/ai', {
    method: 'POST',
    body: JSON.stringify({ question })
  })
  return response.json()
}
```

### Feedback de Usuario

```typescript
interface HelpTopic {
  // ... campos existentes
  helpful?: number      // Votos positivos
  notHelpful?: number   // Votos negativos
  comments?: Comment[]  // Comentarios de usuarios
}
```

### Búsqueda Semántica

Usar embeddings para búsqueda más inteligente:
```typescript
// Indexar temas con vectores
const indexed = await indexTopics(HELP_TOPICS)

// Buscar semánticamente
const results = await semanticSearch(query, indexed)
```

## 📞 Soporte

**Email:** soporte@opositappss.com

**Horario:** L-V 9:00-18:00

**Tiempo de respuesta:** 24-48 horas

---

**opositAPPSS** - Centro de Ayuda Interactivo
Versión 1.0 - Diciembre 2024

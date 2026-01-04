# 🔧 Manual de Administrador - OpositApp

## 🎯 Introducción

Bienvenido al manual de administración de **OpositApp**. Esta guía cubre todas las funcionalidades administrativas para gestionar la plataforma de forma efectiva.

## 🚀 Acceso al Panel de Administración

### Requisitos Previos

- Cuenta con rol `admin` en la base de datos
- Acceso a `/admin` desde el navegador

### Primer Acceso

1. Inicia sesión con cuenta de administrador
2. Accede a `/admin`
3. Verás el panel principal con todas las secciones

## 📊 Panel Principal de Administración

### Secciones Disponibles

- **👥 Gestión de Usuarios**: Administrar cuentas
- **📚 Gestión de Temario**: Temas y contenido
- **❓ Gestión de Preguntas**: Crear y editar preguntas
- **📝 Supuestos Prácticos**: Administrar casos prácticos
- **💳 Monetización**: Gestión de suscripciones
- **📱 Validación de Teléfonos**: Control de acceso
- **🎨 Vista Previa de Celebración**: Probar efectos visuales
- **📊 Estadísticas Globales**: Analytics de la plataforma

## 👥 Gestión de Usuarios

### Ver Listado de Usuarios

**Ruta**: `/admin/users`

**Información visible**:
- ID de usuario
- Nombre y email
- Rol (user/admin/premium)
- Fecha de registro
- Estado de suscripción
- Teléfono validado
- Última actividad

### Acciones sobre Usuarios

#### 1. Cambiar Rol

```typescript
// Roles disponibles:
- user: Usuario normal
- admin: Administrador
- premium: Usuario con suscripción activa
```

#### 2. Activar/Desactivar Usuario

- Suspender temporalmente
- Bloquear permanentemente
- Reactivar cuenta

#### 3. Editar Datos

- Modificar email
- Resetear contraseña
- Actualizar información personal

#### 4. Ver Actividad

- Tests realizados
- Tiempo de estudio
- Última conexión
- Historial de pagos

### Gestión de Suscripciones Manuales

**Ruta**: `/admin/monetization`

1. Selecciona usuario
2. Elige plan (Free/Premium/Unlimited)
3. Establece fecha de expiración
4. Guarda cambios

**Casos de uso**:
- Compensación por problemas
- Pruebas gratuitas extendidas
- Pagos offline (transferencia/PayPal)
- Becas o promociones especiales

## 📚 Gestión de Temario

### Estructura del Temario

**Archivo**: `data/temario-config.json`

```json
{
  "general": [
    {
      "codigo": "G1",
      "numero": 1,
      "titulo": "La Constitución Española de 1978",
      "activo": true
    }
  ],
  "especifico": [...]
}
```

### Activar/Desactivar Temas

1. Edita `temario-config.json`
2. Cambia `"activo": true/false`
3. Guarda y reinicia el servidor
4. Los cambios se reflejan inmediatamente

### Añadir Nuevos Temas

```json
{
  "codigo": "G25",
  "numero": 25,
  "titulo": "Título del nuevo tema",
  "parte": "general",
  "activo": true
}
```

### Documentos del Temario

**Ubicación**: `documentos-temario/`

**Estructura**:
```
documentos-temario/
├── general/
│   ├── tema-01.pdf
│   ├── tema-02.pdf
│   └── ...
├── especifico/
│   └── tema-01.pdf
└── biblioteca/
    └── leyes/
        └── constitucion.pdf
```

**Formatos soportados**: PDF, TXT, DOCX

## ❓ Gestión de Preguntas

### Ver Preguntas Existentes

**Ruta**: `/admin/questions`

**Filtros disponibles**:
- Por tema
- Por dificultad
- Por estado (activa/inactiva)
- Por fuente (manual/IA)

### Crear Preguntas Manualmente

**Ruta**: `/admin/questions/create`

**Campos requeridos**:
```typescript
{
  text: string              // Enunciado
  options: string[]         // 4 opciones (A, B, C, D)
  correctAnswer: string     // "A", "B", "C" o "D"
  explanation: string       // Explicación detallada
  temaCodigo: string        // "G1", "E3", etc.
  difficulty: string        // "easy", "medium", "hard"
  legalReference?: string   // Artículo, ley, etc.
}
```

**Ejemplo**:
```
Enunciado:
¿En qué año se aprobó la Constitución Española?

Opciones:
A) 1975
B) 1978
C) 1979
D) 1980

Respuesta correcta: B

Explicación:
La Constitución Española fue aprobada en referéndum el 6 de diciembre de 1978 y promulgada el 27 de diciembre de 1978.

Fundamento Legal:
Constitución Española de 1978, Disposición Final
```

### Generar Preguntas con IA

#### Generación Manual

**Script**: `scripts/cron-generate-questions.ts`

```bash
# Generar para un tema específico
npx tsx scripts/cron-generate-questions.ts --tema=G1 --cantidad=10

# Generar para todos los temas
npx tsx scripts/cron-generate-questions.ts --all

# Modo de prueba (no guarda)
npx tsx scripts/cron-generate-questions.ts --tema=G1 --dry-run
```

#### Generación Automática (Cron)

**Configuración**: Ver [AUTOMATIZACION_GENERACION_CRON.md](./AUTOMATIZACION_GENERACION_CRON.md)

**Horarios predeterminados**:
- 🌙 **2:00 AM diaria**: Genera 5 preguntas de tema general aleatorio
- 🌄 **4:00 AM lunes**: Genera 10 preguntas de tema específico
- 🌅 **3:00 AM primer día del mes**: Genera 3 preguntas de cada tema

**Instalar cron**:
```bash
bash scripts/setup-cron.sh install
```

**Verificar instalación**:
```bash
bash scripts/setup-cron.sh list
```

### Protección contra Duplicados

El sistema incluye **detección de duplicados** con algoritmo Jaccard Index:

- **Umbral**: 70% de similitud
- **Aplica a**: Generación manual y automática
- **Acción**: Descarta preguntas similares automáticamente

### Editar Preguntas

1. Ve a `/admin/questions`
2. Busca la pregunta
3. Click en **"Editar"**
4. Modifica campos necesarios
5. Guarda cambios

### Eliminar Preguntas

**Precaución**: Eliminar es permanente

1. Selecciona pregunta
2. Click en **"Eliminar"**
3. Confirma la acción
4. Se eliminan también:
   - Respuestas de usuarios
   - Estadísticas asociadas

## 📝 Gestión de Supuestos Prácticos

### Ver Supuestos Prácticos

**Ruta**: `/admin/practical-cases`

**Vista de lista**:
- ID y título
- Categoría (Supuesto/Caso)
- Número de preguntas
- Número de intentos
- Estado (Publicado/Borrador)
- Fecha de creación

### Crear Nuevo Supuesto

**Ruta**: `/admin/practical-cases/create`

#### Métodos de Creación

**1. Subir desde archivo TXT**

Formato del archivo:
```
TÍTULO: Examen Modelo A 2024

ENUNCIADO:
[Texto completo del enunciado del supuesto...]

PREGUNTA 1:
¿Texto de la pregunta?
A) Opción A
B) Opción B  
C) Opción C
D) Opción D
RESPUESTA: B
EXPLICACIÓN: Justificación legal de por qué B es correcta...

PREGUNTA 2:
[...]
```

**2. Subir desde archivo DOCX**

- Mismo formato que TXT
- Mantiene formato de párrafos
- Se parsea automáticamente

**3. Entrada manual**

- Formulario web
- Añadir preguntas una a una
- Vista previa en tiempo real

### Publicar Supuesto Práctico

Al publicar debes elegir la **categoría**:

#### Categorías Disponibles

1. **📝 Supuesto Práctico**
   - Exámenes oficiales completos
   - Casos complejos con enunciado largo
   - Aparece en sección "Supuestos Prácticos"

2. **💼 Caso Práctico**
   - Ejercicios específicos
   - Práctica de conceptos concretos
   - Aparece en sección "Casos Prácticos"

#### Proceso de Publicación

1. Ve a la lista de supuestos
2. Click en **"Validar"** (botón verde)
3. Aparece modal con opciones:
   - 📝 Supuesto Práctico
   - 💼 Caso Práctico
4. Selecciona categoría
5. Click en **"Publicar"**

**Indicador visual**:
- Badge naranja: "📝 Supuesto"
- Badge azul: "💼 Caso"

### Despublicar Supuesto

Al despublicar tienes dos opciones:

1. **🗑️ Despublicar completamente**
   - Vuelve a borradores
   - No visible para usuarios
   - Puedes editar y republicar

2. **🔄 Mover a otra categoría**
   - De Supuesto → Caso
   - De Caso → Supuesto
   - Sigue publicado, solo cambia categoría

### Editar Supuesto Existente

**Ruta**: `/admin/practical-cases/[id]`

**Ediciones permitidas**:
- ✅ Título
- ✅ Enunciado
- ✅ Preguntas (texto, opciones, respuesta)
- ✅ Explicaciones
- ❌ No se puede cambiar número de preguntas sin recrear

### Estadísticas de Supuestos

**Ruta**: `/admin/practical-cases/[id]/stats`

**Métricas**:
- Total de intentos
- Puntuación media
- Tasa de aprobados (≥5)
- Tiempo medio de realización
- Preguntas más falladas
- Distribución de puntuaciones

## 🎨 Vista Previa de Celebración

### Probar la Celebración

**Ruta**: `/admin/celebration-preview`

**Elementos de la celebración**:
- 🎊 **Confetti animado**: 800 piezas de colores
- 🏆 **Trofeo dorado**: Con efecto de brillo
- ⭐ **Estrellas decorativas**: Animadas con pulso
- 🔊 **Sonido de fanfarria**: `/sounds/fanfarria.mp3`
- 💬 **Mensaje motivacional**: "¡PERFECTO! ¡Sigue así y tu plaza estará más cerca!"

**Funciones de prueba**:
- Botón **"Mostrar Celebración"**: Lanza el efecto completo
- Botón **"🔊 Reproducir Sonido"**: Prueba solo el audio
- **Click fuera del modal**: Cierra la celebración

**Cuándo aparece esta celebración**:
- ✅ Tests de temario con 100% de aciertos
- ✅ Supuestos prácticos con 100% de aciertos
- ✅ Casos prácticos con 100% de aciertos

### Personalizar Celebración

**Archivo**: `app/quiz/[id]/page.tsx` y `app/practical-cases/[id]/page.tsx`

**Parámetros configurables**:

```typescript
// Confetti
numberOfPieces: 800
gravity: 0.25
colors: ['#FFD700', '#FFA500', '#FF6347', '#90EE90', '#87CEEB', '#FF69B4']

// Audio
const audio = new Audio('/sounds/fanfarria.mp3')
audio.volume = 0.7
```

**Cambiar sonido**:
1. Añade nuevo archivo en `/public/sounds/`
2. Actualiza ruta en componentes
3. Formatos soportados: MP3, WAV, OGG

## 📱 Gestión de Teléfonos Permitidos

### Sistema de Validación

**Ruta**: `/admin/phone-validation`

**Funcionalidad**:
- Controlar acceso por número de teléfono
- Solo números en lista pueden registrarse
- Formato: Números españoles (+34)

### Ver Teléfonos Permitidos

**Archivo**: `allowed-phones.txt`

```
+34600000001
+34600000002
+34611222333
```

### Añadir Teléfonos

#### Método 1: Edición Manual

```bash
# Editar archivo directamente
nano allowed-phones.txt

# Añadir números (uno por línea)
+34600123456
+34611234567
```

#### Método 2: Importación Masiva

**Desde WhatsApp Web**:

Ver guías:
- [METODO_RAPIDO_WHATSAPP.md](./METODO_RAPIDO_WHATSAPP.md)
- [IMPORTAR_NUMEROS_WHATSAPP.md](./IMPORTAR_NUMEROS_WHATSAPP.md)

**Desde archivo Excel/CSV**:

```bash
# Convertir CSV a formato correcto
awk -F',' '{print "+34" $1}' numeros.csv > allowed-phones.txt
```

### Eliminar Teléfonos

1. Edita `allowed-phones.txt`
2. Elimina la línea con el número
3. Guarda el archivo
4. El cambio es inmediato

### Verificar Validación

**Ruta**: `/admin/phone-validation/check`

- Ingresa número de teléfono
- Click en **"Verificar"**
- Muestra si está permitido o no

## 💳 Gestión de Monetización

### Configuración de Stripe

**Archivo**: `.env`

```bash
# Claves de Stripe
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Webhook
STRIPE_WEBHOOK_SECRET=whsec_...

# IDs de productos
STRIPE_PREMIUM_PRICE_ID=price_...
STRIPE_UNLIMITED_PRICE_ID=price_...
```

**Configuración completa**: Ver [STRIPE_SETUP.md](./STRIPE_SETUP.md)

### Planes Disponibles

**Configurar en Stripe Dashboard**:

1. **Free** (Gratis)
   - Acceso básico
   - 10 tests/mes
   - Sin supuestos prácticos

2. **Premium** (9.99€/mes)
   - Tests ilimitados
   - Todos los supuestos
   - Asistente IA
   - Sin anuncios

3. **Unlimited** (19.99€/mes)
   - Todo Premium +
   - Aulas virtuales ilimitadas
   - Prioridad en soporte
   - Acceso anticipado a funciones

### Gestión Manual de Suscripciones

**Ruta**: `/admin/monetization`

**Casos de uso**:
- Usuario paga por transferencia
- Compensación por error del sistema
- Extensión de prueba gratis
- Beca o descuento especial

**Pasos**:
1. Busca usuario por email
2. Selecciona plan
3. Establece fecha de inicio y fin
4. Guarda cambios
5. Usuario recibe email de confirmación

### Ver Suscripciones Activas

**Ruta**: `/admin/monetization/active`

**Información mostrada**:
- Usuario y email
- Plan actual
- Fecha de inicio
- Próxima renovación
- Método de pago (Stripe/Manual)
- Estado (Activa/Cancelada/Expirada)

### Cancelar Suscripciones

**Desde Stripe**:
- Usuario lo hace desde su perfil
- Se cancela al final del período actual

**Manualmente**:
1. Ve a `/admin/monetization`
2. Busca usuario
3. Click en **"Cancelar suscripción"**
4. Confirma acción
5. Efecto inmediato o al finalizar período

## 📊 Estadísticas y Analytics

### Dashboard de Estadísticas Globales

**Ruta**: `/admin/statistics`

**Métricas principales**:

#### Usuarios
- Total registrados
- Activos últimos 7 días
- Activos últimos 30 días
- Nuevos registros (hoy/semana/mes)
- Tasa de retención

#### Actividad
- Tests realizados (total/hoy/semana)
- Supuestos completados
- Preguntas respondidas
- Tiempo total de estudio

#### Rendimiento
- Puntuación media global
- % Tests con 100% aciertos
- Temas más estudiados
- Temas con peor rendimiento

#### Monetización
- Ingresos totales
- Ingresos mensuales
- Suscripciones activas por plan
- Tasa de conversión Free → Premium
- Churn rate (cancelaciones)

### Exportar Datos

**Formatos disponibles**:
- CSV
- Excel (XLSX)
- JSON
- PDF (informe)

**Botón**: "Exportar datos" en cada sección

### Gráficas Disponibles

- 📈 Evolución de usuarios en el tiempo
- 📊 Tests por tema (barras)
- 🥧 Distribución de puntuaciones (pie)
- 📉 Tasa de abandono (línea)
- 🗓️ Actividad por día de la semana (heat map)

## 🤖 Gestión del Asistente IA

### Configuración de IA

**Archivo**: `.env`

```bash
# Groq (recomendado)
GROQ_API_KEY=gsk_...

# Ollama (local - opcional)
OLLAMA_API_URL=http://localhost:11434
```

### Modelos Disponibles

**Groq**:
- `llama-3.3-70b-versatile` (recomendado)
- `mixtral-8x7b-32768`
- `gemma2-9b-it`

**Ollama** (local):
- `llama3`
- `mistral`
- `gemma`

### Mantenimiento de la Base de Conocimientos

**Ubicación**: `data/biblioteca-legal.json`

**Estructura**:
```json
{
  "articulo": "Art. 161 LGSS",
  "titulo": "Incapacidad Temporal",
  "contenido": "Texto completo del artículo...",
  "tags": ["IT", "baja", "prestación"]
}
```

**Añadir documentación**:
1. Edita `biblioteca-legal.json`
2. Añade nueva entrada
3. Incluye tags relevantes
4. Guarda y reinicia

### Monitorizar Uso de IA

**Ruta**: `/admin/ai-usage`

**Métricas**:
- Consultas totales
- Tokens consumidos
- Coste estimado
- Tiempo medio de respuesta
- Temas más consultados
- Tasa de satisfacción (thumbs up/down)

## 🔧 Mantenimiento del Sistema

### Tareas Diarias

- ✅ Revisar logs de errores
- ✅ Verificar cron jobs ejecutados
- ✅ Monitorizar uso de base de datos
- ✅ Revisar nuevas preguntas generadas por IA

### Tareas Semanales

- ✅ Backup de base de datos
- ✅ Revisar y aprobar preguntas IA
- ✅ Analizar estadísticas de uso
- ✅ Responder feedback de usuarios

### Tareas Mensuales

- ✅ Actualización de documentación legal
- ✅ Revisar y ajustar precios
- ✅ Análisis de churn y retención
- ✅ Planificar nuevas funcionalidades

### Backups

**Base de datos (PostgreSQL)**:

```bash
# Crear backup
pg_dump opositappss > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql opositappss < backup_20260101.sql
```

**Archivos importantes**:
- `allowed-phones.txt`
- `data/temario-config.json`
- `data/biblioteca-legal.json`
- `documentos-temario/*`

### Logs

**Ubicación**: `logs/`

```bash
# Ver últimas entradas
tail -f logs/cron-generation.log

# Buscar errores
grep "ERROR" logs/*.log
```

## 🆘 Solución de Problemas Comunes

### Los tests no se corrigen

**Causa**: API de submit no responde

**Solución**:
```bash
# Verificar que el servidor está corriendo
npm run dev

# Revisar logs del servidor
tail -f .next/server.log

# Verificar conexión a base de datos
npx prisma db pull
```

### Las preguntas generadas por IA son de baja calidad

**Causa**: Prompt mal configurado o modelo inadecuado

**Solución**:
1. Edita `scripts/cron-generate-questions.ts`
2. Ajusta el prompt del sistema
3. Prueba con otro modelo
4. Aumenta temperatura para más creatividad (0.7-0.9)
5. O disminúyela para más precisión (0.3-0.5)

### La celebración no aparece

**Causa**: Archivos de sonido o componente de confetti

**Solución**:
```bash
# Verificar que existe el archivo de sonido
ls -la public/sounds/fanfarria.mp3

# Verificar que react-confetti está instalado
npm list react-confetti

# Reinstalar si es necesario
npm install react-confetti
```

### Stripe webhooks fallan

**Causa**: Webhook secret incorrecto

**Solución**:
1. Ve a Stripe Dashboard → Webhooks
2. Copia el signing secret
3. Actualiza `STRIPE_WEBHOOK_SECRET` en `.env`
4. Reinicia servidor
5. Prueba con evento de test

## 📚 Documentación Adicional

### Guías Técnicas

- [AUTOMATIZACION_GENERACION_CRON.md](./AUTOMATIZACION_GENERACION_CRON.md) - Generación automática
- [STRIPE_SETUP.md](./STRIPE_SETUP.md) - Configuración de pagos
- [PHONE_VALIDATION_SYSTEM.md](./PHONE_VALIDATION_SYSTEM.md) - Sistema de validación
- [SISTEMA_IA_COMPLETO.md](./SISTEMA_IA_COMPLETO.md) - Asistente IA
- [GUIA_FUNDAMENTO_LEGAL.md](./GUIA_FUNDAMENTO_LEGAL.md) - Referencias legales

### Scripts Útiles

```bash
# Generar preguntas
npx tsx scripts/cron-generate-questions.ts

# Verificar sistema
npx tsx scripts/verify-system-health.ts

# Comprobar preguntas
npx tsx scripts/check-questions.ts

# Test de IA
npx tsx scripts/test-ai-system.ts
```

## 🎯 Mejores Prácticas

### Calidad de Contenido

1. **Revisa todas las preguntas generadas por IA** antes de publicar
2. **Incluye siempre fundamento legal** en las explicaciones
3. **Varía la dificultad** (30% fácil, 50% media, 20% difícil)
4. **Actualiza contenido** cuando cambie la legislación

### Comunicación con Usuarios

1. **Anuncia nuevas funcionalidades** con antelación
2. **Notifica mantenimientos programados** (24h antes)
3. **Responde feedback** en menos de 48h
4. **Publica changelog** mensual con mejoras

### Seguridad

1. **Backups diarios automáticos**
2. **No compartas credenciales** de administrador
3. **Usa 2FA** en cuentas críticas (Stripe, servidor)
4. **Monitoriza intentos de login** fallidos
5. **Actualiza dependencias** regularmente

## 📞 Contacto y Soporte

**Email**: admin@opositapp.com  
**Documentación**: https://docs.opositapp.com  
**Repositorio**: (Privado)

---

📅 **Última actualización**: Enero 2026  
✍️ **Mantenido por**: Equipo OpositApp  
🔄 **Versión**: 2.0

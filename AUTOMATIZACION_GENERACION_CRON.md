# 🤖 Automatización de Generación de Preguntas con Cron

## 📋 Resumen

Se ha implementado un sistema **completo de automatización** para generar preguntas de temario de forma automática y periódica mediante **cron jobs**. El sistema:

- ✅ **Genera preguntas automáticamente** cada día/semana/mes
- ✅ **Sin intervención manual** requerida
- ✅ **Logging completo** de todas las ejecuciones
- ✅ **Manejo robusto de errores** y reintentos
- ✅ **Flexible** - permite configurar horarios y qué generar
- ✅ **Seguro** - no sobrescribe datos existentes

---

## 🛡️ Protección Contra Duplicados

✅ **Versión manual: HABILITADA COMPLETAMENTE**

Ambos sistemas (manual y automático) incluyen protección contra:
- **Duplicados exactos** (misma pregunta palabra por palabra)
- **Preguntas similares** (70%+ de palabras en común)
- **Duplicados dentro del lote** (preguntas generadas al mismo tiempo)

**Cada pregunta rechazada se reporta en logs.**

📖 **Ver documentación completa**: [PROTECCION_CONTRA_DUPLICADOS.md](PROTECCION_CONTRA_DUPLICADOS.md)

---

### 1. **Instalación de Cron Jobs**

```bash
cd /Users/copiadorasalguero/opositapp

# Instalar trabajos cron predeterminados
bash scripts/setup-cron.sh install
```

**Esto configurará:**
- ⏰ **Cada día a las 2:00 AM**: Generar preguntas de temario general
- ⏰ **Cada lunes a las 4:00 AM**: Generar preguntas de temario específico
- ⏰ **Cada 1º de mes a las 3:00 AM**: Generación completa

### 2. **Verificar Instalación**

```bash
# Ver los trabajos cron configurados
bash scripts/setup-cron.sh list

# Resultado esperado:
# 📋 Trabajos de Generación de Preguntas:
# 
# 0 2 * * * cd /Users/copiadorasalguero/opositapp && npx tsx scripts/cron-generate-questions.ts --general-only
# 0 4 * * 1 cd /Users/copiadorasalguero/opositapp && npx tsx scripts/cron-generate-questions.ts --specific-only
# 0 3 1 * * cd /Users/copiadorasalguero/opositapp && npx tsx scripts/cron-generate-questions.ts --all
```

### 3. **Probar el Script**

```bash
# Ejecutar una prueba en modo seco (sin guardar)
bash scripts/setup-cron.sh test

# O ejecutar manualmente:
npx tsx scripts/cron-generate-questions.ts --num-questions=5 --dry-run --tema=G1
```

---

## 📖 Guía Completa

### Uso del Script Principal

#### **Sintaxis:**
```bash
npx tsx scripts/cron-generate-questions.ts [opciones]
```

#### **Opciones Disponibles:**

| Opción | Descripción | Ejemplo |
|--------|-------------|---------|
| `--all` | Generar para todos los temas | `--all` |
| `--general-only` | Solo temario general | `--general-only` |
| `--specific-only` | Solo temario específico | `--specific-only` |
| `--tema=X` | Generar solo para un tema | `--tema=G1` |
| `--num-questions=N` | Preguntas por tema (default: 30) | `--num-questions=20` |
| `--log-file=PATH` | Archivo de log (default: logs/cron-generation.log) | `--log-file=/custom/path.log` |
| `--dry-run` | Simular sin guardar en BD | `--dry-run` |

#### **Ejemplos Prácticos:**

```bash
# 1. Generar 10 preguntas para tema G1 (modo simulación)
npx tsx scripts/cron-generate-questions.ts --tema=G1 --num-questions=10 --dry-run

# 2. Generar 30 preguntas para todos los temas generales
npx tsx scripts/cron-generate-questions.ts --general-only --num-questions=30

# 3. Generar 25 preguntas para tema específico E5
npx tsx scripts/cron-generate-questions.ts --tema=E5 --num-questions=25

# 4. Generación completa con log personalizado
npx tsx scripts/cron-generate-questions.ts --all --log-file=/var/log/opositapp-cron.log

# 5. Probar solo generación (primeras 5 preguntas)
npx tsx scripts/cron-generate-questions.ts --dry-run --num-questions=5
```

---

## ⏰ Configuración de Horarios Predeterminados

### **Horario Diario (2:00 AM - Temario General)**
```cron
0 2 * * * cd /Users/copiadorasalguero/opositapp && npx tsx scripts/cron-generate-questions.ts --general-only
```
- **Cuándo**: Todos los días a las 2:00 AM
- **Qué genera**: Preguntas de temario general (G1-G23)
- **Duración estimada**: 30-45 minutos
- **Preguntas por tema**: 30 (por defecto)

### **Horario Semanal (Lunes 4:00 AM - Temario Específico)**
```cron
0 4 * * 1 cd /Users/copiadorasalguero/opositapp && npx tsx scripts/cron-generate-questions.ts --specific-only
```
- **Cuándo**: Cada lunes a las 4:00 AM
- **Qué genera**: Preguntas de temario específico (E1-E13)
- **Duración estimada**: 15-25 minutos
- **Preguntas por tema**: 30 (por defecto)

### **Horario Mensual (1º de mes 3:00 AM - Completo)**
```cron
0 3 1 * * cd /Users/copiadorasalguero/opositapp && npx tsx scripts/cron-generate-questions.ts --all
```
- **Cuándo**: Primer día de cada mes a las 3:00 AM
- **Qué genera**: Todos los temas (G1-G23 + E1-E13)
- **Duración estimada**: 50-75 minutos
- **Preguntas por tema**: 30 (por defecto)

---

## 🔧 Personalización de Horarios

### **Cambiar Horario Manualmente**

Para editar los horarios, usa:
```bash
crontab -e
```

**Formato cron explicado:**
```
┌───────────── minuto (0 - 59)
│ ┌───────────── hora (0 - 23)
│ │ ┌───────────── día del mes (1 - 31)
│ │ │ ┌───────────── mes (1 - 12)
│ │ │ │ ┌───────────── día de la semana (0 - 7) (0 = domingo, 1 = lunes, etc.)
│ │ │ │ │
│ │ │ │ │
* * * * * comando a ejecutar
```

**Ejemplos de configuración personalizada:**

```bash
# Cada 6 horas
0 */6 * * * cd /opositapp && npx tsx scripts/cron-generate-questions.ts --all

# Cada 4 horas durante el día (6 AM a 10 PM)
0 6,10,14,18,22 * * * cd /opositapp && npx tsx scripts/cron-generate-questions.ts --general-only

# Cada hora (útil para testing)
0 * * * * cd /opositapp && npx tsx scripts/cron-generate-questions.ts --tema=G1 --num-questions=5

# Cada 15 minutos
*/15 * * * * cd /opositapp && npx tsx scripts/cron-generate-questions.ts --tema=G1 --num-questions=1

# Fin de semana (sábado y domingo)
0 2 * * 0,6 cd /opositapp && npx tsx scripts/cron-generate-questions.ts --all
```

---

## 📊 Monitoreo y Logs

### **Ver Log en Tiempo Real**

```bash
# Ver última actualización del log
tail -f logs/cron-generation.log

# Ver últimas 50 líneas
tail -50 logs/cron-generation.log

# Ver por nivel (INFO, WARN, ERROR, SUCCESS)
grep "SUCCESS" logs/cron-generation.log
grep "ERROR" logs/cron-generation.log
```

### **Estructura del Log**

```
[2026-01-02T02:00:00.000Z] [INFO] ============================================================
[2026-01-02T02:00:00.000Z] [INFO] INICIANDO GENERACIÓN AUTOMÁTICA DE PREGUNTAS
[2026-01-02T02:00:00.000Z] [INFO] ============================================================
[2026-01-02T02:00:00.000Z] [INFO] Configuración:
[2026-01-02T02:00:00.000Z] [INFO]   - Modo: PRODUCCIÓN
[2026-01-02T02:00:00.000Z] [INFO]   - Solo general: true
[2026-01-02T02:00:00.000Z] [INFO] Temas a procesar: 23
[2026-01-02T02:00:00.000Z] [INFO] Cuestionario creado: uuid-xyz
[2026-01-02T02:00:15.000Z] [SUCCESS] Procesando: Tema 1 - ...
[2026-01-02T02:00:15.000Z] [SUCCESS] 30 preguntas generadas
[2026-01-02T02:00:15.000Z] [SUCCESS] 30 preguntas guardadas en BD
...
[2026-01-02T02:45:00.000Z] [SUCCESS] ============================================================
[2026-01-02T02:45:00.000Z] [SUCCESS] Temas procesados exitosamente: 23
[2026-01-02T02:45:00.000Z] [INFO] Total preguntas: 690
[2026-01-02T02:45:00.000Z] [SUCCESS] ============================================================
```

### **Verificar Estadísticas en BD**

```bash
# Contar preguntas generadas hoy
npx prisma studio
# Luego abre la tabla "Question" y filtra por fecha

# O mediante consulta SQL:
npx prisma db execute --stdin << EOF
SELECT 
  temaCodigo, 
  COUNT(*) as total,
  DATE(createdAt) as fecha
FROM Question
GROUP BY temaCodigo, DATE(createdAt)
ORDER BY DATE(createdAt) DESC, temaCodigo
EOF
```

---

## ⚙️ Configuración Avanzada

### **Variables de Entorno Requeridas**

```bash
# .env debe contener:
GROQ_API_KEY=your-api-key-here
DATABASE_URL=your-database-url
```

### **Aumentar/Disminuir Velocidad**

Por defecto, el script pausa **2 segundos entre temas** para no saturar la API Groq.

**Modificar el tiempo de espera:**
```typescript
// En scripts/cron-generate-questions.ts, línea ~220:
// Actual: await new Promise(resolve => setTimeout(resolve, 2000))
// Para más rápido (1s): setTimeout(resolve, 1000)
// Para más lento (5s): setTimeout(resolve, 5000)
```

### **Limitar Cantidad de Preguntas Generadas**

Para no usar toda la cuota de API de Groq:

```bash
# Generar solo 5 preguntas por tema (en lugar de 30)
npx tsx scripts/cron-generate-questions.ts --all --num-questions=5

# O en cron:
0 2 * * * cd /opositapp && npx tsx scripts/cron-generate-questions.ts --general-only --num-questions=10
```

### **Usar Ollama en Lugar de Groq**

Para usar Ollama (local, gratuito) en lugar de Groq:

```bash
# El script actual usa Groq por defecto
# Para cambiar a Ollama, necesitarías:
# 1. Modificar scripts/cron-generate-questions.ts
# 2. Cambiar la llamada a groq por una llamada a ollama
# 3. Ver script: scripts/generate-questions-ollama.ts para referencia
```

---

## 🚨 Troubleshooting

### **Problema: "Script not found"**

```bash
# Solución: Verificar ruta absoluta en crontab
# Cambiar en setup-cron.sh la línea del cd a:
cd /Users/copiadorasalguero/opositapp && ...
```

### **Problema: "GROQ_API_KEY not found"**

```bash
# Solución: Variables de entorno no se cargan en cron
# Opción 1: Agregar a crontab
0 2 * * * export GROQ_API_KEY=xxx && cd /opositapp && npx tsx scripts/cron-generate-questions.ts

# Opción 2: Crear script wrapper que cargue .env
# Ver: scripts/cron-wrapper.sh (por crear)
```

### **Problema: "Database connection error"**

```bash
# Solución: Asegurar que DATABASE_URL está en .env
# Y que los permisos de la BD permiten conexión desde cron

# Verificar conexión:
npx prisma db status
```

### **Problema: Las preguntas no se generan**

```bash
# 1. Verificar logs
tail -50 logs/cron-generation.log

# 2. Probar manualmente
npx tsx scripts/cron-generate-questions.ts --tema=G1 --num-questions=5 --dry-run

# 3. Verificar que Groq API está respondiendo
curl https://api.groq.com/health

# 4. Revisar cuota de API
# Acceder a: https://console.groq.com/keys
```

---

## 📋 Desinstalación

```bash
# Desinstalar todos los trabajos cron
bash scripts/setup-cron.sh remove

# Verificar que se removieron
bash scripts/setup-cron.sh list
```

---

## 📊 Estimaciones de Tiempo y Costos

### **Tiempo de Ejecución**

| Configuración | Temas | Preguntas/tema | Duración estimada |
|---------------|-------|----------------|-------------------|
| 1 tema (general) | 1 | 30 | ~2-3 minutos |
| Todos generales | 23 | 30 | ~45-60 minutos |
| Todos específicos | 13 | 30 | ~25-35 minutos |
| Todos (general + específico) | 36 | 30 | ~70-90 minutos |

### **Costos de API (Groq)**

- **Modelo**: LLaMA 3.3 70B
- **Costo**: ~$0.10 por 1M tokens
- **Promedio por pregunta**: ~200 tokens = ~$0.00002 por pregunta

**Estimación mensual:**
- 30 preguntas/día × 30 días = 900 preguntas/mes
- 900 × $0.00002 = **~$0.02/mes** ✅ Muy económico

---

## 🎯 Casos de Uso Recomendados

### **Escenario 1: Generación Continua (Recomendado)**
```bash
# Instalar la configuración predeterminada
bash scripts/setup-cron.sh install

# Esto genera:
# - 690 preguntas/semana (23 general + 13 específico)
# - En 3 horarios diferentes (sin conflictos)
# - Costo: ~$0.15/mes
```

### **Escenario 2: Generación Agresiva (Máximas preguntas)**
```bash
# Generar cada 2 horas durante el día
0 */2 * * * cd /opositapp && npx tsx scripts/cron-generate-questions.ts --all --num-questions=50

# Genera: ~600 preguntas/día
# Costo: ~$1.20/mes
```

### **Escenario 3: Generación Conservadora (Minimal)**
```bash
# Generar 1 tema nuevo cada 6 horas
0 */6 * * * cd /opositapp && npx tsx scripts/cron-generate-questions.ts --num-questions=5

# Genera: ~20 preguntas/día
# Costo: ~$0.01/mes
```

---

## 📞 Referencia Rápida

```bash
# Instalar cron
bash scripts/setup-cron.sh install

# Ver cron actual
bash scripts/setup-cron.sh list

# Probar script
bash scripts/setup-cron.sh test

# Ejecutar manual
npx tsx scripts/cron-generate-questions.ts --general-only --num-questions=30

# Ver logs
tail -f logs/cron-generation.log

# Desinstalar cron
bash scripts/setup-cron.sh remove

# Editar cron manualmente
crontab -e

# Ver crontab actual
crontab -l
```

---

## ✅ Checklist de Setup

- [ ] Verificar que `GROQ_API_KEY` está en `.env`
- [ ] Verificar que `DATABASE_URL` está en `.env`
- [ ] Ejecutar `bash scripts/setup-cron.sh test` y verificar que funciona
- [ ] Ejecutar `bash scripts/setup-cron.sh install`
- [ ] Ejecutar `bash scripts/setup-cron.sh list` para confirmar
- [ ] Esperar a la próxima ejecución programada y revisar `logs/cron-generation.log`
- [ ] Verificar en Prisma Studio que las preguntas se guardaron

---

**Versión**: 1.0.0  
**Fecha**: 2 de enero de 2026  
**Estado**: ✅ Listo para producción

¡Sistema de automatización completamente funcional! 🚀

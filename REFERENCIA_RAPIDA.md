# 📋 Referencia Rápida - Manual + Automático + Protección

## 🎯 Estado Actual

| Componente | Status | Acción |
|-----------|--------|--------|
| **Manual** | ✅ Habilitada | `npx tsx scripts/cron-generate-questions.ts [opciones]` |
| **Automática** | ✅ Funcionando | Generando en horarios configurados |
| **Protección** | ✅ Activa | Filtra duplicados automáticamente |

---

## 🚀 Comandos Más Usados

### Generación Manual

```bash
# Generar para todos los temas
npx tsx scripts/cron-generate-questions.ts --all

# Generar solo temario general
npx tsx scripts/cron-generate-questions.ts --general-only

# Generar solo temario específico
npx tsx scripts/cron-generate-questions.ts --specific-only

# Generar para un tema específico
npx tsx scripts/cron-generate-questions.ts --tema=G1

# Generar menos preguntas
npx tsx scripts/cron-generate-questions.ts --tema=G1 --num-questions=10

# Modo simulación (sin guardar)
npx tsx scripts/cron-generate-questions.ts --tema=G1 --dry-run
```

### Monitoreo y Administración

```bash
# Ver logs en tiempo real
tail -f logs/cron-generation.log

# Ver últimas ejecuciones
tail -50 logs/cron-generation.log

# Verificar cron instalado
bash scripts/setup-cron.sh list

# Desinstalar cron
bash scripts/setup-cron.sh remove

# Instalar cron
bash scripts/setup-cron.sh install
```

---

## 📊 Cómo Funciona la Protección

### 1. Antes de Guardar
```
Nueva pregunta generada
        ↓
¿Existe igual en BD?  → NO → ¿Es similar 70%+?
        ↓                           ↓
       SÍ                         SÍ
        ↓                           ↓
    ELIMINAR                    ELIMINAR
        ↓                           ↓
        └────────────→ GUARDAR ←───┘
```

### 2. Ejemplos de Filtrado

**Duplicado exacto:**
```
Generada: "¿Cuál es el artículo 1 de la Constitución?"
Existente: "¿Cuál es el artículo 1 de la Constitución?"
Resultado: ❌ ELIMINADA
```

**Muy similar (85%):**
```
Generada: "¿Cuál es el artículo 1 de la Constitución Española?"
Existente: "¿Cuál es el artículo uno de la Constitución de 1978?"
Resultado: ❌ ELIMINADA
```

**Diferente:**
```
Generada: "¿Quién promulga la Constitución?"
Existente: "¿Cuál es el artículo 1?"
Resultado: ✅ GUARDADA
```

---

## 🔍 Leer Logs

### Ejemplo de log con filtrado

```log
[2026-01-02T17:30:15.100Z] [INFO] Procesando: Tema 1 - La Constitución
[2026-01-02T17:30:17.234Z] [SUCCESS]   30 preguntas generadas
[2026-01-02T17:30:17.235Z] [INFO]   🔍 Filtrado: 30 generadas → 28 aceptadas (2 eliminadas)
[2026-01-02T17:30:17.500Z] [SUCCESS]   28 preguntas guardadas en BD
```

**Interpretación:**
- Se intentó generar: 30 preguntas
- De esas, 2 eran duplicadas/similares
- Se guardaron: 28 únicas
- Duplicados eliminados: 2

### Buscar en logs

```bash
# Ver solo ejecuciones exitosas
grep "SUCCESS" logs/cron-generation.log

# Ver solo filtrados
grep "Filtrado" logs/cron-generation.log

# Ver errores
grep "ERROR" logs/cron-generation.log

# Ver últimas 10 lineas
tail -10 logs/cron-generation.log
```

---

## ⏰ Horarios Automáticos (si está instalado)

```
02:00 AM (Todos los días)
  └─ Genera: Temario general (G1-G23)
  └─ Cantidad: 690 preguntas/semana
  └─ Duración: ~45-60 minutos

04:00 AM (Cada lunes)
  └─ Genera: Temario específico (E1-E13)
  └─ Cantidad: 390 preguntas
  └─ Duración: ~25-35 minutos

03:00 AM (Primer día del mes)
  └─ Genera: Todo (36 temas)
  └─ Cantidad: 1,080 preguntas
  └─ Duración: ~70-90 minutos
```

---

## 💡 Tips Útiles

### Probar una generación antes de automatizarla

```bash
# Probar con modo dry-run
npx tsx scripts/cron-generate-questions.ts --tema=G1 --dry-run
# Esto muestra qué se generaría sin guardar nada
```

### Generar más preguntas con menos duplicados

```bash
# Generar más cantidad (más opciones para filtrado)
npx tsx scripts/cron-generate-questions.ts --all --num-questions=50
```

### Verificar que funciona la protección

```bash
# Generar 2 veces el mismo tema
npx tsx scripts/cron-generate-questions.ts --tema=G1 --num-questions=10
npx tsx scripts/cron-generate-questions.ts --tema=G1 --num-questions=10

# Verás que la segunda vez genera menos preguntas únicas (más filtradas)
```

### Revisar preguntas guardadas

```bash
# Ver en Prisma Studio
npx prisma studio
# Luego: Tables → Question → Filtrar por temaCodigo
```

---

## 🆘 Solucionar Problemas

### "No se generan preguntas"

```bash
# 1. Verificar que GROQ_API_KEY está en .env
grep GROQ_API_KEY .env

# 2. Probar manualmente
npx tsx scripts/cron-generate-questions.ts --tema=G1 --dry-run

# 3. Ver logs
tail -50 logs/cron-generation.log
```

### "Cron no se ejecutó"

```bash
# 1. Verificar que está instalado
bash scripts/setup-cron.sh list

# 2. Ver logs del sistema
log stream --predicate 'eventMessage contains[c] "cron"' --level debug

# 3. Probar manualmente
bash scripts/setup-cron.sh test
```

### "Se guardan muchos duplicados"

```bash
# Aumentar umbral de filtrado (ahora es 70%)
# Ver: PROTECCION_CONTRA_DUPLICADOS.md
# Línea: const UMBRAL_SIMILARIDAD = 0.7
# Cambiar a: 0.8 (80% = más restrictivo)
```

---

## 📚 Documentación Completa

| Documento | Para |
|-----------|------|
| `CONFIRMACION_MANUAL_Y_AUTOMATICA.md` | Confirmación completa |
| `PROTECCION_CONTRA_DUPLICADOS.md` | Detalles del filtrado |
| `AUTOMATIZACION_GENERACION_CRON.md` | Guía técnica cron |
| `INICIO_RAPIDO_CRON.md` | Quick start |

---

## ✅ Checklist Rápido

- [ ] Manual funciona: `npx tsx scripts/cron-generate-questions.ts --tema=G1`
- [ ] Automática instalada: `bash scripts/setup-cron.sh list`
- [ ] Logs generándose: `tail -f logs/cron-generation.log`
- [ ] Preguntas únicas: Ver que se filtra duplicados en logs
- [ ] Protección activa: Ver `[INFO] 🔍 Filtrado` en logs

---

**Última actualización**: 2 de enero de 2026  
**Versión**: 1.0.0

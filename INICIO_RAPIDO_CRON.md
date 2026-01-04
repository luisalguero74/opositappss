# ⚡ Inicio Rápido - Automatización de Generación de Preguntas

## En 3 Pasos

### 1️⃣ Ejecutar Prueba
```bash
bash scripts/test-cron-automation.sh
```

### 2️⃣ Instalar Cron Jobs
```bash
bash scripts/setup-cron.sh install
```

### 3️⃣ Verificar Instalación
```bash
bash scripts/setup-cron.sh list
```

---

## ¿Qué Hace?

Genera **preguntas de temario de forma automática y periódica**:

- **Cada día 2:00 AM** → 690 preguntas de temario general  
- **Cada lunes 4:00 AM** → 390 preguntas de temario específico  
- **Cada 1º de mes 3:00 AM** → 1,080 preguntas totales  

**Sin hacer nada manualmente. El sistema funciona mientras duermes.** 🌙

---

## Archivos Creados

| Archivo | Descripción |
|---------|-------------|
| `scripts/cron-generate-questions.ts` | Script principal de generación |
| `scripts/setup-cron.sh` | Utilidad para instalar/desinstalar cron |
| `scripts/test-cron-automation.sh` | Script de prueba |
| `AUTOMATIZACION_GENERACION_CRON.md` | Documentación completa |

---

## Monitoreo

Ver qué está pasando en tiempo real:

```bash
# Ver logs mientras se ejecuta
tail -f logs/cron-generation.log

# Ver últimas 50 líneas
tail -50 logs/cron-generation.log

# Buscar errores
grep "ERROR" logs/cron-generation.log
```

---

## Customización

### Cambiar Horarios

```bash
# Editar horarios manualmente
crontab -e

# Ver horarios actuales
crontab -l
```

### Generar Manualmente

```bash
# 5 preguntas para tema G1
npx tsx scripts/cron-generate-questions.ts --tema=G1 --num-questions=5

# Todos los temas (30 preguntas cada uno)
npx tsx scripts/cron-generate-questions.ts --all --num-questions=30

# Solo general
npx tsx scripts/cron-generate-questions.ts --general-only

# Solo específico
npx tsx scripts/cron-generate-questions.ts --specific-only

# Modo simulación (sin guardar)
npx tsx scripts/cron-generate-questions.ts --tema=G1 --dry-run
```

---

## ❌ Desinstalar

```bash
bash scripts/setup-cron.sh remove
```

---

## 📚 Documentación Completa

Para configuración avanzada, horarios personalizados, troubleshooting, etc.:

👉 Ver [AUTOMATIZACION_GENERACION_CRON.md](AUTOMATIZACION_GENERACION_CRON.md)

---

**¡Listo!** La automatización está lista para usar. 🚀

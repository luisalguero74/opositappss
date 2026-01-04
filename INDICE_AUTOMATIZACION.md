# 📚 Índice de Automatización - Generación de Preguntas con Cron

## 🎯 ¿Qué es?

Sistema automatizado que **genera preguntas de temario de forma periódica** (cada día/semana/mes) sin intervención manual.

---

## 🚀 Inicio en 3 Pasos

### 1. Probar que funciona
```bash
bash scripts/test-cron-automation.sh
```

### 2. Instalar automatización
```bash
bash scripts/setup-cron.sh install
```

### 3. Verificar instalación
```bash
bash scripts/setup-cron.sh list
```

**¡Listo!** Ya está generando preguntas automáticamente. 🎉

---

## 📖 Documentación

### 📋 Para Empezar Rápido
👉 **[INICIO_RAPIDO_CRON.md](INICIO_RAPIDO_CRON.md)**
- En 3 pasos
- Comandos básicos
- Cómo monitorear

### 📚 Guía Completa
👉 **[AUTOMATIZACION_GENERACION_CRON.md](AUTOMATIZACION_GENERACION_CRON.md)**
- Explicación detallada
- Personalización de horarios
- Troubleshooting
- Estimaciones de costo

### ✅ Verificación
👉 **[VERIFICACION_CONFIGURACION.md](VERIFICACION_CONFIGURACION.md)**
- Checklist de setup
- Estadísticas de prueba
- Próximos pasos

### 📊 Resumen Ejecutivo
👉 **[RESUMEN_AUTOMATIZACION.md](RESUMEN_AUTOMATIZACION.md)**
- Componentes entregados
- Capacidades técnicas
- Métricas de éxito

---

## 📦 Archivos Creados

### Scripts

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `scripts/cron-generate-questions.ts` | 342 | Script principal de generación |
| `scripts/setup-cron.sh` | 200+ | Utilidad para instalar/desinstalar cron |
| `scripts/test-cron-automation.sh` | 150+ | Prueba de funcionamiento |

### Documentación

| Archivo | Tamaño | Propósito |
|---------|--------|----------|
| `INICIO_RAPIDO_CRON.md` | 2.2K | Quick start |
| `AUTOMATIZACION_GENERACION_CRON.md` | 12K | Guía completa |
| `VERIFICACION_CONFIGURACION.md` | 11K | Checklist |
| `RESUMEN_AUTOMATIZACION.md` | 11K | Resumen ejecutivo |
| `INDICE_AUTOMATIZACION.md` | Este archivo | Índice |

---

## ⏰ Horarios Automáticos

Después de instalar, se generan preguntas en:

| Horario | Qué | Cuándo |
|---------|-----|--------|
| 2:00 AM | 690 preguntas generales | Todos los días |
| 4:00 AM | 390 preguntas específicas | Cada lunes |
| 3:00 AM | 1,080 preguntas (todo) | Primer día del mes |

---

## 🔧 Comandos Rápidos

```bash
# Instalar cron
bash scripts/setup-cron.sh install

# Ver cron instalado
bash scripts/setup-cron.sh list

# Probar script
bash scripts/setup-cron.sh test

# Ver logs en tiempo real
tail -f logs/cron-generation.log

# Generar manualmente: 1 tema
npx tsx scripts/cron-generate-questions.ts --tema=G1

# Generar manualmente: todos
npx tsx scripts/cron-generate-questions.ts --all

# Generar en simulación (sin guardar)
npx tsx scripts/cron-generate-questions.ts --dry-run

# Desinstalar cron
bash scripts/setup-cron.sh remove
```

---

## 💾 Estructura de Proyecto

```
opositapp/
├── scripts/
│   ├── cron-generate-questions.ts          ← Script principal
│   ├── setup-cron.sh                       ← Setup utility
│   ├── test-cron-automation.sh             ← Prueba
│   └── ... (otros scripts existentes)
│
├── logs/
│   └── cron-generation.log                 ← Logs de ejecución
│
└── Documentación/
    ├── INICIO_RAPIDO_CRON.md               ← Empezar aquí
    ├── AUTOMATIZACION_GENERACION_CRON.md   ← Detalles
    ├── VERIFICACION_CONFIGURACION.md       ← Checklist
    ├── RESUMEN_AUTOMATIZACION.md           ← Resumen
    └── INDICE_AUTOMATIZACION.md            ← Este archivo
```

---

## ❓ Preguntas Frecuentes

### ¿Cómo empiezo?
1. `bash scripts/test-cron-automation.sh` para probar
2. `bash scripts/setup-cron.sh install` para instalar
3. Listo, ahora genera automáticamente

### ¿Puedo cambiar los horarios?
Sí, con `crontab -e`. Ver detalles en la guía completa.

### ¿Cuánto cuesta?
~$0.15 USD/mes en API Groq (muy económico)

### ¿Cómo veo si funciona?
`tail -f logs/cron-generation.log` para monitorear en tiempo real

### ¿Puedo generar manualmente?
Sí: `npx tsx scripts/cron-generate-questions.ts --all --num-questions=30`

### ¿Qué pasa si quiero desinstalar?
`bash scripts/setup-cron.sh remove` para remover todos los cron jobs

---

## 📊 Capacidades

- ✅ Generación automática sin intervención
- ✅ Temario completo (36 temas)
- ✅ Customizable (cantidad, horarios, temas)
- ✅ Logging y monitoreo completo
- ✅ Bajo costo (~$0.15/mes)
- ✅ Totalmente documentado
- ✅ Probado y validado

---

## 🎓 Aprender Más

| Tema | Documento |
|------|-----------|
| Cómo empezar rápido | [INICIO_RAPIDO_CRON.md](INICIO_RAPIDO_CRON.md) |
| Personalizar horarios | [AUTOMATIZACION_GENERACION_CRON.md](AUTOMATIZACION_GENERACION_CRON.md#-personalización-de-horarios) |
| Troubleshooting | [AUTOMATIZACION_GENERACION_CRON.md](AUTOMATIZACION_GENERACION_CRON.md#-troubleshooting) |
| Estimaciones de costo | [AUTOMATIZACION_GENERACION_CRON.md](AUTOMATIZACION_GENERACION_CRON.md#-estimaciones-de-tiempo-y-costos) |
| Casos de uso | [AUTOMATIZACION_GENERACION_CRON.md](AUTOMATIZACION_GENERACION_CRON.md#-casos-de-uso-recomendados) |
| Verificar estado | [VERIFICACION_CONFIGURACION.md](VERIFICACION_CONFIGURACION.md) |

---

## 📞 Soporte

Si algo no funciona:

1. **Revisar logs**: `tail -50 logs/cron-generation.log`
2. **Probar manualmente**: `bash scripts/setup-cron.sh test`
3. **Consultar guía**: [AUTOMATIZACION_GENERACION_CRON.md](AUTOMATIZACION_GENERACION_CRON.md#-troubleshooting)
4. **Verificar variables**: `grep GROQ_API_KEY .env` y `grep DATABASE_URL .env`

---

## ✅ Estado del Sistema

| Componente | Estado |
|-----------|--------|
| Scripts | ✅ Creados y testeados |
| Documentación | ✅ Completa |
| Pruebas | ✅ Exitosas (0 errores) |
| Listo para usar | ✅ SÍ |

---

**Última actualización**: 2 de enero de 2026  
**Versión**: 1.0.0  
**Status**: ✅ Completado y listo para producción

👉 **Siguiente paso**: [INICIO_RAPIDO_CRON.md](INICIO_RAPIDO_CRON.md)

# 🔧 Guía de Administración - Asistente IA Mejorado

## 📋 Checklist de Implementación

Después de las mejoras de enero 2026, verifica:

### Compilación y Despliegue
- [ ] Código compila sin errores (`npm run build` exitoso)
- [ ] No hay warnings en compilación
- [ ] Servidor inicia sin problemas (`npm run dev`)
- [ ] Endpoint `/api/ai/chat` responde correctamente
- [ ] Base de datos conecta exitosamente
- [ ] Variables de entorno configuradas (GROQ_API_KEY)

### Funcionalidad
- [ ] Chat mode funciona (conversación continua)
- [ ] Explain mode funciona (explicaciones didácticas)
- [ ] Summarize mode funciona (resumen de documentos)
- [ ] Búsqueda de artículos exactos funciona
- [ ] Detección de acrónimos funciona (LGSS, ET, etc.)
- [ ] Validación cruzada de múltiples documentos

### Documentación
- [ ] `ASISTENTE_ESTUDIO_MEJORADO.md` creado y completo
- [ ] `PRUEBAS_ASISTENTE_ESTUDIO.md` creado con casos de test
- [ ] `CHANGELOG_ASISTENTE_ESTUDIO.md` documentando cambios
- [ ] `RESUMEN_MEJORAS_ASISTENTE_IA.md` como referencia ejecutiva
- [ ] `TIPS_AVANZADOS_ASISTENTE.md` para usuarios avanzados

---

## 🚀 Pasos para Activar las Mejoras

### Paso 1: Verificar Compilación
```bash
# En la terminal del proyecto
npm run build

# Esperar a que compile sin errores
# Debe terminar con: "Build completed successfully"
```

### Paso 2: Reiniciar Servidor
```bash
# Detener servidor actual (Ctrl+C)
# Luego iniciar con:
npm run dev

# Debe mostrar:
# ✓ Ready in XXXms
# ✓ Listening on http://localhost:3000
```

### Paso 3: Probar Endpoint
```bash
# En otra terminal:
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "query": "¿Qué dice el artículo 21 de la Ley 39/2015?",
    "action": "chat"
  }'

# Debe retornar JSON con respuesta y sources
```

### Paso 4: Notificar a Usuarios
- Actualizar página inicio con información de mejoras
- Enviar email a estudiantes: "Asistente IA mejorado disponible"
- Incluir link a `ASISTENTE_ESTUDIO_MEJORADO.md`

---

## 📊 Monitoreo y Mantenimiento

### Daily Monitoring

**Cada día, verifica:**
```bash
# 1. Servidor sigue corriendo
ps aux | grep "node"

# 2. No hay errores en logs
# Revisar consola del servidor en VS Code

# 3. Respuestas son consistentes
# Haz una pregunta de prueba manualmente
```

**Indicadores de problemas:**
- ❌ Respuestas que parafrasean en lugar de citar literal
- ❌ Artículos no encontrados cuando deberían estarlo
- ❌ Temperatura subida (respuestas más creativas, menos precisas)
- ❌ Max tokens reducido (respuestas incompletas)

### Weekly Monitoring

**Una vez a la semana:**
```bash
# 1. Ejecutar casos de prueba
# Usar PRUEBAS_ASISTENTE_ESTUDIO.md

# 2. Recopilar métricas
- % respuestas con citas literales (target: >90%)
- % respuestas con fuentes múltiples (target: >60%)
- Tiempo promedio respuesta (target: <3s)
- Errores de compilación (target: 0)

# 3. Revisar logs de API
# Buscar errors y warnings

# 4. Verificar temperatura
# Debe estar en 0.05
```

**Script para verificar estado:**
```bash
#!/bin/bash
echo "=== ESTADO DEL ASISTENTE IA ==="
echo "1. Compilación:"
npm run build 2>&1 | tail -1

echo "2. Servidor:"
curl -s http://localhost:3000/api/ai/chat && echo "✅ API funciona" || echo "❌ API no responde"

echo "3. Base de datos:"
npx prisma db execute --stdin < /dev/null && echo "✅ BD conecta" || echo "❌ BD error"

echo "=== FIN VERIFICACIÓN ==="
```

### Monthly Monitoring

**Una vez al mes:**
```bash
# 1. Análisis de feedback de usuarios
# Recopilar bug reports desde PRUEBAS_ASISTENTE_ESTUDIO.md

# 2. Actualizar documentos si es necesario
# Revisar que CHANGELOG está actualizado

# 3. Verificar métricas completas
# Precisión actual: ?
# Usuarios impactados: ?
# Mejoras sugeridas: ?

# 4. Planificar mejoras futuras (roadmap)
# Ver CHANGELOG_ASISTENTE_ESTUDIO.md sección "Mejoras Futuras"
```

---

## 🔍 Casos de Uso para Testear Regularmente

### Test 1: Artículo Específico (Diario)
```
Pregunta: "¿Qué dice exactamente el artículo 130 de la LGSS?"

Criterio de éxito:
- Respuesta comienza con 📜
- Incluye TEXTO LITERAL (entre comillas)
- No parafrasea
- Tiene estructura: literal + análisis + aplicación
```

### Test 2: Artículo No Disponible (Diario)
```
Pregunta: "¿Qué dice el artículo 9999 de la LGSS?"

Criterio de éxito:
- Respuesta incluye ⚠️ "NO ENCONTRADO"
- NO inventa el artículo
- Ofrece alternativas
```

### Test 3: Concepto Jurídico (Semanal)
```
Pregunta: "Explica incapacidad temporal según LGSS"

Criterio de éxito:
- Definición literal (📜)
- Artículos específicos
- Ejemplos prácticos (💼)
- Puntos clave (✅)
```

### Test 4: Comparación Multi-Fuente (Semanal)
```
Pregunta: "¿Cuál es la diferencia entre LGSS y ET sobre trabajador?"

Criterio de éxito:
- Ambas definiciones citadas literalmente
- Diferencias claras marcadas
- Artículos de ambas leyes
```

---

## ⚠️ Troubleshooting

### Problema 1: Respuestas Parafraseadas
**Síntoma**: Artículos resumidos en lugar de literales

**Causa probable**: Temperatura aumentada o prompt modificado

**Solución**:
```typescript
// Verificar en src/lib/rag-system.ts:
// DEBE ser:
temperature: 0.05

// Si está en 0.1 o superior:
// Cambiar a 0.05 y reiniciar servidor
```

### Problema 2: Artículos No Encontrados
**Síntoma**: Sistema dice "no encontrado" para artículos que existen

**Causa probable**: Documento no está en BD o mal indexado

**Solución**:
```bash
# Verificar documentos en BD:
npx prisma studio

# Navegar a tabla "LegalDocument"
# Buscar documento por referencia (ej: "Ley 39/2015")
# Si no existe: cargar con load-legal-documents.ts

# Si existe pero no se encuentra:
# Revisar campos: title, content, reference, topic
```

### Problema 3: Respuestas Incompletas
**Síntoma**: Respuestas cortadas o truncadas

**Causa probable**: Max tokens demasiado bajo

**Solución**:
```typescript
// Verificar en src/lib/rag-system.ts:
// DEBE ser:
max_tokens: 4096

// Si está en 3072 o inferior:
// Cambiar a 4096 y reiniciar
```

### Problema 4: Respuestas Creativas (Alucinaciones)
**Síntoma**: Respuestas inventadas o imprecisas

**Causa probable**: Temperatura muy alta

**Solución**:
```typescript
// NUNCA cambiar a temperatura > 0.2
// Para máxima precisión: 0.05
// El sistema está optimizado para 0.05

// Si aún hay problemas:
// 1. Revisar sistema prompt en generateRAGResponse()
// 2. Verificar que incluye "REGLA DE ORO"
// 3. Verificar que tiene "PROTOCOLO DE VALIDACIÓN"
```

### Problema 5: Timeout en API
**Síntoma**: Peticiones toman >5 segundos

**Causa probable**: Muchos documentos o base de datos lenta

**Solución**:
```bash
# Verificar performance BD:
npx prisma db status

# Si hay lag:
# 1. Reducir número de documentos consultados (maxResults = 5)
# 2. Añadir índices en LegalDocument.topic
# 3. Optimizar contenido: usar primeros 5000 caracteres (no todo)
```

---

## 📈 Métricas Importantes

### Medir Precisión
```bash
# Ejecuta 10 pruebas de artículos específicos
# Cuenta cuántas responden con texto literal

Fórmula: (respuestas_literales / total_respuestas) * 100
Meta: > 90%
```

### Medir Confianza
```bash
# Pide feedback a usuarios:
# "¿Qué tan confiable fue la respuesta?"
# 1 = No confiable
# 5 = Muy confiable

Meta: promedio > 4.0
```

### Medir Uso
```bash
# Logs API:
# Número de llamadas a /api/ai/chat
# Tiempo promedio de respuesta
# Número de errores

Meta: 
- Respuestas < 3 segundos
- Errores < 1%
```

---

## 🔐 Seguridad

### Variables de Entorno Críticas
```bash
# .env DEBE contener:
GROQ_API_KEY=tu_clave_aqui
DATABASE_URL=tu_base_datos

# NUNCA exponer estas claves en código
# NUNCA commitear .env a git
```

### Rate Limiting (Futuro)
```typescript
// Actualmente sin rate limiting
// Si abusan de API, implementar:
// - Max 10 requests/minuto por usuario
// - Max 100 requests/hora
// - Cache de respuestas frecuentes

// Implementado en: app/api/ai/chat/route.ts
```

### Validación de Input
```typescript
// Input sanitizado automáticamente por Groq
// Pero verificar:
if (!query || query.length > 5000) {
  // Rechazar
}
```

---

## 📚 Mantenimiento de Documentación

### Actualizar Cuando:

1. **Cambios en sistema RAG**
   - Actualizar: `CHANGELOG_ASISTENTE_ESTUDIO.md`
   - Actualizar: `RESUMEN_MEJORAS_ASISTENTE_IA.md` (versión)

2. **Nuevos modos o funciones**
   - Actualizar: `ASISTENTE_ESTUDIO_MEJORADO.md`
   - Actualizar: `TIPS_AVANZADOS_ASISTENTE.md`

3. **Nuevos casos de test**
   - Actualizar: `PRUEBAS_ASISTENTE_ESTUDIO.md`

4. **Cambios en normativa**
   - Actualizar: Referencias en documentos de usuarios
   - Notificar: A estudiantes sobre cambios

---

## 🚀 Roadmap Futuro

### Q1 2026 (Próximas mejoras)
- [ ] Integración con API de BOE para normativa actualizada
- [ ] Cache de respuestas frecuentes
- [ ] Analytics dashboard de uso

### Q2 2026
- [ ] Integración con API de INSS
- [ ] Análisis automático de jurisprudencia
- [ ] Exportar respuestas a PDF

### Q3 2026
- [ ] Machine learning para mejorar búsqueda
- [ ] Integración con foro de estudiantes
- [ ] Sistema de revisión de respuestas

### Q4 2026
- [ ] Integración con simulacros de examen
- [ ] Recomendaciones personalizadas
- [ ] Chat en vivo con expertos legales

---

## 📞 Contacto y Escalación

### Si encuentras un bug:
1. Documenta en: `PRUEBAS_ASISTENTE_ESTUDIO.md`
2. Usa plantilla de bug incluida
3. Incluye: pregunta exacta, respuesta obtenida, respuesta esperada
4. Escalate a: Equipo de desarrollo

### Si necesitas cambios:
1. Abre issue con: [FEATURE] Nombre
2. Incluye: descripción, impacto, prioridad
3. Pon en: roadmap del proyecto

### Si hay rendimiento lento:
1. Ejecuta: Script de verificación
2. Revisa: Logs del servidor
3. Optimiza: Base de datos o configuración

---

## 📊 Reporte Mensual

**Template para reporte mensual:**
```markdown
# Reporte Asistente IA - [Mes/Año]

## Métricas
- Precisión: X%
- Tiempo promedio: X segundos
- Errores: X por 1000 requests
- Usuarios activos: X

## Problemas Reportados
- Problema 1: [descripción]
- Problema 2: [descripción]

## Acciones Tomadas
- Acción 1: [resultado]
- Acción 2: [resultado]

## Próximas Mejoras
- Mejora 1: [descripción]
- Mejora 2: [descripción]

## Recomendaciones
- [recomendación 1]
- [recomendación 2]
```

---

## ✅ Resumen de Administración

**Responsabilidades clave:**
1. ✅ Monitorear funcionamiento diario
2. ✅ Ejecutar pruebas semanales
3. ✅ Recopilar feedback de usuarios
4. ✅ Mantener documentación actualizada
5. ✅ Reportar problemas/mejoras
6. ✅ Escalar issues críticas

**Herramientas disponibles:**
- `PRUEBAS_ASISTENTE_ESTUDIO.md` - Casos de test
- `CHANGELOG_ASISTENTE_ESTUDIO.md` - Historial
- `src/lib/rag-system.ts` - Código principal
- `app/api/ai/chat/route.ts` - Endpoint API

**Contacto:**
- Issues: Registrar en proyecto
- Mejoras: Sugerir en roadmap
- Emergencias: Contactar dev principal

---

**Versión**: 2.1.0  
**Última actualización**: 2 de enero de 2026  
**Estado**: ✅ En producción  
**SLA**: 99.9% disponibilidad

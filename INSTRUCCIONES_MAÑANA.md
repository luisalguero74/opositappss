# 🌅 EJECUTAR MAÑANA A LAS 7-8 AM (2 minutos total)

## ⏰ IMPORTANTE: Ejecutar temprano (7-8 AM)
A esa hora NO habrá usuarios conectados y funcionará instantáneamente.

## ✅ Estado Actual
- ✅ Código completamente implementado y pusheado a GitHub
- ✅ DATABASE_URL configurado con pooler de Supabase (puerto 6543)
- ✅ Schema.prisma actualizado
- ⏳ **PENDIENTE:** Solo ejecutar SQL (2 minutos)

## 🚀 Pasos (SUPER SIMPLE)

### Paso 1: Ejecutar SQL en Supabase (1 min)
1. **7-8 AM** - Abre **Supabase Dashboard** → SQL Editor
2. **New query**
3. Copia TODO el contenido de `EJECUTAR_EN_SUPABASE.sql`
4. Pégalo y **Run**
5. ✅ Listo en 5 segundos (a esa hora no hay conexiones activas)

### Paso 2: Migrar Datos Existentes (2 min)
En la terminal de VSCode:
```bash
npx ts-node scripts/migrate-questions-to-temas.ts
```

Este script:
- Vincula todas las preguntas existentes a sus temas
- Crea las relaciones N:N entre cuestionarios y preguntas
- Muestra progreso en consola

### Paso 3: Verificar (1 min)
```bash
npx prisma studio
```

Verifica:
- Tabla `QuestionnaireQuestion` creada
- Campo `Question.temaId` visible
- Relaciones funcionando

### Paso 4: Probar el Nuevo Sistema
1. Ve a `/admin/questionnaires/create`
2. Crea un cuestionario usando el wizard de 4 pasos
3. Selecciona temas, dificultad, cantidad de preguntas
4. ¡Verás el nuevo sistema en acción! 🎉

## 📋 Checklist Rápido
- [ ] SQL ejecutado en Supabase
- [ ] Script de migración ejecutado
- [ ] Verificado en Prisma Studio
- [ ] Creado un cuestionario de prueba
- [ ] Todo funcionando ✅

## ⚠️ Si Algo Falla
- Revisa que DATABASE_URL siga con el pooler (puerto 6543)
- Verifica que el SQL se ejecutó sin errores
- Consulta `IMPLEMENTACION_BANCO_PREGUNTAS_COMPLETADO.md` para más detalles

## 🎯 Resultado Final
Un sistema completo de banco de preguntas donde:
- Las preguntas están organizadas por tema
- Puedes reutilizar preguntas en múltiples cuestionarios
- Creación de cuestionarios con filtros avanzados
- Distribución equitativa o proporcional
- Selección aleatoria, recientes o menos respondidas

¡Descansa bien! 😴

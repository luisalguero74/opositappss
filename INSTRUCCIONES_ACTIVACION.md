# 🚀 INSTRUCCIONES PARA ACTIVAR EL NUEVO SISTEMA

**Fecha**: 18 de febrero de 2026  
**Estado**: Código implementado ✅ | BD pendiente de migración ⏳

---

## ⚡ ACTIVACIÓN RÁPIDA (3 pasos)

### **Paso 1: Conectar a la Base de Datos** 

Cuando tu base de datos Supabase esté disponible:

```bash
# Verificar conexión
npx prisma db pull
```

Si sale error, revisar en Supabase que el proyecto esté activo.

---

### **Paso 2: Aplicar Migración del Schema**

```bash
# Aplicar cambios de estructura
npx prisma migrate deploy
```

Esto creará:
- Campo `temaId` en tabla `Question` (opcional)
- Tabla nueva `QuestionnaireQuestion` (N:N)
- Índices y relaciones

**Tiempo estimado**: 10-30 segundos

---

### **Paso 3: Migrar Datos Existentes**

```bash
# Vincular preguntas a temas y crear relaciones N:N
npx ts-node scripts/migrate-questions-to-temas.ts
```

Este script:
1. Lee todas las preguntas existentes
2. Las vincula a `TemaOficial` según su `temaNumero` y `temaCodigo`
3. Crea relaciones `QuestionnaireQuestion` para mantener cuestionarios actuales
4. Muestra progreso en tiempo real
5. Imprime resumen final con estadísticas

**Tiempo estimado**: 1-3 minutos (depende de cantidad de preguntas)

---

## ✅ VERIFICACIÓN POST-MIGRACIÓN

Una vez completados los 3 pasos, verificar que todo funciona:

### **1. Verificar en Base de Datos**

```bash
# Abrir Prisma Studio para inspeccionar visualmente
npx prisma studio
```

Verificar:
- ✅ Tabla `QuestionnaireQuestion` existe
- ✅ Preguntas tienen `temaId` asignado
- ✅ Cuestionarios existentes mantienen sus preguntas

### **2. Probar Nueva Interfaz**

1. Login como admin
2. Ir a **Admin Panel**
3. Click en **"Crear Cuestionario"** (nueva opción)
4. Seguir wizard de 4 pasos
5. Crear un cuestionario de prueba

### **3. Verificar Funcionalidades Existentes**

Probar que **TODO sigue funcionando**:

- [ ] Responder un cuestionario existente
- [ ] Ver corrección automática
- [ ] Verificar celebración al 100% (si aplica)
- [ ] Ver estadísticas en `/statistics`
- [ ] Ver historial de intentos
- [ ] Verificar racha de estudio
- [ ] Probar marcado de preguntas (🤔📚⭐)

**Todos deben funcionar igual que antes** ✅

---

## 🔄 SI ALGO FALLA (Rollback)

Si encuentras algún problema, puedes volver al estado anterior:

```bash
# 1. Volver al commit anterior (antes de la implementación)
git reset --hard d4e14ed

# 2. Regenerar Prisma Client
npx prisma generate

# 3. Reiniciar servidor
npm run dev
```

**Estado**: Sistema vuelve a funcionar exactamente como antes.

Luego puedes reportar el error y re-intentar cuando se corrija.

---

## 📊 QUÉ ESPERAR DESPUÉS DE LA MIGRACIÓN

### **Usuarios Normales**
- ❌ **NO notan NINGÚN cambio**
- ✅ Todo funciona igual
- ✅ Mismos cuestionarios disponibles
- ✅ Mismas estadísticas

### **Administradores**
- ✅ **Nueva forma de crear cuestionarios** (más potente)
- ✅ Pueden seleccionar temas específicos
- ✅ Configurar dificultad y cantidad
- ✅ Vista previa antes de crear
- ✅ Las interfaces antiguas siguen funcionando

### **Base de Datos**
- ✅ **Mejor organización** (preguntas por tema)
- ✅ **CERO duplicados** nuevos
- ✅ Reutilización eficiente
- ✅ Escalabilidad mejorada

---

## ⚠️ NOTAS IMPORTANTES

### **Durante la Migración**

1. **Pausar generación automática** (si tienes cron jobs activos)
   ```bash
   # Deshabilitar temporalmente
   # /api/cron/generate-questions
   ```

2. **Evitar crear cuestionarios** durante los 3 pasos
   - Esperar a que migración complete
   - Total tiempo: ~5 minutos máximo

3. **No cerrar terminal** mientras ejecuta `migrate-questions-to-temas.ts`

### **Después de la Migración**

1. **Cuestionarios antiguos siguen funcionando**
   - Usan relación legacy (`questionnaireId`)
   - No necesitan modificación

2. **Nuevos cuestionarios usan sistema N:N**
   - Creados con `/admin/questionnaires/create`
   - Sin duplicación de preguntas

3. **Convivencia de ambos sistemas**
   - Totalmente compatible
   - Migración gradual si lo deseas

---

## 🎯 USANDO EL NUEVO SISTEMA

### **Crear Cuestionario por Temas**

1. **Acceder**:
   ```
   Admin Panel → "Crear Cuestionario"
   O: /admin/questionnaires/create
   ```

2. **Configurar**:
   - Paso 1: Título y tipo
   - Paso 2: Seleccionar temas (ej: Temas 1-5 General)
   - Paso 3: Dificultad (fácil+media), Cantidad (50 preguntas)
   - Paso 4: Confirmar

3. **Resultado**:
   - Cuestionario creado con 50 preguntas
   - Distribuidas equitativamente entre temas seleccionados
   - **Sin duplicar preguntas** en BD
   - Listo para publicar

### **Ejemplo Práctico**

**Objetivo**: Test con Temas 1, 2, 3 (General), solo preguntas fáciles, 30 preguntas

**Pasos**:
1. Título: "Test Básico Temas 1-3"
2. Tipo: Teoría
3. Seleccionar: Tema 1, Tema 2, Tema 3
4. Dificultad: Solo "Fácil"
5. Cantidad: 30
6. Distribución: Equitativa (10 por tema)
7. Crear

**Resultado**:
- Cuestionario con exactamente 30 preguntas fáciles
- 10 del Tema 1 + 10 del Tema 2 + 10 del Tema 3
- Preguntas seleccionadas aleatoriamente
- Listo en segundos

---

## 📞 SOPORTE

Si necesitas ayuda:

1. **Ver logs del script**:
   ```bash
   npx ts-node scripts/migrate-questions-to-temas.ts > migracion.log 2>&1
   ```

2. **Verificar schema**:
   ```bash
   npx prisma validate
   ```

3. **Regenerar Prisma Client** (si hay errores de tipos):
   ```bash
   npx prisma generate
   ```

4. **Consultar documentación completa**:
   - [IMPLEMENTACION_BANCO_PREGUNTAS_COMPLETADO.md](./IMPLEMENTACION_BANCO_PREGUNTAS_COMPLETADO.md)
   - [PROPUESTA_BANCO_PREGUNTAS_RIESGO_CERO.md](./PROPUESTA_BANCO_PREGUNTAS_RIESGO_CERO.md)

---

## ✅ CHECKLIST DE ACTIVACIÓN

- [ ] Base de datos Supabase activa
- [ ] `npx prisma migrate deploy` ejecutado correctamente
- [ ] `npx ts-node scripts/migrate-questions-to-temas.ts` completado sin errores
- [ ] Verificado en Prisma Studio que datos migraron
- [ ] Probada nueva interfaz `/admin/questionnaires/create`
- [ ] Verificado que cuestionarios existentes funcionan
- [ ] Probadas funcionalidades (corrección, estadísticas, etc.)
- [ ] Todo funciona correctamente ✅

---

**¡Sistema listo para usar!** 🚀

Si todos los checks están ✅, el nuevo sistema está **100% operativo** y puedes empezar a crear cuestionarios usando el banco de preguntas por tema.

# 📱 Numeración Española - Guía de Referencia

## ✅ Formatos Válidos en España

España utiliza múltiples rangos de numeración móvil **simultáneamente**:

| Formato | Estado | Ejemplo |
|---------|--------|---------|
| `+346XXXXXXXX` | ✅ Activo | +34656809596 |
| `+347XXXXXXXX` | ✅ Activo | +34756809596 |
| `+348XXXXXXXX` | ✅ Activo | +34856809596 |
| `+349XXXXXXXX` | ✅ Activo | +34956809596 |

## ⚠️ Importante: Validación Exacta

El sistema de OpositApp valida números de forma **EXACTA**:

```
+34656809596 ≠ +34756809596
```

Son números **diferentes** y deben añadirse **por separado** si quieres autorizar ambos.

---

## 🎯 Casos de Uso Comunes

### Caso 1: Usuario con un solo número
**Situación:** El usuario tiene `+34656809596`

**Solución:** Añade solo ese número
```
+34656809596|Usuario A
```

---

### Caso 2: Usuario con números en ambos rangos
**Situación:** El usuario tiene:
- `+34656809596` (número antiguo)
- `+34756809596` (número nuevo del mismo usuario)

**Solución:** Añade ambos números
```
+34656809596|Usuario A
+34756809596|Usuario A (nuevo)
```

---

### Caso 3: Grupo WhatsApp con múltiples números
**Situación:** Grupo con 10 personas, algunos con +346, otros con +347

**Solución:** Añade cada número específico
```
+34656809596|Grupo Oposiciones
+34657123456|Grupo Oposiciones
+34758123456|Grupo Oposiciones
+34659456789|Grupo Oposiciones
```

---

## 🔧 Herramientas Disponibles

### 1. Panel Web
Accede a: `http://localhost:3000/admin/allowed-phones`

**Funciones:**
- ➕ Añadir números individualmente
- 📋 Carga masiva (pegar múltiples números)
- 📊 Ver listado completo
- 🗑️ Eliminar números

---

### 2. Archivo allowed-phones.txt
Edita el archivo y ejecuta:
```bash
npx tsx scripts/load-allowed-phones.ts
```

**Formato del archivo:**
```txt
# Comentarios con #
+34656809596|Grupo A
+34756809596|Grupo A
+34657123456|Grupo B
```

---

### 3. Script de Duplicación
Si quieres crear versiones +347 de todos tus números +346:

```bash
npx tsx scripts/migrate-phone-numbers.ts
```

**Resultado:**
- `+34656809596` → Crea **también** `+34756809596`
- NO elimina números originales
- Solo crea los que no existan

---

## ❓ Preguntas Frecuentes

### ¿Por qué el registro dice "no autorizado"?
El número **exacto** no está en la lista. Verifica:
1. ¿El número está escrito exactamente igual?
2. ¿Tiene el prefijo +34?
3. ¿Es el rango correcto (+346 vs +347)?

### ¿Tengo que duplicar todos los números?
**No necesariamente.** Solo si:
- Un usuario tiene números en ambos rangos
- Quieres permitir acceso con cualquiera de los dos

### ¿Puedo autorizar solo +347 y rechazar +346?
**Sí.** Solo añade los números +347 que quieras autorizar.

### ¿El sistema convierte automáticamente +346 → +347?
**No.** Cada número se valida exactamente como está guardado.

---

## 📊 Ejemplo Práctico

**Escenario:** Tienes un grupo WhatsApp con 5 personas:
- María: +34656111111
- Juan: +34657222222 (cambió a +34757222222)
- Ana: +34758333333 (solo tiene +347)
- Pedro: +34659444444
- Luis: +34656555555

**Números a añadir:**
```txt
+34656111111|Grupo WhatsApp - María
+34657222222|Grupo WhatsApp - Juan (antiguo)
+34757222222|Grupo WhatsApp - Juan (nuevo)
+34758333333|Grupo WhatsApp - Ana
+34659444444|Grupo WhatsApp - Pedro
+34656555555|Grupo WhatsApp - Luis
```

**Total:** 6 números (Juan tiene 2)

---

## 🔐 Validación del Sistema

El sistema valida:

1. ✅ Formato: `+34` + 9 dígitos
2. ✅ Número exacto en lista de permitidos
3. ❌ NO hace conversiones automáticas
4. ❌ NO acepta aproximaciones

---

## 📝 Comandos Útiles

```bash
# Ver todos los números permitidos
npx tsx -e "import {prisma} from './src/lib/prisma'; prisma.allowedPhoneNumber.findMany().then(phones => phones.forEach(p => console.log(p.phoneNumber, p.groupName || ''))).finally(() => prisma.\$disconnect())"

# Contar total
npx tsx -e "import {prisma} from './src/lib/prisma'; prisma.allowedPhoneNumber.count().then(console.log).finally(() => prisma.\$disconnect())"

# Buscar números +346
npx tsx -e "import {prisma} from './src/lib/prisma'; prisma.allowedPhoneNumber.findMany({where:{phoneNumber:{startsWith:'+346'}}}).then(phones => console.log('Total +346:', phones.length)).finally(() => prisma.\$disconnect())"

# Buscar números +347
npx tsx -e "import {prisma} from './src/lib/prisma'; prisma.allowedPhoneNumber.findMany({where:{phoneNumber:{startsWith:'+347'}}}).then(phones => console.log('Total +347:', phones.length)).finally(() => prisma.\$disconnect())"
```

---

## 🎓 Resumen

1. **+346 y +347 son rangos DIFERENTES pero AMBOS VÁLIDOS**
2. **Añade cada número exacto que quieras autorizar**
3. **Usa el panel web para gestión rápida**
4. **Usa scripts para operaciones masivas**
5. **La validación es EXACTA, sin conversiones automáticas**

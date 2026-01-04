# 📱 Cómo Acceder al Sistema de Validación de Números de Teléfono

## ✅ La funcionalidad SÍ está implementada

Te muestro paso a paso dónde verla:

---

## 🎯 Opción 1: Panel de Administración (Recomendado)

### Paso 1: Acceder como Administrador

1. Abre tu navegador en: `http://localhost:3000/login`
2. Inicia sesión con una cuenta de **administrador**
   - Si no tienes cuenta admin, primero crea una o modifica tu usuario actual

### Paso 2: Ir al Panel de Números Permitidos

3. En el menú lateral de administración, busca **"Gestión de Teléfonos"** o ve directamente a:
   ```
   http://localhost:3000/admin/allowed-phones
   ```

### Paso 3: Gestionar Números

En esta pantalla verás:

```
┌─────────────────────────────────────────────────────────┐
│  Números de Teléfono Permitidos                         │
│─────────────────────────────────────────────────────────│
│  Añadir Nuevo Número:                                   │
│  ┌──────────────────┐  ┌──────────────┐  [AÑADIR]      │
│  │ +34656809596     │  │ Grupo WhatsApp│                │
│  └──────────────────┘  └──────────────┘                │
│                                                          │
│  Lista de Números Autorizados:                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Teléfono         │ Grupo       │ Fecha    │ Acción││ │
│  │ +34656809596     │ WhatsApp    │ 29/12/25 │ [X]   ││ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Acciones disponibles:**
- ✅ Ver todos los números autorizados
- ✅ Añadir nuevos números (manualmente)
- ✅ Eliminar números
- ✅ Ver a qué grupo pertenecen

---

## 🎯 Opción 2: Página de Registro (Vista del Usuario)

### Paso 1: Ir a Registro

1. Abre: `http://localhost:3000/register`

### Paso 2: Ver el Campo de Teléfono

Verás un formulario como este:

```
┌─────────────────────────────────────────┐
│         Registro de Usuario             │
│─────────────────────────────────────────│
│  Nombre                                 │
│  ┌──────────────────────────────────┐  │
│  │                                   │  │
│  └──────────────────────────────────┘  │
│                                         │
│  Email                                  │
│  ┌──────────────────────────────────┐  │
│  │ tu@email.com                      │  │
│  └──────────────────────────────────┘  │
│                                         │
│  Número de Teléfono Móvil ⭐           │
│  ┌──────────────────────────────────┐  │
│  │ +34 600 000 000                   │  │ ← AQUÍ ESTÁ
│  └──────────────────────────────────┘  │
│  Formato: +34 seguido de 9 dígitos     │
│                                         │
│  Contraseña                             │
│  ┌──────────────────────────────────┐  │
│  │ ••••••••                          │  │
│  └──────────────────────────────────┘  │
│                                         │
│         [REGISTRARSE]                   │
└─────────────────────────────────────────┘
```

### Paso 3: Probar la Validación

**Test 1: Número NO autorizado**
```
Teléfono: +34600000000
Resultado: ❌ "Este número de teléfono no está autorizado para registrarse"
```

**Test 2: Número autorizado**
```
Teléfono: +34656809596
Resultado: ✅ Registro exitoso
```

---

## 🎯 Opción 3: Prisma Studio (Base de Datos)

### Ya está abierto en tu navegador

1. Ve a: `http://localhost:5556`
2. En el panel izquierdo, haz clic en **"AllowedPhoneNumber"**
3. Verás la tabla con los números autorizados:

```
┌──────────────────────────────────────────────────────────┐
│ AllowedPhoneNumber                                       │
├────────┬───────────────┬──────────────┬──────────────────┤
│ id     │ phoneNumber   │ groupName    │ addedAt          │
├────────┼───────────────┼──────────────┼──────────────────┤
│ cm...  │ +34656809596  │ WhatsApp     │ 2025-12-29...    │
└────────┴───────────────┴──────────────┴──────────────────┘
```

4. También puedes ver la tabla **"User"** para ver qué usuarios tienen teléfono asociado:

```
┌──────────────────────────────────────────────────────────┐
│ User                                                     │
├────────┬──────────────┬─────────────────┬───────────────┤
│ email  │ phoneNumber  │ name            │ role          │
├────────┼──────────────┼─────────────────┼───────────────┤
│ luis@  │ +34656809596 │ Luis Alguero    │ admin         │
└────────┴──────────────┴─────────────────┴───────────────┘
```

---

## 🎯 Opción 4: Carga Masiva con Script

### Si quieres añadir más números desde un archivo

1. **Crea el archivo** `allowed-phones.txt` en la raíz del proyecto:
   ```bash
   touch allowed-phones.txt
   ```

2. **Añade números** (uno por línea):
   ```
   +34656809596 # Grupo WhatsApp Oposiciones
   +34612345678 # Grupo 2
   +34698765432 # Individual
   ```

3. **Ejecuta el script:**
   ```bash
   npx tsx scripts/load-allowed-phones.ts
   ```

4. **Resultado:**
   ```
   ✅ Procesado: +34656809596 (Grupo WhatsApp Oposiciones)
   ✅ Procesado: +34612345678 (Grupo 2)
   ✅ Procesado: +34698765432 (Individual)
   
   📊 Resumen:
   - Números válidos procesados: 3
   - Total en la base de datos: 3
   ```

---

## 🔍 Verificar que Funciona

### Test Completo de Validación

1. **Abre el panel admin:**
   ```
   http://localhost:3000/admin/allowed-phones
   ```

2. **Añade un número de prueba:**
   - Teléfono: `+34999888777`
   - Grupo: `Test`
   - Clic en **AÑADIR**

3. **Ve a registro:**
   ```
   http://localhost:3000/register
   ```

4. **Intenta registrarte con dos números diferentes:**

   **Test A - Número NO autorizado:**
   ```
   Email: test1@example.com
   Teléfono: +34111222333 ← NO está en la lista
   Contraseña: Test123!@#
   
   Resultado esperado: ❌ Error "Número no autorizado"
   ```

   **Test B - Número autorizado:**
   ```
   Email: test2@example.com
   Teléfono: +34999888777 ← SÍ está en la lista
   Contraseña: Test123!@#
   
   Resultado esperado: ✅ Registro exitoso
   ```

---

## 📁 Ubicación de Archivos

Si quieres ver el código, está en:

### Frontend (UI)
- **Registro:** `app/register/page.tsx` (líneas 89-99)
- **Panel Admin:** `app/admin/allowed-phones/page.tsx`

### Backend (API)
- **Validación de registro:** `app/api/auth/register/route.ts` (líneas 14-31)
- **Gestión admin:** `app/api/admin/allowed-phones/route.ts`

### Base de Datos
- **Schema:** `prisma/schema.prisma` (líneas 14 y 343-351)
  - Modelo `User.phoneNumber`
  - Modelo `AllowedPhoneNumber`

### Scripts
- **Carga masiva:** `scripts/load-allowed-phones.ts`

### Documentación
- **Guía completa:** `PHONE_VALIDATION_SYSTEM.md`

---

## 🚨 Si No Lo Ves

### Problema 1: No aparece en el menú de administración

**Solución:**
1. Verifica que eres administrador
2. O accede directamente a: `http://localhost:3000/admin/allowed-phones`

### Problema 2: Campo de teléfono no aparece en registro

**Solución:**
1. Limpia caché del navegador (Ctrl+Shift+R o Cmd+Shift+R)
2. Verifica que el servidor está corriendo
3. Mira la consola del navegador para errores

### Problema 3: Base de datos sin tabla AllowedPhoneNumber

**Solución:**
```bash
npx prisma db push
```

---

## ✅ Resumen: Dónde Está Todo

| Funcionalidad | URL | Requiere Admin |
|---------------|-----|----------------|
| Ver números autorizados | http://localhost:3000/admin/allowed-phones | ✅ Sí |
| Añadir/eliminar números | http://localhost:3000/admin/allowed-phones | ✅ Sí |
| Probar validación (registro) | http://localhost:3000/register | ❌ No |
| Ver en base de datos | http://localhost:5556 (Prisma Studio) | ❌ No |
| Carga masiva | `npx tsx scripts/load-allowed-phones.ts` | Terminal |

---

## 🎯 Próximo Paso

**Para ver el panel ahora mismo:**

1. Abre: `http://localhost:3000/login`
2. Inicia sesión como admin
3. Ve a: `http://localhost:3000/admin/allowed-phones`

**O abre Prisma Studio:**
- Ya está corriendo en: `http://localhost:5556`

¡La funcionalidad está 100% implementada y funcionando! 🎉

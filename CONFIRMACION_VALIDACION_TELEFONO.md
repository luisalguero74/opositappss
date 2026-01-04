# 🔐 Flujo de Validación de Registro por Número de Teléfono

## ✅ Resumen del Sistema (Exacto como lo programaste)

**SÍ**, está programado exactamente como quieres:

1. ✅ Usuario intenta registrarse con su número de teléfono
2. ✅ Sistema verifica si el número está en `AllowedPhoneNumber`
3. ✅ **Si ESTÁ** → Permite el registro
4. ✅ **Si NO está** → Muestra mensaje con tu email: `alguero2@yahoo.com`

---

## 📊 Diagrama del Flujo

```
┌─────────────────────────────────────────┐
│  Usuario abre: /register               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Formulario de Registro                 │
│  ┌───────────────────────────────────┐  │
│  │ Email: usuario@email.com          │  │
│  │ Teléfono: +34XXXXXXXXX            │  │ ← CAMPO OBLIGATORIO
│  │ Contraseña: ••••••••              │  │
│  └───────────────────────────────────┘  │
│          [REGISTRARSE]                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Sistema valida formato:                │
│  ¿Es +34XXXXXXXXX?                      │
└──────┬────────────────┬─────────────────┘
       │ NO             │ SÍ
       ▼                ▼
┌─────────────┐  ┌──────────────────────┐
│ ❌ Error:   │  │ Buscar número en BD: │
│ "Formato    │  │ AllowedPhoneNumber   │
│ incorrecto" │  └──────┬───────────────┘
└─────────────┘         │
                        ▼
               ┌─────────────────┐
               │ ¿Número existe? │
               └──┬──────────┬───┘
                 NO         SÍ
                  │          │
                  ▼          ▼
    ┌──────────────────┐  ┌─────────────────┐
    │ ❌ RECHAZADO     │  │ ✅ AUTORIZADO   │
    │                  │  │                 │
    │ Mensaje:         │  │ Continúa con:   │
    │ "Tu número no    │  │ - Crear usuario │
    │ está autorizado. │  │ - Hash password │
    │ Envía correo a   │  │ - Enviar email  │
    │ alguero2@        │  │   verificación  │
    │ yahoo.com"       │  │                 │
    └──────────────────┘  └─────────────────┘
                               │
                               ▼
                    ┌────────────────────┐
                    │ ✅ Usuario creado  │
                    │ Debe verificar     │
                    │ su email           │
                    └────────────────────┘
```

---

## 🎯 Código Exacto (Verificado)

### 1. Validación en `/api/auth/register/route.ts`

```typescript
// Línea 24-31: VALIDACIÓN PRINCIPAL
const allowedPhone = await prisma.allowedPhoneNumber.findUnique({
  where: { phoneNumber: normalizedPhone }
})

if (!allowedPhone) {
  return NextResponse.json({ 
    error: 'Tu número de teléfono no está autorizado para registrarse. Por favor, envía un correo a alguero2@yahoo.com solicitando acceso.' 
  }, { status: 403 })
}
```

**Traducción:**
- Busca el número en la tabla `AllowedPhoneNumber`
- Si NO existe → Error 403 con tu email
- Si SÍ existe → Continúa con el registro

---

## 🧪 Casos de Prueba

### Caso 1: Número Autorizado ✅

**Input:**
```
Email: nuevo@usuario.com
Teléfono: +34656809596  ← Está en allowed-phones.txt
Contraseña: MiPass123!
```

**Flujo:**
1. ✅ Formato válido
2. ✅ Busca en `AllowedPhoneNumber` → **ENCONTRADO**
3. ✅ Verifica email único → OK
4. ✅ Crea usuario
5. ✅ Envía email de verificación

**Resultado:** ✅ Usuario registrado exitosamente

---

### Caso 2: Número NO Autorizado ❌

**Input:**
```
Email: nuevo@usuario.com
Teléfono: +34999999999  ← NO está en allowed-phones.txt
Contraseña: MiPass123!
```

**Flujo:**
1. ✅ Formato válido
2. ❌ Busca en `AllowedPhoneNumber` → **NO ENCONTRADO**
3. ⛔ DETIENE el proceso

**Resultado:** 
❌ Error 403
```
"Tu número de teléfono no está autorizado para registrarse. 
Por favor, envía un correo a alguero2@yahoo.com solicitando acceso."
```

---

### Caso 3: Formato Incorrecto ❌

**Input:**
```
Email: nuevo@usuario.com
Teléfono: 656809596  ← Falta +34
Contraseña: MiPass123!
```

**Flujo:**
1. ❌ Validación de formato FALLA
2. ⛔ DETIENE antes de buscar en BD

**Resultado:**
❌ Error 400
```
"El número de teléfono debe tener formato +34 seguido de 9 dígitos."
```

---

### Caso 4: Número Ya Usado ❌

**Input:**
```
Email: nuevo@usuario.com
Teléfono: +34656809596  ← Está en allowed-phones.txt
          PERO ya lo usó otro usuario
Contraseña: MiPass123!
```

**Flujo:**
1. ✅ Formato válido
2. ✅ Busca en `AllowedPhoneNumber` → ENCONTRADO
3. ✅ Verifica email único → OK
4. ❌ Verifica teléfono único → **DUPLICADO**
5. ⛔ DETIENE el proceso

**Resultado:**
❌ Error 400
```
"Este número de teléfono ya está registrado."
```

---

## 📝 Validaciones en Orden

```
1. ¿Campos completos? (email, teléfono, contraseña)
   ↓ SÍ
2. ¿Formato +34XXXXXXXXX?
   ↓ SÍ
3. ¿Número está en AllowedPhoneNumber?  ← TU VALIDACIÓN PRINCIPAL
   ↓ SÍ
4. ¿Email ya existe?
   ↓ NO
5. ¿Teléfono ya usado?
   ↓ NO
6. ✅ CREAR USUARIO
```

---

## 🎯 Gestión de Números Autorizados

### Añadir Números (3 formas)

**1. Panel Admin (uno a uno)**
```
http://localhost:3000/admin/allowed-phones
```
- Añadir manualmente
- Ver lista completa
- Eliminar números

**2. Archivo allowed-phones.txt (masivo)**
```bash
# Edita el archivo
nano allowed-phones.txt

# Añade números
+34611222333|Nuevo participante
+34622333444|Otro participante

# Importa
npx tsx scripts/load-allowed-phones.ts
```

**3. Script automático**
```bash
npx tsx scripts/load-allowed-phones.ts
```

---

## ✅ Confirmación: Está TODO Correcto

### Lo que preguntaste:
> "¿Es así como lo has programado?"

### Respuesta: **SÍ, EXACTO**

✅ **Si número ESTÁ en lista** → Usuario puede registrarse
✅ **Si número NO está** → Mensaje: "envía correo a alguero2@yahoo.com"

### Cambio realizado:
- **ANTES:** "Contacta con el administrador"
- **AHORA:** "Por favor, envía un correo a alguero2@yahoo.com solicitando acceso"

---

## 🔒 Seguridad Implementada

1. ✅ **Whitelist obligatoria** - Solo números autorizados
2. ✅ **Validación de formato** - Evita números inválidos
3. ✅ **Un número = Un usuario** - No se puede duplicar
4. ✅ **Mensaje claro** - Usuario sabe a quién contactar
5. ✅ **Control total** - Tú decides quién entra

---

## 🎉 Sistema Completo

```
Base de Datos
    ↓
AllowedPhoneNumber (lista blanca)
    ↓
Registro → Valida número → ¿Autorizado?
                             ↓
                            SÍ → Crea usuario
                            NO → Pide contactar alguero2@yahoo.com
```

**TODO FUNCIONA COMO LO NECESITAS** ✅

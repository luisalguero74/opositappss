# Sistema de Validación de Números de Teléfono

## 📱 Descripción

Sistema de control de acceso mediante validación de números de teléfono móvil. Solo los usuarios cuyos números estén previamente registrados en la base de datos podrán completar el proceso de registro.

## 🎯 Características

✅ **Validación estricta**: Solo números en formato español (+34XXXXXXXXX)  
✅ **Lista blanca**: Control total de quién puede registrarse  
✅ **Integración WhatsApp**: Gestiona grupos identificando el origen de cada número  
✅ **GDPR compliant**: Aviso de protección de datos conforme a normativa europea  
✅ **Panel de administración**: Interfaz gráfica para gestionar números permitidos  
✅ **Carga masiva**: Script para importar múltiples números desde archivo  

## 🔐 Funcionamiento del Registro

### Proceso para el Usuario

1. **Accede a `/register`**
2. **Introduce**:
   - Email
   - Número de teléfono móvil (+34 XXX XXX XXX)
   - Contraseña (mín. 8 caracteres, mayúscula, minúscula, número, carácter especial)
3. **Acepta** el aviso de protección de datos (RGPD + LOPDGDD)
4. **Sistema valida**:
   - ✅ Formato del teléfono correcto
   - ✅ Número existe en lista de permitidos
   - ✅ Email no duplicado
   - ✅ Teléfono no usado previamente
5. **Resultado**:
   - ✅ Si todo OK → Cuenta creada + Email de verificación
   - ❌ Si falla → Mensaje de error específico

### Mensajes de Error

- `"El número de teléfono debe tener formato +34 seguido de 9 dígitos"`
- `"El número de teléfono proporcionado no está autorizado para el registro. Contacta con el administrador"`
- `"El email ya está registrado"`
- `"Este número de teléfono ya está registrado"`

## 👨‍💼 Gestión Administrativa

### Panel Web (`/admin/allowed-phones`)

**Acceso**: Solo administradores

**Funciones**:
- ➕ Añadir números individualmente
- 🗑️ Eliminar números
- 👁️ Ver todos los números con grupo de origen y fecha
- 📋 Información de carga masiva

**Datos mostrados**:
- Número de teléfono (formato +34XXXXXXXXX)
- Grupo de WhatsApp asociado
- Fecha de alta
- Botón eliminar

### Carga Masiva por Script

#### 1. Preparar archivo `allowed-phones.txt`

```txt
# Números de teléfono permitidos para registro
# Formato: +34XXXXXXXXX (uno por línea)
# Puedes añadir comentarios con # y separar con nombre de grupo usando |

# Grupo WhatsApp Principal
+34600000001|Grupo Principal
+34600000002|Grupo Principal

# Grupo WhatsApp Secundario
+34700000001|Grupo Secundario
+34700000002|Grupo Secundario

# Sin grupo especificado
+34800000001
```

#### 2. Ejecutar script

```bash
npx tsx scripts/load-allowed-phones.ts
```

#### 3. Resultado

```
📱 Cargando números de teléfono permitidos...

✅ +34600000001 (Grupo Principal)
✅ +34600000002 (Grupo Principal)
✅ +34700000001 (Grupo Secundario)
✅ +34700000002 (Grupo Secundario)
✅ +34800000001

📊 Resumen:
   ✅ Números añadidos/actualizados: 5
   ⚠️  Números omitidos: 0
   ❌ Errores de formato: 0

📱 Total de números permitidos en BD: 5
```

## 🗄️ Estructura de Base de Datos

### Modelo `AllowedPhoneNumber`

```prisma
model AllowedPhoneNumber {
  id          String   @id @default(cuid())
  phoneNumber String   @unique
  groupName   String?
  addedAt     DateTime @default(now())
  
  @@index([phoneNumber])
}
```

### Modelo `User` (campo añadido)

```prisma
model User {
  id          String   @id @default(cuid())
  email       String   @unique
  phoneNumber String?  @unique  // ← Nuevo campo
  // ... otros campos
}
```

## 📋 Normativa de Protección de Datos

### Texto Legal Mostrado en Registro

> 🔒 Al registrarte, aceptas que tus datos personales serán tratados de acuerdo con el **Reglamento General de Protección de Datos (RGPD) UE 2016/679** y la **Ley Orgánica 3/2018 de Protección de Datos Personales y Garantía de los Derechos Digitales**. Tus datos se utilizarán únicamente para la gestión de tu cuenta y no se compartirán con terceros sin tu consentimiento.

### Cumplimiento Legal

- ✅ Base legal: Consentimiento explícito del usuario
- ✅ Finalidad: Gestión de cuenta y control de acceso
- ✅ Minimización de datos: Solo se solicita lo necesario
- ✅ Integridad: Datos almacenados de forma segura (PostgreSQL)
- ✅ Confidencialidad: No se comparten con terceros

## 🔧 Archivos Modificados/Creados

### Base de Datos
- `prisma/schema.prisma` - Añadido modelo `AllowedPhoneNumber` y campo `phoneNumber` en `User`

### Frontend
- `app/register/page.tsx` - Formulario con campo teléfono + aviso GDPR

### Backend
- `app/api/auth/register/route.ts` - Validación de teléfono en lista blanca
- `app/api/admin/allowed-phones/route.ts` - API para gestión de números (GET, POST, DELETE)

### Administración
- `app/admin/allowed-phones/page.tsx` - Panel de gestión de números
- `app/admin/page.tsx` - Enlace al panel de teléfonos

### Scripts
- `scripts/load-allowed-phones.ts` - Carga masiva desde archivo
- `scripts/update-admin-phone.ts` - Actualización de usuario existente
- `allowed-phones.txt` - Archivo de números permitidos

## 🚀 Comandos Útiles

```bash
# Aplicar cambios de schema a PostgreSQL
npx prisma db push

# Regenerar cliente Prisma
npx prisma generate

# Cargar números desde archivo
npx tsx scripts/load-allowed-phones.ts

# Actualizar número de admin
npx tsx scripts/update-admin-phone.ts

# Ver base de datos
npx prisma studio
```

## 📞 Configuración Actual

**Números registrados**: 1  
**Usuario configurado**: luisalguero74@gmail.com  
**Teléfono**: +34656809596  
**Grupo**: Administrador - Luis Alguero  

## 🔄 Flujo Completo

```
┌─────────────────────────────────────────────────────┐
│  1. Administrador carga números permitidos          │
│     - Panel web o archivo allowed-phones.txt        │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  2. Usuario intenta registrarse                     │
│     - Introduce email + teléfono + contraseña       │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  3. Sistema valida                                  │
│     ✓ Formato teléfono (+34XXXXXXXXX)              │
│     ✓ Teléfono en lista blanca (AllowedPhoneNumber)│
│     ✓ Email no duplicado                           │
│     ✓ Teléfono no usado                            │
└─────────────────────────────────────────────────────┘
                        ↓
              ┌─────────┴─────────┐
              │                   │
         ✅ APROBADO         ❌ RECHAZADO
              │                   │
    ┌─────────────────┐   ┌──────────────────┐
    │ Cuenta creada   │   │ Mensaje de error │
    │ Email enviado   │   │ Acceso denegado  │
    └─────────────────┘   └──────────────────┘
```

## 🛡️ Seguridad

- **Validación doble**: Frontend + Backend
- **Formato estricto**: Solo números españoles válidos
- **Lista blanca**: Solo números pre-aprobados
- **Unique constraints**: Email y teléfono únicos en BD
- **Normalización**: Espacios y guiones eliminados automáticamente
- **Logging**: Errores registrados en consola
- **Protección admin**: Solo administradores gestionan números

## 📝 Notas Importantes

1. **Usuarios existentes**: Pueden tener `phoneNumber = NULL` (registrados antes del sistema)
2. **Nuevos usuarios**: OBLIGATORIO proporcionar teléfono válido
3. **Formato único**: +34 seguido de 9 dígitos (sin espacios internos en BD)
4. **Grupos WhatsApp**: Campo opcional para organización
5. **Eliminación**: Al eliminar un número, nuevos registros con ese número serán rechazados

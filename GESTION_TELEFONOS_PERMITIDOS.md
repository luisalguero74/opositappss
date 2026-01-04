# 📱 Gestión de Teléfonos Permitidos

## 📋 Resumen del Sistema

El sistema de teléfonos permitidos controla qué números móviles pueden registrarse en la plataforma OpositApp.

### 🔑 Características Principales

- ✅ Solo números autorizados pueden crear cuenta
- ✅ Soporte automático para formatos +346 y +347
- ✅ Gestión mediante panel web
- ✅ Importación masiva desde archivo
- ✅ Scripts de normalización y migración

---

## 🌐 Panel Web de Gestión

### Acceso
```
http://localhost:3000/admin/allowed-phones
```

Desde el panel de administración: **📱✅ Teléfonos Permitidos**

### Funcionalidades

#### ➕ Añadir Número Individual
- Formato: `+34 600 000 000`, `+34600000000`, `+34-600-000-000`
- Campo opcional: Nombre del grupo (ej: "Grupo WhatsApp Principal")

#### 📋 Carga Masiva
- Pega múltiples números (uno por línea)
- Acepta diversos formatos
- Asigna grupo opcional a todos

#### 📊 Listado Completo
- Muestra todos los números permitidos
- Contador total
- Fecha de alta
- Grupos asignados
- Eliminar individualmente

---

## 📞 Numeración Española Válida

### ✅ Formatos Aceptados
Los números móviles en España tienen múltiples rangos válidos:
- **Rango tradicional:** `+346XXXXXXXX`
- **Rango ampliado:** `+347XXXXXXXX`
- **Otros rangos:** `+348XXXXXXXX`, `+349XXXXXXXX`, etc.

### ⚠️ Importante
**Los números se validan de forma EXACTA.** Esto significa:
- `+34656809596` ≠ `+34756809596` (son números diferentes)
- Debes añadir cada número específico que quieras autorizar
- No hay conversión automática entre rangos

### 📝 Ejemplo
Si quieres autorizar un usuario que puede tener 2 números:
```
+34656809596|Usuario A
+34756809596|Usuario A (nuevo número)
```

---

## 🛠️ Scripts de Gestión

### 1. Normalizar Números
Añade el prefijo `+34` a números que no lo tienen:

```bash
npx tsx scripts/normalize-phone-numbers.ts
```

**Resultado:**
- `34600123456` → `+34600123456`
- `600123456` → `+34600123456`
- Elimina duplicados
- Valida formato correcto

---

### 2. Duplicar números (+346 → +347)
Crea versiones +347 de tus números +346 existentes:

```bash
npx tsx scripts/migrate-phone-numbers.ts
```

**Resultado:**
- `+34656809596` → CREA también `+34756809596`
- NO elimina los números originales
- Útil si quieres autorizar usuarios con números en ambos rangos
- Solo crea los que no existan ya

---

### 3. Cargar desde Archivo
Importa números masivamente desde `allowed-phones.txt`:

```bash
npx tsx scripts/load-allowed-phones.ts
```

**Formato del archivo:**
```txt
# Comentarios con #
+34600123456|Grupo WhatsApp Principal
+34600123457|Grupo Secundario
34600123458
```

---

## 🔍 Consultas Útiles

### Ver todos los números
```bash
npx tsx -e "import {prisma} from './src/lib/prisma'; prisma.allowedPhoneNumber.findMany().then(phones => { console.log('\n📱 Números:\n'); phones.forEach(p => console.log('  -', p.phoneNumber, p.groupName || '')); console.log('\nTotal:', phones.length); }).finally(() => prisma.\$disconnect())"
```

### Contar números
```bash
npx tsx -e "import {prisma} from './src/lib/prisma'; prisma.allowedPhoneNumber.count().then(count => console.log('Total:', count)).finally(() => prisma.\$disconnect())"
```

### Buscar número específico
```bash
npx tsx -e "import {prisma} from './src/lib/prisma'; prisma.allowedPhoneNumber.findUnique({where:{phoneNumber:'+34656809596'}}).then(p => console.log(p)).finally(() => prisma.\$disconnect())"
```

---

## 🎯 Validación durante el Registro

### Proceso
1. Usuario ingresa número de teléfono
2. Sistema normaliza (elimina espacios/guiones)
3. Busca número exacto en lista permitida
4. Si no existe, busca formato alternativo (+346 ↔ +347)
5. Si no está en ningún formato → **Rechaza registro**

### Formatos Aceptados en Registro
- `+34 600 123 456`
- `+34-600-123-456`
- `+34600123456`
- `34600123456` (añade + automáticamente)

---

## 📊 Estado Actual

Ejecuta este comando para ver el estado:
```bash
npx tsx scripts/normalize-phone-numbers.ts
```

**Información mostrada:**
- Total de números
- Números correctos
- Números actualizados
- Listado completo final

---

## ❓ Preguntas Frecuentes

### ¿Por qué algunos números dicen "no autorizado"?
- El número no está en la lista de permitidos (búsqueda exacta)
- El número tiene formato incorrecto
- Verifica en el panel web si el número existe exactamente como lo ingresó el usuario

### ¿Cuál es la diferencia entre +346 y +347?
Son rangos de numeración **diferentes pero igualmente válidos** en España. Ambos formatos funcionan simultáneamente:
- +346XXXXXXXX - Rango tradicional
- +347XXXXXXXX - Rango ampliado

### ¿Tengo que añadir +346 y +347 por separado?
**Sí.** Cada número se valida exactamente. Si un usuario tiene:
- +34656809596 (número con rango +346)
- +34756809596 (número con rango +347)

Debes añadir **ambos** si quieres autorizar ambos números.

### ¿Cómo añado múltiples números rápidamente?
1. Usa el formulario de **Carga Masiva** en el panel web
2. O edita `allowed-phones.txt` y ejecuta `load-allowed-phones.ts`

### ¿Puedo eliminar números?
Sí, desde el panel web haciendo clic en "🗑️ Eliminar".

---

## 🔐 Seguridad

- Solo administradores pueden gestionar números
- API protegida con autenticación
- Logs de todos los cambios
- Validación de formato estricta

---

## 📝 Mejores Prácticas

1. **Usa el panel web** para añadir/eliminar números individuales
2. **Carga masiva** para importar listas grandes
3. **Ejecuta normalización** después de importar desde archivo
4. **Respalda** la lista antes de migraciones masivas
5. **Documenta grupos** para organizar usuarios

---

## 🆘 Solución de Problemas

### Error: "No autorizado"
```bash
# Verifica si el número existe
npx tsx -e "import {prisma} from './src/lib/prisma'; prisma.allowedPhoneNumber.findMany({where:{phoneNumber:{contains:'600123456'}}}).then(console.log).finally(() => prisma.\$disconnect())"
```

### Números sin prefijo +34
```bash
# Normaliza todos los números
npx tsx scripts/normalize-phone-numbers.ts
```

### Duplicados en la lista
```bash
# El script de normalización los elimina automáticamente
npx tsx scripts/normalize-phone-numbers.ts
```

---

## 📞 Contacto

Para solicitar acceso o reportar problemas:
**alguero2@yahoo.com**

# 📱 Cómo Importar Números de WhatsApp al Sistema

## 🎯 Objetivo

Importar la lista de números de teléfono de tu grupo/comunidad de WhatsApp para que solo esas personas puedan registrarse en la plataforma.

---

## 📋 Método 1: WhatsApp Web (Recomendado)

### Paso 1: Exportar Contactos del Grupo

#### Opción A: Manualmente desde WhatsApp Web

1. **Abre WhatsApp Web** en tu navegador:
   - Ve a: https://web.whatsapp.com
   - Escanea el código QR con tu móvil

2. **Abre tu grupo** de opositores

3. **Ver información del grupo:**
   - Haz clic en el nombre del grupo (arriba)
   - Verás la lista de participantes

4. **Copiar números** (uno a uno):
   - Haz clic en cada participante
   - Copia su número de teléfono
   - Pégalo en un archivo de texto

#### Opción B: Desde el móvil (más rápido)

1. **Abre el grupo** en WhatsApp
2. **Toca el nombre del grupo** (arriba)
3. **Ver todos los participantes**
4. **Toca cada contacto** → Copiar número
5. Envíate los números a ti mismo por email o WhatsApp

---

## 📋 Método 2: Crear el Archivo allowed-phones.txt

### Paso 1: Ejecutar el script para crear el archivo de ejemplo

En la terminal, ejecuta:

```bash
npx tsx scripts/load-allowed-phones.ts
```

Esto creará automáticamente un archivo `allowed-phones.txt` de ejemplo.

### Paso 2: Editar el archivo con tus números reales

Abre el archivo `allowed-phones.txt` que se creó en la raíz del proyecto:

```bash
# En Mac/Linux
open allowed-phones.txt

# O usa tu editor favorito
code allowed-phones.txt  # VS Code
nano allowed-phones.txt  # Nano
vim allowed-phones.txt   # Vim
```

### Paso 3: Formato del archivo

El archivo debe tener este formato:

```txt
# Números de teléfono del grupo de WhatsApp "Oposiciones INSS 2025"
# Formato: +34XXXXXXXXX o +34XXXXXXXXX|Nombre del Grupo

# Participantes activos
+34656809596|Luis Alguero - Administrador
+34612345678|Grupo Principal
+34698765432|Grupo Principal
+34611222333|Grupo Principal

# Subgrupo de estudio
+34622333444|Subgrupo Temario General
+34633444555|Subgrupo Temario Específico

# Individuales (sin grupo)
+34644555666
+34655666777
```

**Reglas importantes:**
- ✅ **UN número por línea**
- ✅ **Formato:** `+34XXXXXXXXX` (código de país + 9 dígitos)
- ✅ **Opcional:** Añade `|Nombre del Grupo` después del número
- ✅ **Comentarios:** Líneas que empiezan con `#` son ignoradas
- ✅ **Líneas vacías:** Se ignoran automáticamente

### Paso 4: Ejecutar la importación

Una vez que hayas editado el archivo con todos los números reales:

```bash
npx tsx scripts/load-allowed-phones.ts
```

**Salida esperada:**
```
📱 Cargando números de teléfono permitidos...

✅ Procesado: +34656809596 (Luis Alguero - Administrador)
✅ Procesado: +34612345678 (Grupo Principal)
✅ Procesado: +34698765432 (Grupo Principal)
✅ Procesado: +34611222333 (Grupo Principal)
✅ Procesado: +34622333444 (Subgrupo Temario General)
✅ Procesado: +34633444555 (Subgrupo Temario Específico)
✅ Procesado: +34644555666 (Sin grupo)
✅ Procesado: +34655666777 (Sin grupo)

📊 Resumen:
- Números válidos procesados: 8
- Total en la base de datos: 8

✅ ¡Importación completada!
```

---

## 📋 Método 3: Desde Excel o Google Sheets

Si tienes los números en una hoja de cálculo:

### Paso 1: Formato en la hoja

```
| Teléfono      | Nombre        | Grupo           |
|---------------|---------------|-----------------|
| 656809596     | Luis Alguero  | Administrador   |
| 612345678     | María García  | Grupo Principal |
| 698765432     | Juan López    | Grupo Principal |
```

### Paso 2: Crear la columna con formato correcto

En una nueva columna, usa esta fórmula (Excel/Sheets):

```excel
="+34"&A2&"|"&C2
```

Esto generará:
```
+34656809596|Administrador
+34612345678|Grupo Principal
+34698765432|Grupo Principal
```

### Paso 3: Copiar al archivo allowed-phones.txt

1. Selecciona todas las celdas con el formato correcto
2. Copia (Ctrl+C o Cmd+C)
3. Pega en `allowed-phones.txt`
4. Ejecuta el script de importación

---

## 📋 Método 4: Exportación Automática desde WhatsApp (Avanzado)

### Opción A: Export de Chat

1. **Abre el grupo en WhatsApp**
2. **Toca los 3 puntos** (menú) → **Más** → **Exportar chat**
3. **Sin archivos multimedia**
4. **Guarda el archivo .txt**

El archivo exportado tendrá este formato:
```
[29/12/25 10:30:45] Luis Alguero: Hola a todos
[29/12/25 10:31:12] María García: Buenos días
```

5. **Extraer números** manualmente o con un script

### Opción B: Script Python (si sabes programar)

Si tienes muchos números y quieres automatizar:

```python
import re

# Lee el archivo exportado de WhatsApp
with open('chat.txt', 'r', encoding='utf-8') as f:
    content = f.read()

# Extrae números de teléfono españoles
phones = re.findall(r'\+34\d{9}', content)

# Elimina duplicados
phones = list(set(phones))

# Guarda en formato correcto
with open('allowed-phones.txt', 'w') as f:
    f.write("# Números extraídos del grupo de WhatsApp\n\n")
    for phone in sorted(phones):
        f.write(f"{phone}|Grupo WhatsApp\n")

print(f"✅ Extraídos {len(phones)} números únicos")
```

---

## 🎯 Ejemplo Completo: Caso Real

### Situación:
Tienes un grupo de WhatsApp "Oposiciones INSS 2025" con 50 personas.

### Pasos:

**1. Ejecuta el script para crear el archivo:**
```bash
npx tsx scripts/load-allowed-phones.ts
```

**2. Edita `allowed-phones.txt`:**

```txt
# Grupo WhatsApp: Oposiciones INSS 2025
# Fecha de exportación: 30/12/2025

# Coordinadores
+34656809596|Luis Alguero - Coordinador
+34612345678|María García - Coordinadora

# Grupo Tema General (20 personas)
+34611111111|Grupo Tema General
+34622222222|Grupo Tema General
+34633333333|Grupo Tema General
# ... (hasta 20 números)

# Grupo Tema Específico (15 personas)
+34644444444|Grupo Tema Específico
+34655555555|Grupo Tema Específico
# ... (hasta 15 números)

# Grupo Supuestos Prácticos (15 personas)
+34666666666|Grupo Prácticos
+34677777777|Grupo Prácticos
# ... (hasta 15 números)
```

**3. Importa:**
```bash
npx tsx scripts/load-allowed-phones.ts
```

**4. Verifica en el panel admin:**
- Ve a: http://localhost:3000/admin/allowed-phones
- Verás los 50 números cargados

---

## ✅ Verificación

### Comprobar que se cargaron correctamente:

**Opción 1: Panel de administración**
```
http://localhost:3000/admin/allowed-phones
```

**Opción 2: Prisma Studio**
```bash
npx prisma studio
```
Luego ve a la tabla `AllowedPhoneNumber`

**Opción 3: Terminal**
```bash
# Cuenta total de números
npx tsx -e "import {prisma} from './src/lib/prisma'; prisma.allowedPhoneNumber.count().then(console.log).finally(() => prisma.\$disconnect())"
```

---

## 🔄 Actualizar la Lista

Si necesitas añadir o quitar números:

### Añadir nuevos números:

**Opción 1: Panel admin** (uno a uno)
- Ve a: http://localhost:3000/admin/allowed-phones
- Añade manualmente

**Opción 2: Archivo** (masivo)
1. Edita `allowed-phones.txt`
2. Añade las nuevas líneas
3. Ejecuta: `npx tsx scripts/load-allowed-phones.ts`
   - El script usa `upsert`, así que no duplica números existentes

### Eliminar números:

**Opción 1: Panel admin**
- Haz clic en [X] junto al número

**Opción 2: Prisma Studio**
- Abre http://localhost:5556
- Selecciona y elimina registros

---

## 📝 Plantilla Lista para Usar

Crea `allowed-phones.txt` con esta plantilla:

```txt
# ========================================
# LISTA DE TELÉFONOS AUTORIZADOS
# Grupo: [NOMBRE DE TU GRUPO]
# Fecha: [FECHA DE HOY]
# ========================================

# INSTRUCCIONES:
# 1. Reemplaza los números de ejemplo con números reales
# 2. Mantén el formato: +34XXXXXXXXX
# 3. Opcional: Añade |Nombre después del número
# 4. Guarda este archivo
# 5. Ejecuta: npx tsx scripts/load-allowed-phones.ts

# ========================================
# NÚMEROS AUTORIZADOS
# ========================================

# Administradores
+34656809596|Luis Alguero - Admin

# Participantes del grupo
# (Añade aquí todos los números de WhatsApp)

# +34[NÚMERO]|[NOMBRE OPCIONAL]


# ========================================
# FIN DE LA LISTA
# ========================================
```

---

## 🆘 Problemas Comunes

### Error: "Número no válido"

**Causa:** Formato incorrecto

**Solución:**
- ✅ Correcto: `+34656809596`
- ❌ Incorrecto: `656809596` (falta +34)
- ❌ Incorrecto: `34656809596` (falta +)
- ❌ Incorrecto: `+34 656 809 596` (tiene espacios)

### Error: "Archivo no encontrado"

**Causa:** El archivo `allowed-phones.txt` no está en la raíz del proyecto

**Solución:**
```bash
# Verifica que estás en la raíz del proyecto
pwd
# Debe mostrar: /Users/copiadorasalguero/opositapp

# Crea el archivo en el lugar correcto
touch allowed-phones.txt
```

### Los números no aparecen en el panel

**Solución:**
```bash
# Recarga la página del panel admin
# O ejecuta el script de nuevo
npx tsx scripts/load-allowed-phones.ts
```

---

## 🎉 ¡Listo!

Una vez importados los números:

1. ✅ Solo esas personas podrán registrarse
2. ✅ Cualquier otro número será rechazado
3. ✅ Puedes gestionar la lista desde el panel admin
4. ✅ Los usuarios verán un mensaje claro si su número no está autorizado

**Próximo paso:** Comparte la URL de registro con tu grupo de WhatsApp:
```
http://localhost:3000/register
```

(En producción será tu dominio real)

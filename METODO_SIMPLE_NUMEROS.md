# 📱 Método Simple: Copiar Números de WhatsApp (SIN Scripts)

## 🎯 Método Más Fácil - Manual Rápido

### Paso 1: Exportar Chat del Grupo de WhatsApp

**En tu móvil:**

1. Abre WhatsApp
2. Abre tu grupo de oposiciones
3. Toca el **nombre del grupo** (arriba)
4. Desplázate hacia abajo y toca **"Exportar chat"**
5. Selecciona **"Sin archivos multimedia"**
6. Envíatelo por **email** o guárdalo en tu nube

Esto creará un archivo `.txt` con todo el historial.

---

### Paso 2: Extraer Solo los Números

El archivo exportado tendrá este formato:

```
[29/12/25 10:30:45] Luis Alguero: Hola
[29/12/25 10:31:12] +34 656 809 596: Buenos días
[29/12/25 11:00:00] María García: ¿Cómo están?
[29/12/25 11:05:30] +34 612 345 678: Todo bien
```

**Opción A: Buscar y reemplazar en Word/Pages**

1. Abre el archivo en Word, Pages o cualquier editor
2. Usa "Buscar y reemplazar" con expresiones regulares:
   - Buscar: Todo lo que NO sea números de teléfono
   - Dejar solo las líneas con `+34`

**Opción B: Usar un editor de texto online**

1. Ve a: https://regex101.com
2. Pega el contenido del chat
3. Usa esta expresión regular: `\+34\s?\d{3}\s?\d{3}\s?\d{3}`
4. Verás destacados todos los números españoles
5. Cópialos uno a uno

---

### Paso 3: Formato para el Archivo allowed-phones.txt

Copia y pega los números en este formato (uno por línea):

```txt
# Grupo WhatsApp Oposiciones INSS 2025

+34656809596|Luis Alguero - Admin
+34612345678|Participante del grupo
+34698765432|Participante del grupo
+34611222333|Participante del grupo
```

**IMPORTANTE:** 
- Elimina los espacios: `+34 656 809 596` → `+34656809596`
- Puedes hacerlo con "Buscar y reemplazar": Busca ` ` (espacio) y reemplaza con `` (nada)

---

## 🎯 Método Alternativo: Copiar Uno a Uno

Si tu grupo no es muy grande (menos de 20 personas), es más rápido copiar manualmente:

### En WhatsApp Web:

1. Ve a https://web.whatsapp.com
2. Abre tu grupo
3. Haz clic en el **nombre del grupo** (arriba)
4. Verás la lista de participantes

### Para cada participante:

5. Haz clic en su nombre
6. Verás su información de contacto
7. **Copia el número** (aparece como `+34 XXX XXX XXX`)
8. Pégalo en `allowed-phones.txt`

**Ejemplo:**
```
Participante 1: +34 656 809 596
→ Copias: +34656809596|Participante 1

Participante 2: +34 612 345 678
→ Copias: +34612345678|Participante 2
```

---

## 🎯 Método Super Rápido: Google Sheets

Si tienes los números en cualquier formato:

### Paso 1: Pega en Google Sheets

```
| Nombre           | Teléfono Original  |
|------------------|-------------------|
| Luis Alguero     | +34 656 809 596   |
| María García     | +34 612 345 678   |
| Juan López       | +34 698 765 432   |
```

### Paso 2: Limpia los números

En la columna C, usa esta fórmula:

```excel
=SUBSTITUTE(B2," ","")&"|"&A2
```

Esto genera:
```
+34656809596|Luis Alguero
+34612345678|María García
+34698765432|Juan López
```

### Paso 3: Copia y pega en allowed-phones.txt

1. Selecciona la columna C
2. Copia (Cmd+C o Ctrl+C)
3. Pega en `allowed-phones.txt`
4. Listo

---

## ✅ Resumen: Lo Más Simple

### Si tienes menos de 20 números:
→ **Copia manual uno a uno** desde WhatsApp Web

### Si tienes 20-50 números:
→ **Exporta el chat** y extrae con buscar/reemplazar

### Si tienes más de 50 números:
→ **Usa Google Sheets** con la fórmula

---

## 📝 Plantilla Lista para Editar

Edita este archivo directamente:

```bash
# En Mac
open allowed-phones.txt

# En VS Code
code allowed-phones.txt

# En terminal
nano allowed-phones.txt
```

Y pega tus números en este formato:

```txt
# ========================================
# GRUPO WHATSAPP OPOSICIONES INSS 2025
# ========================================

# IMPORTANTE:
# - Formato: +34XXXXXXXXX (sin espacios)
# - Opcional: añade |Nombre después
# - Un número por línea

# Tu número (admin)
+34656809596|Luis Alguero - Coordinador

# Participantes del grupo
# (Copia y pega aquí los números)
+34612345678
+34698765432
+34611222333


# ========================================
# Después de editar, ejecuta:
# npx tsx scripts/load-allowed-phones.ts
# ========================================
```

---

## ✅ Verificación Final

**Sí está programado correctamente:**

✅ **Si el número ESTÁ en la lista:**
- Usuario puede registrarse normalmente

✅ **Si el número NO está en la lista:**
- Aparece el mensaje: 
  > "Tu número de teléfono no está autorizado para registrarse. Por favor, envía un correo a alguero2@yahoo.com solicitando acceso."

---

## 🎉 ¡Ya está todo listo!

1. Edita `allowed-phones.txt` con tus números
2. Ejecuta: `npx tsx scripts/load-allowed-phones.ts`
3. Comparte la URL de registro con tu grupo de WhatsApp

**Los usuarios verán:**
- Si su número está autorizado → Pueden registrarse
- Si NO está autorizado → Mensaje con tu email: alguero2@yahoo.com

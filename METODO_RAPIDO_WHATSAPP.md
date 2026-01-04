# 🚀 Método Rápido: Copiar Números de WhatsApp Web

## ⚡ Opción 1: Script para Navegador (Más Rápido)

### Paso 1: Abre WhatsApp Web
1. Ve a: https://web.whatsapp.com
2. Escanea el código QR con tu móvil
3. Abre tu grupo de oposiciones

### Paso 2: Abre la Información del Grupo
1. Haz clic en el nombre del grupo (arriba)
2. Verás la lista de participantes

### Paso 3: Ejecuta este Script en la Consola del Navegador

1. **Abre la consola** (F12 o Cmd+Option+J en Mac)
2. **Pega este código** y presiona Enter:

```javascript
// Script para extraer números de teléfono de WhatsApp Web
(function() {
    // Busca todos los elementos de contacto
    const contacts = document.querySelectorAll('[data-testid="contact"]');
    
    let numbers = [];
    
    contacts.forEach(contact => {
        // Intenta obtener el número del atributo data o del texto
        const text = contact.textContent || '';
        
        // Busca números españoles en el formato +34 XXX XXX XXX
        const phoneMatch = text.match(/\+34\s*\d{3}\s*\d{3}\s*\d{3}/);
        
        if (phoneMatch) {
            // Limpia el número (quita espacios)
            const cleanNumber = phoneMatch[0].replace(/\s/g, '');
            numbers.push(cleanNumber);
        }
    });
    
    // Elimina duplicados
    numbers = [...new Set(numbers)];
    
    // Crea el contenido para el archivo
    let output = '# Números extraídos de WhatsApp Web\n';
    output += '# Fecha: ' + new Date().toLocaleDateString() + '\n\n';
    
    numbers.forEach(num => {
        output += num + '|Grupo WhatsApp\n';
    });
    
    // Muestra resultado en consola
    console.log('✅ Números encontrados: ' + numbers.length);
    console.log('\n📋 Copia el texto de abajo y pégalo en allowed-phones.txt:\n');
    console.log(output);
    
    // También lo copia al portapapeles si es posible
    if (navigator.clipboard) {
        navigator.clipboard.writeText(output).then(() => {
            console.log('\n✅ ¡Copiado al portapapeles! Ahora pégalo en allowed-phones.txt');
        });
    }
    
    return numbers;
})();
```

3. **El script hará:**
   - Buscar todos los números del grupo
   - Limpiarlos (quitar espacios)
   - Formatearlos correctamente
   - **Copiarlos al portapapeles automáticamente**

4. **Pega el resultado** en tu archivo `allowed-phones.txt`

---

## ⚡ Opción 2: Exportar Lista de Participantes

### Desde el Móvil:

1. **Abre WhatsApp** en tu móvil
2. **Abre el grupo**
3. **Toca el nombre del grupo** (arriba)
4. **Toca "Ver todos"** en la sección de participantes
5. **Mantén pulsado** sobre un participante
6. **Selecciona "Reenviar info de contacto"**
7. **Envíatelo a ti mismo** o a "Mensajes guardados"

### Luego:

1. Abre el mensaje en WhatsApp Web
2. Descarga el archivo .vcf (vCard)
3. Abre el .vcf con un editor de texto
4. Busca todas las líneas que empiezan con `TEL:`
5. Extrae los números

---

## ⚡ Opción 3: Script Python Automático

Si tienes Python instalado, guarda esto como `extract_phones.py`:

```python
#!/usr/bin/env python3
import re
import sys

def extract_phones_from_text(text):
    """Extrae números de teléfono españoles del texto"""
    # Patrón para números españoles: +34 XXX XXX XXX o +34XXXXXXXXX
    pattern = r'\+34\s*\d{3}\s*\d{3}\s*\d{3}|\+34\d{9}'
    
    phones = re.findall(pattern, text)
    
    # Limpia espacios
    phones = [p.replace(' ', '') for p in phones]
    
    # Elimina duplicados manteniendo el orden
    seen = set()
    unique_phones = []
    for p in phones:
        if p not in seen:
            seen.add(p)
            unique_phones.append(p)
    
    return unique_phones

def main():
    print("📱 Extractor de Números de WhatsApp")
    print("=" * 50)
    print("\nPega el texto del grupo de WhatsApp (Ctrl+D cuando termines):\n")
    
    # Lee el texto de la entrada estándar
    text = sys.stdin.read()
    
    # Extrae números
    phones = extract_phones_from_text(text)
    
    if not phones:
        print("❌ No se encontraron números de teléfono")
        return
    
    # Crea el archivo
    output = "# Números extraídos automáticamente\n"
    output += f"# Total encontrados: {len(phones)}\n\n"
    
    for i, phone in enumerate(phones, 1):
        output += f"{phone}|Participante {i}\n"
    
    # Guarda en archivo
    with open('allowed-phones.txt', 'w', encoding='utf-8') as f:
        f.write(output)
    
    print(f"\n✅ Encontrados {len(phones)} números")
    print(f"✅ Guardados en: allowed-phones.txt")
    print("\nNúmeros encontrados:")
    for phone in phones:
        print(f"  • {phone}")

if __name__ == "__main__":
    main()
```

**Uso:**
```bash
python3 extract_phones.py
# Pega el texto del grupo
# Presiona Ctrl+D (Mac/Linux) o Ctrl+Z (Windows)
```

---

## ⚡ Opción 4: Desde Archivo Exportado de WhatsApp

### Exportar el chat:

1. **Móvil:** Abre el grupo → Menú (⋮) → Más → Exportar chat
2. **Sin archivos multimedia**
3. Guarda el archivo `.txt`

### Extraer números del archivo:

```bash
# En Mac/Linux
grep -oE '\+34[0-9]{9}' chat.txt | sort -u > phones_raw.txt

# Formatear para el sistema
while read phone; do
    echo "$phone|Grupo WhatsApp"
done < phones_raw.txt > allowed-phones.txt

# Ver resultado
cat allowed-phones.txt
```

---

## 📋 Comparativa de Métodos

| Método | Velocidad | Dificultad | Mejor Para |
|--------|-----------|------------|------------|
| Script navegador | ⚡⚡⚡ Muy rápido | 😊 Fácil | Grupos pequeños/medianos (< 100) |
| Exportar chat + grep | ⚡⚡ Rápido | 😐 Media | Grupos grandes (> 100) |
| Manual | ⚡ Lento | 😊 Muy fácil | Pocos números (< 10) |
| Script Python | ⚡⚡⚡ Muy rápido | 😐 Media | Si sabes Python |

---

## 🎯 Recomendación

**Para la mayoría de casos: USA EL SCRIPT DEL NAVEGADOR** ⭐

1. Abre WhatsApp Web
2. Abre la consola (F12)
3. Pega el script JavaScript
4. ¡Los números se copian automáticamente!
5. Pega en `allowed-phones.txt`
6. Ejecuta `npx tsx scripts/load-allowed-phones.ts`

✅ **5 minutos y listo**

---

## 🆘 Si Tienes Problemas

### El script de navegador no funciona

**Causa:** WhatsApp cambió la estructura HTML

**Solución:** Usa el método de exportación de chat

### Los números no tienen el formato +34

**Causa:** Algunos contactos no tienen código de país

**Solución manual:**
```bash
# Añade +34 a todos los números que empiezan con 6 o 7
sed 's/^6/+346/; s/^7/+347/' allowed-phones.txt > temp.txt
mv temp.txt allowed-phones.txt
```

### Hay números duplicados

**No te preocupes:** El script usa `upsert`, así que no duplica números aunque los ejecutes varias veces.

---

## ✅ Checklist Final

- [ ] Tienes acceso a WhatsApp Web o al móvil
- [ ] Has exportado los números (cualquier método)
- [ ] Los números están en `allowed-phones.txt`
- [ ] Formato correcto: `+34XXXXXXXXX`
- [ ] Ejecutado: `npx tsx scripts/load-allowed-phones.ts`
- [ ] Verificado en: http://localhost:3000/admin/allowed-phones

**¡Listo para que tu grupo se registre!** 🎉

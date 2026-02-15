# 🎯 Configuración de Google AdSense - Guía Completa

## ✅ Estado Actual

- ✅ Componente `GoogleAds` creado y mejorado con validaciones
- ✅ Landing page profesional creada en `/landing`
- ✅ Archivo `ads.txt` configurado correctamente
- ✅ Script de AdSense integrado en la landing page
- ✅ Redirección automática de home a landing cuando no hay sesión

---

## 📋 Pasos para Activar Google AdSense

### 1. **Crear Cuenta de AdSense**

1. Ve a https://www.google.com/adsense
2. Haz clic en "Empezar"
3. Ingresa la URL de tu sitio: `https://tudominio.com`
4. Completa el formulario con tus datos:
   - País o territorio
   - Zona horaria
   - Nombre y dirección postal
   - Número de teléfono

### 2. **Obtener tu Publisher ID**

1. Una vez creada la cuenta, ve a **AdSense > Cuenta > Información de la cuenta**
2. Copia tu **Publisher ID** (formato: `ca-pub-XXXXXXXXXXXXXXXX`)
3. **IMPORTANTE**: Guarda este ID, lo necesitarás en varios lugares

### 3. **Actualizar el Archivo ads.txt**

El archivo ya está creado en `/app/ads.txt/route.ts`. Solo necesitas:

1. Reemplazar `ca-pub-3330699408382004` con tu Publisher ID real
2. El archivo se sirve automáticamente en: `https://tudominio.com/ads.txt`

```typescript
// app/ads.txt/route.ts
const body = `# Google AdSense
google.com, ca-pub-TU-ID-AQUI, DIRECT, f08c47fec0942fa0`
```

### 4. **Configurar AdSense en el Panel de Administrador**

1. Inicia sesión como administrador
2. Ve a: **Admin > Monetización sin Suscripción** (`/admin/monetization-free`)
3. Activa "Publicidad Contextual (Google AdSense)"
4. Pega tu Publisher ID en el campo correspondiente
5. Guarda cambios

### 5. **Añadir el Script de AdSense al Sitio**

El script ya está añadido en la landing page. Google necesita verificar que esté presente:

```tsx
{/* Ya incluido en /app/landing/page.tsx */}
<script
  async
  src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
  crossOrigin="anonymous"
/>
```

### 6. **Verificar el Sitio en AdSense**

1. Ve a tu cuenta de AdSense
2. Haz clic en "Sitios"
3. Añade tu dominio si no aparece
4. Google verificará automáticamente:
   - ✅ Que el script de AdSense esté presente
   - ✅ Que el archivo `ads.txt` sea accesible
   - ✅ Que haya suficiente contenido original

### 7. **Proceso de Aprobación**

**Google revisará tu sitio en 1-7 días**. Verifican:

- ✅ **Contenido original**: La landing page tiene contenido único
- ✅ **Navegación clara**: Header, footer y enlaces funcionales
- ✅ **Política de privacidad**: Debes añadir una página `/privacy`
- ✅ **Términos y condiciones**: Debes añadir una página `/terms`
- ✅ **Diseño profesional**: La landing es elegante y visual
- ✅ **Imágenes reales**: Usa imágenes de Unsplash (permitidas)
- ✅ **Sin contenido prohibido**: Nada de violencia, adulto, etc.

---

## 🚨 Requisitos Importantes para la Aprobación

### ✅ Contenido Mínimo
- **Mínimo 10-15 páginas** con contenido original
- Actualmente tienes: landing, login, register, dashboard, pricing, etc.
- **Añadir**: privacy, terms, about, contact, blog (opcional)

### ✅ Tráfico
- No hay requisito mínimo oficial
- Recomendado: Al menos 50-100 visitantes/día
- **Puedes solicitar aprobación SIN tráfico**

### ✅ Dominio
- Debe ser un dominio propio (no .vercel.app ni localhost)
- Mínimo 6 meses de antigüedad (flexible)
- Debe estar publicado y accesible públicamente

### ✅ Políticas que Debes Crear

**Página de Privacidad** (`/privacy`):
- Explica qué datos recopilas
- Cómo usas cookies
- Que usas Google AdSense (incluye su política)
- Derechos del usuario (RGPD)

**Página de Términos** (`/terms`):
- Condiciones de uso del servicio
- Limitaciones de responsabilidad
- Propiedad intelectual

---

## 📍 Dónde Aparecerán los Anuncios

Los anuncios aparecerán en:

1. **Dashboard** - Configurado en `MonetizationWrapper`
2. **Landing Page** - Script añadido
3. **Cualquier página donde uses** `<GoogleAds />`

### Ejemplo de Uso Manual:

```tsx
import GoogleAds from '@/components/monetization/GoogleAds'

<GoogleAds 
  clientId="ca-pub-XXXXXXXXXXXXXXXX" 
  slot="1234567890"
  format="auto"
/>
```

---

## 🔧 Configuración Actual del Sistema

### Archivo: `app/admin/monetization-free/page.tsx`
- ✅ Campo para ingresar Publisher ID
- ✅ Activar/desactivar anuncios
- ✅ Guardar en base de datos

### Archivo: `components/monetization/MonetizationWrapper.tsx`
- ✅ Lee configuración de la BD
- ✅ Solo muestra anuncios si están activados
- ✅ Valida que el Publisher ID sea correcto

### Archivo: `components/monetization/GoogleAds.tsx`
- ✅ Componente reutilizable
- ✅ Validación de Publisher ID
- ✅ Manejo de errores
- ✅ Responsive y adaptable

---

## 🐛 Solución de Problemas Comunes

### Problema: "Los anuncios no aparecen"

**Causas posibles:**
1. ✅ Publisher ID incorrecto → Verifica en AdSense
2. ✅ AdSense aún no aprobado → Espera la aprobación
3. ✅ Bloqueador de anuncios activo → Desactívalo
4. ✅ No has guardado el ID en `/admin/monetization-free`
5. ✅ AdSense está en "modo de prueba" → Puede tardar horas

**Solución:**
```bash
# Verificar que ads.txt sea accesible
curl https://tudominio.com/ads.txt

# Verificar consola del navegador
# Debe mostrar: "AdSense loaded successfully"
```

### Problema: "AdSense rechazó mi solicitud"

**Causas:**
- ❌ Contenido insuficiente → Añade más páginas
- ❌ Falta política de privacidad → Créala
- ❌ Diseño poco profesional → Ya está solucionado
- ❌ Navegación confusa → Ya está solucionado

**Solución:**
1. Lee el email de rechazo (explica el motivo)
2. Corrige el problema
3. Espera 30 días para volver a solicitar

---

## 📊 Monitorización y Estadísticas

Una vez aprobado, podrás ver en AdSense:

- 💰 **Ingresos estimados** (se actualizan cada hora)
- 👀 **Impresiones de anuncios**
- 🖱️ **Clicks en anuncios**
- 📈 **CTR (Click-Through Rate)**
- 💵 **RPM (Revenue Per Mille)**

**Pago mínimo:** 70€ (se paga mensualmente)

---

## 🎨 Configuración Avanzada (Opcional)

### Crear Unidades de Anuncio Personalizadas

1. Ve a AdSense > **Anuncios > Por unidad**
2. Crea una nueva unidad de anuncio
3. Copia el código **data-ad-slot**
4. Úsalo en tu componente:

```tsx
<GoogleAds 
  clientId="ca-pub-XXXXXXXXXXXXXXXX"
  slot="1234567890" // ← Slot ID de tu unidad
  format="rectangle" // o "horizontal", "vertical"
/>
```

### Tipos de Anuncios Disponibles

- **Display (gráficos)**: Banners, cuadrados, rascacielos
- **In-feed**: Integrados en listas de contenido
- **In-article**: Dentro del contenido de texto
- **Multiplex**: Anuncios relacionados nativos

---

## 📞 Soporte

Si tienes problemas con AdSense:

1. **Centro de Ayuda**: https://support.google.com/adsense
2. **Foro de AdSense**: https://support.google.com/adsense/community
3. **Contacto directo**: Disponible tras la aprobación

---

## ✅ Checklist Final antes de Solicitar Aprobación

- [ ] Dominio propio configurado (no .vercel.app)
- [ ] Sitio publicado y accesible públicamente
- [ ] Landing page profesional con imágenes reales
- [ ] Archivo `ads.txt` accesible en /ads.txt
- [ ] Script de AdSense añadido al sitio
- [ ] Página de Privacidad creada
- [ ] Página de Términos y Condiciones creada
- [ ] Al menos 10 páginas con contenido original
- [ ] Navegación clara con header y footer
- [ ] Diseño responsive (mobile-friendly)
- [ ] Contenido en español (o tu idioma principal)
- [ ] Sin contenido prohibido (adulto, violencia, etc.)

---

## 🚀 Próximos Pasos

1. **Crear páginas faltantes:**
   - `/privacy` - Política de Privacidad
   - `/terms` - Términos y Condiciones
   - `/about` - Sobre Nosotros
   - `/contact` - Contacto

2. **Publicar en dominio propio** (si aún no lo has hecho)

3. **Solicitar aprobación** en Google AdSense

4. **Esperar 1-7 días** para la revisión

5. **¡Empezar a monetizar!** 🎉

---

**Última actualización:** 16 de febrero de 2026

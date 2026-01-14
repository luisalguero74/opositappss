# Actualización de Botones de Ayuda - Usuario y Administrador

**Fecha:** 14 de enero de 2026  
**Versión:** 1.0

## Resumen

Se han actualizado y expandido los sistemas de ayuda para **usuarios** y **administradores** con documentación completa sobre todas las funciones disponibles en la plataforma.

---

## 🎯 Cambios Realizados

### 1. **Centro de Ayuda - Usuario (HelpModal.tsx)**

Actualización de [src/components/HelpModal.tsx](src/components/HelpModal.tsx):
- ✅ **12 categorías de ayuda** con 15 tópicos de ayuda completos
- ✅ **Asistente IA Profesional** integrado (busca en documentación legal y temario)
- ✅ Búsqueda por palabras clave
- ✅ Filtrado por categoría
- ✅ **Nueva sección:** Monetización - Cómo apoyar opositAPPSS

**Categorías:**
- 🎓 Aulas Virtuales
- 📝 Simulacros de Examen
- 📚 Cuestionarios
- 📊 Estadísticas
- 🗣️ Foro
- 💰 Suscripción
- 🔐 Cuenta (Contraseña, Email)
- 🔧 Problemas Técnicos
- 📱 Móvil
- 🧠 Repetición Espaciada
- 🔥 Racha de Estudio
- 🏆 Logros
- ⏱️ Modo Examen
- 💰 Monetización

### 2. **Centro de Ayuda - Administrador (AdminHelpModal.tsx)**

Nuevo archivo: [src/components/AdminHelpModal.tsx](src/components/AdminHelpModal.tsx)
- ✅ **11 categorías** con 13 tópicos de ayuda para administradores
- ✅ Interfaz idéntica a usuario pero con funciones administrativas
- ✅ Guías paso a paso para cada operación

**Categorías:**
- 📄 Gestión de Contenido (Subir PDF)
- 🤖 Generación de Preguntas (IA, Masivo)
- 📝 Gestión de Preguntas (Editar, Eliminar)
- 📊 Calidad de Preguntas (Revisión, Aprobación)
- 👥 Gestión de Usuarios
- 📊 Estadísticas y Monitoreo
- 💰 Monetización
- 🔍 Monitoreo y Debugging
- 🎓 Aulas Virtuales
- 📧 Comunicaciones (Emails)
- 💾 Bases de Datos (Backup, Restore)
- ⚙️ Configuración General

### 3. **Botones Flotantes**

#### Usuario: [src/components/HelpButton.tsx](src/components/HelpButton.tsx)
- Botón flotante **azul** (bottom-right)
- Acceso desde Dashboard, Teoría, Prácticos, Aulas Virtuales
- Tooltip: "¿Necesitas ayuda?"

#### Admin: [src/components/AdminHelpButton.tsx](src/components/AdminHelpButton.tsx) (NUEVO)
- Botón flotante **púrpura/rosa** (bottom-left)
- Diferencia visual clara de usuario
- Tooltip: "Ayuda de Admin"
- Incluido en [app/admin/page.tsx](app/admin/page.tsx)

### 4. **Actualización de README.md**

Se agregó sección de monetización rápida en [README.md](README.md):
- Instrucciones para activar Ko-fi
- Instrucciones para activar AdSense
- Instrucciones para afiliados/patrocinadores

---

## 📋 Funciones Documentadas

### Para Usuarios (15 tópicos)

| Función | Categoría | Descripción |
|---------|-----------|-------------|
| Entrar a Aula Virtual | 🎓 Aulas | Guía paso a paso |
| Controles en Aula | 🎓 Aulas | Cámara, micrófono, chat, pantalla |
| Simulacros de Examen | 📝 Examen | Formato 70 + 15, 120 minutos |
| Cuestionarios Teoría/Prácticos | 📚 | Cómo hacer tests |
| Estadísticas | 📊 | Ver progreso y análisis |
| Foro de Supuestos | 🗣️ | Crear hilos, responder |
| Suscripción | 💰 | Gestionar plan |
| Recuperar Contraseña | 🔐 | Reset por email |
| Verificar Email | 🔐 | Activar cuenta |
| Problemas Técnicos | 🔧 | Troubleshooting |
| Uso en Móvil | 📱 | Experiencia responsive |
| Estadísticas Avanzadas | 📊 | Gráficas y métricas |
| Preguntas Falladas | ❌ | Banco de errores |
| Preguntas Marcadas | 📌 | Crear lista personalizada |
| Repetición Espaciada | 🧠 | Sistema SM-2 |
| Racha de Estudio | 🔥 | Motivación diaria |
| Logros/Badges | 🏆 | Sistema gamificado |
| Modo Examen | ⏱️ | Condiciones reales |
| **Cómo Apoyar** | 💰 | Ko-fi, Patreon, difusión |

### Para Administradores (13 tópicos)

| Función | Categoría | Descripción |
|---------|-----------|-------------|
| Subir PDF | 📄 | Importar contenido |
| Generar Preguntas IA | 🤖 | Automático desde PDF |
| Generador Masivo | 🤖 | Lote de preguntas |
| Gestionar Preguntas | 📝 | Editar, eliminar, archivar |
| Calidad de Preguntas | 📊 | Revisar y aprobar IA |
| Gestión Usuarios | 👥 | Crear, roles, permisos |
| Estadísticas Admin | 📊 | Dashboard, reportes |
| Configurar Monetización | 💰 | AdSense, Ko-fi, Patreon |
| Monitoreo Errores | 🔍 | Logs y debugging |
| Aulas Virtuales Admin | 🎓 | Crear, programar sesiones |
| Enviar Emails | 📧 | Notificaciones, plantillas |
| Backup/Restore | 💾 | Protección datos |
| Configuración General | ⚙️ | Sitio, tema, seguridad |

---

## 🚀 Cómo Usar

### Usuario
1. En cualquier página del dashboard, busca el botón flotante **azul** (abajo derecha)
2. Haz clic en el icono "?"
3. Busca tu pregunta o navega por categorías
4. Opcionalmente, usa el "Asistente IA Profesional" para consultas complejas

### Administrador
1. En el panel de administración, busca el botón flotante **púrpura** (abajo izquierda)
2. Haz clic en el icono de engranaje
3. Busca la función que necesitas documentar
4. Lee pasos, consejos y mejores prácticas

---

## 📁 Archivos Modificados

```
src/components/
├── HelpModal.tsx              (ACTUALIZADO - Agregado tópico monetización)
├── HelpButton.tsx             (Sin cambios - Ya existía)
├── AdminHelpModal.tsx         (NUEVO - 13 tópicos admin)
└── AdminHelpButton.tsx        (NUEVO - Botón admin)

app/admin/
└── page.tsx                   (ACTUALIZADO - Importado AdminHelpButton)

README.md                       (ACTUALIZADO - Sección monetización)
```

---

## ✅ Testing & Validación

- ✅ Build: `npm run build` exitoso
- ✅ No hay errores TypeScript
- ✅ Componentes importados correctamente
- ✅ AdminHelpButton incluido en admin/page.tsx
- ✅ HelpButton ya estaba en dashboard, theory, practical
- ✅ Responsivo en móvil

---

## 🎨 Diseño Visual

| Elemento | Usuario | Admin |
|----------|---------|-------|
| Botón Color | Azul a Índigo | Púrpura a Rosa |
| Posición | Bottom-Right | Bottom-Left |
| Header Modal | Azul-Índigo | Púrpura-Rosa |
| Icono | ? | ⚙️ |
| Categorías | 14 | 11 |
| Tópicos | 15 | 13 |

---

## 📝 Notas Importantes

1. **Monetización para Usuarios**
   - Se agregó documentación sobre Ko-fi, Patreon, difusión
   - Enfatiza que todo sigue siendo voluntario
   - Plataforma 100% gratuita para usuarios

2. **Guías Admin Detalladas**
   - Cada función tiene pasos numerados
   - Incluye consejos de mejores prácticas
   - Referencia a dónde encontrar cada función

3. **Escalabilidad**
   - Fácil agregar nuevos tópicos
   - Sistema de keywords para búsqueda flexible
   - Estructura reutilizable para futuras secciones

---

## 🔄 Próximos Pasos (Opcionales)

1. Migrar `middleware.tsx` a `proxy` (Next.js 16+)
2. Mover `viewport` metadata a `viewport` exports
3. Configurar variables de entorno adicionales (GROQ_API_KEY si se usa)
4. A/B testing: medir uso del sistema de ayuda

---

**Autor:** GitHub Copilot  
**Estado:** ✅ Completado y Desplegable

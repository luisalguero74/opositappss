# Guía rápida para auditar Supabase

## 1. Auditar tablas y datos en Supabase (Base de datos)
1. Entra en https://app.supabase.com y selecciona tu proyecto.
2. Ve a la sección "Database" > "Tables" para ver todas las tablas y su contenido.
3. Puedes exportar datos desde la interfaz o ejecutar queries SQL en la pestaña "SQL Editor".

## 2. Auditar archivos en Supabase Storage
1. En el panel de Supabase, ve a "Storage" > "Buckets".
2. Revisa cada bucket para ver los archivos subidos (imágenes, PDFs, etc.).
3. Puedes descargar, borrar o subir archivos desde aquí.

## 3. Auditar funciones, policies y triggers
1. En "Database" > "Functions" puedes ver funciones SQL creadas.
2. En "Database" > "Triggers" puedes ver triggers activos.
3. En "Authentication" > "Policies" puedes revisar las políticas de acceso.

## 4. Corregir Security Advisor: RLS Disabled in Public
Si Supabase te marca `RLS Disabled in Public` (por ejemplo en tablas como `public.User`, `public.Account`, etc.), puedes habilitar RLS en todas las tablas del schema `public`.

1. Abre Supabase → **SQL Editor**.
2. Ejecuta el contenido de [supabase-enable-rls-public.sql](supabase-enable-rls-public.sql).

Notas:
- El script también aplica un **lockdown**: fuerza RLS, revoca permisos a `anon`/`authenticated` y crea una policy explícita de denegación.
- Si tu app consulta tablas vía Supabase JS/PostgREST, tendrás que crear **policies + grants** por tabla (solo en las que quieras exponer).

## 5. Auditoría por script (opcional)
Si quieres listar archivos de Storage por script, puedes usar la API de Supabase:

```js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://<PROJECT>.supabase.co', '<SERVICE_ROLE_KEY>')

async function listFiles(bucket) {
  const { data, error } = await supabase.storage.from(bucket).list('')
  if (error) throw error
  console.log(data)
}

listFiles('nombre-del-bucket')
```

Reemplaza los valores por los de tu proyecto.

---

¿Necesitas también ejemplos para migrar endpoints concretos a URLs externas? Dímelo y los preparo.

## 6. Corregir Security Advisor: Function Search Path Mutable
Si Supabase te marca el warning `Function Search Path Mutable` (por ejemplo `public.update_updated_at_column`), es porque la función no tiene `search_path` fijado y puede ser inseguro.

1. Abre Supabase → **SQL Editor**.
2. Ejecuta el contenido de [supabase-fix-function-search-path.sql](supabase-fix-function-search-path.sql).
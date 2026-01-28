import fs from 'fs'
import readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()))
  })
}

async function main() {
  console.log('Configuración de Supabase Storage para el repositorio de documentos')
  console.log('No se ejecutará ninguna migración ni cambio en la base de datos.\n')

  const url = await ask('1) Pega aquí la URL de tu proyecto Supabase (https://...supabase.co): ')
  if (!url) {
    console.log('La URL de Supabase es obligatoria. Saliendo.')
    rl.close()
    return
  }

  const anonKey = await ask('2) Pega aquí la clave pública (pushable/anon/public) de Supabase: ')
  if (!anonKey) {
    console.log('La clave pública de Supabase es obligatoria. Saliendo.')
    rl.close()
    return
  }

  const envPath = '.env.local'
  let envContent = ''
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8')
  }

  const lines = envContent.split('\n').filter(Boolean)

  const setOrAdd = (key, value) => {
    const idx = lines.findIndex((line) => line.startsWith(key + '='))
    const safeValue = value.includes(' ') ? JSON.stringify(value) : value
    const entry = `${key}=${safeValue}`
    if (idx >= 0) {
      lines[idx] = entry
    } else {
      lines.push(entry)
    }
  }

  setOrAdd('SUPABASE_URL', url)
  setOrAdd('NEXT_PUBLIC_SUPABASE_URL', url)
  setOrAdd('SUPABASE_ANON_KEY', anonKey)
  setOrAdd('NEXT_PUBLIC_SUPABASE_ANON_KEY', anonKey)

  fs.writeFileSync(envPath, lines.join('\n') + '\n')

  console.log('\nListo. Se han actualizado las siguientes claves en .env.local:')
  console.log('  - SUPABASE_URL')
  console.log('  - NEXT_PUBLIC_SUPABASE_URL')
  console.log('  - SUPABASE_ANON_KEY')
  console.log('  - NEXT_PUBLIC_SUPABASE_ANON_KEY')
  console.log('\nPuedes revisar el archivo .env.local si quieres comprobarlo.')

  rl.close()
}

main().catch((err) => {
  console.error('Error inesperado:', err)
  rl.close()
})

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
  console.log('Actualización de la clave pública (anon) de Supabase')
  console.log('No se modificará la URL ni se harán migraciones.\n')

  const anonKey = await ask('Pega aquí la clave "anon public" completa de Supabase: ')
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

  setOrAdd('SUPABASE_ANON_KEY', anonKey)
  setOrAdd('NEXT_PUBLIC_SUPABASE_ANON_KEY', anonKey)

  fs.writeFileSync(envPath, lines.join('\n') + '\n')

  console.log('\nListo. Se han actualizado en .env.local:')
  console.log('  - SUPABASE_ANON_KEY')
  console.log('  - NEXT_PUBLIC_SUPABASE_ANON_KEY')

  rl.close()
}

main().catch((err) => {
  console.error('Error inesperado:', err)
  rl.close()
})

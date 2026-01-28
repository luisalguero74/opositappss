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
  console.log('Configuración de DATABASE_URL para entorno de DESARROLLO')
  console.log('Esto solo afecta a tu .env.local (tu ordenador), no a producción.\n')

  const newDbUrl = await ask('Pega aquí la nueva DATABASE_URL del proyecto Supabase de DESARROLLO: ')
  if (!newDbUrl) {
    console.log('DATABASE_URL es obligatoria. Saliendo.')
    rl.close()
    return
  }

  const envPath = '.env.local'
  let envContent = ''
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8')
  }

  const lines = envContent.split('\n').filter(Boolean)

  const getCurrent = (key) => {
    const line = lines.find((l) => l.startsWith(key + '='))
    if (!line) return undefined
    return line.slice(key.length + 1)
  }

  const currentDbUrl = getCurrent('DATABASE_URL')

  // Guardamos la actual como copia de seguridad local si no existe
  if (currentDbUrl && !getCurrent('DATABASE_URL_PROD_BACKUP')) {
    lines.push(`DATABASE_URL_PROD_BACKUP=${currentDbUrl}`)
    console.log('Se ha guardado una copia de seguridad en DATABASE_URL_PROD_BACKUP.')
  }

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

  setOrAdd('DATABASE_URL', newDbUrl)

  fs.writeFileSync(envPath, lines.join('\n') + '\n')

  console.log('\nListo. Ahora tu .env.local apunta a la base de datos de DESARROLLO.')
  console.log('Si en el futuro quieres volver a la URL anterior, podrás usar DATABASE_URL_PROD_BACKUP como referencia.')

  rl.close()
}

main().catch((err) => {
  console.error('Error inesperado:', err)
  rl.close()
})

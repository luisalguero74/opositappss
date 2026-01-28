import fs from 'fs'

const envPath = '.env.local'

if (!fs.existsSync(envPath)) {
  console.error('.env.local no existe; no se puede restaurar DATABASE_URL.')
  process.exit(1)
}

const content = fs.readFileSync(envPath, 'utf8')
const lines = content.split('\n').filter(Boolean)

const getValue = (key) => {
  const line = lines.find((l) => l.startsWith(key + '='))
  if (!line) return undefined
  return line.slice(key.length + 1)
}

const prodBackup = getValue('DATABASE_URL_PROD_BACKUP')

if (!prodBackup) {
  console.error('No se ha encontrado DATABASE_URL_PROD_BACKUP en .env.local. Nada que restaurar.')
  process.exit(1)
}

const setOrAdd = (key, value) => {
  const idx = lines.findIndex((line) => line.startsWith(key + '='))
  const entry = `${key}=${value}`
  if (idx >= 0) {
    lines[idx] = entry
  } else {
    lines.push(entry)
  }
}

setOrAdd('DATABASE_URL', prodBackup)

fs.writeFileSync(envPath, lines.join('\n') + '\n')

console.log('DATABASE_URL restaurada desde DATABASE_URL_PROD_BACKUP en .env.local.')

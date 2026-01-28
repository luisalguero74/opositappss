import { readdir } from 'fs/promises'
import path from 'path'
import { prisma } from '../src/lib/prisma'
import { importTemaFromJson } from './import-tema-json'

async function main() {
  const root = process.cwd()

  console.log('🔎 Buscando ficheros TEMA*.json en', root)
  const entries = await readdir(root)
  const files = entries.filter((name) => name.startsWith('TEMA') && name.endsWith('.json'))

  if (files.length === 0) {
    console.log('⚠️ No se han encontrado ficheros TEMA*.json en el directorio raíz.')
    return
  }

  console.log('📂 Ficheros detectados:')
  for (const f of files) {
    console.log('   ·', f)
  }

  console.log('\n🚀 Iniciando importación en lote...')

  for (const file of files) {
    const fullPath = path.join(root, file)
    console.log('\n==============================')
    console.log('▶️  Importando', fullPath)
    console.log('==============================')
    try {
      // No pasamos temaCodigo explícito: se inferirá del JSON y del temario oficial
      await importTemaFromJson(fullPath)
    } catch (err) {
      console.error('❌ Error al importar', file, ':', err)
    }
  }

  console.log('\n✅ Importación en lote finalizada.')
}

main()
  .catch((err) => {
    console.error('❌ Error general en importación en lote:', err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {})
  })

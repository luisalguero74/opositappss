import { PrismaClient } from '@prisma/client'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { TEMARIO_OFICIAL } from '../src/lib/temario-oficial'

const prisma = new PrismaClient()

async function migrate() {
  console.log('🚀 Iniciando migración de temario a base de datos...\n')

  const CONFIG_PATH = join(process.cwd(), 'data', 'temario-config.json')

  // Verificar si existe el archivo de configuración
  if (!existsSync(CONFIG_PATH)) {
    console.log('⚠️  No se encontró archivo de configuración JSON.')
    console.log('   Inicializando base de datos con estructura vacía...\n')
    
    // Crear todos los temas sin archivos
    for (const tema of TEMARIO_OFICIAL) {
      await prisma.temaOficial.upsert({
        where: { id: tema.id },
        create: {
          id: tema.id,
          numero: tema.numero,
          titulo: tema.titulo,
          descripcion: tema.descripcion,
          categoria: tema.categoria,
          normativaBase: tema.normativaBase ? JSON.stringify(tema.normativaBase) : null
        },
        update: {
          titulo: tema.titulo,
          descripcion: tema.descripcion,
          normativaBase: tema.normativaBase ? JSON.stringify(tema.normativaBase) : null
        }
      })
    }
    
    console.log('✅ Estructura de temas inicializada correctamente.')
    await prisma.$disconnect()
    return
  }

  // Leer configuración del archivo JSON
  const data = await readFile(CONFIG_PATH, 'utf-8')
  const config = JSON.parse(data)

  let temasImportados = 0
  let archivosImportados = 0

  // Migrar cada tema
  for (const [temaId, temaData] of Object.entries(config.temas)) {
    const temaInfo = TEMARIO_OFICIAL.find(t => t.id === temaId)
    
    if (!temaInfo) {
      console.log(`⚠️  Tema ${temaId} no encontrado en TEMARIO_OFICIAL, saltando...`)
      continue
    }

    // Crear o actualizar el tema
    await prisma.temaOficial.upsert({
      where: { id: temaId },
      create: {
        id: temaId,
        numero: temaInfo.numero,
        titulo: temaInfo.titulo,
        descripcion: temaInfo.descripcion,
        categoria: temaInfo.categoria,
        normativaBase: temaInfo.normativaBase ? JSON.stringify(temaInfo.normativaBase) : null
      },
      update: {} // No actualizamos datos estáticos
    })

    temasImportados++

    // Importar archivos
    const archivos = (temaData as any).archivos || []
    for (const archivo of archivos) {
      // Verificar si el archivo ya existe
      const existente = await prisma.temaArchivo.findFirst({
        where: {
          temaId: temaId,
          nombre: archivo.nombre
        }
      })

      if (!existente) {
        await prisma.temaArchivo.create({
          data: {
            temaId: temaId,
            nombre: archivo.nombre,
            numeroPaginas: archivo.numeroPaginas || 0
          }
        })
        archivosImportados++
        console.log(`  ✅ ${temaId}: ${archivo.nombre} (${archivo.numeroPaginas || 0} págs)`)
      } else {
        console.log(`  ⏭️  ${temaId}: ${archivo.nombre} (ya existe)`)
      }
    }
  }

  console.log('\n📊 Resumen de migración:')
  console.log(`   • Temas importados: ${temasImportados}`)
  console.log(`   • Archivos importados: ${archivosImportados}`)

  // Verificar estado final
  const totalTemas = await prisma.temaOficial.count()
  const totalArchivos = await prisma.temaArchivo.count()
  const temasConArchivos = await prisma.temaOficial.count({
    where: {
      archivos: {
        some: {}
      }
    }
  })

  console.log('\n📚 Estado final de la base de datos:')
  console.log(`   • Total de temas: ${totalTemas}`)
  console.log(`   • Total de archivos: ${totalArchivos}`)
  console.log(`   • Temas con archivos: ${temasConArchivos}`)

  await prisma.$disconnect()
  console.log('\n✅ Migración completada exitosamente.')
}

migrate().catch(error => {
  console.error('❌ Error durante la migración:', error)
  process.exit(1)
})

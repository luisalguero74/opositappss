import { listLocalTemarioFiles } from '@/lib/local-temario-storage'

export interface FileToProcess {
  filePath: string
  fileName: string
  type: string
  topic?: string
}

export async function findAllLocalDocumentsToProcess(): Promise<FileToProcess[]> {
  const documents: FileToProcess[] = []

  // Procesar documentos de biblioteca
  const bibliotecaFiles = await listLocalTemarioFiles('biblioteca')
  for (const file of bibliotecaFiles) {
    if (file.match(/\.(txt|pdf|doc|docx)$/i)) {
      documents.push({
        filePath: `documentos-temario/biblioteca/${file}`,
        fileName: file,
        type: 'ley',
      })
    }
  }

  // Procesar temario general
  const generalFiles = await listLocalTemarioFiles('general')
  for (const file of generalFiles) {
    if (file.match(/\.(txt|pdf|doc|docx)$/i) && !file.includes('README')) {
      const match = file.match(/tema[_\s]?(\d+)/i)
      const temaNum = match ? parseInt(match[1]) : undefined

      documents.push({
        filePath: `documentos-temario/general/${file}`,
        fileName: file,
        type: 'temario_general',
        topic: temaNum ? `Tema ${temaNum}` : undefined,
      })
    }
  }

  // Procesar temario específico
  const especificoFiles = await listLocalTemarioFiles('especifico')
  for (const file of especificoFiles) {
    if (file.match(/\.(txt|pdf|doc|docx)$/i) && !file.includes('README')) {
      const match = file.match(/tema[_\s]?(\d+)/i)
      const temaNum = match ? parseInt(match[1]) : undefined

      documents.push({
        filePath: `documentos-temario/especifico/${file}`,
        fileName: file,
        type: 'temario_especifico',
        topic: temaNum ? `Tema ${24 + temaNum}` : undefined,
      })
    }
  }

  return documents
}

import { existsSync } from 'fs'
import { mkdir, readFile, readdir, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { getLocalTemarioCategoriaDir } from '@/lib/local-documentos-temario'

export function detectTemarioContentType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase()
  switch (extension) {
    case 'pdf':
      return 'application/pdf'
    case 'txt':
      return 'text/plain; charset=utf-8'
    case 'doc':
      return 'application/msword'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'epub':
      return 'application/epub+zip'
    default:
      return 'application/octet-stream'
  }
}

export async function listLocalTemarioFiles(categoria: string): Promise<string[]> {
  const dirPath = getLocalTemarioCategoriaDir(categoria)
  if (!existsSync(dirPath)) return []
  return await readdir(dirPath)
}

export async function readLocalTemarioFile(
  categoria: string,
  fileName: string
): Promise<{ buffer: Buffer; contentType: string; filePath: string } | null> {
  const dirPath = getLocalTemarioCategoriaDir(categoria)
  const filePath = join(dirPath, fileName)
  if (!existsSync(filePath)) return null

  const buffer = await readFile(filePath)
  return { buffer, contentType: detectTemarioContentType(fileName), filePath }
}

export async function writeLocalTemarioFile(
  categoria: string,
  fileName: string,
  buffer: Buffer
): Promise<{ filePath: string }>
{
  const dirPath = getLocalTemarioCategoriaDir(categoria)
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true })
  }

  const filePath = join(dirPath, fileName)
  await writeFile(filePath, buffer)
  return { filePath }
}

export async function deleteLocalTemarioFile(
  categoria: string,
  fileName: string
): Promise<boolean> {
  const dirPath = getLocalTemarioCategoriaDir(categoria)
  const filePath = join(dirPath, fileName)
  if (!existsSync(filePath)) return false
  await unlink(filePath)
  return true
}

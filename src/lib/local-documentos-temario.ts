import { join } from 'path'

export function getLocalDocumentosTemarioDir(): string {
  return join(process.cwd(), 'documentos-temario')
}

export function getLocalTemarioCategoriaDir(categoria: string): string {
  return join(getLocalDocumentosTemarioDir(), categoria)
}

export function getLocalBibliotecaDir(): string {
  return join(getLocalDocumentosTemarioDir(), 'biblioteca')
}

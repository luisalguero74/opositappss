'use client'

import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { unzipSync } from 'fflate'
import { getRepoColorClasses } from '@/lib/repo-color'

// Tipos base para datos estáticos actuales
interface StaticFolder {
  id: string
  name: string
  description?: string
}

interface StaticFile {
  id: string
  title: string
  fileName: string
  folderId?: string | null
  allowDownload: boolean
}

// Tipos pensados para el futuro consumo de la API de repositorio
// (mantienen la estructura actual pero permiten cargar desde BD).
interface RepoDocumentApi {
  id: string
  title: string
  fileName: string
  allowDownload: boolean
}

interface RepoFolderApi {
  id: string
  code: string
  name: string
  description?: string | null
  parentId?: string | null
  documents: RepoDocumentApi[]
}

interface RepoApiResponse {
  folders: RepoFolderApi[]
}

// Ejemplos de carpetas reales que has comentado.
const STATIC_FOLDERS: StaticFolder[] = [
  {
    id: 'temario-adams',
    name: 'TEMARIO ADAMS',
    description: 'Temario completo de la editorial ADAMS organizado por temas.',
  },
  {
    id: 'leyes-rd',
    name: 'LEYES_RD',
    description: 'Compilación de leyes y reales decretos relevantes.',
  },
  {
    id: 'temario-juridicas',
    name: 'TEMARIO TODO JURÍDICAS',
    description: 'Material jurídico complementario agrupado por bloques.',
  },
]

// Ejemplos de ficheros, algunos dentro de carpeta y otros sueltos.
const STATIC_FILES: StaticFile[] = [
  {
    id: 'file-1',
    title: 'Simulacro oficial enero 2026',
    fileName: 'simulacro_enero_2026.pdf',
    folderId: 'temario-adams',
    allowDownload: true,
  },
  {
    id: 'file-2',
    title: 'Compilación RD recaudación',
    fileName: 'compilacion_rd_recaudacion.pdf',
    folderId: 'leyes-rd',
    allowDownload: false,
  },
  {
    id: 'file-3',
    title: 'Esquemas básicos LO 3/2007',
    fileName: 'esquemas_lo_3_2007.pdf',
    folderId: 'temario-juridicas',
    allowDownload: false,
  },
  {
    id: 'file-4',
    title: 'Actualización TREBEP según Martina',
    fileName: 'Actualizacion_TREBEP_segun_Martina.pdf',
    folderId: null,
    allowDownload: true,
  },
]

const GLOBAL_UPLOAD_TARGET = '__global__'

export default function RepositorioPage() {
  // Estado para el disclaimer legal
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  // Flag de seguridad: si no está activado, la página usa solo datos estáticos.
  // Se puede activar por entorno (ej: Preview en Vercel) con NEXT_PUBLIC_USE_REPOSITORY_API=true.
  const repositoryApiFlagRaw = String(
    process.env.NEXT_PUBLIC_USE_REPOSITORY_API ??
      // Backward-compat / typo-proof: some envs may have the key misspelled.
      (process.env as any).NEXT_PUBLIC_USE_REPOSITOY_API ??
      ''
  ).trim()

  const USE_REPOSITORY_API = ['true', '1', 'yes', 'on'].includes(repositoryApiFlagRaw.toLowerCase())

  const { data: session, status } = useSession() as { data: Session | null; status: 'loading' | 'authenticated' | 'unauthenticated' }
  const router = useRouter()

  const [foldersFromApi, setFoldersFromApi] = useState<RepoFolderApi[] | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [apiLoading, setApiLoading] = useState(false)

  const [createFolderName, setCreateFolderName] = useState('')
  const [createFolderDescription, setCreateFolderDescription] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [createFolderError, setCreateFolderError] = useState<string | null>(null)

  const [uploadOpenByFolderId, setUploadOpenByFolderId] = useState<Record<string, boolean>>({})
  const [uploadModeByFolderId, setUploadModeByFolderId] = useState<Record<string, 'files' | 'directory' | 'zip'>>({})
  const [selectedFilesByFolderId, setSelectedFilesByFolderId] = useState<Record<string, File[]>>({})
  const [allowDownloadByFolderId, setAllowDownloadByFolderId] = useState<Record<string, boolean>>({})
  const [uploadTitleByFolderId, setUploadTitleByFolderId] = useState<Record<string, string>>({})
  const [uploadingByFolderId, setUploadingByFolderId] = useState<Record<string, boolean>>({})
  const [uploadProgressByFolderId, setUploadProgressByFolderId] = useState<Record<string, { done: number; total: number }>>({})
  const [uploadErrorByFolderId, setUploadErrorByFolderId] = useState<Record<string, string | null>>({})

  const [createChildFolderNameByFolderId, setCreateChildFolderNameByFolderId] = useState<Record<string, string>>({})
  const [creatingChildFolderByFolderId, setCreatingChildFolderByFolderId] = useState<Record<string, boolean>>({})
  const [createChildFolderErrorByFolderId, setCreateChildFolderErrorByFolderId] = useState<Record<string, string | null>>({})

  const [supportsDirectoryUpload, setSupportsDirectoryUpload] = useState(false)

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)

  const openRepoDocument = (id: string, opts?: { preview?: boolean }) => {
    if (!USE_REPOSITORY_API) {
      window.alert(
        'Repositorio en modo demostración: estas carpetas y ficheros son de ejemplo.\n\nPara ver documentos reales, activa NEXT_PUBLIC_USE_REPOSITORY_API=true y carga el contenido desde el panel de administración.'
      )
      return
    }

    if (opts?.preview) {
      window.open(`/repositorio/visor/${id}`, '_blank')
      return
    }

    window.open(`/api/repository/download/${id}`, '_blank')
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/repositorio')
    }
  }, [status, router])

  useEffect(() => {
    const input = document.createElement('input') as any
    setSupportsDirectoryUpload(Boolean(input && 'webkitdirectory' in input))
  }, [])

  useEffect(() => {
    if (!USE_REPOSITORY_API) return
    if (status !== 'authenticated') return

    let cancelled = false
    const load = async () => {
      setApiLoading(true)
      setApiError(null)
      try {
        const res = await fetch('/api/repository/folders')
        if (!res.ok) {
          throw new Error(`Error ${res.status}`)
        }
        const data: RepoApiResponse = await res.json()
        if (!cancelled) {
          setFoldersFromApi(data.folders)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[Repositorio] Error cargando desde API:', err)
          setApiError('No se ha podido cargar el repositorio dinámico.')
        }
      } finally {
        if (!cancelled) {
          setApiLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [USE_REPOSITORY_API, status])

  useEffect(() => {
    if (!currentFolderId) return
    if (!foldersFromApi) return
    const exists = foldersFromApi.some((f) => String(f.id) === String(currentFolderId))
    if (!exists) {
      setCurrentFolderId(null)
    }
  }, [currentFolderId, foldersFromApi])

  const refreshFoldersFromApi = async () => {
    if (!USE_REPOSITORY_API) return
    const res = await fetch('/api/repository/folders')
    if (!res.ok) throw new Error(`Error ${res.status}`)
    const data: RepoApiResponse = await res.json()
    setFoldersFromApi(data.folders)
  }

  const deleteFolderById = async (id: string) => {
    const res = await fetch('/api/repository/folder', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    if (!res.ok) {
      let message = `Error borrando carpeta (HTTP ${res.status})`
      try {
        const data = await res.json()
        if (data?.error) message = String(data.error)
      } catch {
        // ignore
      }
      throw new Error(message)
    }
  }

  const deleteDocumentById = async (id: string) => {
    const res = await fetch('/api/repository/document', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })

    if (!res.ok) {
      let message = `Error borrando documento (HTTP ${res.status})`
      try {
        const data = await res.json()
        if (data?.error) message = String(data.error)
      } catch {
        // ignore
      }
      throw new Error(message)
    }
  }

  const slugifyCode = (name: string) =>
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

  const deriveTitleFromFileName = (fileName: string) => {
    const base = fileName.replace(/\.[^/.]+$/, '')
    const spaced = base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
    return spaced.slice(0, 100) || 'Documento'
  }

  const getRelativePathParts = (fileObj: File) => {
    const rel = String((fileObj as any)?.webkitRelativePath || '')
    if (!rel) return [] as string[]

    // Example: "CarpetaRaiz/Sub1/Sub2/file.pdf" -> ["Sub1","Sub2"]
    const rawParts = rel.split('/').filter(Boolean)
    if (rawParts.length <= 2) return []
    return rawParts.slice(1, -1)
  }

  const shouldIgnoreEntryPath = (entryPath: string) => {
    const normalized = entryPath.replace(/\\/g, '/').replace(/^\/+/, '')
    if (!normalized) return true
    if (normalized.startsWith('__MACOSX/')) return true
    if (normalized.includes('/__MACOSX/')) return true
    if (normalized.endsWith('/')) return true
    const fileName = normalized.split('/').pop() || ''
    if (!fileName) return true
    if (fileName === '.DS_Store') return true
    return false
  }

  const guessMimeTypeFromName = (name: string): string => {
    const ext = name.split('.').pop()?.toLowerCase() || ''
    switch (ext) {
      case 'pdf':
        return 'application/pdf'
      case 'png':
        return 'image/png'
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'gif':
        return 'image/gif'
      case 'webp':
        return 'image/webp'
      case 'txt':
        return 'text/plain'
      case 'md':
        return 'text/markdown'
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      default:
        return 'application/octet-stream'
    }
  }

  const getZipEntries = async (zipFile: File) => {
    const buf = await zipFile.arrayBuffer()
    const entries = unzipSync(new Uint8Array(buf))

    const rawNames = Object.keys(entries)
      .map((n) => n.replace(/\\/g, '/'))
      .filter((n) => !shouldIgnoreEntryPath(n))

    const split = rawNames
      .map((n) => n.split('/').filter(Boolean))
      .filter((parts) => parts.length >= 1)

    const firstSeg = split.length ? split[0][0] : ''
    const canStripRoot =
      Boolean(firstSeg) &&
      split.every((parts) => parts[0] === firstSeg) &&
      split.some((parts) => parts.length >= 2)

    const result: Array<{ file: File; parts: string[] }> = []

    for (const name of rawNames) {
      const data = entries[name]
      if (!data) continue

      const parts = name.split('/').filter(Boolean)
      if (!parts.length) continue

      const effectiveParts = canStripRoot ? parts.slice(1) : parts
      if (!effectiveParts.length) continue

      const fileName = effectiveParts[effectiveParts.length - 1]
      const folderParts = effectiveParts.slice(0, -1)
      if (!fileName) continue

      const type = guessMimeTypeFromName(fileName)
      const bytes = new Uint8Array(data)
      const blob = new Blob([bytes], { type })
      const file = new File([blob], fileName, { type })
      result.push({ file, parts: folderParts })
    }

    return result
  }

  const runUpload = async (params: {
    uiKey: string
    baseFolderId: string
    folderNameForDb: string
    mode: 'files' | 'directory' | 'zip'
    selected: File[]
    allowDownload: boolean
  }) => {
    const { uiKey, baseFolderId, folderNameForDb, mode, selected, allowDownload } = params

    if (selected.length === 0) {
      setUploadErrorByFolderId((p) => ({ ...p, [uiKey]: 'Selecciona archivos, una carpeta o un ZIP' }))
      return
    }

    setUploadingByFolderId((p) => ({ ...p, [uiKey]: true }))
    setUploadErrorByFolderId((p) => ({ ...p, [uiKey]: null }))
    setUploadProgressByFolderId((p) => ({ ...p, [uiKey]: { done: 0, total: 0 } }))

    try {
      let currentFolders = foldersFromApi || []

      let entries: Array<{ file: File; parts: string[] }> = []

      if (mode === 'zip') {
        const zipFile = selected[0]
        entries = await getZipEntries(zipFile)
      } else {
        entries = selected.map((fileObj) => ({
          file: fileObj,
          parts: mode === 'directory' ? getRelativePathParts(fileObj) : [],
        }))
      }

      if (entries.length === 0) {
        setUploadErrorByFolderId((p) => ({ ...p, [uiKey]: 'No hay ficheros válidos para subir' }))
        return
      }

      setUploadProgressByFolderId((p) => ({ ...p, [uiKey]: { done: 0, total: entries.length } }))

      for (let index = 0; index < entries.length; index++) {
        const entry = entries[index]
        const fileObj = entry.file

        const ensured = await ensureFolderPath({
          baseParentId: baseFolderId,
          parts: entry.parts,
          folders: currentFolders,
        })

        const targetFolderId = ensured.folderId
        currentFolders = ensured.folders

        const init = await fetch('/api/repository/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderId: targetFolderId,
            fileName: fileObj.name,
            contentType: fileObj.type,
          }),
        })

        if (!init.ok) {
          let message = `Error preparando subida (HTTP ${init.status})`
          try {
            const data = await init.json()
            if (data?.error) message = String(data.error)
          } catch {
            // ignore
          }
          throw new Error(message)
        }

        const initData = await init.json()
        const uploadUrl = String(initData?.uploadUrl || '')
        const storagePath = String(initData?.storagePath || '')
        const storageBucket = String(initData?.storageBucket || '')
        if (!uploadUrl || !storagePath || !storageBucket) {
          throw new Error('Respuesta inválida preparando subida')
        }

        const putRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': fileObj.type || 'application/octet-stream',
          },
          body: fileObj,
        })

        if (!putRes.ok) {
          throw new Error(`Error subiendo a almacenamiento (HTTP ${putRes.status})`)
        }

        const shouldUseCustomTitle = entries.length === 1 && mode === 'files'
        const title = shouldUseCustomTitle
          ? (uploadTitleByFolderId[uiKey] || deriveTitleFromFileName(fileObj.name))
          : deriveTitleFromFileName(fileObj.name)

        const complete = await fetch('/api/repository/upload-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderId: targetFolderId,
            folderName: folderNameForDb,
            folderDescription: null,
            title,
            fileName: fileObj.name,
            storagePath,
            storageBucket,
            allowDownload,
          }),
        })

        if (!complete.ok) {
          let message = `Subida OK pero fallo registrando en BD (HTTP ${complete.status})`
          try {
            const data: any = await complete.json()
            if (data?.error) message = String(data.error)
          } catch {
            // ignore
          }
          throw new Error(message)
        }

        setUploadProgressByFolderId((p) => ({
          ...p,
          [uiKey]: { done: index + 1, total: entries.length },
        }))
      }

      setSelectedFilesByFolderId((p) => ({ ...p, [uiKey]: [] }))
      setUploadOpenByFolderId((p) => ({ ...p, [uiKey]: false }))
      await refreshFoldersFromApi()
    } catch (err: any) {
      setUploadErrorByFolderId((p) => ({ ...p, [uiKey]: err?.message || 'Error desconocido' }))
    } finally {
      setUploadingByFolderId((p) => ({ ...p, [uiKey]: false }))
    }
  }

  const ensureFolderPath = async (params: {
    baseParentId: string
    parts: string[]
    folders: RepoFolderApi[]
  }) => {
    const { baseParentId, parts } = params
    let { folders } = params

    const normalizeKey = (parentId: string | null | undefined, name: string) =>
      `${parentId || 'root'}::${name.trim().toLowerCase()}`

    const map = new Map<string, RepoFolderApi>()
    for (const f of folders) {
      map.set(normalizeKey(f.parentId, f.name), f)
    }

    let parentId: string | null = baseParentId
    for (const part of parts) {
      const cleaned = part.trim()
      if (!cleaned) continue

      const existing = map.get(normalizeKey(parentId, cleaned))
      if (existing) {
        parentId = existing.id
        continue
      }

      const createRes = await fetch('/api/repository/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleaned, description: null, parentId }),
      })

      if (!createRes.ok) {
        let message = `Error creando subcarpeta (HTTP ${createRes.status})`
        try {
          const data = await createRes.json()
          if (data?.error) message = String(data.error)
        } catch {
          // ignore
        }
        throw new Error(message)
      }

      const created = await createRes.json()
      const folder: RepoFolderApi = {
        id: String(created?.folder?.id || ''),
        code: String(created?.folder?.code || slugifyCode(cleaned)),
        name: String(created?.folder?.name || cleaned),
        description: created?.folder?.description ?? null,
        parentId: created?.folder?.parentId ?? parentId,
        documents: [],
      }

      if (!folder.id) throw new Error('Error creando subcarpeta: respuesta inválida')

      folders = [...folders, folder]
      map.set(normalizeKey(folder.parentId, folder.name), folder)
      parentId = folder.id
    }

    return { folderId: parentId || baseParentId, folders }
  }

  if (!session || status !== 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Cargando repositorio...</p>
      </div>
    )
  }


  const role = String(session.user?.role || '').toLowerCase()
  const isAdmin = role === 'admin'
  const repoRole = String(session.user?.repoRole || 'NONE').toUpperCase()
  const isEditor = repoRole === 'EDITOR'
  const canAccessRepository = isAdmin || repoRole !== 'NONE'
  const canDownload = isAdmin || repoRole === 'EDITOR'
  const canManage = isAdmin || isEditor

  if (!canAccessRepository) {
    router.replace('/dashboard')
    return null
  }

  const apiFolders = foldersFromApi || []
  const folderById = new Map<string, RepoFolderApi>()
  for (const f of apiFolders) folderById.set(String(f.id), f)

  const getFolderPathLabel = (folder: RepoFolderApi) => {
    const parts: string[] = []
    let current: RepoFolderApi | undefined = folder
    let guard = 0
    while (current) {
      guard += 1
      if (guard > 20) break
      parts.unshift(String(current.name || ''))
      const parentId = current.parentId ? String(current.parentId) : ''
      if (!parentId) break
      current = folderById.get(parentId)
    }
    const label = parts.filter(Boolean).join(' / ').trim()
    return label || String(folder.name || '')
  }

  const sortedApiFolders = [...apiFolders].sort((a, b) =>
    getFolderPathLabel(a).localeCompare(getFolderPathLabel(b), 'es', { sensitivity: 'base' })
  )

  const currentFolder = currentFolderId ? folderById.get(String(currentFolderId)) : undefined
  const currentFolderName = currentFolder?.name ? String(currentFolder.name) : ''

  const getBreadcrumb = () => {
    if (!currentFolderId) return [] as RepoFolderApi[]
    const parts: RepoFolderApi[] = []
    let cursor = currentFolder
    let guard = 0
    while (cursor) {
      guard += 1
      if (guard > 20) break
      parts.unshift(cursor)
      const parentId = cursor.parentId ? String(cursor.parentId) : ''
      if (!parentId) break
      cursor = folderById.get(parentId)
    }
    return parts
  }

  const breadcrumb = getBreadcrumb()

  const listChildFolders = (parentId: string | null) => {
    const pid = parentId ? String(parentId) : null
    return apiFolders
      .filter((f) => (f.parentId ? String(f.parentId) : null) === pid)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'es', { sensitivity: 'base' }))
  }

  const getFolderDepth = (folder: RepoFolderApi) => {
    let depth = 0
    let cursor: RepoFolderApi | undefined = folder
    let guard = 0
    while (cursor) {
      guard += 1
      if (guard > 30) break
      const parentId = cursor.parentId ? String(cursor.parentId) : ''
      if (!parentId) break
      depth += 1
      cursor = folderById.get(parentId)
    }
    return depth
  }

  const rootFolders = USE_REPOSITORY_API ? listChildFolders(null) : []
  const folderTreeItems = USE_REPOSITORY_API
    ? [...sortedApiFolders].sort((a, b) => {
        const da = getFolderDepth(a)
        const db = getFolderDepth(b)
        if (da !== db) return da - db
        return getFolderPathLabel(a).localeCompare(getFolderPathLabel(b), 'es', { sensitivity: 'base' })
      })
    : []

  const visibleFolders = USE_REPOSITORY_API ? listChildFolders(currentFolderId) : []
  const visibleDocuments = USE_REPOSITORY_API && currentFolder ? currentFolder.documents || [] : []

  // Mostrar disclaimer solo a usuarios (no gestión)
  if (!isAdmin && !isEditor && !disclaimerAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm p-8 border border-slate-200 flex flex-col items-center">
          <h2 className="text-lg font-bold mb-4 text-slate-800 text-center">Condiciones de uso del material compartido</h2>
          <div className="text-xs text-slate-700 mb-6 text-justify whitespace-pre-line">
            El usuario/a declara aceptar las normas de uso responsable del material compartido, comprometiéndose a utilizarlo exclusivamente para los fines del grupo y a no difundirlo a terceros sin autorización. Asimismo, reconoce la existencia de un equilibrio de responsabilidad: quien facilita el material lo hace de forma desinteresada y con intención de apoyar el estudio colectivo, y quien accede a él, asume la obligación de respetar su carácter interno y confidencial. El usuario/a reconoce que el acceso al material compartido se realiza de forma voluntaria y bajo su exclusiva responsabilidad. Se compromete a utilizar dicho material únicamente para los fines internos del grupo y a no difundirlo, reproducirlo ni compartirlo con terceros sin autorización expresa.
            
            Los administradores/as del grupo actúan únicamente como facilitadores del acceso y no asumen responsabilidad legal por el uso indebido que puedan realizar los usuarios. La responsabilidad derivada de cualquier filtración, difusión no autorizada o vulneración de este compromiso recaerá exclusivamente en la persona que lleve a cabo dicha acción.

            El usuario declara haber leído y aceptado estas condiciones antes de acceder al material.
          </div>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition text-sm"
            onClick={() => setDisclaimerAccepted(true)}
          >
            Acepto
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <Link
                href={role === 'admin' ? '/admin' : '/dashboard'}
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                Volver
              </Link>
              <h1 className="mt-2 text-xl font-bold text-slate-900">Repositorio de documentos</h1>
              <p className="mt-1 text-sm text-slate-600 max-w-2xl">
                Accede a las carpetas y ficheros del equipo. Los lectores solo pueden ver en pantalla;
                editores/administradores podrán descargar cuando el fichero lo permita.
              </p>
            </div>

            {USE_REPOSITORY_API && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  onClick={refreshFoldersFromApi}
                  disabled={apiLoading}
                >
                  {apiLoading ? 'Actualizando…' : 'Actualizar'}
                </button>

                <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                  Vista:{' '}
                  <span className="ml-1 text-slate-900">
                    {currentFolder ? String(currentFolder.name || 'Carpeta') : 'Raíz'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-6">
          {USE_REPOSITORY_API && (
            <section>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-700 flex-wrap">
                      <button
                        type="button"
                        className="px-2 py-1 rounded-md border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() => setCurrentFolderId(null)}
                      >
                        Inicio
                      </button>
                      {breadcrumb.map((b) => (
                        <div key={b.id} className="flex items-center gap-2">
                          <span className="text-slate-400">/</span>
                          <button
                            type="button"
                            className="px-2 py-1 rounded-md border border-slate-200 bg-white font-semibold text-slate-700 hover:bg-slate-50"
                            onClick={() => setCurrentFolderId(String(b.id))}
                            title={getFolderPathLabel(b)}
                          >
                            {String(b.name || 'Carpeta')}
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] text-slate-500">
                      {apiLoading ? 'Cargando…' : apiError ? apiError : foldersFromApi ? `${apiFolders.length} carpeta(s)` : ''}
                    </div>
                  </div>

                  {apiError && !foldersFromApi && (
                    <p className="text-xs text-red-700">{apiError}</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {USE_REPOSITORY_API && canManage && (
            <section>
              <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">Acciones (equipo)</h2>
              <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault()
                    setCreatingFolder(true)
                    setCreateFolderError(null)
                    try {
                      const name = createFolderName.trim()
                      if (!name) {
                        setCreateFolderError('Nombre requerido')
                        return
                      }

                      const parentId = currentFolderId ? String(currentFolderId) : null
                      const res = await fetch('/api/repository/folders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name,
                          description: createFolderDescription.trim() || null,
                          parentId,
                        }),
                      })

                      if (!res.ok) {
                        let message = `Error creando carpeta (HTTP ${res.status})`
                        try {
                          const data = await res.json()
                          if (data?.error) message = String(data.error)
                        } catch {
                          // ignore
                        }
                        setCreateFolderError(message)
                        return
                      }

                      setCreateFolderName('')
                      setCreateFolderDescription('')
                      await refreshFoldersFromApi()
                    } catch (err: any) {
                      setCreateFolderError(err?.message || 'Error desconocido')
                    } finally {
                      setCreatingFolder(false)
                    }
                  }}
                  className="flex flex-col gap-2"
                >
                  <p className="text-xs font-semibold text-slate-700">
                    {currentFolderId ? `Nueva subcarpeta en: ${currentFolderName || 'carpeta'}` : 'Nueva carpeta (nivel superior)'}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="Nombre"
                      value={createFolderName}
                      onChange={(e) => setCreateFolderName(e.target.value)}
                      maxLength={120}
                      required
                    />
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="Descripción (opcional)"
                      value={createFolderDescription}
                      onChange={(e) => setCreateFolderDescription(e.target.value)}
                      maxLength={200}
                    />
                  </div>
                  {createFolderError && <p className="text-xs text-red-600">{createFolderError}</p>}
                  <div>
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                      disabled={creatingFolder}
                    >
                      {creatingFolder ? 'Creando...' : '+ Crear carpeta'}
                    </button>
                  </div>
                </form>

                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-2">Subir documentos</p>
                  {!currentFolderId ? (
                    <p className="text-xs text-slate-600">Entra en una carpeta para subir archivos dentro.</p>
                  ) : (
                    <form
                      className="flex flex-col gap-2"
                      onSubmit={async (e) => {
                        e.preventDefault()
                        const folderId = String(currentFolderId)
                        const mode = uploadModeByFolderId[folderId] || 'files'
                        const selected = selectedFilesByFolderId[folderId] || []
                        const allowDownload = allowDownloadByFolderId[folderId] == null ? true : allowDownloadByFolderId[folderId]

                        const folder = folderById.get(folderId)
                        if (!folder) {
                          setUploadErrorByFolderId((p) => ({ ...p, [folderId]: 'Carpeta no encontrada' }))
                          return
                        }

                        await runUpload({
                          uiKey: folderId,
                          baseFolderId: folderId,
                          folderNameForDb: String(folder.name || ''),
                          mode,
                          selected,
                          allowDownload,
                        })
                      }}
                    >
                      <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
                        <button
                          type="button"
                          className={
                            (uploadModeByFolderId[String(currentFolderId)] || 'files') === 'files'
                              ? 'px-3 py-1.5 rounded-full bg-blue-600 text-white text-[11px] font-semibold'
                              : 'px-3 py-1.5 rounded-full text-slate-700 text-[11px] font-semibold hover:bg-white'
                          }
                          onClick={() =>
                            setUploadModeByFolderId((p) => ({
                              ...p,
                              [String(currentFolderId)]: 'files',
                            }))
                          }
                        >
                          Archivos
                        </button>
                        <button
                          type="button"
                          disabled={!supportsDirectoryUpload}
                          className={
                            (uploadModeByFolderId[String(currentFolderId)] || 'files') === 'directory'
                              ? 'px-3 py-1.5 rounded-full bg-blue-600 text-white text-[11px] font-semibold disabled:opacity-60'
                              : 'px-3 py-1.5 rounded-full text-slate-700 text-[11px] font-semibold hover:bg-white disabled:opacity-60'
                          }
                          onClick={() =>
                            setUploadModeByFolderId((p) => ({
                              ...p,
                              [String(currentFolderId)]: 'directory',
                            }))
                          }
                        >
                          Carpeta
                        </button>
                        <button
                          type="button"
                          className={
                            (uploadModeByFolderId[String(currentFolderId)] || 'files') === 'zip'
                              ? 'px-3 py-1.5 rounded-full bg-blue-600 text-white text-[11px] font-semibold'
                              : 'px-3 py-1.5 rounded-full text-slate-700 text-[11px] font-semibold hover:bg-white'
                          }
                          onClick={() =>
                            setUploadModeByFolderId((p) => ({
                              ...p,
                              [String(currentFolderId)]: 'zip',
                            }))
                          }
                        >
                          ZIP
                        </button>
                      </div>

                      {(uploadModeByFolderId[String(currentFolderId)] || 'files') === 'zip' ? (
                        <input
                          type="file"
                          accept=".zip,application/zip"
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || [])
                            setSelectedFilesByFolderId((p) => ({ ...p, [String(currentFolderId)]: files.slice(0, 1) }))
                            setUploadTitleByFolderId((p) => ({ ...p, [String(currentFolderId)]: '' }))
                          }}
                        />
                      ) : (uploadModeByFolderId[String(currentFolderId)] || 'files') === 'directory' ? (
                        <input
                          type="file"
                          multiple
                          // @ts-expect-error - webkitdirectory is supported by Chromium browsers
                          webkitdirectory=""
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || [])
                            setSelectedFilesByFolderId((p) => ({ ...p, [String(currentFolderId)]: files }))
                            setUploadTitleByFolderId((p) => ({ ...p, [String(currentFolderId)]: '' }))
                          }}
                        />
                      ) : (
                        <input
                          type="file"
                          multiple
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                          onChange={(e) => {
                            const files = Array.from(e.target.files || [])
                            setSelectedFilesByFolderId((p) => ({ ...p, [String(currentFolderId)]: files }))
                            if (files.length === 1) {
                              setUploadTitleByFolderId((p) => ({
                                ...p,
                                [String(currentFolderId)]: deriveTitleFromFileName(files[0].name),
                              }))
                            } else {
                              setUploadTitleByFolderId((p) => ({ ...p, [String(currentFolderId)]: '' }))
                            }
                          }}
                        />
                      )}

                      {(uploadModeByFolderId[String(currentFolderId)] || 'files') === 'files' &&
                        (selectedFilesByFolderId[String(currentFolderId)] || []).length === 1 && (
                          <input
                            type="text"
                            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                            placeholder="Título (solo si subes 1 fichero)"
                            value={uploadTitleByFolderId[String(currentFolderId)] || ''}
                            onChange={(e) =>
                              setUploadTitleByFolderId((p) => ({
                                ...p,
                                [String(currentFolderId)]: e.target.value,
                              }))
                            }
                            maxLength={100}
                          />
                        )}

                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={
                            allowDownloadByFolderId[String(currentFolderId)] == null
                              ? true
                              : Boolean(allowDownloadByFolderId[String(currentFolderId)])
                          }
                          onChange={(e) =>
                            setAllowDownloadByFolderId((p) => ({
                              ...p,
                              [String(currentFolderId)]: e.target.checked,
                            }))
                          }
                        />
                        Permitir descarga (equipo)
                      </label>

                      {uploadErrorByFolderId[String(currentFolderId)] && (
                        <p className="text-xs text-red-600">{uploadErrorByFolderId[String(currentFolderId)]}</p>
                      )}

                      {uploadProgressByFolderId[String(currentFolderId)] && uploadingByFolderId[String(currentFolderId)] && (
                        <p className="text-[11px] text-slate-600">
                          Subiendo {uploadProgressByFolderId[String(currentFolderId)].done}/
                          {uploadProgressByFolderId[String(currentFolderId)].total}...
                        </p>
                      )}

                      <button
                        type="submit"
                        className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        disabled={Boolean(uploadingByFolderId[String(currentFolderId)])}
                      >
                        {uploadingByFolderId[String(currentFolderId)] ? 'Subiendo...' : 'Subir'}
                      </button>

                      <p className="text-[11px] text-slate-500">
                        En móvil: usa “Archivos” o “ZIP”. “Carpeta” depende del navegador.
                      </p>
                    </form>
                  )}
                </div>
              </div>
            </section>
          )}

          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
              Carpetas de material
            </h2>
            {USE_REPOSITORY_API ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <aside className="md:col-span-1">
                  <div className="rounded-xl border border-slate-200 bg-white">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-700">Carpetas</p>
                      <p className="text-[11px] text-slate-500">Árbol de navegación</p>
                    </div>

                    {apiLoading && !foldersFromApi ? (
                      <div className="px-4 py-6">
                        <p className="text-xs text-slate-600">Cargando…</p>
                      </div>
                    ) : rootFolders.length === 0 ? (
                      <div className="px-4 py-6">
                        <p className="text-xs text-slate-600">No hay carpetas todavía.</p>
                      </div>
                    ) : (
                      <div className="py-2">
                        <button
                          type="button"
                          className={
                            (currentFolderId == null
                              ? 'bg-slate-50 text-slate-900 '
                              : 'text-slate-700 hover:bg-slate-50 ') +
                            'w-full text-left px-4 py-2 text-xs font-semibold'
                          }
                          onClick={() => setCurrentFolderId(null)}
                        >
                          Inicio
                        </button>

                        {folderTreeItems.map((f) => {
                          const depth = getFolderDepth(f)
                          const isCurrent = currentFolderId != null && String(currentFolderId) === String(f.id)
                          const label = getFolderPathLabel(f)
                          const color = getRepoColorClasses(String(f.code || f.id))
                          return (
                            <button
                              key={f.id}
                              type="button"
                              className={
                                (isCurrent
                                  ? `bg-slate-100 text-slate-900 border-l-4 ${color.borderStrong} `
                                  : `text-slate-700 hover:bg-slate-50 border-l-4 border-l-transparent `) +
                                'w-full text-left px-4 py-2'
                              }
                              style={{ paddingLeft: 16 + depth * 14 }}
                              onClick={() => setCurrentFolderId(String(f.id))}
                              title={label}
                            >
                              <div className="flex items-start gap-2">
                                <span className={
                                  `mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${color.dot}`
                                } />
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold truncate">{String(f.name || 'Carpeta')}</p>
                                  {depth > 0 && (
                                    <p className="text-[11px] text-slate-500 truncate">{label}</p>
                                  )}
                                </div>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </aside>

                <div className="md:col-span-2">
                  <div className="rounded-xl border border-slate-200 bg-white">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-700">{currentFolderId ? 'Contenido' : 'Contenido (inicio)'}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {currentFolder ? `Ruta actual: ${getFolderPathLabel(currentFolder)}` : 'Selecciona una carpeta para ver su contenido.'}
                      </p>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {currentFolderId && (
                        <button
                          type="button"
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
                          onClick={() => setCurrentFolderId(currentFolder?.parentId ? String(currentFolder.parentId) : null)}
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-700">..</p>
                            <p className="text-[11px] text-slate-500">Subir un nivel</p>
                          </div>
                          <span className="text-xs text-slate-400">Carpeta</span>
                        </button>
                      )}

                      {visibleFolders.length === 0 && visibleDocuments.length === 0 ? (
                        <div className="px-4 py-6">
                          <p className="text-sm text-slate-600">{currentFolderId ? 'Esta carpeta está vacía.' : 'Selecciona una carpeta para ver su contenido.'}</p>
                        </div>
                      ) : null}

                      {visibleFolders.map((f) => {
                        const subCount = listChildFolders(String(f.id)).length
                        const docCount = (f.documents || []).length
                        const label = getFolderPathLabel(f)
                        const color = getRepoColorClasses(String(f.code || f.id))

                        return (
                          <div
                            key={f.id}
                            className={`flex items-center justify-between gap-2 px-4 py-3 border-l-4 ${color.borderStrong} ${color.rowHover}`}
                          >
                            <button
                              type="button"
                              className="flex-1 min-w-0 text-left"
                              onClick={() => setCurrentFolderId(String(f.id))}
                              title={label}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${color.dot}`} />
                                <p className="text-sm font-semibold text-slate-900 truncate">{String(f.name || 'Carpeta')}</p>
                                <span className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${color.badge} ${color.badgeText}`}>Carpeta</span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate">Ruta: {label}</p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {subCount} subcarpeta{subCount === 1 ? '' : 's'} · {docCount} documento{docCount === 1 ? '' : 's'}
                              </p>
                            </button>

                            {canManage && (
                              <button
                                type="button"
                                className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-red-700 hover:bg-slate-50"
                                onClick={async () => {
                                  const id = String(f.id)
                                  if (!window.confirm('¿Borrar esta carpeta y sus documentos?')) return
                                  try {
                                    await deleteFolderById(id)
                                    await refreshFoldersFromApi()
                                  } catch (err: any) {
                                    window.alert(err?.message || 'No se pudo borrar la carpeta')
                                  }
                                }}
                                title="Borra la carpeta (incluye subcarpetas) y elimina sus ficheros del almacenamiento"
                              >
                                Borrar
                              </button>
                            )}
                          </div>
                        )
                      })}

                      {visibleDocuments.length > 0 && (
                        <div className="px-4 py-2 bg-slate-50">
                          <p className="text-xs font-semibold text-slate-700">Documentos en esta carpeta</p>
                        </div>
                      )}

                      {visibleDocuments.map((file) => (
                        <div key={file.id} className="flex items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{file.title}</p>
                            <p className="text-[11px] text-slate-500 truncate">{file.fileName}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={() => openRepoDocument(file.id, { preview: true })}
                              title="Ver documento en visor"
                            >
                              Ver
                            </button>
                            {file.allowDownload && canDownload && (
                              <button
                                type="button"
                                className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                onClick={() => openRepoDocument(file.id)}
                                title="Descargar documento"
                              >
                                Descargar
                              </button>
                            )}
                            {canManage && (
                              <button
                                type="button"
                                className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-red-700 hover:bg-slate-50"
                                onClick={async () => {
                                  const id = String(file.id)
                                  if (!window.confirm('¿Borrar este documento?')) return
                                  try {
                                    await deleteDocumentById(id)
                                    await refreshFoldersFromApi()
                                  } catch (err: any) {
                                    window.alert(err?.message || 'No se pudo borrar el documento')
                                  }
                                }}
                                title="Borra el documento y elimina el fichero del almacenamiento"
                              >
                                Borrar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STATIC_FOLDERS.map((folder) => {
                  const filesInFolder = STATIC_FILES.filter((f) => f.folderId === folder.id)
                  const color = getRepoColorClasses(folder.id)
                  return (
                    <div
                      key={folder.id}
                      className={`rounded-xl border border-slate-200 bg-white shadow-sm transition p-4 flex flex-col gap-3 border-l-4 ${color.borderStrong} ${color.rowHover}`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${color.dot}`} />
                            <h3 className="text-base font-semibold text-slate-900 truncate">{folder.name}</h3>
                          </div>
                          <span className="text-[11px] text-slate-500">
                            {filesInFolder.length} fichero{filesInFolder.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        {folder.description && <p className="text-xs text-slate-600 mb-2">{folder.description}</p>}
                      </div>

                      {filesInFolder.length > 0 ? (
                        <ul className="divide-y divide-slate-100 text-xs text-slate-700">
                          {filesInFolder.map((file) => (
                            <li
                              key={file.id}
                              className="flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 truncate">{file.title}</p>
                                <p className="text-[11px] text-slate-500 truncate">{file.fileName}</p>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                  onClick={() => openRepoDocument(file.id, { preview: true })}
                                  title="Ver documento en visor"
                                >
                                  Ver
                                </button>
                                {file.allowDownload && canDownload && (
                                  <button
                                    type="button"
                                    className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                                    onClick={() => openRepoDocument(file.id)}
                                    title="Descargar documento"
                                  >
                                    Descargar
                                  </button>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-slate-500">Aún no hay ficheros en esta carpeta.</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {!USE_REPOSITORY_API && (
            <section>
              <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
                Ficheros sueltos
              </h2>
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4">
                {STATIC_FILES.filter((f) => !f.folderId).length === 0 ? (
                  <p className="text-xs text-slate-500">No hay ficheros sueltos registrados todavía.</p>
                ) : (
                  <ul className="divide-y divide-slate-100 text-xs text-slate-700">
                    {STATIC_FILES.filter((f) => !f.folderId).map((file) => (
                      <li key={file.id} className="flex items-center justify-between gap-2 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">{file.title}</p>
                          <p className="text-[11px] text-slate-500 truncate">{file.fileName}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                            onClick={() => openRepoDocument(file.id, { preview: true })}
                            title="Ver documento en visor"
                          >
                            Ver
                          </button>
                          {file.allowDownload && canDownload && (
                            <button
                              type="button"
                              className="px-2 py-1 rounded-md border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
                              onClick={() => openRepoDocument(file.id)}
                              title="Descargar documento"
                            >
                              Descargar
                            </button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="mt-3 text-[11px] text-slate-500">
                Nota: los documentos se abren en visor de solo lectura. La descarga solo está disponible
                para editores/administradores cuando el fichero lo permita.
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { unzipSync } from 'fflate'
import { getRepoColorClasses } from '@/lib/repo-color'

type RepoFileRow = {
  id: string
  title: string
  fileName: string
  allowDownload: boolean
}

function FolderCard(props: {
  folderId: string
  folderName: string
  folderDescription?: string
  filesInFolder: RepoFileRow[]
  canManage: boolean
  useRepositoryApi: boolean
  refreshFoldersFromApi: () => Promise<void>
}) {
  const {
    folderId,
    folderName,
    folderDescription,
    filesInFolder,
    canManage,
    useRepositoryApi,
    refreshFoldersFromApi,
  } = props

  const color = getRepoColorClasses(folderId)

  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [fileTitle, setFileTitle] = useState('')
  const [fileObj, setFileObj] = useState<File | null>(null)
  const [allowDownload, setAllowDownload] = useState(true)

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!fileObj) return

    setUploading(true)
    setUploadError(null)
    try {
      // Prefer direct-to-B2 upload to avoid Vercel request size limits (HTTP 413).
      // This requires B2 CORS allowing PUT from your domain.
      const init = await fetch('/api/repository/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId,
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
          try {
            const text = await init.text()
            const snippet = text?.trim()?.slice(0, 200)
            if (snippet) message = `${message}: ${snippet}`
          } catch {
            // ignore
          }
        }
        setUploadError(message)
        return
      }

      const initData = await init.json()
      const uploadUrl = String(initData?.uploadUrl || '')
      const storagePath = String(initData?.storagePath || '')
      const storageBucket = String(initData?.storageBucket || '')
      if (!uploadUrl || !storagePath || !storageBucket) {
        setUploadError('Respuesta inválida preparando subida')
        return
      }

      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': fileObj.type || 'application/octet-stream',
        },
        body: fileObj,
      })

      if (!putRes.ok) {
        setUploadError(`Error subiendo a almacenamiento (HTTP ${putRes.status})`)
        return
      }

      const complete = await fetch('/api/repository/upload-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId,
          folderName,
          folderDescription: folderDescription || null,
          title: fileTitle,
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
          const code = data?.details?.code ? String(data.details.code) : ''
          const detailMessage = data?.details?.message ? String(data.details.message) : ''

          if (data?.error) {
            message = String(data.error)
            if (code) message += ` (${code})`
            if (detailMessage) message += `: ${detailMessage}`
          } else {
            if (code) message += ` (${code})`
            if (detailMessage) message += `: ${detailMessage}`
          }
        } catch {
          // ignore
        }
        setUploadError(message)
        return
      }

      setShowUpload(false)
      setFileTitle('')
      setFileObj(null)
      setAllowDownload(true)

      if (useRepositoryApi) {
        await refreshFoldersFromApi()
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Error desconocido')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm border-l-4 ${color.borderStrong}`}>
      <div className={`flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100 ${color.rowHover}`}>
        <div>
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${color.dot}`} />
            <p className="text-sm font-semibold text-slate-900">{folderName}</p>
            <span className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${color.badge} ${color.badgeText}`}>Carpeta</span>
          </div>
          {folderDescription && <p className="text-xs text-slate-600 mt-0.5">{folderDescription}</p>}
        </div>
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {filesInFolder.length} fichero{filesInFolder.length === 1 ? '' : 's'}
        </span>
      </div>

      {canManage && (
        <button
          className="mx-4 mt-3 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          onClick={() => setShowUpload((v) => !v)}
        >
          {showUpload ? 'Cancelar subida' : '+ Subir fichero'}
        </button>
      )}

      {showUpload && (
        <form
          onSubmit={handleUpload}
          className="mx-4 mt-3 mb-3 flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3"
        >
          <input
            type="text"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            placeholder="Título del fichero"
            value={fileTitle}
            onChange={(e) => setFileTitle(e.target.value)}
            required
            maxLength={100}
          />
          <input
            type="file"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
            accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFileObj(e.target.files?.[0] || null)}
            required
          />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={allowDownload}
              onChange={(e) => setAllowDownload(e.target.checked)}
            />
            Permitir descarga (editores/admin)
          </label>
          {uploadError && <div className="text-red-600 text-xs">{uploadError}</div>}
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            disabled={uploading}
          >
            {uploading ? 'Subiendo...' : 'Subir'}
          </button>
        </form>
      )}

      {filesInFolder.length > 0 ? (
        <div className="px-4 pb-4">
          <table className="w-full text-xs text-left">
          <thead>
            <tr className="text-slate-500">
              <th className="py-2 pr-3 font-medium">Fichero</th>
              <th className="py-2 pr-3 font-medium">Nombre interno</th>
              <th className="py-2 pr-3 font-medium">Acceso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filesInFolder.map((file) => (
              <tr key={file.id} className="hover:bg-slate-50">
                <td className="py-2 pr-3 align-top">
                  <span className="font-medium text-slate-900">{file.title}</span>
                </td>
                <td className="py-2 pr-3 text-slate-500 align-top truncate max-w-[18rem]">{file.fileName}</td>
                <td className="py-2 pr-3 align-top">
                  {file.allowDownload ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">
                      Descarga (admin/editor)
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
                      Solo visor
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 pb-4 text-xs text-slate-500">Aún no has asignado ficheros a esta carpeta.</p>
      )}
    </div>
  )
}

interface StaticFolderAdmin {
  id: string
  name: string
  description?: string
}

interface StaticFileAdmin {
  id: string
  title: string
  fileName: string
  folderId?: string | null
  allowDownload: boolean
}

interface RepoDocumentAdminApi {
  id: string
  title: string
  fileName: string
  allowDownload: boolean
}

interface RepoFolderAdminApi {
  id: string
  code: string
  name: string
  description?: string | null
  parentId?: string | null
  documents: RepoDocumentAdminApi[]
}

interface RepoAdminApiResponse {
  folders: RepoFolderAdminApi[]
}

const STATIC_FOLDERS_ADMIN: StaticFolderAdmin[] = [
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

const STATIC_FILES_ADMIN: StaticFileAdmin[] = [
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

export default function AdminRepositorioPage() {
  const repositoryApiFlagRaw = String(
    process.env.NEXT_PUBLIC_USE_REPOSITORY_API ??
      // Backward-compat / typo-proof
      (process.env as any).NEXT_PUBLIC_USE_REPOSITOY_API ??
      ''
  ).trim()

  const USE_REPOSITORY_API = ['true', '1', 'yes', 'on'].includes(repositoryApiFlagRaw.toLowerCase())

  const { data: session, status } = useSession() as {
    data: Session | null
    status: 'loading' | 'authenticated' | 'unauthenticated'
  }
  const router = useRouter()

  const [foldersFromApi, setFoldersFromApi] = useState<RepoFolderAdminApi[] | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [apiLoading, setApiLoading] = useState(false)

  // Estado para crear carpeta
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderDescription, setNewFolderDescription] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [folderError, setFolderError] = useState<string | null>(null)

  const [createFolderParentId, setCreateFolderParentId] = useState<string | null>(null)

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>([])

  const [selectedSubfolderIds, setSelectedSubfolderIds] = useState<string[]>([])
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([])

  const [uploadMode, setUploadMode] = useState<'files' | 'directory' | 'zip'>('files')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [allowDownload, setAllowDownload] = useState(true)
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadingBulk, setUploadingBulk] = useState(false)
  const [uploadBulkError, setUploadBulkError] = useState<string | null>(null)
  const [uploadBulkProgress, setUploadBulkProgress] = useState<{ done: number; total: number } | null>(null)
  const [supportsDirectoryUpload, setSupportsDirectoryUpload] = useState(false)

  useEffect(() => {
    const input = document.createElement('input') as any
    setSupportsDirectoryUpload(Boolean(input && 'webkitdirectory' in input))
  }, [])

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
      const data = (entries as any)[name]
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

  const ensureFolderPath = async (params: {
    baseParentId: string
    parts: string[]
    folders: RepoFolderAdminApi[]
  }) => {
    const { baseParentId, parts } = params
    let { folders } = params

    const normalizeKey = (parentId: string | null | undefined, name: string) =>
      `${parentId || 'root'}::${name.trim().toLowerCase()}`

    const map = new Map<string, RepoFolderAdminApi>()
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
      const folder: RepoFolderAdminApi = {
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

  const runBulkUpload = async () => {
    const folderId = selectedFolderId
    const baseFolder = folderId ? (foldersFromApi || []).find((f) => f.id === folderId) : undefined
    if (!baseFolder) {
      setUploadBulkError('Selecciona una carpeta destino')
      return
    }

    if (selectedFiles.length === 0) {
      setUploadBulkError('Selecciona archivos, una carpeta o un ZIP')
      return
    }

    setUploadingBulk(true)
    setUploadBulkError(null)
    setUploadBulkProgress({ done: 0, total: 0 })

    try {
      let currentFolders = foldersFromApi || []
      let entries: Array<{ file: File; parts: string[] }> = []

      if (uploadMode === 'zip') {
        entries = await getZipEntries(selectedFiles[0])
      } else {
        entries = selectedFiles.map((fileObj) => ({
          file: fileObj,
          parts: uploadMode === 'directory' ? getRelativePathParts(fileObj) : [],
        }))
      }

      if (!entries.length) {
        setUploadBulkError('No hay ficheros válidos para subir')
        return
      }

      setUploadBulkProgress({ done: 0, total: entries.length })

      for (let index = 0; index < entries.length; index++) {
        const entry = entries[index]
        const fileObj = entry.file

        const ensured = await ensureFolderPath({
          baseParentId: baseFolder.id,
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
          headers: { 'Content-Type': fileObj.type || 'application/octet-stream' },
          body: fileObj,
        })

        if (!putRes.ok) {
          throw new Error(`Error subiendo a almacenamiento (HTTP ${putRes.status})`)
        }

        const shouldUseCustomTitle = entries.length === 1 && uploadMode === 'files'
        const title = shouldUseCustomTitle
          ? (uploadTitle.trim() || deriveTitleFromFileName(fileObj.name))
          : deriveTitleFromFileName(fileObj.name)

        const complete = await fetch('/api/repository/upload-complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            folderId: targetFolderId,
            folderName: baseFolder.name,
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

        setUploadBulkProgress({ done: index + 1, total: entries.length })
      }

      setSelectedFiles([])
      setUploadTitle('')
      await refreshFoldersFromApi()
    } catch (err: any) {
      setUploadBulkError(err?.message || 'Error desconocido')
    } finally {
      setUploadingBulk(false)
    }
  }

  const refreshFoldersFromApi = async () => {
    if (!USE_REPOSITORY_API) return
    setApiLoading(true)
    setApiError(null)
    try {
      const res = await fetch('/api/repository/folders')
      if (!res.ok) {
        throw new Error(`Error ${res.status}`)
      }
      const data: RepoAdminApiResponse = await res.json()
      setFoldersFromApi(data.folders)
    } catch (err) {
      console.error('[Admin Repositorio] Error recargando desde API:', err)
      setApiError('No se ha podido cargar el repositorio dinámico. Mostrando estructura estática.')
    } finally {
      setApiLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/admin/repositorio')
    }
  }, [status, router])

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
        const data: RepoAdminApiResponse = await res.json()
        if (!cancelled) {
          setFoldersFromApi(data.folders)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[Admin Repositorio] Error cargando desde API:', err)
          setApiError('No se ha podido cargar el repositorio dinámico. Mostrando estructura estática.')
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

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Cargando panel de repositorio...</p>
      </div>
    )
  }

  const role = String(session.user?.role || '').toLowerCase()
  const isAdmin = role === 'admin'
  const repoRole = String((session.user as any)?.repoRole || 'NONE').toUpperCase()
  const isEditor = repoRole === 'EDITOR'
  const canManage = isAdmin || isEditor

  if (!canManage) {
    router.replace('/dashboard')
    return null
  }

  const showFileManager = USE_REPOSITORY_API && Boolean(foldersFromApi)
  const apiFolders = foldersFromApi || []
  const ROOT_KEY = '__root__'
  const parentKey = (parentId?: string | null) => (parentId ? parentId : ROOT_KEY)

  const folderById = new Map<string, RepoFolderAdminApi>()
  const childrenByParentId = new Map<string, RepoFolderAdminApi[]>()
  for (const f of apiFolders) {
    folderById.set(f.id, f)
    const key = parentKey(f.parentId)
    const arr = childrenByParentId.get(key) || []
    arr.push(f)
    childrenByParentId.set(key, arr)
  }
  for (const [k, arr] of childrenByParentId.entries()) {
    arr.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    childrenByParentId.set(k, arr)
  }

  const containerFolders = childrenByParentId.get(ROOT_KEY) || []

  // Root supports multiple containers. Keep `selectedFolderId=null` as "Raíz" view.

  const selectedFolder = selectedFolderId ? folderById.get(selectedFolderId) || null : null
  const selectedChildFolders = selectedFolderId
    ? childrenByParentId.get(parentKey(selectedFolderId)) || []
    : containerFolders

  useEffect(() => {
    setSelectedSubfolderIds([])
    setSelectedDocumentIds([])
  }, [selectedFolderId])

  const getBreadcrumb = (folderId: string | null) => {
    if (!folderId) return [] as RepoFolderAdminApi[]
    const out: RepoFolderAdminApi[] = []
    let current: RepoFolderAdminApi | null = folderById.get(folderId) || null
    let guard = 0
    while (current) {
      out.unshift(current)
      guard += 1
      if (guard > 20) break
      const pid = current.parentId ? String(current.parentId) : null
      current = pid ? folderById.get(pid) || null : null
    }
    return out
  }

  const breadcrumb = getBreadcrumb(selectedFolderId)
  const selectedFolderLabel = breadcrumb.length ? breadcrumb[breadcrumb.length - 1].name : 'Raíz'

  const createFolderParentLabel = (() => {
    if (!createFolderParentId) return 'Raíz'
    if (createFolderParentId === selectedFolderId) return selectedFolderLabel
    return folderById.get(createFolderParentId)?.name || 'Carpeta'
  })()

  const toggleExpand = (folderId: string) => {
    setExpandedFolderIds((prev) => (prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]))
  }

  const selectFolder = (folderId: string) => {
    setSelectedFolderId(folderId)
    setExpandedFolderIds((prev) => (prev.includes(folderId) ? prev : [...prev, folderId]))
  }

  const handleDeleteFolder = async (folderId: string) => {
    const folderName = folderById.get(folderId)?.name || 'esta carpeta'
    const ok = window.confirm(`¿Borrar “${folderName}” y todas sus subcarpetas?`)
    if (!ok) return

    try {
      const res = await fetch('/api/repository/folder', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: folderId }),
      })

      if (!res.ok) {
        let message = `Error borrando carpeta (HTTP ${res.status})`
        try {
          const data = await res.json()
          if (data?.error) message = String(data.error)
        } catch {
          // ignore
        }
        window.alert(message)
        return
      }

      await refreshFoldersFromApi()
      setSelectedFolderId((prev) => (prev === folderId ? null : prev))
    } catch (err: any) {
      window.alert(err?.message || 'Error borrando carpeta')
    }
  }

  const handleDeleteDocument = async (documentId: string) => {
    const ok = window.confirm('¿Borrar este documento?')
    if (!ok) return

    try {
      const res = await fetch('/api/repository/document', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: documentId }),
      })

      if (!res.ok) {
        let message = `Error borrando documento (HTTP ${res.status})`
        try {
          const data = await res.json()
          if (data?.error) message = String(data.error)
        } catch {
          // ignore
        }
        window.alert(message)
        return
      }

      await refreshFoldersFromApi()
    } catch (err: any) {
      window.alert(err?.message || 'Error borrando documento')
    }
  }

  const deleteFolderSilent = async (folderId: string) => {
    const res = await fetch('/api/repository/folder', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: folderId }),
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

  const deleteDocumentSilent = async (documentId: string) => {
    const res = await fetch('/api/repository/document', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: documentId }),
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

  const bulkDeleteSelected = async () => {
    const folders = selectedSubfolderIds
    const docs = selectedDocumentIds

    if (folders.length === 0 && docs.length === 0) return

    const ok = window.confirm(
      `¿Borrar seleccionados?\n\n- Carpetas: ${folders.length}\n- Documentos: ${docs.length}`
    )
    if (!ok) return

    try {
      // Delete docs first (fast) then folders (recursive).
      for (const docId of docs) {
        await deleteDocumentSilent(docId)
      }
      for (const folderId of folders) {
        await deleteFolderSilent(folderId)
      }

      setSelectedSubfolderIds([])
      setSelectedDocumentIds([])
      await refreshFoldersFromApi()
    } catch (err: any) {
      window.alert(err?.message || 'No se ha podido borrar la selección')
    }
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingFolder(true)
    setFolderError(null)
    try {
      const res = await fetch('/api/repository/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName,
          description: newFolderDescription,
          parentId: createFolderParentId,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setFolderError(data.error || 'Error al crear carpeta')
      } else {
        setShowCreateFolder(false)
        setNewFolderName('')
        setNewFolderDescription('')
        await refreshFoldersFromApi()
      }
    } catch (err: any) {
      setFolderError(err.message || 'Error desconocido')
    } finally {
      setCreatingFolder(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <Link
                href="/admin"
                className="text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                Volver al panel de administración
              </Link>
              <h1 className="mt-2 text-xl font-bold text-slate-900">Administración del repositorio</h1>
              <p className="mt-1 text-sm text-slate-600 max-w-2xl">
                Organiza carpetas y ficheros, decide qué se puede descargar y prepara el repositorio para usuarios.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                onClick={refreshFoldersFromApi}
                disabled={apiLoading}
              >
                {apiLoading ? 'Actualizando…' : 'Actualizar'}
              </button>

              {(isAdmin || isEditor) && (
                <button
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  onClick={() => {
                    // Create a ROOT container (parentId=null), not inside the currently selected folder.
                    setCreateFolderParentId(null)
                    setShowCreateFolder(true)
                  }}
                >
                  Nuevo contenedor
                </button>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/admin/repositorio/access-logs"
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Logs de acceso
              </Link>
              <Link
                href="/admin/repositorio/access-requests"
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Solicitudes
              </Link>
            </div>

            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
              Vista: <span className="ml-1 text-slate-900">{selectedFolderId ? selectedFolderLabel : 'Raíz'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">


        {showCreateFolder && (
          <form onSubmit={handleCreateFolder} className="mb-6 max-w-xl bg-white rounded-xl shadow-sm p-6 border border-slate-200 flex flex-col gap-3">
            <h2 className="text-base font-bold text-slate-900">
              {createFolderParentId ? 'Crear subcarpeta' : 'Crear contenedor'}
            </h2>
            {showFileManager && (
              <p className="text-xs text-slate-600">
                Se creará dentro de: <span className="font-semibold text-slate-800">{createFolderParentLabel}</span>
              </p>
            )}
            <input
              type="text"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Nombre de la carpeta"
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              required
              maxLength={60}
            />
            <textarea
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Descripción (opcional)"
              value={newFolderDescription}
              onChange={e => setNewFolderDescription(e.target.value)}
              maxLength={200}
            />
            {folderError && <div className="text-red-600 text-xs">{folderError}</div>}
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={creatingFolder}
              >
                {creatingFolder ? 'Creando...' : 'Crear'}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                onClick={() => setShowCreateFolder(false)}
                disabled={creatingFolder}
              >
                Cancelar
              </button>
            </div>
          </form>
        )}

        {showFileManager ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            <aside className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-800">Estructura</h2>
                {(isAdmin || isEditor) && (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-slate-50"
                    onClick={() => {
                      setCreateFolderParentId(null)
                      setShowCreateFolder(true)
                    }}
                  >
                    + Contenedor
                  </button>
                )}
              </div>
              {apiError && <p className="mt-2 text-xs text-red-600">{apiError}</p>}

              <div className="mt-3 space-y-1">
                {containerFolders.length === 0 ? (
                  <p className="text-xs text-slate-500">No hay contenedores todavía.</p>
                ) : (
                  containerFolders.map((f) => {
                    const renderNode = (node: RepoFolderAdminApi, level: number): React.ReactNode => {
                      const children = childrenByParentId.get(parentKey(node.id)) || []
                      const hasChildren = children.length > 0
                      const expanded = expandedFolderIds.includes(node.id)
                      const selected = selectedFolderId === node.id

                      return (
                        <div key={node.id}>
                          <div
                            className={
                              selected
                                ? 'flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1'
                                : 'flex items-center gap-1 rounded-md px-2 py-1 hover:bg-slate-50'
                            }
                            style={{ paddingLeft: 8 + level * 12 }}
                          >
                            {hasChildren ? (
                              <button
                                type="button"
                                className="text-xs text-slate-500 hover:text-slate-700"
                                onClick={() => toggleExpand(node.id)}
                                aria-label={expanded ? 'Contraer' : 'Expandir'}
                              >
                                {expanded ? '▾' : '▸'}
                              </button>
                            ) : (
                              <span className="text-xs text-slate-300">•</span>
                            )}
                            <button
                              type="button"
                              className={
                                selected
                                  ? 'text-xs font-semibold text-slate-900 truncate'
                                  : 'text-xs font-medium text-slate-700 truncate'
                              }
                              onClick={() => selectFolder(node.id)}
                            >
                              {node.name}
                            </button>
                          </div>

                          {hasChildren && expanded && (
                            <div className="space-y-1">
                              {children.map((child) => renderNode(child, level + 1))}
                            </div>
                          )}
                        </div>
                      )
                    }

                    return renderNode(f, 0)
                  })
                )}
              </div>
            </aside>

            <section className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Explorador</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        className={
                          breadcrumb.length === 0
                            ? 'font-semibold text-slate-800'
                            : 'font-semibold text-blue-600 hover:text-blue-800'
                        }
                        onClick={() => setSelectedFolderId(null)}
                      >
                        Raíz
                      </button>
                      {breadcrumb.length > 0 && <span className="text-slate-300">/</span>}
                    </span>
                    {breadcrumb.map((f, idx) => (
                      <span key={f.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          className={
                            idx === breadcrumb.length - 1
                              ? 'font-semibold text-slate-800'
                              : 'font-semibold text-blue-600 hover:text-blue-800'
                          }
                          onClick={() => selectFolder(f.id)}
                        >
                          {f.name}
                        </button>
                        {idx !== breadcrumb.length - 1 && <span className="text-slate-300">/</span>}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={
                      selectedFolderId
                        ? 'inline-flex items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100'
                        : 'inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-400 cursor-not-allowed'
                    }
                    onClick={() => {
                      if (!selectedFolderId) return
                      setCreateFolderParentId(selectedFolderId)
                      setShowCreateFolder(true)
                    }}
                    disabled={!selectedFolderId}
                  >
                    + Nueva carpeta
                  </button>

                  {selectedFolderId && (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                      onClick={() => handleDeleteFolder(selectedFolderId)}
                    >
                      Borrar carpeta
                    </button>
                  )}
                </div>
              </div>

              {(selectedSubfolderIds.length > 0 || selectedDocumentIds.length > 0) && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-xs text-slate-700">
                    Seleccionados: <span className="font-semibold">{selectedSubfolderIds.length}</span> carpeta(s),{' '}
                    <span className="font-semibold">{selectedDocumentIds.length}</span> documento(s)
                  </p>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                    onClick={bulkDeleteSelected}
                  >
                    Borrar seleccionados
                  </button>
                </div>
              )}

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Subida masiva</h3>
                {selectedFolderId ? (
                  <p className="mt-1 text-xs text-slate-600">
                    Sube varios ficheros, una carpeta completa o un ZIP. Destino: <span className="font-semibold">{selectedFolderLabel}</span>.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-600">
                    Selecciona un contenedor para habilitar la subida masiva.
                  </p>
                )}

                <div className="mt-3 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    disabled={!selectedFolderId}
                    className={
                      uploadMode === 'files'
                        ? 'px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold disabled:opacity-60'
                        : 'px-3 py-1.5 rounded-full text-slate-700 text-xs font-semibold hover:bg-white disabled:opacity-60'
                    }
                    onClick={() => setUploadMode('files')}
                  >
                    Archivos
                  </button>
                  <button
                    type="button"
                    disabled={!selectedFolderId || !supportsDirectoryUpload}
                    className={
                      uploadMode === 'directory'
                        ? 'px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold disabled:opacity-60'
                        : 'px-3 py-1.5 rounded-full text-slate-700 text-xs font-semibold hover:bg-white disabled:opacity-60'
                    }
                    onClick={() => setUploadMode('directory')}
                  >
                    Carpeta
                  </button>
                  <button
                    type="button"
                    disabled={!selectedFolderId}
                    className={
                      uploadMode === 'zip'
                        ? 'px-3 py-1.5 rounded-full bg-blue-600 text-white text-xs font-semibold disabled:opacity-60'
                        : 'px-3 py-1.5 rounded-full text-slate-700 text-xs font-semibold hover:bg-white disabled:opacity-60'
                    }
                    onClick={() => setUploadMode('zip')}
                  >
                    ZIP
                  </button>
                </div>

                <div className="mt-3">
                  {uploadMode === 'zip' ? (
                    <input
                      type="file"
                      accept=".zip,application/zip"
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                      disabled={!selectedFolderId || uploadingBulk}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        setSelectedFiles(files.slice(0, 1))
                        setUploadTitle('')
                      }}
                    />
                  ) : uploadMode === 'directory' ? (
                    <input
                      type="file"
                      multiple
                      // @ts-expect-error - webkitdirectory is supported by Chromium browsers
                      webkitdirectory=""
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                      disabled={!selectedFolderId || uploadingBulk}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        setSelectedFiles(files)
                        setUploadTitle('')
                      }}
                    />
                  ) : (
                    <input
                      type="file"
                      multiple
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                      disabled={!selectedFolderId || uploadingBulk}
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        setSelectedFiles(files)
                        if (files.length === 1) {
                          setUploadTitle(deriveTitleFromFileName(files[0].name))
                        } else {
                          setUploadTitle('')
                        }
                      }}
                    />
                  )}

                  {uploadMode === 'files' && selectedFiles.length === 1 && (
                    <input
                      type="text"
                      className="mt-2 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="Título (solo si subes 1 fichero)"
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                      disabled={!selectedFolderId || uploadingBulk}
                      maxLength={100}
                    />
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={allowDownload}
                      onChange={(e) => setAllowDownload(e.target.checked)}
                      disabled={!selectedFolderId || uploadingBulk}
                    />
                    Permitir descarga (gestión)
                  </label>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    disabled={uploadingBulk || !selectedFolderId}
                    onClick={runBulkUpload}
                  >
                    {uploadingBulk ? 'Subiendo...' : 'Subir'}
                  </button>
                </div>

                {uploadBulkError && <p className="mt-2 text-xs text-red-600">{uploadBulkError}</p>}
                {uploadBulkProgress && uploadingBulk && (
                  <p className="mt-1 text-[11px] text-slate-600">
                    Subiendo {uploadBulkProgress.done}/{uploadBulkProgress.total}...
                  </p>
                )}
                <p className="mt-2 text-[11px] text-slate-500">
                  En móvil: usa “Archivos” o “ZIP”. “Carpeta” depende del navegador.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">
                  {selectedFolderId ? 'Subcarpetas' : 'Contenedores (raíz)'}
                </h3>
                {selectedChildFolders.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    {selectedFolderId
                      ? 'No hay subcarpetas.'
                      : 'No hay contenedores todavía. Usa “Nueva carpeta” para crear el primero.'}
                  </p>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="py-2 pr-3 font-medium w-8">
                          <input
                            type="checkbox"
                            checked={
                              selectedSubfolderIds.length > 0 &&
                              selectedSubfolderIds.length === selectedChildFolders.length
                            }
                            onChange={(e) => {
                              const checked = e.target.checked
                              setSelectedSubfolderIds(checked ? selectedChildFolders.map((f) => f.id) : [])
                            }}
                            aria-label={selectedFolderId ? 'Seleccionar todas las subcarpetas' : 'Seleccionar todos los contenedores'}
                          />
                        </th>
                        <th className="py-2 pr-3 font-medium">{selectedFolderId ? 'Carpeta' : 'Contenedor'}</th>
                        <th className="py-2 pr-3 font-medium">Descripción</th>
                        <th className="py-2 pr-3 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedChildFolders.map((f) => (
                        <tr key={f.id} className="hover:bg-slate-50">
                          <td className="py-2 pr-3 align-top">
                            <input
                              type="checkbox"
                              checked={selectedSubfolderIds.includes(f.id)}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setSelectedSubfolderIds((prev) =>
                                  checked ? [...prev, f.id] : prev.filter((id) => id !== f.id)
                                )
                              }}
                              aria-label={`Seleccionar carpeta ${f.name}`}
                            />
                          </td>
                          <td className="py-2 pr-3 align-top font-medium text-slate-900">{f.name}</td>
                          <td className="py-2 pr-3 align-top text-slate-600">{f.description || '—'}</td>
                          <td className="py-2 pr-3 align-top">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                                onClick={() => selectFolder(f.id)}
                              >
                                Abrir
                              </button>
                              <button
                                type="button"
                                className="text-xs font-semibold text-red-700 hover:text-red-800"
                                onClick={() => handleDeleteFolder(f.id)}
                              >
                                Borrar
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Documentos</h3>
                {!selectedFolderId ? (
                  <p className="text-xs text-slate-500">Selecciona un contenedor para ver los documentos.</p>
                ) : (selectedFolder?.documents || []).length === 0 ? (
                  <p className="text-xs text-slate-500">No hay documentos en esta carpeta.</p>
                ) : (
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="py-2 pr-3 font-medium w-8">
                          <input
                            type="checkbox"
                            checked={
                              selectedDocumentIds.length > 0 &&
                              selectedDocumentIds.length === (selectedFolder?.documents || []).length
                            }
                            onChange={(e) => {
                              const checked = e.target.checked
                              setSelectedDocumentIds(
                                checked ? (selectedFolder?.documents || []).map((d) => d.id) : []
                              )
                            }}
                            aria-label="Seleccionar todos los documentos"
                          />
                        </th>
                        <th className="py-2 pr-3 font-medium">Título</th>
                        <th className="py-2 pr-3 font-medium">Nombre interno</th>
                        <th className="py-2 pr-3 font-medium">Acceso</th>
                        <th className="py-2 pr-3 font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(selectedFolder?.documents || []).map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50">
                          <td className="py-2 pr-3 align-top">
                            <input
                              type="checkbox"
                              checked={selectedDocumentIds.includes(doc.id)}
                              onChange={(e) => {
                                const checked = e.target.checked
                                setSelectedDocumentIds((prev) =>
                                  checked ? [...prev, doc.id] : prev.filter((id) => id !== doc.id)
                                )
                              }}
                              aria-label={`Seleccionar documento ${doc.title}`}
                            />
                          </td>
                          <td className="py-2 pr-3 align-top font-medium text-slate-900">{doc.title}</td>
                          <td className="py-2 pr-3 text-slate-500 align-top truncate max-w-[18rem]">{doc.fileName}</td>
                          <td className="py-2 pr-3 align-top">
                            {doc.allowDownload ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">
                                Descarga
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
                                Solo visor
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-3 align-top">
                            <button
                              type="button"
                              className="text-xs font-semibold text-red-700 hover:text-red-800"
                              onClick={() => handleDeleteDocument(doc.id)}
                            >
                              Borrar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
              <h2 className="text-sm font-semibold text-slate-700 mb-1 uppercase tracking-wide">Carpetas y ficheros (vista interna)</h2>
              <p className="text-xs text-slate-600 mb-1">
                Esta tabla resume cómo estás organizando el repositorio hoy. Si activas el repositorio dinámico,
                tendrás una vista tipo gestor de archivos.
              </p>

              <div className="space-y-4 text-sm text-slate-800">
                {STATIC_FOLDERS_ADMIN.map((folder) => {
                  const filesInFolder: RepoFileRow[] = STATIC_FILES_ADMIN.filter(
                    (f) => f.folderId === (folder as StaticFolderAdmin).id
                  ) as RepoFileRow[]

                  return (
                    <FolderCard
                      key={folder.id}
                      folderId={folder.id}
                      folderName={folder.name}
                      folderDescription={folder.description}
                      filesInFolder={filesInFolder}
                      canManage={canManage}
                      useRepositoryApi={false}
                      refreshFoldersFromApi={refreshFoldersFromApi}
                    />
                  )
                })}
              </div>
            </section>

            <aside className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">Nota</h3>
                <p className="text-xs text-slate-600">
                  Para usar el gestor de carpetas/subcarpetas real, activa `NEXT_PUBLIC_USE_REPOSITORY_API` y
                  aplica las migraciones de RepoFolder/RepoDocument.
                </p>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

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
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-slate-100">
        <div>
          <p className="text-sm font-semibold text-slate-900">{folderName}</p>
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
  const USE_REPOSITORY_API = process.env.NEXT_PUBLIC_USE_REPOSITORY_API === 'true'

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
  const isEditor = role === 'editor'
  if (!isAdmin && !isEditor) {
    router.replace('/dashboard')
    return null
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreatingFolder(true)
    setFolderError(null)
    try {
      const res = await fetch('/api/repository/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName, description: newFolderDescription })
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
            {(isAdmin || isEditor) && (
              <button
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                onClick={() => setShowCreateFolder((v) => !v)}
              >
                Crear carpeta
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">

        <div className="mb-4">
          <Link
            href="/admin/repositorio/access-logs"
            className="text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            Ver logs de acceso
          </Link>
          <span className="mx-2 text-slate-300">|</span>
          <Link
            href="/admin/repositorio/access-requests"
            className="text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            Ver solicitudes de acceso
          </Link>
        </div>

        {showCreateFolder && (
          <form onSubmit={handleCreateFolder} className="mb-6 max-w-xl bg-white rounded-xl shadow-sm p-6 border border-slate-200 flex flex-col gap-3">
            <h2 className="text-base font-bold text-slate-900">Crear carpeta</h2>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <section className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-1 uppercase tracking-wide">Carpetas y ficheros (vista interna)</h2>
            <p className="text-xs text-slate-600 mb-1">
              Esta tabla resume cómo estás organizando el repositorio hoy. Más adelante estos datos vendrán
              de la base de datos y de Supabase Storage, pero ya refleja la estructura real que quieres
              aplicar (carpetas + ficheros, y qué es descargable).
            </p>

            <div className="space-y-4 text-sm text-slate-800">
              {(USE_REPOSITORY_API && foldersFromApi ? foldersFromApi : STATIC_FOLDERS_ADMIN).map((folder) => {
                const isApiFolder = (folder as any).code !== undefined
                const filesInFolder: RepoFileRow[] = (USE_REPOSITORY_API && foldersFromApi && isApiFolder
                  ? (folder as RepoFolderAdminApi).documents
                  : STATIC_FILES_ADMIN.filter((f) => f.folderId === (folder as StaticFolderAdmin).id)) as RepoFileRow[]

                const folderName = isApiFolder ? (folder as RepoFolderAdminApi).name : (folder as StaticFolderAdmin).name
                const folderDescription = isApiFolder
                  ? (folder as RepoFolderAdminApi).description || undefined
                  : (folder as StaticFolderAdmin).description

                return (
                  <FolderCard
                    key={folder.id}
                    folderId={folder.id}
                    folderName={folderName}
                    folderDescription={folderDescription}
                    filesInFolder={filesInFolder}
                    canManage={isAdmin || isEditor}
                    useRepositoryApi={USE_REPOSITORY_API}
                    refreshFoldersFromApi={refreshFoldersFromApi}
                  />
                )
              })}

              <div className="rounded-xl border border-dashed border-slate-200 p-4 bg-slate-50">
                <p className="text-xs font-semibold text-slate-800 mb-2">Ficheros sueltos (sin carpeta)</p>
                {STATIC_FILES_ADMIN.filter((f) => !f.folderId).length === 0 ? (
                  <p className="text-[11px] text-slate-500">No hay ficheros sueltos definidos.</p>
                ) : (
                  <table className="w-full text-xs text-left mt-1">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="py-2 pr-3 font-medium">Fichero</th>
                        <th className="py-2 pr-3 font-medium">Nombre interno</th>
                        <th className="py-2 pr-3 font-medium">Acceso</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {STATIC_FILES_ADMIN.filter((f) => !f.folderId).map((file) => (
                        <tr key={file.id} className="hover:bg-slate-50">
                          <td className="py-2 pr-3 align-top font-medium text-slate-900">{file.title}</td>
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
                )}
              </div>
            </div>
          </section>

          <aside className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Estado actual</h3>
              <p className="text-xs text-slate-600">
                • Zona de usuario (/repositorio) creada y protegida por login.
                <br />• Acceso de administración (/admin/repositorio) activado sólo para rol admin.
                <br />• Carpeta y ejemplos de ficheros maquetados según tu modelo real.
              </p>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Cómo subir ahora los documentos</h3>
              <ol className="list-decimal list-inside text-xs text-slate-600 space-y-1">
                <li>
                  Sube o copia los PDFs/presentaciones a las carpetas correspondientes de tu NAS o nube
                  (como haces ahora habitualmente).
                </li>
                <li>
                  Asegúrate de que sólo los administradores tienen acceso directo físico a esas carpetas.
                </li>
                <li>
                  Da acceso a los usuarios exclusivamente a través de OPOSITAPP (/repositorio), cuando
                  activemos los visores en sólo lectura.
                </li>
              </ol>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Siguiente paso (cuando quieras)</h3>
              <p className="text-xs text-slate-600">
                Cuando tengamos estable la conexión con la base de datos de desarrollo, el siguiente paso
                será:
                <br />• Crear las tablas RepoFolder/RepoDocument/RepoDocumentAccessLog en Supabase.
                <br />• Conectar esta vista a esas tablas y a Supabase Storage.
                <br />• Registrar automáticamente cada acceso (view/descarga) por usuario.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

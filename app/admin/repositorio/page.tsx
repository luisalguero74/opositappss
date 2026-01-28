'use client'

import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

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

  if (!isAdmin) {
    router.replace('/dashboard')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link
              href="/admin"
              className="text-blue-600 hover:text-blue-800 font-semibold inline-block mb-2"
            >
              ← Volver al panel de administración
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              🗂️ Administración del Repositorio
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Vista de trabajo interna para que organices las carpetas y ficheros del repositorio, decidas
              qué es descargable y qué solo se puede ver en pantalla, y prepares la conexión con Supabase
              Storage y los logs de acceso.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
          <section className="lg:col-span-2 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-5 space-y-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-1 uppercase tracking-wide">Carpetas y ficheros (vista interna)</h2>
            <p className="text-xs text-slate-600 mb-1">
              Esta tabla resume cómo estás organizando el repositorio hoy. Más adelante estos datos vendrán
              de la base de datos y de Supabase Storage, pero ya refleja la estructura real que quieres
              aplicar (carpetas + ficheros, y qué es descargable).
            </p>

            <div className="space-y-4 text-sm text-slate-800">
              {(USE_REPOSITORY_API && foldersFromApi ? foldersFromApi : STATIC_FOLDERS_ADMIN).map((folder) => {
                const isApiFolder = (folder as any).code !== undefined
                const filesInFolder = USE_REPOSITORY_API && foldersFromApi && isApiFolder
                  ? (folder as RepoFolderAdminApi).documents
                  : STATIC_FILES_ADMIN.filter((f) => f.folderId === (folder as StaticFolderAdmin).id)

                const folderName = isApiFolder ? (folder as RepoFolderAdminApi).name : (folder as StaticFolderAdmin).name
                const folderDescription = isApiFolder
                  ? (folder as RepoFolderAdminApi).description || undefined
                  : (folder as StaticFolderAdmin).description

                return (
                  <div key={folder.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/80">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold flex items-center gap-2">
                          <span className="text-lg">📂</span>
                          {folderName}
                        </p>
                        {folderDescription && (
                          <p className="text-[11px] text-slate-600">{folderDescription}</p>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {filesInFolder.length} fichero{filesInFolder.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {filesInFolder.length > 0 ? (
                      <table className="w-full text-[11px] text-left border-t border-slate-200 mt-2">
                        <thead>
                          <tr className="text-slate-500">
                            <th className="py-1 pr-2 font-medium">Fichero</th>
                            <th className="py-1 pr-2 font-medium">Nombre interno</th>
                            <th className="py-1 pr-2 font-medium">Descarga</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filesInFolder.map((file) => (
                            <tr key={file.id} className="border-t border-slate-100">
                              <td className="py-1 pr-2 align-top">
                                <span className="whitespace-nowrap">📄 {file.title}</span>
                              </td>
                              <td className="py-1 pr-2 text-slate-500 align-top">
                                {file.fileName}
                              </td>
                              <td className="py-1 pr-2 align-top">
                                {file.allowDownload ? (
                                  <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">
                                    Permitida (editores/admin)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
                                    Solo lectura
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-[11px] text-slate-500 mt-1">Aún no has asignado ficheros a esta carpeta.</p>
                    )}
                  </div>
                )
              })}

              <div className="border border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/60">
                <p className="text-xs font-semibold text-slate-800 mb-2">Ficheros sueltos (sin carpeta)</p>
                {STATIC_FILES_ADMIN.filter((f) => !f.folderId).length === 0 ? (
                  <p className="text-[11px] text-slate-500">No hay ficheros sueltos definidos.</p>
                ) : (
                  <table className="w-full text-[11px] text-left border-t border-slate-200 mt-1">
                    <thead>
                      <tr className="text-slate-500">
                        <th className="py-1 pr-2 font-medium">Fichero</th>
                        <th className="py-1 pr-2 font-medium">Nombre interno</th>
                        <th className="py-1 pr-2 font-medium">Descarga</th>
                      </tr>
                    </thead>
                    <tbody>
                      {STATIC_FILES_ADMIN.filter((f) => !f.folderId).map((file) => (
                        <tr key={file.id} className="border-t border-slate-100">
                          <td className="py-1 pr-2 align-top">📄 {file.title}</td>
                          <td className="py-1 pr-2 text-slate-500 align-top">{file.fileName}</td>
                          <td className="py-1 pr-2 align-top">
                            {file.allowDownload ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5">
                                Permitida (editores/admin)
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
                                Solo lectura
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

          <aside className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-slate-200 p-5 space-y-4">
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

'use client'

import { useSession } from 'next-auth/react'
import type { Session } from 'next-auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'

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

export default function RepositorioPage() {
  // Estado para el disclaimer legal
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
  // Flag de seguridad: si no está activado, la página usa solo datos estáticos.
  // Se puede activar por entorno (ej: Preview en Vercel) con NEXT_PUBLIC_USE_REPOSITORY_API=true.
  const USE_REPOSITORY_API = process.env.NEXT_PUBLIC_USE_REPOSITORY_API === 'true'

  const { data: session, status } = useSession() as { data: Session | null; status: 'loading' | 'authenticated' | 'unauthenticated' }
  const router = useRouter()

  const [foldersFromApi, setFoldersFromApi] = useState<RepoFolderApi[] | null>(null)
  const [apiError, setApiError] = useState<string | null>(null)
  const [apiLoading, setApiLoading] = useState(false)

  const openRepoDocument = (id: string, opts?: { preview?: boolean }) => {
    if (!USE_REPOSITORY_API) {
      window.alert(
        'Repositorio en modo demostración: estas carpetas y ficheros son de ejemplo.\n\nPara ver documentos reales, activa NEXT_PUBLIC_USE_REPOSITORY_API=true y carga el contenido desde el panel de administración.'
      )
      return
    }

    const preview = opts?.preview ? '?preview=1' : ''
    window.open(`/api/repository/download/${id}${preview}`, '_blank')
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/repositorio')
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
        const data: RepoApiResponse = await res.json()
        if (!cancelled) {
          setFoldersFromApi(data.folders)
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[Repositorio] Error cargando desde API:', err)
          setApiError('No se ha podido cargar el repositorio dinámico. Mostrando contenido estático.')
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

  if (!canAccessRepository) {
    router.replace('/dashboard')
    return null
  }

  // Mostrar disclaimer solo a usuarios (no admin/editor)
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
          <Link
            href={role === 'admin' ? '/admin' : '/dashboard'}
            className="text-sm font-semibold text-slate-700 hover:text-slate-900"
          >
            Volver
          </Link>
          <h1 className="mt-2 text-xl font-bold text-slate-900">Repositorio de documentos</h1>
          <p className="mt-1 text-sm text-slate-600">
            Accede a las carpetas y ficheros aportados por el equipo. Los usuarios lectores solo pueden
            ver en pantalla; los editores/administradores podrán descargar cuando el fichero lo permita.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-6">
          <section>
            <h2 className="text-sm font-semibold text-slate-700 mb-3 uppercase tracking-wide">
              Carpetas de material
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(USE_REPOSITORY_API && foldersFromApi ? foldersFromApi : STATIC_FOLDERS).map((folder) => {
                const isApiFolder = typeof (folder as RepoFolderApi).code === 'string'
                const usingApiData = USE_REPOSITORY_API && foldersFromApi && isApiFolder
                const filesInFolder = usingApiData
                  ? (folder as RepoFolderApi).documents
                  : STATIC_FILES.filter((f) => f.folderId === (folder as StaticFolder).id)

                const folderName = isApiFolder ? (folder as RepoFolderApi).name : (folder as StaticFolder).name
                const folderDescription = isApiFolder
                  ? (folder as RepoFolderApi).description || undefined
                  : (folder as StaticFolder).description

                return (
                  <div
                    key={folder.id}
                    className="rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition p-4 flex flex-col gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-base font-semibold text-slate-900">{folderName}</h3>
                        <span className="text-[11px] text-slate-500">
                          {filesInFolder.length} fichero{filesInFolder.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      {folderDescription && (
                        <p className="text-xs text-slate-600 mb-2">{folderDescription}</p>
                      )}
                    </div>
                    {filesInFolder.length > 0 ? (
                      <ul className="divide-y divide-slate-100 text-xs text-slate-700">
                        {filesInFolder.map((file) => (
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
                    ) : (
                      <p className="text-xs text-slate-500">Aún no hay ficheros en esta carpeta.</p>
                    )}
                  </div>
                )
              })}
            </div>
          </section>

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
        </div>
      </div>
    </div>
  )
}

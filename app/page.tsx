import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session?.user) {
    redirect('/dashboard')
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-slate-900 text-white">
      {/* Background layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700" />
      <div
        className="absolute inset-0 opacity-[0.62]"
        style={{
          backgroundImage: "url('/landing-study-photo.jpg')",
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
          filter: 'brightness(1.08) saturate(1.05)',
        }}
      />
      <div className="absolute inset-0 bg-slate-900/25" />
      <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-sky-400/10 blur-3xl" />

      <div className="relative max-w-5xl mx-auto px-6 py-14 md:py-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold tracking-wide">
          <span className="text-base leading-none">📚</span>
          Preparación de oposiciones · Seguridad Social
        </div>

        <h1 className="mt-6 text-4xl md:text-5xl font-extrabold tracking-tight">
          opositAPPSS
        </h1>
        <p className="mt-4 max-w-2xl text-white/80 text-base md:text-lg">
          Tests, seguimiento de progreso y recursos de estudio para preparar tus oposiciones con constancia y foco.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-xl bg-white text-slate-900 px-6 py-3 font-bold hover:bg-white/90"
          >
            Iniciar sesión
          </a>
          <a
            href="/register"
            className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/5 text-white px-6 py-3 font-bold hover:bg-white/10"
          >
            Crear cuenta
          </a>
        </div>

        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold">Cuestionarios</p>
            <p className="mt-2 text-sm text-white/75">
              Practica con tests y repasa errores para afianzar conceptos.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold">Progreso</p>
            <p className="mt-2 text-sm text-white/75">
              Visualiza tu evolución y mantén la constancia en el estudio.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold">Recursos</p>
            <p className="mt-2 text-sm text-white/75">
              Accede a material organizado para complementar tu preparación.
            </p>
          </div>
        </div>

        <p className="mt-10 text-xs text-white/60">
          Al continuar, aceptas que el acceso a ciertas secciones requiere autenticación.
        </p>
      </div>
    </main>
  )
}

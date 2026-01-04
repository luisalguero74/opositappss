'use client'

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import Link from 'next/link';
import { TODOS_LOS_TEMAS } from '@/lib/temario';

interface TemaEstadisticas {
  codigo: string;
  numero: number | null;
  parte: string | null;
  titulo: string | null;
  totalPreguntas: number;
  correctas: number;
  incorrectas: number;
  porcentajeAcierto: number;
}

interface ApiResponse {
  temas: TemaEstadisticas[];
  totalTemasPracticados: number;
}

export default function TemarioPage() {
  const { data: session } = useSession() as { data: Session | null };
  const [stats, setStats] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todos' | 'GENERAL' | 'ESPECÍFICO'>('todos');

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchStats = async () => {
      try {
        const response = await fetch('/api/statistics/by-topic');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [session]);

  if (!session) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p>Cargando...</p>
    </div>;
  }

  const getColorByPercentage = (porcentaje: number) => {
    if (porcentaje >= 85) return 'bg-green-100 border-green-500 text-green-800';
    if (porcentaje >= 70) return 'bg-yellow-100 border-yellow-500 text-yellow-800';
    if (porcentaje >= 50) return 'bg-orange-100 border-orange-500 text-orange-800';
    return 'bg-red-100 border-red-500 text-red-800';
  };

  const getIconByPercentage = (porcentaje: number) => {
    if (porcentaje >= 85) return '🟢';
    if (porcentaje >= 70) return '🟡';
    if (porcentaje >= 50) return '🟠';
    return '🔴';
  };

  // Combinar temas del temario con estadísticas
  const temasConEstadisticas = TODOS_LOS_TEMAS.map(tema => {
    const stat = stats?.temas.find(s => s.codigo === tema.codigo);
    return {
      ...tema,
      stats: stat || null,
    };
  });

  // Filtrar temas
  const temasFiltrados = filter === 'todos' 
    ? temasConEstadisticas 
    : temasConEstadisticas.filter(t => t.parte === filter);

  // Calcular estadísticas corregidas basadas en los temas filtrados
  const temasPracticadosFiltrados = temasFiltrados.filter(t => t.stats !== null);
  const temasDominadosFiltrados = temasPracticadosFiltrados.filter(t => t.stats && t.stats.porcentajeAcierto >= 85);
  const temasReforzarFiltrados = temasPracticadosFiltrados.filter(t => t.stats && t.stats.porcentajeAcierto < 70);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/dashboard" 
              className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center gap-2"
            >
              ← Volver al Dashboard
            </Link>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-4">
              Temario Seguridad Social
            </h1>
            <p className="text-gray-600 mt-2">
              Revisa tu progreso en cada tema del temario oficial
            </p>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex gap-3">
            <button
              onClick={() => setFilter('todos')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'todos'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos los Temas ({TODOS_LOS_TEMAS.length})
            </button>
            <button
              onClick={() => setFilter('GENERAL')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'GENERAL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Parte General (23)
            </button>
            <button
              onClick={() => setFilter('ESPECÍFICO')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'ESPECÍFICO'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Parte Específica (13)
            </button>
          </div>

          {/* Resumen de Estadísticas */}
          {stats && (
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📊 Resumen General</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Temas Practicados</p>
                  <p className="text-3xl font-bold text-blue-600">{temasPracticadosFiltrados.length}</p>
                  <p className="text-gray-500 text-xs">
                    de {filter === 'todos' ? TODOS_LOS_TEMAS.length : filter === 'GENERAL' ? 23 : 13} totales
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Temas Dominados (&gt;85%)</p>
                  <p className="text-3xl font-bold text-green-600">
                    {temasDominadosFiltrados.length}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-gray-600 text-sm">Temas a Reforzar (&lt;70%)</p>
                  <p className="text-3xl font-bold text-red-600">
                    {temasReforzarFiltrados.length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Lista de Temas */}
          <div className="space-y-3">
            {loading ? (
              <div className="bg-white rounded-xl shadow-md p-8 text-center">
                <p className="text-gray-600">Cargando estadísticas...</p>
              </div>
            ) : (
              temasFiltrados.map(tema => (
                <Link
                  key={tema.codigo}
                  href={`/dashboard/temario/${tema.codigo}`}
                  className="block bg-white rounded-xl shadow-md hover:shadow-xl transition-all transform hover:scale-[1.01]"
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-gray-100 text-gray-700 font-mono text-sm px-3 py-1 rounded">
                            {tema.codigo}
                          </span>
                          <span className={`px-3 py-1 rounded text-xs font-medium ${
                            tema.parte === 'GENERAL' 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {tema.parte}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          Tema {tema.numero}: {tema.titulo}
                        </h3>
                      </div>
                      
                      {tema.stats ? (
                        <div className="ml-4 flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-gray-600">
                              {tema.stats.totalPreguntas} preguntas
                            </p>
                            <p className="text-xs text-gray-500">
                              {tema.stats.correctas} correctas
                            </p>
                          </div>
                          <div className={`border-l-4 pl-4 py-2 rounded ${getColorByPercentage(tema.stats.porcentajeAcierto)}`}>
                            <p className="text-3xl font-bold flex items-center gap-2">
                              {getIconByPercentage(tema.stats.porcentajeAcierto)}
                              {tema.stats.porcentajeAcierto}%
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="ml-4 bg-gray-100 rounded-lg px-4 py-3">
                          <p className="text-gray-500 text-sm">Sin practicar</p>
                          <p className="text-xs text-gray-400">Haz clic para empezar</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {temasFiltrados.length === 0 && !loading && (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <p className="text-gray-600">No hay temas en esta categoría</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

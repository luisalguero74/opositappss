'use client'

import { useEffect, useState, use } from 'react';
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';
import Link from 'next/link';
import { getTemaByCode } from '@/lib/temario';

interface PreguntaFallada {
  id: string;
  pregunta: string;
  respuestaCorrecta: string;
  tuRespuesta: string;
}

interface Recomendacion {
  tipo: 'critico' | 'mejora' | 'bien' | 'excelente' | 'accion' | 'atencion';
  mensaje: string;
}

interface Estadisticas {
  totalPreguntas: number;
  correctas: number;
  incorrectas: number;
  porcentajeAcierto: number;
}

interface TemaInfo {
  codigo: string | null;
  numero: number | null;
  parte: string | null;
  titulo: string | null;
}

interface ApiResponse {
  tema?: TemaInfo;
  estadisticas?: Estadisticas | null;
  preguntasFalladas?: PreguntaFallada[];
  recomendaciones?: Recomendacion[];
  mensaje?: string;
}

export default function TemaDetallePage({
  params,
}: {
  params: Promise<{ codigo: string }>;
}) {
  const { codigo } = use(params);
  const { data: session } = useSession() as { data: Session | null };
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const temaOficial = getTemaByCode(codigo);

  useEffect(() => {
    if (!session?.user?.id) return;

    const fetchData = async () => {
      try {
        const response = await fetch(`/api/statistics/by-topic/${codigo}`);
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Error cargando datos del tema:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, codigo]);

  if (!session) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p>Cargando...</p>
    </div>;
  }

  const getColorByTipo = (tipo: string) => {
    switch (tipo) {
      case 'critico':
        return 'bg-red-50 border-red-500 text-red-800';
      case 'mejora':
        return 'bg-orange-50 border-orange-500 text-orange-800';
      case 'bien':
        return 'bg-yellow-50 border-yellow-500 text-yellow-800';
      case 'excelente':
        return 'bg-green-50 border-green-500 text-green-800';
      case 'accion':
        return 'bg-blue-50 border-blue-500 text-blue-800';
      case 'atencion':
        return 'bg-purple-50 border-purple-500 text-purple-800';
      default:
        return 'bg-gray-50 border-gray-500 text-gray-800';
    }
  };

  const getIconByTipo = (tipo: string) => {
    switch (tipo) {
      case 'critico':
        return '🚨';
      case 'mejora':
        return '📈';
      case 'bien':
        return '👍';
      case 'excelente':
        return '🌟';
      case 'accion':
        return '💡';
      case 'atencion':
        return '⚠️';
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="p-6">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link 
              href="/dashboard/temario" 
              className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center gap-2"
            >
              ← Volver al Temario
            </Link>
            
            {temaOficial && (
              <div className="mt-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="bg-gray-800 text-white font-mono text-sm px-3 py-1 rounded">
                    {temaOficial.codigo}
                  </span>
                  <span className={`px-3 py-1 rounded text-xs font-medium ${
                    temaOficial.parte === 'GENERAL' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {temaOficial.parte}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Tema {temaOficial.numero}: {temaOficial.titulo}
                </h1>
              </div>
            )}
          </div>

          {loading ? (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <p className="text-gray-600">Cargando estadísticas...</p>
            </div>
          ) : data?.mensaje ? (
            <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-6">
              <p className="text-yellow-800">{data.mensaje}</p>
              <p className="text-yellow-700 mt-2 text-sm">
                Comienza a practicar preguntas de este tema para ver tus estadísticas.
              </p>
            </div>
          ) : data?.estadisticas ? (
            <>
              {/* Estadísticas Generales */}
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  📊 Estadísticas Generales
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-gray-600 text-sm mb-1">Total Preguntas</p>
                    <p className="text-4xl font-bold text-blue-600">
                      {data.estadisticas.totalPreguntas}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-gray-600 text-sm mb-1">Correctas</p>
                    <p className="text-4xl font-bold text-green-600">
                      {data.estadisticas.correctas}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-gray-600 text-sm mb-1">Incorrectas</p>
                    <p className="text-4xl font-bold text-red-600">
                      {data.estadisticas.incorrectas}
                    </p>
                  </div>
                  <div className={`rounded-lg p-4 text-center border-2 ${
                    data.estadisticas.porcentajeAcierto >= 85 ? 'bg-green-100 border-green-500' :
                    data.estadisticas.porcentajeAcierto >= 70 ? 'bg-yellow-100 border-yellow-500' :
                    data.estadisticas.porcentajeAcierto >= 50 ? 'bg-orange-100 border-orange-500' :
                    'bg-red-100 border-red-500'
                  }`}>
                    <p className="text-gray-700 text-sm mb-1 font-medium">% Acierto</p>
                    <p className="text-4xl font-bold">
                      {data.estadisticas.porcentajeAcierto}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Recomendaciones */}
              {data.recomendaciones && data.recomendaciones.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    💬 Recomendaciones Personalizadas
                  </h2>
                  <div className="space-y-3">
                    {data.recomendaciones.map((rec, index) => (
                      <div
                        key={index}
                        className={`border-l-4 rounded-lg p-4 ${getColorByTipo(rec.tipo)}`}
                      >
                        <p className="flex items-center gap-2">
                          <span className="text-2xl">{getIconByTipo(rec.tipo)}</span>
                          <span className="font-medium">{rec.mensaje}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preguntas Falladas */}
              {data.preguntasFalladas && data.preguntasFalladas.length > 0 && (
                <div className="bg-white rounded-xl shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    ❌ Preguntas que has Fallado (últimas {data.preguntasFalladas.length})
                  </h2>
                  <p className="text-gray-600 mb-4 text-sm">
                    Revisa tus errores para identificar áreas de mejora
                  </p>
                  <div className="space-y-4">
                    {data.preguntasFalladas.map((pregunta, index) => (
                      <div
                        key={pregunta.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                      >
                        <div className="flex items-start gap-3">
                          <span className="bg-red-100 text-red-700 font-bold text-sm px-3 py-1 rounded-full">
                            #{index + 1}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 mb-3">
                              {pregunta.pregunta}
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="bg-red-50 border border-red-200 rounded p-3">
                                <p className="text-xs text-red-600 font-semibold mb-1">
                                  ❌ Tu respuesta:
                                </p>
                                <p className="text-sm text-gray-700">
                                  {pregunta.tuRespuesta}
                                </p>
                              </div>
                              <div className="bg-green-50 border border-green-200 rounded p-3">
                                <p className="text-xs text-green-600 font-semibold mb-1">
                                  ✅ Respuesta correcta:
                                </p>
                                <p className="text-sm text-gray-700">
                                  {pregunta.respuestaCorrecta}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón para Practicar */}
              <div className="mt-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                <h3 className="text-xl font-bold mb-2">¿Listo para mejorar?</h3>
                <p className="mb-4 opacity-90">
                  Sigue practicando preguntas de este tema para mejorar tu rendimiento
                </p>
                <Link
                  href="/dashboard/theory"
                  className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition"
                >
                  Ir a Practicar →
                </Link>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-md p-8 text-center">
              <p className="text-gray-600">No se pudieron cargar las estadísticas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
